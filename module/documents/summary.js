/**
 * @module documents/summary
 * @description The localized rule lines and book citation of an item's or creature's `system` (roadmap/STAGE-15),
 * for its sheet, its chat card, and the compendium browser.
 */

import { formatPhrase } from "../utils/localization.js";
import { buildRulesSummary, buildSourceCitation } from "../utils/rule-summary.js";

/**
 * What a document's rules do, one line each, and the book and page it cites.
 * @param {{rules?: object[], source?: {book: string, page: number}}} system
 * @returns {{lines: string[], citation: string|null}}
 */
export function summaryOf(system) {
  const citation = buildSourceCitation(system?.source);
  return {
    lines: buildRulesSummary(system?.rules, { itemName: itemNameOf }).map(formatPhrase),
    citation: citation ? formatPhrase(citation) : null
  };
}

/**
 * The name of the item a GrantItem rule's uuid names, or the uuid when it is not loaded.
 * @param {string} uuid
 * @returns {string}
 */
function itemNameOf(uuid) {
  return fromUuidSync(uuid, { strict: false })?.name ?? uuid;
}
