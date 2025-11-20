import { analyzeRuleHeuristic } from '../utils/textAnalysis.js';
import { analyzeWithGemini, hasGeminiClient } from './geminiService.js';

export const evaluateRules = async (rules, text) => {
  if (hasGeminiClient()) {
    try {
      return await Promise.all(rules.map((rule) => analyzeWithGemini(rule, text)));
    } catch (error) {
      console.error('Gemini evaluation failed, falling back to heuristic:', error);
    }
  }

  return rules.map((rule) => analyzeRuleHeuristic(text, rule));
};
