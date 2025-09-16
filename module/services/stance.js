/**
 * L5R4 Stance Service Module for Foundry VTT v13+
 * 
 * Provides comprehensive combat stance automation and management for the L5R4 system.
 * Handles all aspects of stance mechanics from effect creation to roll modifications
 * and integrates seamlessly with actor data preparation and the dice service.
 *
 * ## Core Responsibilities:
 * - **Stance Automation**: Apply mechanical effects during actor data preparation
 * - **Active Effect Management**: Create and configure stance status effects
 * - **Roll Integration**: Modify attack rolls based on active stances
 * - **Hook Management**: Handle effect lifecycle events and state changes
 * - **Flag Management**: Persist stance-specific data like Full Defense rolls
 *
 * ## Key Features:
 * - **Full Attack Stance**: +2k1 attack rolls, -10 Armor TN penalty
 * - **Defense Stance**: Air Ring + Defense Skill bonus to Armor TN, no attacks
 * - **Full Defense Stance**: Defense/Reflexes roll + half result to Armor TN, Free Actions only
 * - **Attack/Center Stance**: Visual indicators with no mechanical effects
 * - **Mutually Exclusive**: Stance enforcement handled by separate system
 *
 * ## Usage Examples:
 * ```javascript
 * import { stance } from "./services/index.js";
 * 
 * // Apply stance automation during actor preparation
 * stance.applyStanceAutomation(actor, actor.system);
 * 
 * // Create stance effects
 * const fullAttackEffect = stance.createFullAttackStanceEffect(actor);
 * await actor.createEmbeddedDocuments("ActiveEffect", [fullAttackEffect]);
 * 
 * // Get attack bonuses for roll modifications
 * const bonuses = stance.getStanceAttackBonuses(actor);
 * rollData.diceRoll += bonuses.roll;
 * rollData.diceKeep += bonuses.keep;
 * ```
 *
 * ## Initialization Sequence:
 * 1. **System Init**: Call `initializeStanceService()` to register all hooks
 * 2. **Actor Preparation**: `applyStanceAutomation()` called during `prepareData()`
 * 3. **Effect Creation**: Status effects created via UI or programmatically
 * 4. **Roll Integration**: Attack rolls automatically modified via hooks
 *
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.ActiveEffect.html|ActiveEffect API}
 * @see {@link https://foundryvtt.com/api/classes/foundry.documents.Actor.html#prepareData|Actor.prepareData}
 * @see {@link https://foundryvtt.com/api/namespaces/Hooks.html|Foundry Hooks System}
 */

import { SYS_ID, CHAT_TEMPLATES } from "../config.js";
import { toInt } from "../utils.js";
import { R } from "../utils.js";

/* -------------------------------------------- */
/* Stance Automation Core Logic                */
/* -------------------------------------------- */

/**
 * Stance automation handler that applies mechanical effects based on active stance status effects.
 * Called during actor data preparation to modify derived statistics.
 * 
 * @param {Actor} actor - The actor to apply stance effects to
 * @param {object} sys - The actor's system data object
 */
export function applyStanceAutomation(actor, sys) {
  if (!actor || !sys) return;

  const activeStances = getActiveStances(actor);
  
  // Initialize stance modifier tracking
  sys.armorTn = sys.armorTn || {};
  sys.armorTn.stanceMod = 0; // Reset stance modifier each time
  
  // Apply stance-specific automations
  for (const stanceId of activeStances) {
    switch (stanceId) {
      case "fullAttackStance":
        applyFullAttackStance(actor, sys);
        break;
      case "defenseStance":
        applyDefenseStance(actor, sys);
        break;
      case "fullDefenseStance":
        applyFullDefenseStance(actor, sys);
        break;
      case "centerStance":
      default:
        break;
    }
  }
  
  // Apply final stance modifier to current Armor TN
  if (sys.armorTn.stanceMod !== 0) {
    sys.armorTn.current = (sys.armorTn.current || 0) + sys.armorTn.stanceMod;
  }
}

/**
 * Get all active stance status effects on an actor.
 * 
 * @param {Actor} actor - The actor to check for active stances
 * @returns {string[]} Array of active stance IDs
 */
