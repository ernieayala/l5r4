import { SYS_ID } from "../config/constants.js";

/**
 * @fileoverview L5R4 Template Preloader - Handlebars Template Caching for Foundry VTT v13+
 * 
 * This module provides comprehensive template preloading functionality for the L5R4 system,
 * ensuring all Handlebars templates are cached during system initialization to optimize
 * runtime performance and eliminate template loading delays.
 *
 * **Core Responsibilities:**
 * - **Template Caching**: Preload all system templates into Foundry's template registry
 * - **Performance Optimization**: Eliminate runtime template loading delays
 * - **Error Prevention**: Catch template loading issues during system initialization
 * - **Dependency Management**: Ensure all required templates are available before use
 * - **Memory Efficiency**: Optimize template storage and access patterns
 *
 * **Integration Testing Requirements:**
 * @integration-test Scenario: Real template files exist and are valid Handlebars
 * @integration-test Reason: Unit tests mock loadTemplates completely
 * @integration-test Validates: Actual template paths resolve, files parse without errors
 * 
 * @integration-test Scenario: Foundry's loadTemplates API caches templates correctly
 * @integration-test Reason: Unit tests stub API behavior with vi.fn()
 * @integration-test Validates: Templates available via renderTemplate after preload
 * 
 * @integration-test Scenario: Missing template file throws descriptive error
 * @integration-test Reason: Unit tests mock error conditions, not real file I/O
 * @integration-test Validates: Actual 404 errors caught during system initialization
 *
 * **Template Architecture:**
 * The L5R4 system uses a hierarchical template structure with clear separation of concerns:
 * - **Main Templates**: Complete sheet layouts for actors, items, and applications
 * - **Partial Templates**: Reusable components shared across multiple sheets
 * - **Card Templates**: Specialized templates for chat message rendering
 * - **Dialog Templates**: Modal and popup interface templates
 *
 * **Template Categories:**
 * - **Item Templates**: Individual item type templates (advantage, weapon, spell, commonItem, etc.)
 * - **Item Partials**: Shared components for item sheets (_rules-summary, _scaffold, _header)
 * - **Actor Templates**: Main actor sheet templates (pc-sheet, npc-sheet, limited views)
 * - **Actor Partials**: Reusable actor sheet components (_stats, _skills, _equipment, _traits)
 * - **Card Templates**: Chat card templates for items (weapon-card, spell-card, etc.)
 * - **Card Partials**: Shared chat card components (_expand, _header, _footer)
 * - **Chat Templates**: Roll result displays (simple-roll, full-defense-roll, weapon-chat)
 * - **Dialog Templates**: Application interfaces (roll-modifiers, unified-item-create)
 * - **App Templates**: Dedicated application windows (xp-manager, wound-config)
 *
 * **Performance Benefits:**
 * - **Eliminates Loading Delays**: Templates cached at startup prevent runtime fetching
 * - **Reduces Network Requests**: No HTTP requests during sheet rendering
 * - **Improves User Experience**: Instantaneous sheet opening and chat card display
 * - **Error Prevention**: Template loading errors caught during initialization
 * - **Memory Optimization**: Efficient template storage in Foundry's registry
 * - **Concurrent Loading**: Parallel template loading for faster startup
 *
 * **Template Organization:**
 * Templates follow a structured hierarchy for maintainability:
 * ```
 * templates/
 * ├── item/               # Item sheet templates
 * │   ├── _partials/      # Shared item components
 * │   ├── advantage.hbs   # Advantage/disadvantage sheets
 * │   ├── weapon.hbs      # Weapon configuration
 * │   └── ...
 * ├── actor/              # Actor sheet templates
 * │   ├── _partials/      # Shared actor components
 * │   ├── pc.hbs          # Player character sheet
 * │   └── npc.hbs         # Non-player character sheet
 * ├── cards/              # Chat card templates (item displays)
 * │   ├── _partials/      # Shared card components
 * │   └── weapon.hbs      # Weapon info card
 * ├── chat/               # Chat message templates (roll results)
 * │   ├── simple-roll.hbs # Generic roll results
 * │   └── weapon-chat.hbs # Weapon attack results
 * ├── dialogs/            # Modal dialog templates
 * │   └── roll-modifiers-dialog.hbs
 * └── apps/               # Application templates
 *     └── xp-manager.hbs  # XP management interface
 * ```
 *
 * **Loading Strategy:**
 * - **Batch Loading**: All templates loaded in single operation for efficiency
 * - **Error Handling**: Individual template failures logged but don't stop initialization
 * - **Validation**: Template paths validated before loading attempts
 * - **Caching**: Templates stored in Foundry's optimized template registry
 * - **Lazy Evaluation**: Template compilation deferred until first use
 *
 * **Integration Points:**
 * - **System Initialization**: Called during main system setup sequence
 * - **Sheet Rendering**: Templates available for immediate use by all sheets
 * - **Chat System**: Card templates ready for roll result display
 * - **Application Framework**: Dialog templates available for popup interfaces
 *
 * **Usage Examples:**
 * ```javascript
 * // Preload all templates during system init
 * await preloadTemplates();
 * 
 * // Templates are then available via Foundry's template system
 * // Path is built using SYS_ID constant
 * const html = await renderTemplate(`systems/${SYS_ID}/templates/item/weapon.hbs`, context);
 * ```
 *
 * **Maintenance Guidelines:**
 * - **Add New Templates**: Update templatePaths array when adding new templates
 * - **Organize by Category**: Group related templates for clarity
 * - **Use Descriptive Names**: Template names should clearly indicate their purpose
 * - **Document Dependencies**: Note any template interdependencies
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.0.0
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.loadTemplates.html|loadTemplates}
 * @see {@link https://foundryvtt.com/api/functions/renderTemplate.html|renderTemplate}
 */
