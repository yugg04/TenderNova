import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeTender, generateProposal } from '@/lib/ai';
import { parseTenderDeadline } from '@/lib/tender-date';
import { estimateTokens, recordApiUsage } from '@/lib/api-usage';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([]);
  return NextResponse.json(await prisma.proposal.findMany({ where: { userId: user.id }, include: { tender: true }, orderBy: { createdAt: 'desc' } }));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const limit = checkRateLimit(`proposal:${session.user.email}`, 12, 60_000);
    if (!limit.ok) return NextResponse.json({ error: 'Too many proposal requests' }, { status: 429 });
    const { tenderId } = await request.json();
    if (!tenderId) return NextResponse.json({ error: 'tenderId is required' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const tender = await prisma.tender.findFirst({
      where: { id: tenderId, userId: user.id },
      include: { analyses: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    if (!tender.fileContent?.trim()) return NextResponse.json({ error: 'Tender has no readable document content' }, { status: 400 });

    let analysis: any = tender.analysis ?? tender.analyses[0]?.result ?? null;
    if (!analysis) {
      await prisma.tender.update({ where: { id: tender.id }, data: { status: 'ai_analyzing', errorMessage: null } });
      analysis = await analyzeTender(tender.fileContent);
      await recordApiUsage(user.id, 'proposal_pre_analysis', { tokens: estimateTokens(tender.fileContent, JSON.stringify(analysis)), success: true });
      const score = Number((analysis as any).eligibility?.score ?? (analysis as any).successProbability ?? 0);
      await prisma.tender.update({
        where: { id: tender.id },
        data: {
          analysis,
          status: 'completed',
          summary: (analysis as any).summary,
          deadline: parseTenderDeadline((analysis as any).deadline),
          budget: (analysis as any).budget,
          category: (analysis as any).category,
          eligibility: (analysis as any).eligibility,
          risks: (analysis as any).risks,
          title: (analysis as any).title || tender.title,
          aiScore: score || null,
          successProbability: Number((analysis as any).successProbability ?? score) || null,
          qualityRating: (analysis as any).qualityRating ?? (score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D')
        }
      });
      await prisma.tenderAnalysis.create({
        data: {
          tenderId: tender.id,
          userId: user.id,
          result: analysis,
          confidence: Number((analysis as any).confidence ?? score) || null,
          explanation: (analysis as any).explainability ?? (analysis as any).summary
        }
      });
    }

    const content = await generateProposal(tender.fileContent, analysis);
    await recordApiUsage(user.id, 'proposal_generation', { tokens: estimateTokens(tender.fileContent, JSON.stringify(analysis), content), success: true });
    const proposal = await prisma.proposal.create({ data: { userId: user.id, tenderId: tender.id, title: `${tender.title} Proposal`, content } });
    return NextResponse.json(proposal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Proposal generation failed';
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (user) await recordApiUsage(user.id, 'proposal_generation', { success: false, error: message });
    }
    console.error(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, title, content, status } = await request.json();
  const proposal = await prisma.proposal.update({ where: { id }, data: { title, content, status } });
  return NextResponse.json(proposal);
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await request.json();
  await prisma.proposal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
