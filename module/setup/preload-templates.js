/**
 * Preload Handlebars templates used by this system.
 * Foundry v13: `loadTemplates(string[])` preloads and caches the requested paths.
 * We add the new actor sheet entrypoints introduced in steps 5.14–5.15.
 * @returns {Promise<void>}
 */
export async function preloadTemplates() {
  const templatePaths = [
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
    "systems/l5r4/templates/item/partials/_rules-summary.hbs",
    "systems/l5r4/templates/item/partials/_scaffold.hbs",
    "systems/l5r4/templates/actor/pc.hbs",
    "systems/l5r4/templates/actor/npc.hbs",
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
    "systems/l5r4/templates/cards/advantage-disadvantage.hbs",
    "systems/l5r4/templates/cards/_partials/_expand.hbs",
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
  ];

  try {
    await foundry.applications.handlebars.loadTemplates(templatePaths);
  } catch (err) {
    console.warn("L5R4", "Failed to preload templates", { err, templatePaths });
  }
}