function getActiveStances(actor) {
  const stanceIds = new Set([
    "attackStance",
    "fullAttackStance", 
    "defenseStance",
    "fullDefenseStance",
    "centerStance"
  ]);

  const activeStances = [];
  
  for (const effect of actor.effects) {
    if (effect.disabled) continue;
    
    // Check modern statuses Set (v11+)
    if (effect.statuses?.size) {
      for (const statusId of effect.statuses) {
        if (stanceIds.has(statusId)) {
          activeStances.push(statusId);
        }
      }
    }
    
    // Check legacy statusId flag (pre-v11 compatibility)
    const legacyId = effect.getFlag?.("core", "statusId");
    if (legacyId && stanceIds.has(legacyId)) {
      activeStances.push(legacyId);
    }
  }
  
  return activeStances;
}

/**
 * Apply Full Attack Stance automation:
 * - +2k1 to all attack rolls (handled via Active Effects)
 * - -10 to Armor TN
 * 
 * @param {Actor} actor - The actor in Full Attack Stance
 * @param {object} sys - The actor's system data object
 */
function applyFullAttackStance(actor, sys) {
  // Apply -10 to Armor TN via stance modifier
  sys.armorTn.stanceMod += -10;
  
  // Store stance info for UI display
  sys._stanceEffects = sys._stanceEffects || {};
  sys._stanceEffects.fullAttack = {
    armorTnPenalty: -10,
    attackBonus: "+2k1"
  };
}

/**
 * Apply Defense Stance automation:
 * - Add Air Ring + Defense Skill Rank to Armor TN
 * 
 * @param {Actor} actor - The actor in Defense Stance
 * @param {object} sys - The actor's system data object
 */
function applyDefenseStance(actor, sys) {
  const airRing = toInt(sys.rings?.air || 0);
  
  // Find Defense skill rank
  let defenseSkillRank = 0;
  for (const item of actor.items) {
    if (item.type === "skill" && item.name?.toLowerCase().includes("defense")) {
      defenseSkillRank = toInt(item.system?.rank || 0);
      break;
    }
  }
  
  const defenseBonus = airRing + defenseSkillRank;
  
  // Apply bonus to Armor TN via stance modifier
  sys.armorTn.stanceMod += defenseBonus;
  
  // Store stance info for UI display
  sys._stanceEffects = sys._stanceEffects || {};
  sys._stanceEffects.defense = {
    armorTnBonus: defenseBonus,
    airRing: airRing,
    defenseSkill: defenseSkillRank
  };
}

/**
 * Apply Full Defense Stance automation:
 * - Trigger Defense/Reflexes roll when stance is selected
 * - Add half the Defense roll (rounded up) to Armor TN
 * 
 * @param {Actor} actor - The actor in Full Defense Stance
 * @param {object} sys - The actor's system data object
 */
function applyFullDefenseStance(actor, sys) {
  // Check if we need to make the Defense/Reflexes roll
  const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");
  
  if (!existingRoll) {
    // Don't trigger roll during data preparation - defer to stance activation
    // Just apply a default bonus for now
    const defaultBonus = 5; // Reasonable default until roll is made
    sys.armorTn.stanceMod += defaultBonus;
    
    // Store stance info for UI display
    sys._stanceEffects = sys._stanceEffects || {};
    sys._stanceEffects.fullDefense = {
      rollResult: "Pending",
      armorTnBonus: defaultBonus,
      needsRoll: true
    };
  } else {
    // Apply existing roll result
    const rollResult = toInt(existingRoll.total || 0);
    const armorBonus = Math.ceil(rollResult / 2); // Half rounded up
    
    // Apply bonus to Armor TN via stance modifier
    sys.armorTn.stanceMod += armorBonus;
    
    // Store stance info for UI display
    sys._stanceEffects = sys._stanceEffects || {};
    sys._stanceEffects.fullDefense = {
      rollResult: rollResult,
      armorTnBonus: armorBonus
    };
  }
}

/**
 * Trigger a Defense/Reflexes roll for Full Defense Stance.
 * Creates a roll dialog and stores the result for the stance duration.
 * 
 * @param {Actor} actor - The actor making the Defense roll
 * @param {object} sys - The actor's system data object
 */
