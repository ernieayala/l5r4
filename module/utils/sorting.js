/**
 * @module utils/sorting
 * @description Multi-column sorting for actor sheet lists: the primary column the user picked (its preference is
 * kept by module/services/sort-preferences.js), then every other column as a tiebreaker.
 */

/**
 * Sorts list using multi-column sort with user preference.
 *
 * Primary column (from pref) uses specified direction (asc/desc).
 * Secondary columns (all others) use ascending for tiebreaking.
 * Supports both string (locale-aware) and numeric comparison. Kenjutsu 3 and Athletics 2 sorted by rank,
 * descending, keep Kenjutsu first.
 * @param {Array} list - Array of items to sort
 * @param {Record<string, Function>} columns - Map of column key to extractor function
 * @param {object} options
 * @param {{key: string, dir: string}} options.pref - Sort preference: the primary column key and the direction,
 *   "asc" or "desc"
 * @param {string} [options.locale] - Locale for string comparison, the user's language
 * @returns {Array} Sorted array (mutates original)
 */
export function applySortPref(list, columns, { pref, locale }) {
  const primary = pref.key;
  const dirMul = pref.dir === "desc" ? -1 : 1;
  // Build precedence: primary first, then all other columns (deduplicated)
  const precedence = [primary, ...Object.keys(columns)].filter((v, i, a) => a.indexOf(v) === i);
  // String comparator: locale-aware
  const getStringOrder = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), locale);
  // Numeric comparator: handles null/undefined as 0
  const getNumberOrder = (a, b) => Math.sign(Number(a ?? 0) - Number(b ?? 0));
  return list.sort((a, b) => {
    for (const k of precedence) {
      const Av = columns[k]?.(a);
      const Bv = columns[k]?.(b);
      // Select comparator based on type of extracted values
      const r =
        typeof Av === "number" || typeof Bv === "number"
          ? getNumberOrder(Av, Bv)
          : getStringOrder(Av, Bv);
      if (r !== 0) {
        // Apply direction multiplier only to primary column
        return k === primary ? r * dirMul : r;
      }
    }
    return 0;
  });
}
