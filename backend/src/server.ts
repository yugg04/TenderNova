import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import { analyzeTender, compareTenders, generateProposal, streamTenderChat } from './ai';
import { detectDocumentType, extractTextFromDocument } from './document-parser';
import { prisma } from './prisma';
import { parseTenderDeadline } from './tender-date';

const MAX_DOCUMENT_BYTES = 200 * 1024 * 1024 * 1024;

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 20 },
  fileFilter: (_req, file, cb) => {
    cb(null, Boolean(detectDocumentType(file.originalname, file.mimetype)));
  }
});

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json({ limit: '2mb' }));

async function currentUser(req: express.Request) {
  const email = String(req.header('x-user-email') || process.env.ADMIN_EMAIL || 'savanmpatel1407@gmail.com').toLowerCase();
  return prisma.user.findUnique({ where: { email } });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'TenderNova API' });
});

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'TenderNova API',
    health: '/health',
    frontend: process.env.FRONTEND_URL ?? 'http://localhost:3000'
  });
});

app.get('/api/tenders', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const page = Number(req.query.page ?? 1);
    const take = Number(req.query.take ?? 20);
    const [items, total] = await Promise.all([
      prisma.tender.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take }),
      prisma.tender.count({ where: { userId: user.id } })
    ]);
    res.json({ items, total, page, take });
  } catch (error) {
    next(error);
  }
});

app.get('/api/tenders/:id', async (req, res, next) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.params.id } });
    if (!tender) return res.status(404).json({ error: 'Not found' });
    res.json(tender);
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload', upload.any(), async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) return res.status(400).json({ error: 'Upload at least one PDF, DOCX, or TXT file.' });

    const items = [];
    const failures = [];

    for (const file of files) {
      try {
        const { text, type } = await extractTextFromDocument(file.buffer, file.originalname, file.mimetype);
        const tender = await prisma.tender.create({
          data: {
            userId: user.id,
            title: file.originalname.replace(/\.(pdf|docx|txt)$/i, ''),
            fileName: file.originalname,
            fileContent: text,
            sourceType: type,
            status: 'ai_analyzing'
          }
        });

        const job = await prisma.processingJob.create({
          data: { userId: user.id, tenderId: tender.id, type: 'tender_analysis', status: 'ai_analyzing', progress: 70 }
        });

        void analyzeTender(text).then(async analysis => {
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
          await prisma.tender.update({ where: { id: tender.id }, data: { status: 'analysis_failed', errorMessage: message } }).catch(console.error);
          await prisma.processingJob.update({ where: { id: job.id }, data: { status: 'failed', error: message, progress: 100 } }).catch(console.error);
        });

        items.push({ id: tender.id, fileName: file.originalname, status: 'ai_analyzing' });
      } catch (error) {
        failures.push({ fileName: file.originalname, error: error instanceof Error ? error.message : 'Extraction failed' });
      }
    }

    if (items.length === 0) return res.status(400).json({ error: failures.map(f => `${f.fileName}: ${f.error}`).join(' | ') });
    res.status(202).json({ id: items[0].id, status: items.length === 1 ? items[0].status : 'batch_uploaded', items, failures });
  } catch (error) {
    next(error);
  }
});

app.post('/api/analyze', async (req, res, next) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.body.tenderId } });
    if (!tender) return res.status(404).json({ error: 'Not found' });
    const analysis = await analyzeTender(tender.fileContent);
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
        title: analysis.title || tender.title
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.get('/api/proposals', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(await prisma.proposal.findMany({ where: { userId: user.id }, include: { tender: true }, orderBy: { createdAt: 'desc' } }));
  } catch (error) {
    next(error);
  }
});

app.post('/api/proposals', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    const tender = await prisma.tender.findFirst({ where: { id: req.body.tenderId, userId: user?.id } });
    if (!user || !tender) return res.status(404).json({ error: 'Not found' });
    let analysis: any = tender.analysis;
    if (!analysis) {
      analysis = await analyzeTender(tender.fileContent);
      await prisma.tender.update({ where: { id: tender.id }, data: { analysis, status: 'completed' } });
    }
    const content = await generateProposal(tender.fileContent, analysis);
    const proposal = await prisma.proposal.create({
      data: { userId: user.id, tenderId: tender.id, title: `${tender.title} Proposal`, content }
    });
    res.status(201).json(proposal);
  } catch (error) {
    next(error);
  }
});

app.put('/api/proposals/:id', async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: { title: req.body.title, content: req.body.content, status: req.body.status }
    });
    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.post('/api/compare', async (req, res, next) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tenders = await prisma.tender.findMany({ where: { id: { in: req.body.tenderIds ?? [] }, userId: user.id } });
    if (tenders.length < 2) return res.status(400).json({ error: 'Select at least two tenders' });
    res.json(await compareTenders(tenders.map(t => ({ id: t.id, title: t.title, summary: t.summary, budget: t.budget, deadline: t.deadline, category: t.category, analysis: t.analysis }))));
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat', async (req, res, next) => {
  try {
    const tender = await prisma.tender.findUnique({ where: { id: req.body.tenderId } });
    if (!tender) return res.status(404).send('Not found');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    const stream = await streamTenderChat(req.body.messages, tender.fileContent);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`TenderNova backend running on http://localhost:${port}`);
});
