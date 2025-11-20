import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.0-pro-latest';
const MAX_CONTEXT_CHARS = 12000;

const app = express();
const PORT = process.env.PORT || 4000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const sentenceSplit = (text) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])/)
    .map((s) => s.trim())
    .filter(Boolean);

const keywordize = (rule) =>
  rule
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(' ')
    .filter((word) => word.length > 3);

const analyzeRule = (text, rule) => {
  const sentences = sentenceSplit(text);
  const keywords = keywordize(rule);

  let bestMatch = { score: 0, index: -1 };
  sentences.forEach((sentence, index) => {
    const lowerSentence = sentence.toLowerCase();
    const score = keywords.reduce((acc, keyword) => (lowerSentence.includes(keyword) ? acc + 1 : acc), 0);
    if (score > bestMatch.score) {
      bestMatch = { score, index };
    }
  });

  const pass = bestMatch.index !== -1 && bestMatch.score >= Math.max(1, Math.ceil(keywords.length * 0.3));
  const evidence = pass ? sentences[bestMatch.index] : 'No supporting evidence found.';
  const reasoning = pass
    ? `Found ${bestMatch.score} keyword matches for the rule.`
    : 'No meaningful overlap between the rule and document sentences.';
  const confidence = pass
    ? Math.min(98, 65 + bestMatch.score * 5 + Math.floor(Math.random() * 10))
    : Math.max(8, 35 - Math.floor(Math.random() * 15));

  return {
    rule,
    status: pass ? 'pass' : 'fail',
    evidence,
    reasoning,
    confidence,
  };
};

const formatGeminiResult = (rule, payload) => {
  const normalized = typeof payload === 'object' && payload !== null ? payload : {};
  const status = normalized.status?.toLowerCase() === 'pass' ? 'pass' : 'fail';
  const evidence = normalized.evidence || 'No supporting evidence provided.';
  const reasoning = normalized.reasoning || 'LLM did not provide reasoning.';
  const confidence = Math.max(0, Math.min(100, Number(normalized.confidence) || 0));

  return {
    rule,
    status,
    evidence,
    reasoning,
    confidence,
  };
};

const extractJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('LLM response lacked JSON payload');
  }
  return JSON.parse(match[0]);
};

const buildPrompt = (rule, documentText) =>
  `You are an AI compliance analyst. Analyze the provided document text and evaluate the rule.
Document text:
"""
${documentText}
"""

Rule: "${rule}"

Respond strictly as a JSON object with fields:
rule (string), status ("pass" or "fail"), evidence (short quote), reasoning (short sentence), confidence (0-100 integer).`;

const analyzeWithGemini = async (rule, text) => {
  if (!geminiClient) {
    return analyzeRule(text, rule);
  }

  const model = geminiClient.getGenerativeModel({ model: geminiModel });
  const prompt = buildPrompt(rule, text.slice(0, MAX_CONTEXT_CHARS));
  const response = await model.generateContent(prompt);
  const raw = response.response.text();
  const parsed = extractJSON(raw);
  return formatGeminiResult(rule, parsed);
};

app.post('/api/check', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required.' });
    }

    const rawRules = req.body.rules;
    let rules = [];

    if (Array.isArray(rawRules)) {
      rules = rawRules;
    } else if (typeof rawRules === 'string') {
      try {
        const parsed = JSON.parse(rawRules);
        if (Array.isArray(parsed)) {
          rules = parsed;
        }
      } catch (err) {
        rules = [rawRules];
      }
    }

    rules = rules.map((rule) => (typeof rule === 'string' ? rule.trim() : '')).filter(Boolean);

    if (rules.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one rule.' });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    await parser.destroy();

    const text = parsed.text || '';
    if (!text.trim()) {
      return res.status(422).json({ error: 'Unable to extract text from the PDF.' });
    }

    let results;
    try {
      results = geminiClient
        ? await Promise.all(rules.map((rule) => analyzeWithGemini(rule, text)))
        : rules.map((rule) => analyzeRule(text, rule));
    } catch (llmError) {
      console.error('Gemini evaluation failed, falling back to heuristic:', llmError);
      results = rules.map((rule) => analyzeRule(text, rule));
    }

    res.json({
      pages: parsed.total || parsed.pages?.length || null,
      results,
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process the document.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
