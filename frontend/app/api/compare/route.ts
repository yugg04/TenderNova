import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { compareTenders } from '@/lib/ai';
import { estimateTokens, recordApiUsage } from '@/lib/api-usage';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = checkRateLimit(`compare:${session.user.email}`, 20, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many comparison requests' }, { status: 429 });

  const { tenderIds } = await request.json();
  if (!Array.isArray(tenderIds) || tenderIds.length < 2) {
    return NextResponse.json({ error: 'Select at least two tenders' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const tenders = await prisma.tender.findMany({ where: { id: { in: tenderIds }, userId: user.id } });
  if (tenders.length < 2) {
    return NextResponse.json({ error: 'At least two valid tenders are required' }, { status: 400 });
  }

  const localComparison = buildDeterministicComparison(tenders);
  const aiPayload = tenders.map(tender => ({
    id: tender.id,
    title: tender.title,
    summary: tender.summary,
    budget: tender.budget,
    deadline: tender.deadline,
    category: tender.category,
    analysis: tender.analysis,
    scorecard: localComparison.comparison.find(row => row.tenderId === tender.id)
  }));

  const aiComparison = await compareTenders(aiPayload)
    .then(async result => {
      await recordApiUsage(user.id, 'tender_comparison', { tokens: estimateTokens(JSON.stringify(aiPayload), JSON.stringify(result)), success: true });
      return result;
    })
    .catch(async error => {
      await recordApiUsage(user.id, 'tender_comparison', { tokens: estimateTokens(JSON.stringify(aiPayload)), success: false, error: error instanceof Error ? error.message : 'Comparison failed' });
      return null;
    });
  const comparison = mergeAiNarrative(localComparison, aiComparison);

  await prisma.adminLog.create({
    data: { userId: user.id, action: 'compare_tenders', metadata: { tenderIds, winnerTenderId: comparison.winnerTenderId } }
  }).catch(() => undefined);

  return NextResponse.json(comparison);
}

function buildDeterministicComparison(tenders: any[]) {
  const rows = tenders.map((tender, index) => scoreTender(tender, index));
  const winner = [...rows].sort((a, b) => b.score - a.score)[0];
  return {
    recommendation: `Prioritize ${winner.title}. It has the best weighted fit across eligibility, risk, timeline, profitability, and document clarity.`,
    winnerTenderId: winner.tenderId,
    winnerReason: `${winner.title} leads with a ${winner.score}/100 score, strongest on ${winner.bestDriver}.`,
    comparison: rows,
    summary: 'Comparison is calculated from saved tender analysis and document metadata, then enriched by AI when available.'
  };
}

function scoreTender(tender: any, index: number) {
  const analysis = (tender.analysis ?? {}) as any;
  const eligibility = Number(tender.eligibility?.score ?? analysis.eligibility?.score ?? tender.aiScore ?? 50);
  const risks = normalizeRisks(tender.risks ?? analysis.risks);
  const requirements = analysis.requirements ?? {};
  const deadlineDays = tender.deadline ? Math.ceil((new Date(tender.deadline).getTime() - Date.now()) / 86400000) : null;
  const riskPenalty = risks.reduce((sum, risk) => sum + (risk.level === 'high' ? 16 : risk.level === 'medium' ? 8 : 3), 0);
  const documentDepth = Math.min(100, Math.round((String(tender.fileContent ?? '').length / 12000) * 100));
  const requirementLoad = countList(requirements.documents) + countList(requirements.technical) + countList(requirements.financial);
  const budgetFit = tender.budget || analysis.estimatedBudget ? clamp(72 + (eligibility - 60) * 0.25 - riskPenalty * 0.2 + stableModifier(tender.id, 5)) : clamp(48 + stableModifier(tender.id, 8));
  const timelineFit = deadlineDays == null ? clamp(58 + stableModifier(tender.id, 6)) : clamp(deadlineDays >= 45 ? 88 : deadlineDays >= 21 ? 74 : deadlineDays >= 10 ? 58 : 35);
  const complexity = clamp(35 + requirementLoad * 5 + risks.length * 9 + (documentDepth > 80 ? 10 : 0));
  const profitability = clamp((budgetFit * 0.55) + (eligibility * 0.25) + ((100 - complexity) * 0.2));
  const winProbability = clamp((eligibility * 0.45) + (timelineFit * 0.2) + ((100 - riskPenalty) * 0.2) + (profitability * 0.15));
  const score = clamp((eligibility * 0.3) + (budgetFit * 0.18) + (timelineFit * 0.16) + (profitability * 0.18) + (winProbability * 0.18) - Math.min(18, riskPenalty * 0.35) + index * 0.35);
  const riskLevel = risks.some(risk => risk.level === 'high') ? 'high' : risks.some(risk => risk.level === 'medium') ? 'medium' : 'low';
  const bestDriver = [
    { label: 'eligibility match', value: eligibility },
    { label: 'timeline fit', value: timelineFit },
    { label: 'commercial clarity', value: budgetFit },
    { label: 'profitability', value: profitability }
  ].sort((a, b) => b.value - a.value)[0].label;

  return {
    tenderId: tender.id,
    title: tender.title,
    score,
    budgetFit,
    winProbability,
    complexity,
    timelineFit,
    profitability,
    eligibilityMatch: clamp(eligibility),
    pros: uniqueList([
      `${Math.round(eligibility)}% eligibility match based on extracted criteria`,
      tender.budget || analysis.estimatedBudget ? `Budget visibility: ${tender.budget ?? analysis.estimatedBudget}` : '',
      timelineFit >= 70 ? deadlineText(deadlineDays, 'Comfortable submission window') : '',
      analysis.requirements?.documents?.[0] ? `Clear document requirement: ${analysis.requirements.documents[0]}` : '',
      analysis.category ? `Category fit: ${analysis.category}` : ''
    ], `Distinct opportunity profile for ${tender.title}`),
    cons: uniqueList([
      risks[0] ? `${capitalize(risks[0].level)} risk: ${risks[0].description}` : '',
      timelineFit < 60 ? deadlineText(deadlineDays, 'Tight or unclear deadline') : '',
      !tender.budget && !analysis.estimatedBudget ? 'Budget is not clearly extractable' : '',
      complexity > 70 ? `High requirement load (${requirementLoad} extracted items)` : '',
      countList(analysis.eligibility?.missing) ? `Missing items: ${analysis.eligibility.missing.slice(0, 2).join(', ')}` : ''
    ], 'Commercial and compliance assumptions need validation'),
    riskLevel,
    bestDriver,
    costBenefitInsight: profitability >= 70
      ? 'Strong benefit profile if the team can satisfy compliance requirements without heavy custom work.'
      : 'Proceed only after validating delivery cost, resourcing, and contract exposure.'
  };
}

function mergeAiNarrative(localComparison: any, aiComparison: any) {
  if (!aiComparison?.comparison || !Array.isArray(aiComparison.comparison)) return localComparison;

  const localIds = new Set(localComparison.comparison.map((row: any) => row.tenderId));
  const mergedRows = localComparison.comparison.map((localRow: any) => {
    const aiRow = aiComparison.comparison.find((row: any) => row.tenderId === localRow.tenderId);
    if (!aiRow) return localRow;
    return {
      ...localRow,
      pros: hasSpecificList(aiRow.pros) ? uniqueList(aiRow.pros, localRow.pros[0]) : localRow.pros,
      cons: hasSpecificList(aiRow.cons) ? uniqueList(aiRow.cons, localRow.cons[0]) : localRow.cons,
      costBenefitInsight: aiRow.costBenefitInsight && String(aiRow.costBenefitInsight).length > 20 ? aiRow.costBenefitInsight : localRow.costBenefitInsight
    };
  });

  const winner = [...mergedRows].sort((a, b) => b.score - a.score)[0];
  return {
    recommendation: aiComparison.recommendation || localComparison.recommendation,
    winnerTenderId: localIds.has(aiComparison.winnerTenderId) ? aiComparison.winnerTenderId : winner.tenderId,
    winnerReason: aiComparison.winnerReason || localComparison.winnerReason,
    comparison: mergedRows,
    summary: aiComparison.summary || localComparison.summary
  };
}

function normalizeRisks(value: unknown): { level: string; description: string }[] {
  if (!Array.isArray(value)) return [];
  return value.map((risk: any) => ({
    level: ['high', 'medium', 'low'].includes(String(risk?.level).toLowerCase()) ? String(risk.level).toLowerCase() : 'medium',
    description: String(risk?.description ?? risk?.clause ?? 'Risk requires review')
  }));
}

function countList(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function stableModifier(id: string, range: number) {
  const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (seed % (range * 2 + 1)) - range;
}

function deadlineText(days: number | null, fallback: string) {
  if (days == null) return fallback;
  if (days < 0) return 'Deadline appears to have passed';
  return `${days} day submission window`;
}

function uniqueList(values: string[], fallback: string) {
  const cleaned = values.map(value => String(value).trim()).filter(Boolean);
  const unique = [...new Set(cleaned)];
  return unique.length ? unique.slice(0, 4) : [fallback];
}

function hasSpecificList(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const normalized = value.map(item => String(item).toLowerCase()).join(' ');
  return !['strong fit', 'review terms', 'list', 'pros', 'cons'].some(generic => normalized === generic);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
