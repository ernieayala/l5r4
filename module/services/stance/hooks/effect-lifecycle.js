/**
 * Active Effect Lifecycle Hooks for L5R4 Stance Management
 *
 * Manages the lifecycle of stance-related Active Effects on Actor documents.
 * Enforces L5R4 core rule that only one combat stance can be active at a time
 * and handles automated behaviors like Full Defense roll triggers and stance
 * flag cleanup.
 *
 * Key Responsibilities:
 * - **Stance Conflict Resolution**: Automatically removes conflicting stances when a new stance is applied
 * - **Effect Template Hydration**: Applies default stance data to effects created without proper initialization
 * - **Full Defense Roll Automation**: Triggers Defense/Reflexes roll when Full Defense stance is activated
 * - **Flag Cleanup**: Clears persisted stance data when effects are disabled or deleted
 * - **Display Refresh**: Updates actor sheet to reflect stance changes
 *
 * L5R4 Game Rules Context:
 * Combat stances are mutually exclusive per core rules. Characters may only adopt one
 * stance at a time (Attack, Full Attack, Defense, Full Defense, or Center). When a
 * character changes stance, the previous stance must be removed. Full Defense stance
 * requires an immediate Defense/Reflexes roll to calculate the Armor TN bonus.
 *
 * Foundry VTT Integration:
 * - Uses ActiveEffect document hooks (preCreate, create, update, delete) per Foundry v13 lifecycle
 * - Leverages queueMicrotask() to defer async operations and prevent hook race conditions
 * - Queries Actor.effects collection and manages embedded documents via deleteEmbeddedDocuments
 * - Calls Actor.prepareData() to trigger recalculation of derived stats after stance changes
 *
 * @module services/stance/hooks/effect-lifecycle
 * @requires Foundry VTT v13+
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.documents.BaseActiveEffect.html|ActiveEffect API}
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#_preCreate|Document Hooks}
 */

import { getEffectStatusIds, STANCE_IDS } from "../core/helpers.js";
import { triggerFullDefenseRoll } from "../rolls/full-defense-roll.js";
import { clearStanceFlags } from "../core/automation.js";
import { getStanceEffectCreator } from "../core/effect-templates.js";

/**
 * Removes all active stances from an actor except the specified stance.
 *
 * Enforces L5R4's mutually exclusive stance rule by identifying and deleting
 * any existing stance effects that conflict with the newly applied stance.
 * Disabled effects are ignored since they don't contribute to active stance state.
 *
 * The deletion is queued via queueMicrotask() to avoid hook reentrancy issues.
 * This ensures the current hook completes before triggering delete hooks on the
 * conflicting effects, preventing race conditions in Foundry's hook system.
 *
 * Game Rules Context:
 * Per L5R4 core rules, characters may only adopt one stance at a time. When changing
 * stances during combat (Stage 2 of combat round), the previous stance is replaced.
 * This function automates that replacement by removing old stance effects.
 *
 * @param {Actor} actor - The actor whose conflicting stances should be removed
 * @param {string} currentStanceId - The stance ID that should remain (e.g., "fullAttackStance")
 * @param {string} excludeEffectId - The effect ID to exclude from removal (the newly created effect)
 * @returns {void}
 *
 * @private
 */
function removeConflictingStances(actor, currentStanceId, excludeEffectId) {
  const effectsToRemove = [];

  for (const existingEffect of actor.effects) {
    // Skip the newly created effect and any disabled effects
    if (existingEffect.id === excludeEffectId || existingEffect.disabled) {
      continue;
    }

    const existingStances = getEffectStatusIds(existingEffect);
    const hasOtherStance = existingStances.some(id => STANCE_IDS.has(id) && id !== currentStanceId);

    if (hasOtherStance) {
      effectsToRemove.push(existingEffect.id);
    }
  }

  if (effectsToRemove.length > 0) {
    // Defer deletion to avoid hook reentrancy issues
    queueMicrotask(async () => {
      await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
    });
  }
}

/**
 * Triggers the Full Defense roll if the effect contains the Full Defense stance.
 *
 * Full Defense stance requires a Defense/Reflexes roll to be made immediately upon
 * activation. The roll result determines the Armor TN bonus per L5R4 core rules:
 * "A character in Full Defense Stance makes a Defense/Reflexes roll and adds half
 * the total (rounding up) to Armor TN until their following Turn."
 *
 * The roll is deferred via queueMicrotask() to ensure the effect is fully created
 * and applied to the actor before the roll dialog appears to the user.
 *
 * @param {string[]} effectStances - Array of stance IDs from the effect's status IDs
 * @param {Actor} actor - The actor adopting the Full Defense stance
 * @returns {void}
 *
 * @private
 */
