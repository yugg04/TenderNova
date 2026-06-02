import { NextRequest, NextResponse } from 'next/server';
import { detectDocumentType, extractTextFromDocument } from '@/lib/document-parser';
import { analyzeTender } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseTenderDeadline } from '@/lib/tender-date';
import { estimateTokens, recordApiUsage } from '@/lib/api-usage';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_DOCUMENT_BYTES = 200 * 1024 * 1024 * 1024;

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const limit = checkRateLimit(`upload:${session.user.email}`, 10, 60_000);
    if (!limit.ok) return NextResponse.json({ error: 'Too many upload requests' }, { status: 429 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const formData = await request.formData();
    const files = formData.getAll('files').filter((value): value is File => value instanceof File);
    const legacyFile = formData.get('file');
    if (legacyFile instanceof File && files.length === 0) files.push(legacyFile);
    if (files.length === 0) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const items = [];
    const failures = [];

    for (const file of files) {
      const type = detectDocumentType(file.name, file.type);
      if (!type || file.size > MAX_DOCUMENT_BYTES) {
        failures.push({ fileName: file.name, error: 'Invalid file. Upload PDF, DOCX, or TXT.' });
        continue;
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { text } = await extractTextFromDocument(buffer, file.name, file.type);
        const tender = await prisma.tender.create({
          data: {
            userId: user.id,
            title: file.name.replace(/\.(pdf|docx|txt)$/i, ''),
            fileName: file.name,
            fileContent: text,
            sourceType: type,
            status: 'ai_analyzing'
          }
        });

        const job = await prisma.processingJob.create({
          data: { userId: user.id, tenderId: tender.id, type: 'tender_analysis', status: 'ai_analyzing', progress: 70 }
        });

        analyzeTender(text).then(async analysis => {
          await recordApiUsage(user.id, 'upload_analysis', { tokens: estimateTokens(text, JSON.stringify(analysis)), success: true });
          const score = Number(analysis.eligibility?.score ?? analysis.successProbability ?? 0);
          await prisma.tender.update({
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
              successProbability: score || null,
              qualityRating: score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D'
            }
          });
          await prisma.tenderAnalysis.create({ data: { tenderId: tender.id, userId: user.id, result: analysis, confidence: score || null, explanation: analysis.summary } });
          await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'completed', progress: 100 } });
        }).catch(async error => {
          console.error(error);
          const message = error instanceof Error ? error.message : 'AI analysis failed';
          await recordApiUsage(user.id, 'upload_analysis', { tokens: estimateTokens(text), success: false, error: message });
          await prisma.tender.update({ where: { id: tender.id }, data: { status: 'analysis_failed', errorMessage: message } }).catch(console.error);
          await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'failed', error: message, progress: 100 } }).catch(console.error);
        });

        items.push({ id: tender.id, fileName: file.name, status: 'ai_analyzing' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not extract document text';
        failures.push({ fileName: file.name, error: message });
      }
    }

    if (items.length === 0) return NextResponse.json({ error: failures.map(f => `${f.fileName}: ${f.error}`).join(' | ') }, { status: 400 });

    return NextResponse.json({
      id: items[0].id,
      status: items.length === 1 ? items[0].status : 'batch_uploaded',
      items,
      failures,
      warning: failures.length ? `${failures.length} file(s) could not be processed.` : undefined
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