async function triggerFullDefenseRoll(actor, sys) {
  try {
    // Check if roll already exists to prevent duplicates
    const existingRoll = actor.getFlag(SYS_ID, "fullDefenseRoll");
    if (existingRoll) {
      console.log("L5R4 | Full Defense roll already exists, skipping duplicate");
      return;
    }
    
    // Find Defense skill rank
    let defenseSkillRank = 0;
    for (const item of actor.items) {
      if (item.type === "skill" && item.name?.toLowerCase().includes("defense")) {
        defenseSkillRank = toInt(item.system?.rank || 0);
        break;
      }
    }
    
    const reflexes = toInt(sys.traits?.ref || sys._derived?.traitsEff?.ref || 0);
    const rollDice = reflexes + defenseSkillRank;
    const keepDice = reflexes;
    
    // Create the roll formula
    const formula = `${rollDice}d10kh${keepDice}!10`;
    const roll = new Roll(formula);
    
    // Execute the roll
    await roll.evaluate();
    
    // Store the roll result
    await actor.setFlag(SYS_ID, "fullDefenseRoll", {
      total: roll.total,
      formula: formula,
      timestamp: Date.now()
    });
    
    // Create chat message using the new template
    const armorBonus = Math.ceil(roll.total / 2);
    const templateData = {
      formula: formula,
      rollTotal: roll.total,
      armorBonus: armorBonus
    };
    
    const content = await R(CHAT_TEMPLATES.fullDefenseRoll, templateData);
    
    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: content,
      sound: CONFIG.sounds.dice
    };
    
    ChatMessage.create(messageData);
    
    // Re-prepare actor data to apply the new roll result
    actor.prepareData();
    
  } catch (error) {
    console.error("L5R4 | Failed to trigger Full Defense roll:", error);
    ui.notifications?.error("Failed to make Full Defense roll. Please roll manually.");
  }
}

/**
 * Clear stance-related flags when a stance is removed.
 * Called by the stance enforcement system when stances change.
 * 
 * @param {Actor} actor - The actor whose stance flags should be cleared
 * @param {string} removedStanceId - The stance ID that was removed
 */
export async function clearStanceFlags(actor, removedStanceId) {
  if (!actor) return;
  
  try {
    switch (removedStanceId) {
      case "fullDefenseStance":
        await actor.unsetFlag(SYS_ID, "fullDefenseRoll");
        break;
      // Other stances don't currently use flags
      default:
        break;
    }
  } catch (error) {
    console.error("L5R4 | Failed to clear stance flags:", error);
  }
}

/* -------------------------------------------- */
/* Active Effects Creation                     */
/* -------------------------------------------- */

/**
 * Create a Full Attack Stance Active Effect with +2k1 attack bonus.
 * The attack bonus is handled by the stance automation system during rolls.
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Full Attack Stance
 */
export function createFullAttackStanceEffect(actor) {
  return {
    name: "Full Attack Stance",
    icon: `systems/${SYS_ID}/assets/icons/fullattackstance.png`,
    statuses: ["fullAttackStance"],
    changes: [
      // Attack bonus handled by stance automation system
    ],
    flags: {
      [SYS_ID]: {
        stanceType: "fullAttack",
        attackBonus: { roll: 2, keep: 1 },
        description: "Full Attack Stance: +2k1 to attack rolls, -10 to Armor TN"
      }
    }
  };
}

/**
 * Create a Defense Stance Active Effect.
 * The Armor TN bonus is calculated dynamically in the stance automation module.
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Defense Stance
 */
export function createDefenseStanceEffect(actor) {
  return {
    name: "Defense Stance",
    icon: `systems/${SYS_ID}/assets/icons/defensestance.png`,
    statuses: ["defenseStance"],
    changes: [
      // Disable attack actions (handled by UI restrictions)
    ],
    flags: {
      [SYS_ID]: {
        stanceType: "defense",
        description: "Defense Stance: Air Ring + Defense Skill to Armor TN, cannot attack"
      }
    }
  };
}

/**
 * Create a Full Defense Stance Active Effect.
 * The Defense roll and Armor TN bonus are handled by the stance automation module.
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Full Defense Stance
 */
export function createFullDefenseStanceEffect(actor) {
  return {
    name: "Full Defense Stance",
    icon: `systems/${SYS_ID}/assets/icons/fulldefensestance.png`,
    statuses: ["fullDefenseStance"],
    changes: [
      // All restrictions handled by stance automation
    ],
    flags: {
      [SYS_ID]: {
        stanceType: "fullDefense",
        description: "Full Defense Stance: Defense/Reflexes roll + half to Armor TN, only Free Actions"
      }
    }
  };
}

