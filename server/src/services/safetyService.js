/**
 * Simple sensitive word filtering and emotional safety detection.
 */

const SENSITIVE_WORDS = [
  '自杀', '死亡', '暴力', '毒品', '血腥', // 示例敏感词
  'suicide', 'kill', 'death', 'blood', 'drugs'
];

/**
 * Filter sensitive words from text.
 * @param {string} text 
 * @returns {string} filtered text
 */
export function filterSensitiveWords(text) {
  if (!text) return text;
  let filtered = text;
  SENSITIVE_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

/**
 * Check if the text contains high-risk emotional content.
 * @param {string} text 
 * @returns {boolean} true if safe, false if risky
 */
export function checkEmotionalSafety(text) {
  if (!text) return true;
  // Very basic check for extreme negative sentiment
  const riskyKeywords = ['想死', '绝望', '活不下去', '自残'];
  return !riskyKeywords.some(keyword => text.includes(keyword));
}
