import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export const extractTextAndPages = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();

  return {
    text: parsed.text || '',
    pages: parsed.total || parsed.pages?.length || null,
  };
};
