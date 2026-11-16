/**
 * @module utils/floating-text
 * @description The Wounds and Void Points an actor update changed, as the numbers floated over its tokens
 * (roadmap/STAGE-14). The text carries the sign and the resource's name, so its meaning never rests on color.
 */

/** The resources shown, their paths in prepared system data, and their name keys. */
export const FLOATING_RESOURCES = Object.freeze([
  Object.freeze({ id: "wounds", path: "suffered", nameKey: "l5r4.ui.floating.wounds" }),
  Object.freeze({ id: "void", path: "rings.void.value", nameKey: "l5r4.ui.floating.void" })
]);

/**
 * The changed resources between two states: Wounds from 3 to 10 with Void unchanged gives
 * `[{ id: "wounds", delta: 7 }]`.
 * @param {Record<string, number>} before - Values by resource id
 * @param {Record<string, number>} after - Values by resource id
 * @returns {Array<{id: string, delta: number}>}  One entry per resource that changed, in FLOATING_RESOURCES order
 */
export function floatingChanges(before, after) {
  return FLOATING_RESOURCES.map(({ id }) => ({
    id,
    delta: (after[id] ?? 0) - (before[id] ?? 0)
  })).filter(change => change.delta !== 0);
}

/**
 * The text for one change: its sign, size, and the resource's name, such as "+7 Wounds" or "−1 Void Points".
 * @param {number} delta
 * @param {string} name - The resource's localized name
 * @returns {string}
 */
export function floatingText(delta, name) {
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${name}`;
}
