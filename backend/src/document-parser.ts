import { extractTextFromPDF } from './pdf-parser';

export type SupportedDocumentType = 'pdf' | 'docx' | 'txt';

export function detectDocumentType(fileName: string, mimeType = ''): SupportedDocumentType | null {
  const lower = fileName.toLowerCase();
  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || lower.endsWith('.docx')) return 'docx';
  if (mimeType === 'text/plain' || lower.endsWith('.txt')) return 'txt';
  return null;
}

export async function extractTextFromDocument(buffer: Buffer, fileName: string, mimeType = '') {
  const type = detectDocumentType(fileName, mimeType);
  if (!type) throw new Error('Unsupported file type. Upload PDF, DOCX, or TXT.');

  if (type === 'pdf') {
    return { type, text: await extractTextFromPDF(buffer) };
  }

  if (type === 'docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) throw new Error('No readable text found in DOCX.');
    return { type, text };
  }

  const text = buffer.toString('utf8').trim();
  if (!text) throw new Error('TXT file is empty.');
  return { type, text };
}