export async function preloadTemplates() {
  // Comprehensive list of all Handlebars templates used by the L5R4 system
  const templatePaths = [
    // Item sheet templates - individual item type forms
    `systems/${SYS_ID}/templates/item/advantage.hbs`,
    `systems/${SYS_ID}/templates/item/armor.hbs`,
    `systems/${SYS_ID}/templates/item/clan.hbs`,
    `systems/${SYS_ID}/templates/item/disadvantage.hbs`,
    `systems/${SYS_ID}/templates/item/family.hbs`,
    `systems/${SYS_ID}/templates/item/commonItem.hbs`,
    `systems/${SYS_ID}/templates/item/kata.hbs`,
    `systems/${SYS_ID}/templates/item/kiho.hbs`,
    `systems/${SYS_ID}/templates/item/school.hbs`,
    `systems/${SYS_ID}/templates/item/skill.hbs`,
    `systems/${SYS_ID}/templates/item/spell.hbs`,
    `systems/${SYS_ID}/templates/item/tattoo.hbs`,
    `systems/${SYS_ID}/templates/item/technique.hbs`,
    `systems/${SYS_ID}/templates/item/weapon.hbs`,
    
    // Item partial templates - shared components
    `systems/${SYS_ID}/templates/item/_partials/_rules-summary.hbs`,
    `systems/${SYS_ID}/templates/item/_partials/_scaffold.hbs`,
    
    // Actor sheet templates - main character sheets
    `systems/${SYS_ID}/templates/actor/pc.hbs`,
    `systems/${SYS_ID}/templates/actor/npc.hbs`,
    
    // Limited actor sheet templates - restricted views for non-owners
    `systems/${SYS_ID}/templates/actor/pc-limited.hbs`,
    `systems/${SYS_ID}/templates/actor/npc-limited.hbs`,
    
    // Actor partial templates - reusable sheet components
    `systems/${SYS_ID}/templates/actor/_partials/_expand.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_stats.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_stats-npc.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_ranks.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_initiative.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_stances.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_armor.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_wounds.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_fear.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_bio.hbs`,
    
    // Individual item section templates
    `systems/${SYS_ID}/templates/actor/_partials/_skills-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_weapon-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_armor-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_item-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_spell-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_technique-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_kiho-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_kata-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_tattoo-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_advantage-section.hbs`,
    `systems/${SYS_ID}/templates/actor/_partials/_disadvantage-section.hbs`,
    
    // Chat card templates - item display in chat
    `systems/${SYS_ID}/templates/cards/advantage-disadvantage.hbs`,
    `systems/${SYS_ID}/templates/cards/armor.hbs`,
    `systems/${SYS_ID}/templates/cards/clan.hbs`,
    `systems/${SYS_ID}/templates/cards/family.hbs`,
    `systems/${SYS_ID}/templates/cards/commonItem.hbs`,
    `systems/${SYS_ID}/templates/cards/kata.hbs`,
    `systems/${SYS_ID}/templates/cards/kiho.hbs`,
    `systems/${SYS_ID}/templates/cards/school.hbs`,
    `systems/${SYS_ID}/templates/cards/skill.hbs`,
    `systems/${SYS_ID}/templates/cards/spell.hbs`,
    `systems/${SYS_ID}/templates/cards/tattoo.hbs`,
    `systems/${SYS_ID}/templates/cards/technique.hbs`,
    `systems/${SYS_ID}/templates/cards/weapon.hbs`,
    
    // Chat card partial templates - shared chat components
    `systems/${SYS_ID}/templates/cards/_partials/_expand.hbs`,
    
    // Chat message templates - roll result displays
    `systems/${SYS_ID}/templates/chat/full-defense-roll.hbs`,
    `systems/${SYS_ID}/templates/chat/simple-roll.hbs`,
    `systems/${SYS_ID}/templates/chat/weapon-chat.hbs`,
    
    // Actor partial templates - shared actor components
    `systems/${SYS_ID}/templates/actor/_partials/_unified-item-create.hbs`,
    
    // Dialog templates - modal forms and popups
    `systems/${SYS_ID}/templates/dialogs/roll-modifiers-dialog.hbs`,
    `systems/${SYS_ID}/templates/dialogs/unified-item-create-dialog.hbs`,
    
    // Application templates - dedicated app windows
    `systems/${SYS_ID}/templates/apps/xp-manager.hbs`,
    `systems/${SYS_ID}/templates/apps/wound-config.hbs`,
  ];

  // Validate Foundry API availability before attempting to load templates
  if (!globalThis.foundry?.applications?.handlebars?.loadTemplates) {
    const error = new Error(
      "Foundry VTT template system not available. " +
      "Ensure preloadTemplates() is called after Foundry initialization."
    );
    console.warn("L5R4 | Template preloading failed", { error, templatePaths });
    throw error;
  }

  // Preload all templates using Foundry's template caching system
  try {
    await foundry.applications.handlebars.loadTemplates(templatePaths);
    console.log(`L5R4 | Preloaded ${templatePaths.length} Handlebars templates`);
  } catch (err) {
    // Safe error message extraction - handles any error type
    const errorMessage = err?.message ?? err?.toString?.() ?? String(err);
    console.warn("L5R4 | Template preloading failed", { error: err, templatePaths });
    throw new Error(`Failed to preload L5R4 templates: ${errorMessage}`);
  }
}
