/**
 * @module hooks/spell-memorization
 * @description Marks a character's XP history for rebuilding when one of its spells is memorized or forgotten,
 * because a memorized spell costs XP equal to its Mastery Level.
 * game-rules/66_magic_and_spell_casting.md, p.164
 */
import { SYS_ID } from "../config/constants.js";

/**
 * Register spell memorization hooks.
 *
 * Listens for spell memorized field changes and triggers XP recalculation.
 */
export function registerSpellMemorizationHooks() {
  Hooks.on("updateItem", async (item, change) => {
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
