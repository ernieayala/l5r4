/**
 * @module config/sources
 * @description The books an item or creature can cite in `system.source` (roadmap/STAGE-15), by id, with the
 * localization key of each book's name.
 */

/**
 * Book id to the localization key of its name.
 * @type {Readonly<Record<string, string>>}
 */
export const SOURCE_BOOKS = Object.freeze({
  core: "l5r4.ui.sources.core"
});
