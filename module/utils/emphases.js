/**
 * @module utils/emphases
 * @description The Emphases a Skill holds and the Emphasis manager's list. A form that writes a Skill's Emphases
 * offers every one the Skill already holds, so saving it never drops one the form did not list (#187): an Emphasis
 * from a pack outside the official list, one a School grant trained, or a custom one renamed in the world list.
 * game-rules/58_skills_overview.md, p.133
 */

/**
 * Every Emphasis a Skill holds: its available ones, then each trained one not among them, once each.
 * @param {{availableEmphases: string[], trainedEmphases: string[]}} system - A Skill's system data
 * @returns {string[]}
 */
export function getSkillEmphases({ availableEmphases, trainedEmphases }) {
  return [...new Set([...availableEmphases, ...trainedEmphases].filter(Boolean))];
}

/**
 * The Emphasis manager's rows: the official Emphases, the world's custom ones, and every one the Skill holds, sorted,
 * each marked available when the Skill lists it so, and custom when the world's list holds it (only those can be
 * renamed or deleted there).
 * @param {object} lists
 * @param {readonly string[]} lists.official - OFFICIAL_EMPHASES
 * @param {string[]} lists.custom - The world's custom Emphases
 * @param {{availableEmphases: string[], trainedEmphases: string[]}} lists.skill - The Skill's system data
 * @returns {{name: string, available: boolean, custom: boolean}[]}
 */
export function buildEmphasisList({ official, custom, skill }) {
  const available = new Set(skill.availableEmphases);
  const names = new Set([...official, ...custom, ...getSkillEmphases(skill)]);
  return [...names].sort().map(name => ({
    name,
    available: available.has(name),
    custom: custom.includes(name)
  }));
}
