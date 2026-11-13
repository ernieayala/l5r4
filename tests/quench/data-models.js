import { SYS_ID } from "../../module/config/constants.js";

/**
 * Stored paths 3.2.1 kept in template.json that the data models no longer store, by roadmap Stage 2 decision:
 * derived values (decision 4) and PC `armor`, which is NPC-only (decision 6); and by Stage 9, the Void-on-Armor-TN
 * marker, which is an effect now. Paths are relative to `system`.
 * @type {Record<string, string[]>}
 */
const NOT_STORED = {
  pc: [
    "rings.air",
    "rings.earth",
    "rings.fire",
    "rings.water",
    "woundLevels",
    "wounds.value",
    "wounds.healRate",
    "insight.points",
    "armorTn.reduction",
    "armorTn.current",
    "armorTn.useVoid",
    "armorTn.voidRound",
    "initiative.roll",
    "initiative.keep",
    "armor"
  ],
  npc: [
    "rings.air",
    "rings.earth",
    "rings.fire",
    "rings.water",
    "woundLevels",
    "wounds.value",
    "wounds.healRate"
  ]
};

/**
 * The 3.2.1 default for each stored leaf of one subtype: its templates merged with its own fields.
 * @param {object} section   template.json's Actor or Item section.
 * @param {string} type
 * @returns {Record<string, *>}  Defaults keyed by dotted path.
 */
function templateDefaults(section, type) {
  const { templates: names = [], ...own } = section[type];
  const merged = foundry.utils.mergeObject(
    names.reduce((all, name) => foundry.utils.mergeObject(all, section.templates[name]), {}),
    own
  );
  return foundry.utils.flattenObject(merged);
}

/**
 * Batch `l5r4-enhanced.data-models` (roadmap Stage 2): each subtype's stored defaults equal the 3.2.1 template.json
 * defaults, apart from the paths the stage decisions stop storing, and source shaped by older versions migrates
 * when a document is built from it.
 * @param {object} quench  The Quench API object.
 */
export function registerDataModelsBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.data-models`,
    context => {
      const { describe, it, before, assert } = context;
      let template;

      before(async () => {
        template = await (
          await fetch(`systems/${SYS_ID}/tests/fixtures/template-3.2.1.json`)
        ).json();
      });

      describe("Defaults match 3.2.1", () => {
        for (const [documentName, types] of Object.entries(game.system.documentTypes)) {
          if (documentName !== "Actor" && documentName !== "Item") {
            continue;
          }
          for (const type of Object.keys(types)) {
            it(`${documentName} ${type}`, () => {
              const cls = getDocumentClass(documentName);
              const stored = new cls({ name: `Defaults ${type}`, type })._source.system;
              const skipped = NOT_STORED[type] ?? [];
              for (const [path, expected] of Object.entries(
                templateDefaults(template[documentName], type)
              )) {
                if (skipped.some(prefix => path === prefix || path.startsWith(`${prefix}.`))) {
                  assert.isUndefined(
                    foundry.utils.getProperty(stored, path),
                    `${type} system.${path} not stored`
                  );
                  continue;
                }
                const actual = foundry.utils.getProperty(stored, path);
                // keywords is text now (decision 8): the 3.2.1 [] default is "".
                const want = path === "keywords" ? "" : expected;
                assert.deepEqual(actual, want, `${type} system.${path}`);
              }
            });
          }
        }
      });

      describe("Older source migrates on load", () => {
        it("NPC wound_lvl and armor_tn", () => {
          const cls = getDocumentClass("Actor");
          const npc = new cls({
            name: "Legacy NPC",
            type: "npc",
            system: {
              armor: { armor_tn: 25 },
              wound_lvl: {
                healthy: { value: "12", penalty: "0" },
                nicked: { value: 18, penalty: -3 }
              }
            }
          });
          assert.equal(npc.system.armor.armorTn, 25);
          assert.deepEqual(npc._source.system.manualWoundLevels.healthy, {
            value: 12,
            penalty: 0,
            active: true
          });
          assert.deepEqual(npc._source.system.manualWoundLevels.nicked, {
            value: 18,
            penalty: 3,
            active: true
          });
          assert.notProperty(npc._source.system, "wound_lvl");
        });

        it("PC Traits stored as {rank} and snake_case keys", () => {
          const cls = getDocumentClass("Actor");
          const pc = new cls({
            name: "Legacy PC",
            type: "pc",
            system: {
              traits: { ref: { rank: 4 } },
              shadow_taint: { rank: 1, points: 2 },
              initiative: { roll_mod: 1 }
            }
          });
          assert.equal(pc._source.system.traits.ref, 4);
          assert.deepEqual(pc._source.system.shadowTaint, { rank: 1, points: 2 });
          assert.equal(pc._source.system.initiative.rollMod, 1);
        });

        it("Skill snake_case keys, armor misspellings, keywords arrays", () => {
          const cls = getDocumentClass("Item");
          const skill = new cls({
            name: "Legacy Skill",
            type: "skill",
            system: { mastery_3: "m3", roll_bonus: 2 }
          });
          assert.equal(skill._source.system.mastery3, "m3");
          assert.equal(skill._source.system.rollBonus, 2);
          const armor = new cls({
            name: "Legacy Armor",
            type: "armor",
            system: { equiped: true, keywords: ["Samurai", "Heavy"] }
          });
          assert.isTrue(armor._source.system.equipped);
          assert.equal(armor._source.system.keywords, "Samurai, Heavy");
        });
      });

      describe("Prepared values are derived, not stored", () => {
        it("a PC's Rings, Armor TN, and Initiative pool come from its Traits", () => {
          const cls = getDocumentClass("Actor");
          const pc = new cls({
            name: "Derived PC",
            type: "pc",
            system: { traits: { ref: 3, awa: 4, sta: 2, wil: 3 } }
          });
          assert.equal(pc.system.rings.air, 3, "Air = lower of Reflexes and Awareness");
          assert.equal(pc.system.rings.earth, 2, "Earth = lower of Stamina and Willpower");
          assert.equal(pc.system.armorTn.current, 20, "Armor TN = Reflexes x 5 + 5");
          assert.notProperty(pc._source.system.rings, "air");
          assert.notProperty(pc._source.system.armorTn, "current");
        });
      });
    },
    { displayName: "L5R4: Data models" }
  );
}
