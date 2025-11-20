import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, GEMINI_MODEL, MAX_CONTEXT_CHARS } from '../config/env.js';
import { analyzeRuleHeuristic } from '../utils/textAnalysis.js';

const geminiClient = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const buildPrompt = (rule, documentText) =>
  `You are an AI compliance analyst. Analyze the provided document text and evaluate the rule.
Document text:
"""
${documentText}
"""

Rule: "${rule}"

Respond strictly as a JSON object with fields:
rule (string), status ("pass" or "fail"), evidence (short quote), reasoning (short sentence), confidence (0-100 integer).`;

const extractJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('LLM response lacked JSON payload');
  }
  return JSON.parse(match[0]);
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

export const hasGeminiClient = () => Boolean(geminiClient);

export const analyzeWithGemini = async (rule, text) => {
  if (!geminiClient) {
    return analyzeRuleHeuristic(text, rule);
  }

  const model = geminiClient.getGenerativeModel({ model: GEMINI_MODEL });
  const prompt = buildPrompt(rule, text.slice(0, MAX_CONTEXT_CHARS));
  const response = await model.generateContent(prompt);
  const raw = response.response.text();
  const parsed = extractJSON(raw);
  return formatGeminiResult(rule, parsed);
};