/**
 * Create an Attack Stance Active Effect (no mechanical changes per requirements).
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Attack Stance
 */
export function createAttackStanceEffect(actor) {
  return {
    name: "Attack Stance",
    icon: `systems/${SYS_ID}/assets/icons/attackstance.png`,
    statuses: ["attackStance"],
    changes: [],
    flags: {
      [SYS_ID]: {
        stanceType: "attack",
        description: "Attack Stance: Standard combat stance with no restrictions"
      }
    }
  };
}

/**
 * Create a Center Stance Active Effect (no mechanical changes per requirements).
 * 
 * @param {Actor} actor - The actor to create the effect for
 * @returns {object} Active Effect data for Center Stance
 */
export function createCenterStanceEffect(actor) {
  return {
    name: "Center Stance",
    icon: `systems/${SYS_ID}/assets/icons/centerstance.png`,
    statuses: ["centerStance"],
    changes: [],
    flags: {
      [SYS_ID]: {
        stanceType: "center",
        description: "Center Stance: Focused preparation for next round"
      }
    }
  };
}

/**
 * Get the appropriate Active Effect creator function for a stance.
 * 
 * @param {string} stanceId - The stance status ID
 * @returns {Function|null} Effect creator function or null if not found
 */
export function getStanceEffectCreator(stanceId) {
  const creators = {
    "attackStance": createAttackStanceEffect,
    "fullAttackStance": createFullAttackStanceEffect,
    "defenseStance": createDefenseStanceEffect,
    "fullDefenseStance": createFullDefenseStanceEffect,
    "centerStance": createCenterStanceEffect
  };
  
  return creators[stanceId] || null;
}

/* -------------------------------------------- */
/* Roll Hooks and Bonuses                      */
/* -------------------------------------------- */

/**
 * Get stance bonuses for attack rolls from an actor's active effects.
 * 
 * @param {Actor} actor - The actor making the attack roll
 * @returns {{roll: number, keep: number}} Attack roll bonuses from stances
 */
export function getStanceAttackBonuses(actor) {
  let rollBonus = 0;
  let keepBonus = 0;

  if (!actor) return { roll: rollBonus, keep: keepBonus };

  // Check for Full Attack Stance
  for (const effect of actor.effects) {
    if (effect.disabled) continue;
    
    // Check if this is a Full Attack Stance effect
    const isFullAttack = effect.statuses?.has?.("fullAttackStance") || 
                        effect.getFlag?.("core", "statusId") === "fullAttackStance";
    
    if (isFullAttack) {
      const attackBonus = effect.getFlag(SYS_ID, "attackBonus");
      if (attackBonus) {
        rollBonus += attackBonus.roll || 0;
        keepBonus += attackBonus.keep || 0;
      } else {
        // Default Full Attack Stance bonus if flag not set
        rollBonus += 2;
        keepBonus += 1;
      }
    }
  }

  return { roll: rollBonus, keep: keepBonus };
}

/**
 * Apply stance bonuses to attack roll parameters.
 * This function should be called before making attack rolls.
 * 
 * @param {Actor} actor - The actor making the attack
 * @param {object} rollParams - Roll parameters object
 * @param {number} rollParams.diceRoll - Base roll dice
 * @param {number} rollParams.diceKeep - Base keep dice
 * @returns {object} Modified roll parameters with stance bonuses applied
 */
export function applyStanceAttackBonuses(actor, rollParams) {
  const bonuses = getStanceAttackBonuses(actor);
  
  return {
    ...rollParams,
    diceRoll: (rollParams.diceRoll || 0) + bonuses.roll,
    diceKeep: (rollParams.diceKeep || 0) + bonuses.keep,
    stanceBonuses: bonuses
  };
}

/**
 * Register stance-related hooks for roll modifications.
 * This should be called during system initialization.
 */
