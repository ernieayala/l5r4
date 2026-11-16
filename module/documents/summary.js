/**
 * @module documents/summary
 * @description The localized rule lines and book citation of an item's or creature's `system` (roadmap/STAGE-15),
 * for its sheet, its chat card, and the compendium browser.
 */

import { phraseText } from "../utils/localization.js";
import { rulesSummary, sourceCitation } from "../utils/rule-summary.js";

/**
 * What a document's rules do, one line each, and the book and page it cites.
 * @param {{rules?: object[], source?: {book: string, page: number}}} system
 * @returns {{lines: string[], citation: string|null}}
 */
export function summaryText(system) {
  const citation = sourceCitation(system?.source);
  return {
    lines: rulesSummary(system?.rules, { itemName }).map(phraseText),
    citation: citation ? phraseText(citation) : null
  };
}

/**
 * The name of the item a GrantItem rule's uuid names, or the uuid when it is not loaded.
 * @param {string} uuid
 * @returns {string}
 */
function itemName(uuid) {
  return fromUuidSync(uuid, { strict: false })?.name ?? uuid;
}
