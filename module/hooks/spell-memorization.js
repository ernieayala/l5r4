/**
 * Hook handler for spell memorization XP tracking
 *
 * Triggers XP recalculation when spell memorization status changes.
 * Per L5R4 rules, memorizing a spell costs XP equal to its mastery level.
 *
 * @module hooks/spell-memorization
 */

import { SYS_ID } from "../config/constants.js";

/**
 * Register spell memorization hooks
 *
 * Listens for spell memorized field changes and triggers XP recalculation.
 */
export function registerSpellMemorizationHooks() {
  Hooks.on("updateItem", async (item, change, _options, _userId) => {
    if (item.type !== "spell") {
      return;
    }
    if (change.system?.memorized === undefined) {
      return;
    }

    const actor = item.actor;
    if (!actor) {
      return;
    }

    await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 0);
  });
}