function triggerFullDefenseIfNeeded(effectStances, actor) {
  if (effectStances.includes("fullDefenseStance")) {
    queueMicrotask(() => triggerFullDefenseRoll(actor, actor.system));
  }
}

/**
 * Refreshes the actor's derived data.
 *
 * Calls Actor.prepareData() to recalculate all derived stats (including stance-based
 * Armor TN modifiers, attack bonuses, etc.). Foundry's reactive rendering system
 * automatically updates the UI when actor properties change.
 *
 * Foundry Pattern:
 * prepareData() triggers the full data preparation pipeline (prepareBaseData,
 * prepareDerivedData, prepareEmbeddedDocuments) which recalculates all derived
 * actor statistics.
 *
 * @param {Actor} actor - The actor whose data should be refreshed
 * @returns {void}
 *
 * @private
 */
function refreshActorDisplay(actor) {
  actor.prepareData();
}

/**
 * Clears persisted flag data for all stances in the given effect.
 *
 * Some stances (particularly Full Defense) store roll results or state data in
 * actor flags. When these stances are removed or disabled, the associated flags
 * must be cleared to prevent stale data from affecting future calculations.
 *
 * Delegates to clearStanceFlags() which handles the actual flag removal logic
 * for each stance type.
 *
 * @param {Actor} actor - The actor whose stance flags should be cleared
 * @param {string[]} effectStances - Array of stance IDs to clear flags for
 * @returns {void}
 *
 * @private
 */
function clearStanceFlagsFromEffect(actor, effectStances) {
  for (const stanceId of effectStances) {
    if (STANCE_IDS.has(stanceId)) {
      clearStanceFlags(actor, stanceId);
    }
  }
}

/**
 * Foundry hook handler for ActiveEffect preCreate event.
 *
 * Executes before a new Active Effect is created on an Actor. This hook handles:
 * 1. **Effect Template Hydration**: Applies default stance data if effect lacks proper initialization
 * 2. **Conflict Resolution**: Removes existing stances to enforce mutual exclusivity
 *
 * Template Hydration:
 * When stance effects are created programmatically (e.g., via token status icons),
 * they may lack proper name, icon, and flag data. This hook detects such cases and
 * applies the appropriate stance template to ensure consistent effect data.
 *
 * Conflict Resolution:
 * Queues removal of conflicting stances before the new effect is fully created,
 * ensuring L5R4's rule that only one stance can be active at a time.
 *
 * Foundry Lifecycle:
 * preCreate hooks fire before the document is saved to the database. Changes made
 * via effect.updateSource() modify the creation data directly, avoiding unnecessary
 * update operations. The hook runs synchronously, so conflict removal is deferred
 * via queueMicrotask() inside removeConflictingStances().
 *
 * @param {ActiveEffect} effect - The Active Effect being created
 * @param {object} data - The initial data for the effect
 * @param {object} options - Additional options for the creation operation
 * @param {string} userId - ID of the user who initiated the creation
 * @returns {void}
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#_preCreate|Foundry preCreate Hook}
 */
export function onPreCreateActiveEffect(effect, _data, _options, _userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  const effectStances = getEffectStatusIds(effect);
  const stanceId = effectStances.find(id => STANCE_IDS.has(id));

  if (stanceId) {
    const hasProperData = effect.name && effect.name.trim().length > 0;

    // Hydrate effect with template data if it lacks proper initialization
    if (!hasProperData) {
      const creator = getStanceEffectCreator(stanceId);
      if (creator) {
        const templateData = creator(actor);

        effect.updateSource({
          name: templateData.name,
          icon: templateData.icon,
          flags: templateData.flags || {},
          changes: templateData.changes || []
        });
      }
    }

    // Remove conflicting stances to enforce mutual exclusivity
    removeConflictingStances(actor, stanceId, effect.id);
  }
}

/**
 * Foundry hook handler for ActiveEffect create event.
 *
 * Executes after a new Active Effect has been created on an Actor. This hook handles:
 * 1. **Full Defense Roll Trigger**: Initiates the required Defense/Reflexes roll
 * 2. **Display Refresh**: Updates actor sheet to reflect new stance bonuses/penalties
 *
 * Full Defense Roll:
 * Per L5R4 core rules, Full Defense stance requires an immediate Defense/Reflexes
 * roll upon activation. The roll result determines the Armor TN bonus (half of total,
 * rounded up). The roll is deferred via queueMicrotask() to ensure the effect is
 * fully applied before presenting the roll dialog.
 *
 * Display Refresh:
 * Stance changes modify derived stats (Armor TN, attack bonuses, available actions).
 * prepareData() recalculates these values, and sheet.render() updates the UI.
 *
 * Foundry Lifecycle:
 * create hooks fire after the document is saved to the database. The effect is fully
 * initialized and can be safely referenced in calculations at this point.
 *
 * @param {ActiveEffect} effect - The newly created Active Effect
 * @param {object} options - Additional options passed to the creation operation
 * @param {string} userId - ID of the user who initiated the creation
 * @returns {void}
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#_onCreate|Foundry onCreate Hook}
 */
