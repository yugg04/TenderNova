declare module 'pdf-parse/lib/pdf-parse.js' {
  const pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages?: number; info?: unknown; metadata?: unknown }>;
  export = pdfParse;
}
