/**
 * @module utils/predicate
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

const COMPARISONS = Object.freeze({
  gte: (a, b) => a >= b,
  gt: (a, b) => a > b,
  lte: (a, b) => a <= b,
  lt: (a, b) => a < b,
  eq: (a, b) => a === b
});

/**
 * Whether every term of a predicate holds for the options. An empty predicate always holds. A present option
 * holds, `{ not: "target:mounted" }` holds against no options, and `{ gte: ["ring:fire", 3] }` fails against
 * "ring:fire:2".
 * @param {Array<string|object>} predicate
 * @param {Set<string>} options
 * @returns {boolean}
 */
export function testPredicate(predicate, options) {
  return (predicate ?? []).every(term => testTerm(term, options));
}

/**
 * Whether a predicate tests an option starting with one of the prefixes, in any term: "wound:nicked",
 * `{ not: "wound:out" }`, and `{ gte: ["ring:fire", 3] }` all test the prefixes "wound:" or "ring:". A rule's options
 * are prepared in steps, so this tells which step a rule must wait for (#175).
 * @param {Array<string|object>} predicate
 * @param {string[]} prefixes - Option prefixes, each ending in ":"
 * @returns {boolean}
 */
export function hasOptionPrefix(predicate, prefixes) {
  return (predicate ?? [])
    .flatMap(getTermOptions)
    .some(name => prefixes.some(prefix => name.startsWith(prefix)));
}

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
 * The options a term names: the string itself, each name inside `not`, `or`, and `and`, and a comparison's prefix
 * followed by ":".
 * @param {string|object} term
 * @returns {string[]}
 */
function getTermOptions(term) {
  if (typeof term === "string") {
    return [term];
  }
  if (!term || typeof term !== "object") {
    return [];
  }
  return Object.entries(term).flatMap(([operator, value]) =>
    operator in COMPARISONS
      ? [`${value?.[0]}:`]
      : (Array.isArray(value) ? value : [value]).flatMap(getTermOptions)
  );
}
