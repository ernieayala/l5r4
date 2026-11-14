/**
 * @module floating-text
 * @description The Wounds and Void Points an actor update changed, as the numbers floated over its tokens
 * (roadmap/STAGE-14). The text carries the sign and the resource's name, so its meaning never rests on color.
 */

/** The resources shown, their paths in prepared system data, and their name keys. */
export const FLOATING_RESOURCES = Object.freeze([
  Object.freeze({ id: "wounds", path: "suffered", nameKey: "l5r4.ui.floating.wounds" }),
  Object.freeze({ id: "void", path: "rings.void.value", nameKey: "l5r4.ui.floating.void" })
]);

/**
 * The changed resources between two states.
 * @param {Record<string, number>} before  Values by resource id
 * @param {Record<string, number>} after   Values by resource id
 * @returns {Array<{id: string, delta: number}>}  One entry per resource that changed, in FLOATING_RESOURCES order
 *
 * @example
 * floatingChanges({ wounds: 3, void: 2 }, { wounds: 10, void: 2 }); // [{ id: "wounds", delta: 7 }]
 */
export function floatingChanges(before, after) {
  return FLOATING_RESOURCES.map(({ id }) => ({
    id,
    delta: (after[id] ?? 0) - (before[id] ?? 0)
  })).filter(change => change.delta !== 0);
}

/**
 * The text for one change: its sign, size, and the resource's name.
 * @param {number} delta
 * @param {string} name  The resource's localized name
 * @returns {string}
 *
 * @example
 * floatingText(7, "Wounds"); // "+7 Wounds"
 * floatingText(-1, "Void Points"); // "−1 Void Points"
 */
export function floatingText(delta, name) {
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${name}`;
}