export function registerStanceRollHooks() {
  // Hook into the dice service to apply stance bonuses to attack rolls
  Hooks.on("l5r4.preRoll", (rollData) => {
    if (rollData.rollType === "attack" && rollData.actor) {
      const bonuses = getStanceAttackBonuses(rollData.actor);
      
      if (bonuses.roll > 0 || bonuses.keep > 0) {
        rollData.diceRoll = (rollData.diceRoll || 0) + bonuses.roll;
        rollData.diceKeep = (rollData.diceKeep || 0) + bonuses.keep;
        
        // Add stance bonus information to the roll description
        if (rollData.description) {
          rollData.description += ` (Full Attack Stance: +${bonuses.roll}k${bonuses.keep})`;
        } else {
          rollData.description = `Full Attack Stance: +${bonuses.roll}k${bonuses.keep}`;
        }
      }
    }
  });
}

/* -------------------------------------------- */
/* Active Effect Lifecycle Hooks               */
/* -------------------------------------------- */

/**
 * Hook handler for when Active Effects are created.
 * Triggers stance automation when stance effects are applied.
 */
export function onCreateActiveEffect(effect, options, userId) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  
  // Check if this is a stance effect
  const stanceIds = ["fullAttackStance", "defenseStance", "fullDefenseStance"];
  const effectStances = getEffectStatusIds(effect);
  const hasStance = effectStances.some(id => stanceIds.includes(id));
  
  if (hasStance) {
    // Handle Full Defense stance roll trigger
    if (effectStances.includes("fullDefenseStance")) {
      // Trigger the Defense/Reflexes roll immediately
      setTimeout(() => triggerFullDefenseRoll(actor, actor.system), 100);
    }
    
    // Re-prepare actor data to apply stance effects
    actor.prepareData();
  }
}

/**
 * Hook handler for when Active Effects are updated.
 * Handles stance effects being enabled/disabled.
 */
export function onUpdateActiveEffect(effect, changes, options, userId) {
  // Only process when disabled flag changes
  if (changes?.disabled === undefined) return;
  
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  
  // Check if this is a stance effect
  const stanceIds = ["fullAttackStance", "defenseStance", "fullDefenseStance"];
  const effectStances = getEffectStatusIds(effect);
  const hasStance = effectStances.some(id => stanceIds.includes(id));
  
  if (hasStance) {
    // If stance was disabled, clear its flags
    if (changes.disabled === true) {
      for (const stanceId of effectStances) {
        clearStanceFlags(actor, stanceId);
      }
    } else if (changes.disabled === false) {
      // Stance was re-enabled
      if (effectStances.includes("fullDefenseStance")) {
        // Trigger the Defense/Reflexes roll immediately
        setTimeout(() => triggerFullDefenseRoll(actor, actor.system), 100);
      }
    }
    
    // Re-prepare actor data to apply/remove stance effects
    actor.prepareData();
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
  const stanceIds = ["fullAttackStance", "defenseStance", "fullDefenseStance"];
  const effectStances = getEffectStatusIds(effect);
  
  for (const stanceId of effectStances) {
    if (stanceIds.includes(stanceId)) {
      clearStanceFlags(actor, stanceId);
    }
  }
  
  // Re-prepare actor data to remove stance effects
  if (effectStances.some(id => stanceIds.includes(id))) {
    actor.prepareData();
  }
}

/**
 * Extract status IDs from an ActiveEffect document.
 * Handles both modern statuses Set (v11+) and legacy statusId flag.
 * 
 * @param {ActiveEffect} eff - ActiveEffect document to analyze
 * @returns {string[]} Array of status IDs associated with the effect
 */
function getEffectStatusIds(eff) {
  const ids = [];
  // Modern approach: statuses Set (Foundry v11+)
  if (eff?.statuses?.size) ids.push(...eff.statuses);
  // Legacy approach: core.statusId flag (pre-v11 compatibility)
  const legacy = eff?.getFlag?.("core", "statusId");
  if (legacy) ids.push(legacy);
  return ids.filter(Boolean);
}

/* -------------------------------------------- */
/* Service Initialization                      */
/* -------------------------------------------- */

/**
 * Initialize the stance service by registering all necessary hooks.
 * This should be called during system initialization.
 */
export function initializeStanceService() {
  registerStanceRollHooks();
  
  // Register Active Effect hooks
  Hooks.on("createActiveEffect", onCreateActiveEffect);
  Hooks.on("updateActiveEffect", onUpdateActiveEffect);
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);
  
  console.log("L5R4 | Stance service initialized");
}
