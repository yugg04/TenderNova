import { getProviderKeys, markKeyFailure, markKeySuccess } from './api-keys';

const MISTRAL_OCR_URL = process.env.MISTRAL_OCR_URL ?? 'https://api.mistral.ai/v1/ocr';
const MISTRAL_OCR_MODEL = process.env.MISTRAL_OCR_MODEL ?? 'mistral-ocr-latest';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const embeddedText = await extractEmbeddedText(buffer);
  if (embeddedText) return embeddedText;

  const ocrText = await extractTextWithMistralOCR(buffer);
  if (ocrText) return ocrText;

  throw new Error('No readable text found in PDF, and OCR returned no text');
}

async function extractEmbeddedText(buffer: Buffer): Promise<string | null> {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  const data = await pdfParse(buffer);
  return data.text?.trim() ? data.text : null;
}

async function extractTextWithMistralOCR(buffer: Buffer): Promise<string | null> {
  if (process.env.MISTRAL_OCR_ENABLED !== 'true') {
    throw new Error('No readable text found in PDF. Set MISTRAL_OCR_ENABLED="true" to send scanned PDFs to Mistral OCR.');
  }

  const keys = await getProviderKeys('mistral');
  if (!keys.length) throw new Error('No readable text found in PDF. Add an active Mistral API key to enable OCR for scanned PDFs.');

  let lastError = '';
  for (const key of keys) {
    const response = await fetch(MISTRAL_OCR_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key.value}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MISTRAL_OCR_MODEL,
        document: {
          type: 'document_url',
          document_url: `data:application/pdf;base64,${buffer.toString('base64')}`
        },
        table_format: 'markdown',
        extract_header: true,
        extract_footer: true,
        include_image_base64: false
      })
    });

    if (response.ok) {
      const result = await response.json();
      const pages = Array.isArray(result.pages) ? result.pages : [];
      const text = pages
        .map((page: any) => [page.header, page.markdown, page.footer].filter(Boolean).join('\n'))
        .filter(Boolean)
        .join('\n\n');

      await markKeySuccess(key.id, Math.ceil(text.length / 4));
      return text.trim() || null;
    }

    const detail = await response.text();
    await markKeyFailure(key.id);
    if (response.status === 401 || response.status === 403) {
      lastError = 'OCR failed: Mistral API key is invalid, missing OCR access, or billing/credits are not enabled.';
    } else if (response.status === 429) {
      lastError = 'OCR failed: Mistral rate limit or quota exceeded.';
    } else {
      lastError = `OCR failed: ${response.status} ${detail}`;
    }

    if (![401, 403, 429, 500, 502, 503, 504].includes(response.status)) break;
  }

  throw new Error(lastError || 'OCR failed for all active Mistral API keys.');
}
