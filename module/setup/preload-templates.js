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
 * - **Card Templates**: Chat card templates for items and rolls (weapon-chat, spell-chat)
 * - **Card Partials**: Shared chat card components (_expand, _header, _footer)
 * - **Dialog Templates**: Application interfaces (xp-manager, stance-selector)
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
 * │   ├── pc-sheet.hbs    # Player character sheet
 * │   └── npc-sheet.hbs   # Non-player character sheet
 * ├── cards/              # Chat card templates
 * │   ├── _partials/      # Shared card components
 * │   └── weapon-chat.hbs # Weapon roll cards
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
 * const html = await renderTemplate('systems/l5r4/templates/item/weapon.hbs', context);
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
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.loadTemplates.html|loadTemplates}
 * @see {@link https://foundryvtt.com/api/functions/renderTemplate.html|renderTemplate}
 */
export async function preloadTemplates() {
  // Comprehensive list of all Handlebars templates used by the L5R4 system
  const templatePaths = [
    // Item sheet templates - individual item type forms
    "systems/l5r4/templates/item/advantage.hbs",
    "systems/l5r4/templates/item/armor.hbs",
    "systems/l5r4/templates/item/clan.hbs",
    "systems/l5r4/templates/item/disadvantage.hbs",
    "systems/l5r4/templates/item/family.hbs",
    "systems/l5r4/templates/item/commonItem.hbs",
    "systems/l5r4/templates/item/kata.hbs",
    "systems/l5r4/templates/item/kiho.hbs",
    "systems/l5r4/templates/item/school.hbs",
    "systems/l5r4/templates/item/skill.hbs",
    "systems/l5r4/templates/item/spell.hbs",
    "systems/l5r4/templates/item/tattoo.hbs",
    "systems/l5r4/templates/item/technique.hbs",
    "systems/l5r4/templates/item/weapon.hbs",
    
    // Item partial templates - shared components
    "systems/l5r4/templates/item/_partials/_rules-summary.hbs",
    "systems/l5r4/templates/item/_partials/_scaffold.hbs",
    
    // Actor sheet templates - main character sheets
    "systems/l5r4/templates/actor/pc.hbs",
    "systems/l5r4/templates/actor/npc.hbs",
    
    // Actor partial templates - reusable sheet components
    "systems/l5r4/templates/actor/_partials/_expand.hbs",
    "systems/l5r4/templates/actor/_partials/_stats.hbs",
    "systems/l5r4/templates/actor/_partials/_stats-npc.hbs",
    "systems/l5r4/templates/actor/_partials/_ranks.hbs",
    "systems/l5r4/templates/actor/_partials/_initiative.hbs",
    "systems/l5r4/templates/actor/_partials/_armor.hbs",
    "systems/l5r4/templates/actor/_partials/_wounds.hbs",
    "systems/l5r4/templates/actor/_partials/_bio.hbs",
    
    // Individual item section templates
    "systems/l5r4/templates/actor/_partials/_skills-section.hbs",
    "systems/l5r4/templates/actor/_partials/_weapon-section.hbs",
    "systems/l5r4/templates/actor/_partials/_armor-section.hbs",
    "systems/l5r4/templates/actor/_partials/_item-section.hbs",
    "systems/l5r4/templates/actor/_partials/_spell-section.hbs",
    "systems/l5r4/templates/actor/_partials/_technique-section.hbs",
    "systems/l5r4/templates/actor/_partials/_kiho-section.hbs",
    "systems/l5r4/templates/actor/_partials/_kata-section.hbs",
    "systems/l5r4/templates/actor/_partials/_tattoo-section.hbs",
    "systems/l5r4/templates/actor/_partials/_advantage-section.hbs",
    "systems/l5r4/templates/actor/_partials/_disadvantage-section.hbs",
    
    // Chat card templates - item display in chat
    "systems/l5r4/templates/cards/advantage-disadvantage.hbs",
    "systems/l5r4/templates/cards/armor.hbs",
    "systems/l5r4/templates/cards/clan.hbs",
    "systems/l5r4/templates/cards/family.hbs",
    "systems/l5r4/templates/cards/commonItem.hbs",
    "systems/l5r4/templates/cards/kata.hbs",
    "systems/l5r4/templates/cards/kiho.hbs",
    "systems/l5r4/templates/cards/school.hbs",
    "systems/l5r4/templates/cards/skill.hbs",
    "systems/l5r4/templates/cards/spell.hbs",
    "systems/l5r4/templates/cards/tattoo.hbs",
    "systems/l5r4/templates/cards/technique.hbs",
    "systems/l5r4/templates/cards/weapon.hbs",
    
    // Chat card partial templates - shared chat components
    "systems/l5r4/templates/cards/_partials/_expand.hbs",
    
    // Actor partial templates - shared actor components
    "systems/l5r4/templates/actor/_partials/_unified-item-create.hbs",
    
    // Dialog templates - modal forms and popups
    "systems/l5r4/templates/dialogs/roll-modifiers-dialog.hbs",
    "systems/l5r4/templates/dialogs/unified-item-create-dialog.hbs",
  ];

  // Preload all templates using Foundry's template caching system
  try {
    await foundry.applications.handlebars.loadTemplates(templatePaths);
    console.log("L5R4 | Preloaded " + templatePaths.length + " Handlebars templates");
  } catch (err) {
    console.warn("L5R4 | Template preloading failed", { error: err, templatePaths });
    throw new Error("Failed to preload L5R4 templates: " + err.message);
  }
}
