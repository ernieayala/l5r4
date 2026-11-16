/**
 * @module setup/migrations/actors/unlinked-tokens
 * @description Gives unlinked tokens' own items and effects the migrations world actors get.
 */
import { SYS_ID } from "../../../config/constants.js";
import { buildStatusEffectUpdate } from "../../../utils/status-data.js";
import { migrateEmbeddedItems } from "./embedded-items.js";

/**
 * An unlinked token keeps its own items and effects in its actor delta, apart from the world actor, so the
 * world-actor migrations never reach them. Only what the delta holds is migrated: updating an item or effect the
 * token inherits from its actor would copy it into the delta. Running again changes nothing.
 *
 * @param {TokenDocument[]} tokens - Tokens to scan; linked ones are skipped
 * @param {string} label - Migration context label for console logging
 * @returns {Promise<void>}
 */
export async function migrateUnlinkedTokens(tokens, label) {
  for (const token of tokens) {
    const actor = token.actorLink ? null : token.actor;
    if (!actor || !token.delta) {
      continue;
    }
    try {
      const items = actor.items.filter(item => token.delta.items.has(item.id));
      await migrateEmbeddedItems(items, `${label}:${token.uuid}`);
      const updates = token.delta.effects
        .map(effect => buildStatusEffectUpdate(effect._source))
        .filter(Boolean);
      if (updates.length > 0) {
        await actor.updateEmbeddedDocuments("ActiveEffect", updates, { render: false });
      }
    } catch (err) {
      console.warn(`${SYS_ID}`, "Failed to migrate an unlinked token", {
        label,
        token: token.uuid,
        err
      });
    }
  }
}
