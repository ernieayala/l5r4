/**
 * @fileoverview L5R4 Stance Effect Lifecycle Hooks - Active Effect Event Handlers
 * 
 * This module provides Foundry hook handlers for Active Effect lifecycle events
 * related to combat stances. Triggers stance automation when effects are created,
 * updated, or deleted, ensuring actor statistics stay synchronized with active
 * stance effects.
 * 
 * **Core Responsibilities:**
 * - **Effect Creation**: Trigger Full Defense rolls when stance applied
 * - **Effect Updates**: Handle enabling/disabling stance effects
 * - **Effect Deletion**: Clean up stance flags when effects removed
 * - **Actor Synchronization**: Refresh actor data after stance changes
 * 
 * **Hook Integration:**
 * - createActiveEffect: Triggers when new stance effects created
 * - updateActiveEffect: Triggers when stance effects enabled/disabled
 * - deleteActiveEffect: Triggers when stance effects removed
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @see {@link https://foundryvtt.com/api/namespaces/Hooks.html|Foundry Hooks}
 * @see {@link https://foundryvtt.com/api/classes/documents.ActiveEffect.html|ActiveEffect}
 */

import { getEffectStatusIds, STANCE_IDS } from "../core/helpers.js";
import { triggerFullDefenseRoll } from "../rolls/full-defense-roll.js";
import { clearStanceFlags } from "../core/automation.js";
import { getStanceEffectCreator } from "../core/effect-templates.js";

/* -------------------------------------------- */
/* Active Effect Lifecycle Hooks               */
/* -------------------------------------------- */

/**
 * Hook handler for before Active Effects are created.
 * Populates stance effects with proper template data when created from Token HUD.
 * Enforces stance mutual exclusivity per L5R4 rules (only one stance at a time).
 * 
 * **Problem:** When stance effects are toggled from the Token HUD, Foundry creates
 * minimal Active Effects with only a status ID. These lack the name, flags, and
 * structure that the L5R4 stance system expects, causing "active effect [blank]
 * does not exist" errors for all clients.
 * 
 * **Solution:** Intercept effect creation and populate stance effects with the
 * correct template data before they're persisted to the database. Also remove
 * any other active stances since L5R4 rules only allow one stance at a time.
 * 
 * @param {ActiveEffect} effect - The effect document being created
 * @param {object} data - The creation data
 * @param {object} options - Creation options
 * @param {string} userId - The user creating the effect
 */
export function onPreCreateActiveEffect(effect, data, options, userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  
  // Check if this is a stance effect by examining its statuses
  const effectStances = getEffectStatusIds(effect);
  const stanceId = effectStances.find(id => STANCE_IDS.has(id));
  
  if (stanceId) {
    // Check if effect lacks proper template data (name is empty/missing)
    // This indicates it was created by the Token HUD rather than programmatically
    const hasProperData = effect.name && effect.name.trim().length > 0;
    
    if (!hasProperData) {
      // Get the proper template data for this stance
      const creator = getStanceEffectCreator(stanceId);
      if (creator) {
        const templateData = creator(actor);
        
        // Populate the effect with template data while preserving existing statuses
        effect.updateSource({
          name: templateData.name,
          icon: templateData.icon,
          flags: templateData.flags || {},
          changes: templateData.changes || []
        });
      }
    }
    
    // Enforce stance mutual exclusivity: remove any other active stances
    // Per L5R4 rules, only one stance can be active at a time
    const effectsToRemove = [];
    for (const existingEffect of actor.effects) {
      if (existingEffect.id === effect.id || existingEffect.disabled) continue;
      
      const existingStances = getEffectStatusIds(existingEffect);
      const hasOtherStance = existingStances.some(id => STANCE_IDS.has(id) && id !== stanceId);
      
      if (hasOtherStance) {
        effectsToRemove.push(existingEffect.id);
      }
    }
    
    // Queue removal of conflicting stances
    if (effectsToRemove.length > 0) {
      queueMicrotask(async () => {
        await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
      });
    }
  }
}

/**
 * Hook handler for when Active Effects are created.
 * Triggers stance automation when stance effects are applied.
 */
export function onCreateActiveEffect(effect, options, userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  
  // Check if this is a stance effect
  const effectStances = getEffectStatusIds(effect);
  const hasStance = effectStances.some(id => STANCE_IDS.has(id));
  
  if (hasStance) {
    // Handle Full Defense stance roll trigger
    if (effectStances.includes("fullDefenseStance")) {
      // Trigger the Defense/Reflexes roll after current execution context completes
      queueMicrotask(() => triggerFullDefenseRoll(actor, actor.system));
    }
    
    // Re-prepare actor data to apply stance effects
    actor.prepareData();
    
    // Trigger sheet re-render to display updated TN values
    // Use render(false) to avoid re-focusing the sheet window
    actor.sheet?.render(false);
  }
}

/**
 * Hook handler for when Active Effects are updated.
 * Handles stance effects being enabled/disabled.
 * Enforces stance mutual exclusivity when a stance is re-enabled.
 */
export function onUpdateActiveEffect(effect, changes, options, userId) {
  // Only process when disabled flag changes
  if (changes?.disabled === undefined) return;
  
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  
  // Check if this is a stance effect
  const effectStances = getEffectStatusIds(effect);
  const hasStance = effectStances.some(id => STANCE_IDS.has(id));
  
  if (hasStance) {
    // If stance was disabled, clear its flags
    if (changes.disabled === true) {
      for (const stanceId of effectStances) {
        if (STANCE_IDS.has(stanceId)) {
          clearStanceFlags(actor, stanceId);
        }
      }
    } else if (changes.disabled === false) {
      // Stance was re-enabled: enforce mutual exclusivity
      // Remove any other active stances per L5R4 rules
      const effectsToRemove = [];
      const myStanceId = effectStances.find(id => STANCE_IDS.has(id));
      
      for (const existingEffect of actor.effects) {
        if (existingEffect.id === effect.id || existingEffect.disabled) continue;
        
        const existingStances = getEffectStatusIds(existingEffect);
        const hasOtherStance = existingStances.some(id => STANCE_IDS.has(id) && id !== myStanceId);
        
        if (hasOtherStance) {
          effectsToRemove.push(existingEffect.id);
        }
      }
      
      // Remove conflicting stances before triggering Full Defense roll
      if (effectsToRemove.length > 0) {
        queueMicrotask(async () => {
          await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
        });
      }
      
      // Trigger Full Defense roll if applicable
      if (effectStances.includes("fullDefenseStance")) {
        // Trigger the Defense/Reflexes roll after current execution context completes
        queueMicrotask(() => triggerFullDefenseRoll(actor, actor.system));
      }
    }
    
    // Re-prepare actor data to apply/remove stance effects
    actor.prepareData();
    
    // Trigger sheet re-render to display updated TN values
    // Use render(false) to avoid re-focusing the sheet window
    actor.sheet?.render(false);
  }
}

/**
 * Hook handler for when Active Effects are deleted.
 * Clears stance flags when stance effects are removed.
 */
export function onDeleteActiveEffect(effect, options, userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  
  // Check if this was a stance effect and clear its flags
  const effectStances = getEffectStatusIds(effect);
  
  for (const stanceId of effectStances) {
    if (STANCE_IDS.has(stanceId)) {
      clearStanceFlags(actor, stanceId);
    }
  }
  
  // Re-prepare actor data to remove stance effects
  if (effectStances.some(id => STANCE_IDS.has(id))) {
    actor.prepareData();
    
    // Trigger sheet re-render to display updated TN values
    // Use render(false) to avoid re-focusing the sheet window
    actor.sheet?.render(false);
  }
}
