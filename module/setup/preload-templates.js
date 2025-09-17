/**
 * @fileoverview L5R4 Template Preloader - Handlebars Template Caching for Foundry VTT v13+
 * 
 * This module preloads and caches all Handlebars templates used by the L5R4 system
 * to improve performance by eliminating template loading delays during runtime.
 * Templates are loaded during system initialization and cached in Foundry's template registry.
 *
 * **Template Categories:**
 * - **Item Templates**: Individual item type templates (advantage, weapon, spell, etc.)
 * - **Item Partials**: Shared components for item sheets (_rules-summary, _scaffold)
 * - **Actor Templates**: Main actor sheet templates (pc, npc)
 * - **Actor Partials**: Reusable actor sheet components (_stats, _skills, _equipment, etc.)
 * - **Card Templates**: Chat card templates for items and rolls
 * - **Card Partials**: Shared chat card components (_expand)
 *
 * **Performance Benefits:**
 * - **Eliminates Loading Delays**: Templates are cached at startup
 * - **Reduces Network Requests**: No runtime template fetching
 * - **Improves User Experience**: Faster sheet rendering and chat cards
 * - **Error Prevention**: Template loading errors caught during initialization
 *
 * **Template Organization:**
 * Templates follow a hierarchical structure:
 * - `templates/item/`: Item sheet templates
 * - `templates/actor/`: Actor sheet templates  
 * - `templates/cards/`: Chat card templates
 * - `templates/*\/partials/`: Reusable template components
 *
 * @author L5R4 System Team
 * @since 1.0.0
 * @version 2.1.0
 * @see {@link https://foundryvtt.com/api/functions/foundry.applications.handlebars.loadTemplates.html|loadTemplates}
 */
export async function preloadTemplates() {
  // Comprehensive list of all Handlebars templates used by the L5R4 system
  const templatePaths = [
    // Item sheet templates - individual item type forms
    "systems/l5r4/templates/item/advantage.hbs",
    "systems/l5r4/templates/item/armor.hbs",
    "systems/l5r4/templates/item/bow.hbs",
    "systems/l5r4/templates/item/clan.hbs",
    "systems/l5r4/templates/item/disadvantage.hbs",
    "systems/l5r4/templates/item/family.hbs",
    "systems/l5r4/templates/item/item.hbs",
    "systems/l5r4/templates/item/kata.hbs",
    "systems/l5r4/templates/item/kiho.hbs",
    "systems/l5r4/templates/item/school.hbs",
    "systems/l5r4/templates/item/skill.hbs",
    "systems/l5r4/templates/item/spell.hbs",
    "systems/l5r4/templates/item/tattoo.hbs",
    "systems/l5r4/templates/item/technique.hbs",
    "systems/l5r4/templates/item/weapon.hbs",
    
    // Item partial templates - shared components
    "systems/l5r4/templates/item/partials/_rules-summary.hbs",
    "systems/l5r4/templates/item/partials/_scaffold.hbs",
    
    // Actor sheet templates - main character sheets
    "systems/l5r4/templates/actor/pc.hbs",
    "systems/l5r4/templates/actor/npc.hbs",
    
    // Actor partial templates - reusable sheet components
    "systems/l5r4/templates/actor/_partials/_stats.hbs",
    "systems/l5r4/templates/actor/_partials/_stats-npc.hbs",
    "systems/l5r4/templates/actor/_partials/_ranks.hbs",
    "systems/l5r4/templates/actor/_partials/_initiative.hbs",
    "systems/l5r4/templates/actor/_partials/_armor.hbs",
    "systems/l5r4/templates/actor/_partials/_wounds.hbs",
    "systems/l5r4/templates/actor/_partials/_advantages.hbs",
    "systems/l5r4/templates/actor/_partials/_skills.hbs",
    "systems/l5r4/templates/actor/_partials/_equipment.hbs",
    "systems/l5r4/templates/actor/_partials/_bio.hbs",
    "systems/l5r4/templates/actor/_partials/_techniques.hbs",
    
    // Chat card templates - item display in chat
    "systems/l5r4/templates/cards/advantage-disadvantage.hbs",
    "systems/l5r4/templates/cards/armor.hbs",
    "systems/l5r4/templates/cards/clan.hbs",
    "systems/l5r4/templates/cards/family.hbs",
    "systems/l5r4/templates/cards/item.hbs",
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
