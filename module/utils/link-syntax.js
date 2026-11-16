/**
 * @module utils/link-syntax
 * @description The text links a journal, item description, or chat message can carry (roadmap/STAGE-14), parsed and
 * checked without touching Foundry:
 *
 * - `@Check[skill=Kenjutsu|trait=agi|tn=20]`, `@Check[trait=ref]`, `@Check[ring=water|tn=15]`: a Skill (named as its
 *   item is), Trait, or Ring roll with an optional TN; a Skill takes a Trait, `void` included, or uses its own
 * - `@Damage[3k2]`, `@Damage[3k2+5]`: a damage roll from a Roll & Keep pool
 * - `@Condition[dazed]`: a status effect, by its id
 * - `@Fear[2]`: a Fear test at that Rank (1-10)
 *
 * Each may end with `{label}`. Trait, Ring, and condition names are config keys, so a link reads the same in every
 * language (STAGE-14 decision 1). A link that does not parse carries the localization key of its reason.
 * game-rules/42_fear.md, p.90
 */

import { TRAIT_KEYS } from "../config/reference-data.js";
import { RING_LABELS } from "../config/localization.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";
import { FEAR_RANKS } from "./fear.js";

const RING_KEYS = Object.freeze(Object.keys(RING_LABELS));
const CONDITION_IDS = Object.freeze(STATUS_EFFECTS.map(status => status.id));
const WHOLE = /^\d+$/;
const POOL = /^(\d+)k(\d+)(?:([+-])(\d+))?$/i;

/** The link forms, for the enricher. */
export const LINK_TYPES = Object.freeze(["Check", "Damage", "Condition", "Fear"]);

/** A link in text: `@Type[params]{label}`. Global, as core's enricher patterns are. */
export const LINK_PATTERN = /@(Check|Damage|Condition|Fear)\[([^\]\n]*)\](?:\{([^}\n]*)\})?/g;

/** The highest TN a link may set. */
export const MAX_LINK_TN = 999;

/** The most dice a Damage link's pool may roll or keep before the Ten Dice Rule. */
export const MAX_LINK_DICE = 30;

/**
 * @typedef {object} LinkSpec
 * @property {boolean} ok
 * @property {string} type     Check, Damage, Condition, or Fear
 * @property {string} label    The `{label}` text, or ""
 * @property {string} [error]  Localization key of the reason it did not parse
 * @property {string} [skill]  Check: the Skill's name as written
 * @property {string} [trait]  Check: a Trait key, or "void"
 * @property {string} [ring]   Check: a Ring key
 * @property {number|null} [tn]  Check: the TN, or null for none
 * @property {{roll: number, keep: number, bonus: number}} [pool]  Damage
 * @property {string} [condition]  Condition: the status id
 * @property {number} [rank]  Fear
 */

/**
 * Parse one link's parts, as LINK_PATTERN captures them. "Check" with "skill=Kenjutsu|trait=agi|tn=20" gives an
 * ok spec with that Skill, Trait, and TN; "Fear" with "11" fails with the fear error key.
 * @param {string} type - Check, Damage, Condition, or Fear
 * @param {string} params - The text between the brackets
 * @param {string} [label] - The text between the braces
 * @returns {LinkSpec}
 */
export function parseLink(type, params, label = "") {
  const base = { type, label: (label ?? "").trim() };
  let parsed;
  if (type === "Check") {
    const values = keyValues(params);
    parsed = values ? parseCheck(values) : { ok: false, error: "l5r4.ui.links.errors.syntax" };
  } else if (type === "Damage") {
    parsed = parseDamage(params);
  } else if (type === "Condition") {
    parsed = parseCondition(params);
  } else if (type === "Fear") {
    parsed = parseFear(params);
  } else {
    parsed = { ok: false, error: "l5r4.ui.links.errors.syntax" };
  }
  return { ...base, ...parsed };
}

/**
 * A whole number from link text, or null when the text is not one.
 * @param {string} text
 * @returns {number|null}
 */
function whole(text) {
  return WHOLE.test(text) ? Number(text) : null;
}

/**
 * Parse `key=value|key=value`. A key given twice keeps its last value.
 * @param {string} params
 * @returns {Record<string, string>|null}  null when a part has no `=`
 */
function keyValues(params) {
  const out = {};
  for (const part of params.split("|")) {
    const [key, ...rest] = part.split("=");
    if (!rest.length) {
      return null;
    }
    out[key.trim().toLowerCase()] = rest.join("=").trim();
  }
  return out;
}

/**
 * Check a Check link's keys and values.
 * @param {Record<string, string>} values
 * @returns {Omit<LinkSpec, "type"|"label">}
 */
function parseCheck(values) {
  const fail = error => ({ ok: false, error });
  const known = new Set(["skill", "trait", "ring", "tn"]);
  if (Object.keys(values).some(key => !known.has(key))) {
    return fail("l5r4.ui.links.errors.unknownKey");
  }
  const skill = values.skill ?? "";
  const trait = (values.trait ?? "").toLowerCase();
  const ring = (values.ring ?? "").toLowerCase();
  if (trait && ring) {
    return fail("l5r4.ui.links.errors.traitAndRing");
  }
  if (!skill && !trait && !ring) {
    return fail("l5r4.ui.links.errors.nothingToRoll");
  }
  if (skill && ring) {
    return fail("l5r4.ui.links.errors.skillWithRing");
  }
  // A Skill may be rolled with the Void Ring in place of a Trait (#7)
  if (trait && !TRAIT_KEYS.includes(trait) && !(skill && trait === "void")) {
    return fail("l5r4.ui.links.errors.trait");
  }
  if (ring && !RING_KEYS.includes(ring)) {
    return fail("l5r4.ui.links.errors.ring");
  }
  let tn = null;
  if (values.tn !== undefined) {
    tn = whole(values.tn);
    if (tn === null || tn < 1 || tn > MAX_LINK_TN) {
      return fail("l5r4.ui.links.errors.tn");
    }
  }
  return { ok: true, skill, trait, ring, tn };
}

/**
 * Check a Damage link's Roll & Keep pool.
 * @param {string} params
 * @returns {Omit<LinkSpec, "type"|"label">}
 */
function parseDamage(params) {
  const match = POOL.exec(params.trim());
  const roll = match ? Number(match[1]) : 0;
  const keep = match ? Number(match[2]) : 0;
  if (!match || roll < 1 || keep < 1 || roll > MAX_LINK_DICE || keep > MAX_LINK_DICE) {
    return { ok: false, error: "l5r4.ui.links.errors.pool" };
  }
  const bonus = match[3] ? Number(`${match[3]}${match[4]}`) : 0;
  return { ok: true, pool: { roll, keep, bonus } };
}

/**
 * Check a Condition link's status id.
 * @param {string} params
 * @returns {Omit<LinkSpec, "type"|"label">}
 */
function parseCondition(params) {
  const condition = params.trim();
  return CONDITION_IDS.includes(condition)
    ? { ok: true, condition }
    : { ok: false, error: "l5r4.ui.links.errors.condition" };
}

/**
 * Check a Fear link's Rank.
 * @param {string} params
 * @returns {Omit<LinkSpec, "type"|"label">}
 */
function parseFear(params) {
  const rank = whole(params.trim());
  return rank !== null && rank >= FEAR_RANKS.min && rank <= FEAR_RANKS.max
    ? { ok: true, rank }
    : { ok: false, error: "l5r4.ui.links.errors.fear" };
}
