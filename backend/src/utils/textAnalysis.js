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

export const analyzeRuleHeuristic = (text, rule) => {
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
