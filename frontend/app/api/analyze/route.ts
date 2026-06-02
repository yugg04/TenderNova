import { NextRequest, NextResponse } from 'next/server';
import { analyzeTender } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseTenderDeadline } from '@/lib/tender-date';
import { estimateTokens, recordApiUsage } from '@/lib/api-usage';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limit = checkRateLimit(`analyze:${session.user.email}`, 12, 60_000);
  if (!limit.ok) return NextResponse.json({ error: 'Too many analysis requests' }, { status: 429 });
  const { tenderId } = await request.json();
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, userId: user.id } });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  await prisma.tender.update({ where: { id: tender.id }, data: { status: 'ai_analyzing', errorMessage: null } });
  let analysis;
  try {
    analysis = await analyzeTender(tender.fileContent);
    await recordApiUsage(user.id, 'tender_analysis', { tokens: estimateTokens(tender.fileContent, JSON.stringify(analysis)), success: true });
  } catch (error) {
    await recordApiUsage(user.id, 'tender_analysis', { tokens: estimateTokens(tender.fileContent), success: false, error: error instanceof Error ? error.message : 'Analysis failed' });
    throw error;
  }
  const score = Number(analysis.eligibility?.score ?? analysis.successProbability ?? 0);
  const updated = await prisma.tender.update({
    where: { id: tender.id },
    data: {
      analysis,
      status: 'completed',
      summary: analysis.summary,
      deadline: parseTenderDeadline(analysis.deadline),
      budget: analysis.budget,
      category: analysis.category,
      eligibility: analysis.eligibility,
      risks: analysis.risks,
      title: analysis.title || tender.title,
      aiScore: score || null,
      successProbability: Number(analysis.successProbability ?? score) || null,
      qualityRating: analysis.qualityRating ?? (score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D')
    }
  });
  await prisma.tenderAnalysis.create({
    data: {
      tenderId: tender.id,
      userId: user.id,
      result: analysis,
      confidence: Number(analysis.confidence ?? score) || null,
      explanation: analysis.explainability ?? analysis.summary
    }
  });
  return NextResponse.json(updated);
}
