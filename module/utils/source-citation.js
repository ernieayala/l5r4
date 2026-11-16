/**
 * @module utils/source-citation
 * @description The "Core Rulebook p.N" citation of an item's or creature's `system.source`, as a phrase: a
 * localization key and its data, which the caller localizes (module/utils/localization.js, formatPhrase).
 */

import { SOURCE_BOOKS } from "../config/sources.js";

/**
 * The citation of `system.source`: the book's name and the page number. Null when the item cites no book.
 * @param {{book?: string, page?: number}} source
 * @returns {{key: string, data: object}|null}
 */
export function buildSourceCitation(source) {
  const book = SOURCE_BOOKS[source?.book];
  if (!book || !(source.page > 0)) {
    return null;
  }
  return {
    key: "l5r4.ui.ruleSummary.citation",
    data: { book: { key: book, data: {} }, page: source.page }
  };
}
