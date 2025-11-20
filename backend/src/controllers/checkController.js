import { extractTextAndPages } from '../services/pdfService.js';
import { evaluateRules } from '../services/ruleService.js';

const normalizeRules = (rawRules) => {
  let rules = [];

  if (Array.isArray(rawRules)) {
    rules = rawRules;
  } else if (typeof rawRules === 'string') {
    try {
      const parsed = JSON.parse(rawRules);
      rules = Array.isArray(parsed) ? parsed : [rawRules];
    } catch (error) {
      rules = [rawRules];
    }
  }

  return rules.map((rule) => (typeof rule === 'string' ? rule.trim() : '')).filter(Boolean);
};

export const checkDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required.' });
    }

    const rules = normalizeRules(req.body.rules);
    if (rules.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one rule.' });
    }

    const { text, pages } = await extractTextAndPages(req.file.buffer);
    if (!text.trim()) {
      return res.status(422).json({ error: 'Unable to extract text from the PDF.' });
    }

    const results = await evaluateRules(rules, text);
    return res.json({ pages, results });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return res.status(500).json({ error: 'Failed to process the document.' });
  }
};
