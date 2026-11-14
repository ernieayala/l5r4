/**
 * @module ledger
 * @description The size of a change to Honor, Glory, Status, or Taint after the actor's Ledger rules
 * (roadmap/STAGE-11; pp.90-95, 274). Each track counts points, ten to a rank.
 */

import { resolveValue } from "./rule-values.js";

/**
 * @typedef {object} LedgerRuleOutput
 * @property {string} track       honor, glory, status, or taint
 * @property {string} direction   gain or loss
 * @property {number|string} value  The new size, a formula over `@points`
 * @property {string} source
 */

/**
 * Size a change with the Ledger rules for its track and direction, applied in order: each sees the size the rules
 * before it left as `@points`. A size below 0 counts as 0. A rule whose formula fails is skipped and reported.
 *
 * @param {object} spec
 * @param {string} spec.track
 * @param {number} spec.points         The change asked for: positive gains, negative loses
 * @param {LedgerRuleOutput[]} spec.rules
 * @param {object} [spec.rollData={}]  The actor's roll data, for formulas
 * @returns {{points: number, errors: Array<{source: string, message: string}>}}
 *
 * @example
 * ledgerChange({ track: "honor", points: -4, rules: [
 *   { track: "honor", direction: "loss", value: "@points * 2", source: "Sworn" }
 * ] }).points; // -8
 */
export function ledgerChange({ track, points, rules, rollData = {} }) {
  const errors = [];
  if (!points) {
    return { points: 0, errors };
  }
  const direction = points > 0 ? "gain" : "loss";
  let size = Math.abs(points);
  for (const rule of rules.filter(r => r.track === track && r.direction === direction)) {
    try {
      size = resolveValue(rule.value, { ...rollData, points: size });
    } catch (err) {
      errors.push({ source: rule.source, message: err.message });
    }
  }
  size = Math.max(0, size);
  return { points: direction === "gain" ? size : -size, errors };
}
