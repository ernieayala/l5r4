/**
 * @module services/scrolling-text
 * @description Floating Wound and Void Point numbers (roadmap/STAGE-14): when an actor's Wounds or Void Points
 * change, the change floats over each of its tokens on every client that has the `floatingNumbers` setting on. The
 * client making the update records the values before it in the update's options, which reach every client's
 * `updateActor`; each compares them with the prepared values after. A token this user cannot see shows nothing, as
 * core's own status text does [src: client/documents/active-effect.mjs:1039-1055].
 */

import { SYS_ID } from "../config/constants.js";
import { T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";
import {
  FLOATING_RESOURCES,
  getFloatingChanges,
  formatFloatingText
} from "../utils/floating-text.js";

/** Update option carrying the values before the update. */
const BEFORE_OPTION = `${SYS_ID}FloatingBefore`;

/** Fill colors per resource and direction; the text's sign and name carry the meaning. */
const COLORS = Object.freeze({
  wounds: { up: 0xff6b5a, down: 0x7bd88f },
  void: { up: 0x9ecbff, down: 0xc9b8ff }
});

/** Register the floating numbers' hooks, once during init. */
export function registerScrollingText() {
  Hooks.on("preUpdateActor", onPreUpdateActor);
  Hooks.on("updateActor", onUpdateActor);
}

/**
 * The shown resources' prepared values.
 * @param {Actor} actor
 * @returns {Record<string, number>}
 */
function resourceValuesOf(actor) {
  return Object.fromEntries(
    FLOATING_RESOURCES.map(({ id, path }) => [
      id,
      toInt(foundry.utils.getProperty(actor.system, path))
    ])
  );
}

/**
 * Record the values before an update, on the client that makes it.
 * @param {Actor} actor
 * @param {object} _changes
 * @param {object} options
 */
function onPreUpdateActor(actor, _changes, options) {
  options[BEFORE_OPTION] = resourceValuesOf(actor);
}

/**
 * Float each changed value over the actor's visible tokens.
 * @param {Actor} actor
 * @param {object} _changes
 * @param {object} options
 */
function onUpdateActor(actor, _changes, options) {
  const before = options[BEFORE_OPTION];
  if (!before || !canvas?.ready || !game.settings.get(SYS_ID, "floatingNumbers")) {
    return;
  }
  const changes = getFloatingChanges(before, resourceValuesOf(actor));
  if (!changes.length) {
    return;
  }
  // Under reduced motion the number appears and fades where it is, with no travel (motion.md rule 5)
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (const token of actor.getActiveTokens(true)) {
    if (!token.visible || token.document.isSecret) {
      continue;
    }
    changes.forEach(({ id, delta }, i) => {
      const nameKey = FLOATING_RESOURCES.find(resource => resource.id === id).nameKey;
      canvas.interface.createScrollingText(
        { x: token.center.x, y: token.center.y - i * 0.3 * token.h },
        formatFloatingText(delta, T(nameKey)),
        {
          anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
          direction: CONST.TEXT_ANCHOR_POINTS.TOP,
          distance: reduced ? 0 : 2 * token.h,
          fontSize: 28,
          fill: COLORS[id][delta > 0 ? "up" : "down"],
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: reduced ? 0 : 0.25
        }
      );
    });
  }
}
