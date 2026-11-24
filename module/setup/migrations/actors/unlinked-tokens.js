/**
 * @module setup/migrations/actors/unlinked-tokens
 * @description The items and effects an unlinked token keeps in its own actor delta, which the world-actor
 * migrations never reach.
 */

/**
 * The items and effects an unlinked token's actor delta holds, as documents of its synthetic actor, for the item
 * and effect steps. Only what the delta holds is returned: updating an item or effect the token inherits from its
 * actor would copy it into the delta.
 * @param {TokenDocument} token
 * @returns {{items: Item[], effects: ActiveEffect[]}|null} Null for a linked token or one with no delta
 */
export function getTokenDeltaDocuments(token) {
  const actor = token.actorLink ? null : token.actor;
  if (!actor || !token.delta) {
    return null;
  }
  return {
    items: actor.items.filter(item => token.delta.items.has(item.id)),
    effects: actor.effects.filter(effect => token.delta.effects.has(effect.id))
  };
}