export function onCreateActiveEffect(effect, _options, _userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  const effectStances = getEffectStatusIds(effect);
  const hasStance = effectStances.some(id => STANCE_IDS.has(id));

  if (hasStance) {
    triggerFullDefenseIfNeeded(effectStances, actor);
    refreshActorDisplay(actor);
  }
}

/**
 * Foundry hook handler for ActiveEffect update event.
 *
 * Executes when an Active Effect is updated. This hook specifically responds to
 * changes in the effect's disabled state, treating enable/disable as stance
 * activation/deactivation events.
 *
 * Disabled State Handling:
 * - **Disabling (changes.disabled = true)**: Clears stance flags (e.g., Full Defense roll results)
 *   to prevent stale data from affecting future calculations
 * - **Enabling (changes.disabled = false)**: Re-applies stance logic including conflict resolution
 *   and Full Defense roll triggering, treating re-enablement as a fresh activation
 *
 * This approach allows stance effects to be temporarily disabled (e.g., via Foundry's
 * effect management UI) without losing the effect data, then cleanly re-enabled.
 *
 * Foundry Lifecycle:
 * update hooks fire after the document changes are saved. The `changes` parameter
 * contains only the modified fields, not the complete document state. Early return
 * if disabled state wasn't modified optimizes performance.
 *
 * @param {ActiveEffect} effect - The Active Effect being updated
 * @param {object} changes - Object containing only the changed fields
 * @param {object} options - Additional options passed to the update operation
 * @param {string} userId - ID of the user who initiated the update
 * @returns {void}
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#_onUpdate|Foundry onUpdate Hook}
 */
export function onUpdateActiveEffect(effect, changes, _options, _userId) {
  // Early return: Only handle disabled state changes
  if (changes?.disabled === undefined) {
    return;
  }

  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  const effectStances = getEffectStatusIds(effect);
  const hasStance = effectStances.some(id => STANCE_IDS.has(id));

  if (hasStance) {
    // Handle disabling: Clear persisted stance data
    if (changes.disabled === true) {
      clearStanceFlagsFromEffect(actor, effectStances);
    } else if (changes.disabled === false) {
      // Handle enabling: Re-apply stance activation logic
      const stanceId = effectStances.find(id => STANCE_IDS.has(id));
      removeConflictingStances(actor, stanceId, effect.id);
      triggerFullDefenseIfNeeded(effectStances, actor);
    }

    // Recalculate derived stats and refresh display
    refreshActorDisplay(actor);
  }
}

/**
 * Foundry hook handler for ActiveEffect delete event.
 *
 * Executes when an Active Effect is deleted from an Actor. This hook ensures clean
 * removal of stance-related data by clearing persisted flags and updating the display.
 *
 * Cleanup Operations:
 * 1. **Flag Cleanup**: Removes persisted stance data (e.g., Full Defense roll results)
 *    from actor flags to prevent orphaned data
 * 2. **Display Refresh**: Recalculates derived stats and updates sheet UI if the
 *    deleted effect was a stance
 *
 * The cleanup always runs for any effect with stance status IDs, regardless of whether
 * the effect was enabled or disabled at deletion time. This ensures thorough cleanup
 * even if an effect was disabled before deletion.
 *
 * Foundry Lifecycle:
 * delete hooks fire after the document has been removed from the database. The effect
 * object is still accessible for reading data, but cannot be modified. Parent actor
 * reference remains valid for flag operations.
 *
 * @param {ActiveEffect} effect - The deleted Active Effect
 * @param {object} options - Additional options passed to the deletion operation
 * @param {string} userId - ID of the user who initiated the deletion
 * @returns {void}
 *
 * @see {@link https://foundryvtt.com/api/v13/classes/foundry.abstract.Document.html#_onDelete|Foundry onDelete Hook}
 */
export function onDeleteActiveEffect(effect, _options, _userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") {
    return;
  }

  const effectStances = getEffectStatusIds(effect);
  // Always clear flags for any effect with stance status IDs
  clearStanceFlagsFromEffect(actor, effectStances);

  // Refresh display if the deleted effect was a stance
  if (effectStances.some(id => STANCE_IDS.has(id))) {
    refreshActorDisplay(actor);
  }
}
