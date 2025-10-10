/**
 * @fileoverview L5R4 Creation Bonuses - Backward Compatibility Layer
 * 
 * **DEPRECATED**: This file now re-exports functions from utils/xp-calculations.js.
 * The creation bonus calculation logic has been moved to the utils layer to prevent
 * cross-layer dependencies between services and documents.
 * 
 * **Migration Path:**
 * ```javascript
 * // Old (still works via this file)
 * import { getCreationFreeBonus } from "./documents/actor/creation/creation-bonuses.js";
 * 
 * // New (recommended)
 * import { getCreationFreeBonus } from "./utils/xp-calculations.js";
 * ```
 * 
 * **Core Responsibilities:**
 * - **Trait Bonuses**: Calculate total trait bonuses from Family/School items
 * - **Void Bonuses**: Calculate void ring bonuses from Family/School items
 * - **Active Effects**: Priority handling for transferred Active Effects
 * - **Legacy Support**: Fallback to direct bonus properties for older actors
 * - **Deduplication**: Prevent double-counting items seen via multiple access paths
 * 
 * **Resolution Priority:**
 * 1. Active Effects that transfer and ADD to system.traits.<key>
 * 2. Legacy direct bonuses from item.system.trait + item.system.bonus
 * 
 * **Sources Checked:**
 * - Flagged Family/School items via UUID (preferred, modern approach)
 * - Embedded Family/School items (fallback for older actors)
 * 
 * @author L5R4 System Team
 * @since 1.1.0
 * @version 2.0.0
 * @deprecated Import from utils/xp-calculations.js instead
 * @see {@link ../../../utils/xp-calculations.js|XP Calculations Module}
 */

// Re-export from utils layer for backward compatibility
export { getCreationFreeBonus, getCreationFreeBonusVoid } from "../../../utils/xp-calculations.js";
