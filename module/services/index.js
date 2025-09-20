/**
 * @fileoverview L5R4 Services Barrel Module - Service Exports for Foundry VTT v13+
 * 
 * This barrel module provides centralized access to all L5R4 system services,
 * including dice rolling, chat utilities, and stance automation. Serves as the
 * main entry point for service functionality across the system, implementing
 * the barrel pattern for clean module organization and dependency management.
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
 * - **Chat Service**: User interface layer for item creation and dialog management
 * - **Stance Service**: Combat automation layer for stance effects and state management
 * - **Barrel Pattern**: Simplified imports and reduced module coupling
 * - **Named Exports**: Clear function identification and IDE support
 *
 * **Exported Services:**
 * - **Dice Service**: Comprehensive dice rolling with L5R4 mechanics and Ten Dice Rule
 * - **Chat Service**: Item creation dialogs and interactive chat utilities
 * - **Stance Service**: Combat stance automation and Active Effect management
 *
 * **Service Integration:**
 * Services are designed to work together seamlessly:
 * - **Dice ↔ Stance**: Automatic stance bonus application during rolls
 * - **Chat ↔ Dice**: Dialog-driven roll customization and result display
 * - **Stance ↔ Chat**: Stance change notifications and status updates
 * - **Cross-Service**: Shared utilities and configuration from utils and config modules
 *
 * **Import Patterns:**
 * The barrel module supports various import styles:
 * ```javascript
 * // Named imports (recommended)
 * import { SkillRoll, RingRoll, TraitRoll } from "./services/index.js";
 * import { getItemOptions } from "./services/index.js";
 * import { setStance, clearStance } from "./services/index.js";
 * 
 * // Namespace import
 * import * as Services from "./services/index.js";
 * await Services.SkillRoll({ ... });
 * 
 * // Mixed imports
 * import { SkillRoll } from "./services/index.js";
 * import { getItemOptions as createItem } from "./services/index.js";
 * ```
 *
 * **Performance Considerations:**
 * - **Tree Shaking**: Named exports support dead code elimination
 * - **Lazy Loading**: Services loaded only when imported and used
 * - **Module Caching**: Foundry's module system caches service instances
 * - **Minimal Overhead**: Barrel pattern adds negligible performance cost
 * - **Bundle Optimization**: Efficient bundling for production deployments
 *
 * **Design Principles:**
 * - **Centralized Access**: Single import point for all service functionality
 * - **Named Exports**: Clear, descriptive function names for easy identification
 * - **Service Isolation**: Each service maintains its own responsibilities and state
 * - **Consistent API**: Uniform interface patterns across all services
 * - **Documentation**: Comprehensive JSDoc for all exported functions
 * - **Extensibility**: Easy addition of new services without breaking changes
 *
 * **Integration Points:**
 * - **Character Sheets**: Primary consumers of dice and chat services
 * - **Actor System**: Deep integration with stance and dice services
 * - **Item System**: Chat service integration for item creation workflows
 * - **Combat System**: Stance service automation during combat encounters
 * - **Hook System**: Service functions registered as Foundry hook handlers
 *
 * **Error Handling:**
 * - **Service Isolation**: Errors in one service don't affect others
 * - **Graceful Degradation**: System continues to function with service failures
 * - **Error Propagation**: Service errors properly bubbled to calling code
 * - **Debug Support**: Clear error messages with service identification
 * - **Recovery Mechanisms**: Automatic retry and fallback strategies
 *
 * **Extensibility:**
 * Adding new services to the system:
 * 1. Create service module in `/services/` directory
 * 2. Implement service functions with proper JSDoc documentation
 * 3. Add exports to this barrel module
 * 4. Update integration points in consuming modules
 * 5. Add service tests and documentation
 *
 * **Usage Examples:**
 * ```javascript
 * // Dice service usage
 * import { SkillRoll, RingRoll } from "./services/index.js";
 * await SkillRoll({ actor, skillName: "Kenjutsu", actorTrait: 4, skillRank: 3 });
 * await RingRoll({ actor, ring: "fire", ringRank: 3 });
 * 
 * // Chat service usage
 * import { getItemOptions } from "./services/index.js";
 * const result = await getItemOptions("spell");
 * if (!result.cancelled) {
 *   await Item.create({ name: result.name, type: result.type });
 * }
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
 * @see {@link ./chat.js|Chat Service} - Item creation and chat utilities
 * @see {@link ./stance.js|Stance Service} - Combat stance automation
 * @see {@link ../config.js|Config Module} - System configuration and constants
 * @see {@link ../utils.js|Utils Module} - Shared utility functions
 * @see {@link https://foundryvtt.com/api/|Foundry VTT v13 API Documentation}
 */

/** Dice rolling mechanics and dialog systems. */
export * as dice from "./dice.js";

/** Chat utilities and item creation dialogs. */
export * as chat from "./chat.js";

/** Combat stance automation, effects, and roll modifications. */
export * as stance from "./stance.js";
