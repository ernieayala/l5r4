/**
 * @fileoverview L5R4 Services Barrel Module - Service Exports for Foundry VTT v13+
 * 
 * This barrel module provides centralized access to all L5R4 system services,
 * including dice rolling and stance automation. Serves as the main entry point 
 * for service functionality across the system, implementing the barrel pattern 
 * for clean module organization and dependency management.
 *
 * **Core Responsibilities:**
 * - **Service Aggregation**: Centralized re-export of all system services
 * - **API Unification**: Consistent interface for service access across modules
 * - **Dependency Management**: Single import point reduces coupling complexity
 * - **Documentation Hub**: Central reference for all available service functions
 * - **Version Coordination**: Ensures service compatibility and version alignment
 *
 * **System Architecture:**
 * The services module implements a clean separation of concerns:
 * - **Dice Service**: Core mechanical engine for all roll-based interactions
 * - **Stance Service**: Combat automation layer for stance effects and state management
 * - **Barrel Pattern**: Simplified imports and reduced module coupling
 * - **Named Exports**: Clear function identification and IDE support
 *
 * **Exported Services:**
 * - **Dice Service**: Comprehensive dice rolling with L5R4 mechanics and Ten Dice Rule
 * - **Stance Service**: Combat stance automation and Active Effect management
 *
 * **Service Integration:**
 * Services are designed to work together seamlessly:
 * - **Dice ↔ Stance**: Automatic stance bonus application during rolls
 * - **Cross-Service**: Shared utilities and configuration from utils and config modules
 *
 * **Import Patterns:**
 * The barrel module supports various import styles:
 * ```javascript
 * // Named imports (recommended)
 * import { SkillRoll, RingRoll, TraitRoll } from "./services/index.js";
 * import { setStance, clearStance } from "./services/index.js";
 * 
 * // Namespace import
 * import * as Services from "./services/index.js";
 * await Services.SkillRoll({ ... });
 * ```
 *
 * **Usage Examples:**
 * ```javascript
 * // Dice service usage
 * import { SkillRoll, RingRoll } from "./services/index.js";
 * await SkillRoll({ actor, skillName: "Kenjutsu", actorTrait: 4, skillRank: 3 });
 * await RingRoll({ actor, ring: "fire", ringRank: 3 });
 * 
 * // Stance service usage
 * import { setStance, clearStance } from "./services/index.js";
 * await setStance(actor, "attack");
 * await clearStance(actor);
 * ```
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link ./dice.js|Dice Service} - Roll mechanics and dialog system
 * @see {@link ./stance.js|Stance Service} - Combat stance automation
 * @see {@link ../config.js|Config Module} - System configuration and constants
 * @see {@link ../utils.js|Utils Module} - Shared utility functions
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 */

/** Dice rolling mechanics and dialog systems. */
export * as dice from "./dice.js";

/** Combat stance automation, effects, and roll modifications. */
export * as stance from "./stance.js";
