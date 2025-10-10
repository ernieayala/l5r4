/**
 * @fileoverview L5R4 Stance Automation - Backward Compatibility and Flag Management
 * 
 * **ARCHITECTURAL NOTE**: The pure stance calculation logic has been moved to
 * `documents/actor/calculations/stance-effects.js` to maintain proper layer separation.
 * This file now provides backward compatibility and handles async flag management
 * (which belongs in the services layer).
 * 
 * **Core Responsibilities:**
 * - **Backward Compatibility**: Re-export stance calculation functions
 * - **Flag Management**: Clean up stance-specific flags when stances change (async)
 * - **Effect Lifecycle**: Handle ActiveEffect-related operations
 * 
 * **Migration Path:**
 * ```javascript
 * // Old (still works via this file)
 * import { applyStanceAutomation } from "./services/stance/core/automation.js";
 * 
 * // New (for documents layer)
 * import { applyStanceEffects } from "./documents/actor/calculations/stance-effects.js";
 * ```
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @deprecated Use applyStanceEffects from documents/actor/calculations/stance-effects.js
 * @see {@link ../../../documents/actor/calculations/stance-effects.js|Stance Effects}
 */

import { SYS_ID } from "../../../config/constants.js";
import { applyStanceEffects } from "../../../documents/actor/calculations/stance-effects.js";

/* -------------------------------------------- */
/* Backward Compatibility Exports              */
/* -------------------------------------------- */

/**
 * Stance automation handler (backward compatibility wrapper).
 * 
 * @deprecated Import applyStanceEffects from documents/actor/calculations/stance-effects.js instead
 * @param {Actor} actor - The actor to apply stance effects to
 * @param {object} sys - The actor's system data object
 */
export const applyStanceAutomation = applyStanceEffects;

/**
 * Clear stance-related flags when a stance is removed.
 * 
 * @param {Actor} actor - The actor whose stance flags should be cleared
 * @param {string} removedStanceId - The stance ID that was removed
 */
export async function clearStanceFlags(actor, removedStanceId) {
  if (!actor?.isOwner) return;
  
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
