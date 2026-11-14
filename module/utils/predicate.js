/**
 * @module predicate
 * @description Predicates for the rule engine: when a rule applies, tested against a set of roll-option strings
 * such as "stance:defenseStance", "condition:prone", "ring:fire:3", or "target:unmounted" (roadmap/AUTOMATION.md
 * §1).
 *
 * A predicate is an array of terms, all of which must hold. A term is:
 * - a string: the option is present;
 * - `{ not: term }`: the term does not hold;
 * - `{ or: [terms] }`: at least one holds;
 * - `{ and: [terms] }`: all hold;
 * - `{ gte | gt | lte | lt | eq: [prefix, number] }`: an option `prefix:N` is present and N compares so, as in
 *   `{ gte: ["ring:fire", 3] }` against "ring:fire:3".
 */

const COMPARISONS = {
  gte: (a, b) => a >= b,
  gt: (a, b) => a > b,
  lte: (a, b) => a <= b,
  lt: (a, b) => a < b,
  eq: (a, b) => a === b
};

/**
 * Whether one term holds for the options.
 * @param {string|object} term
 * @param {Set<string>} options
 * @returns {boolean}
 */
function testTerm(term, options) {
  if (typeof term === "string") {
    return options.has(term);
  }
  if (!term || typeof term !== "object") {
    return false;
  }
  if ("not" in term) {
    return !testTerm(term.not, options);
  }
  if ("or" in term) {
    return Array.isArray(term.or) && term.or.some(t => testTerm(t, options));
  }
  if ("and" in term) {
    return Array.isArray(term.and) && term.and.every(t => testTerm(t, options));
  }
  for (const [operator, compare] of Object.entries(COMPARISONS)) {
    if (operator in term) {
      const [prefix, value] = term[operator] ?? [];
      return [...options].some(option => {
        if (!option.startsWith(`${prefix}:`)) {
          return false;
        }
        const number = Number(option.slice(prefix.length + 1));
        return Number.isFinite(number) && compare(number, value);
      });
    }
  }
  return false;
}

/**
 * Whether every term of a predicate holds for the options. An empty predicate always holds.
 * @param {Array<string|object>} predicate
 * @param {Set<string>} options
 * @returns {boolean}
 *
 * @example
 * testPredicate(["stance:defenseStance"], new Set(["stance:defenseStance"])); // true
 * testPredicate([{ not: "target:mounted" }], new Set()); // true
 * testPredicate([{ gte: ["ring:fire", 3] }], new Set(["ring:fire:2"])); // false
 */
export function testPredicate(predicate, options) {
  return (predicate ?? []).every(term => testTerm(term, options));
}
