import { SYS_ID } from "../../module/config/constants.js";
import { RULE_KEYS } from "../../module/config/rule-keys.js";
import { createRule } from "../../module/data/rules/rule-models.js";
import { FamilyBonusService } from "../../module/services/family-bonus-service.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";
import { displayRollBonus } from "../../module/utils/mechanics.js";
import { getStanceEffectCreator } from "../../module/services/stance/core/effect-templates.js";
import { TraitRoll } from "../../module/services/dice/rolls/trait-roll.js";
import { getCreationFreeBonusSources } from "../../module/utils/xp-calculations.js";
import { migrateItemRules } from "../../module/setup/migrations/items/item-rules.js";
import { migrateStatusEffectRules } from "../../module/setup/migrations/actors/status-effect-rules.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createArmorData, createSkillData } from "../fixtures/item-fixtures.js";
import { changeThroughSheet, cleanTest, settleChatNotifications, watchConsole } from "./helpers.js";

/** The smallest valid source for each rule key; every other field takes its default. */
const MINIMAL_RULES = {
  RollModifier: { key: "RollModifier", selector: "attack" },
  TNModifier: { key: "TNModifier", selector: "spell" },
  ArmorTN: { key: "ArmorTN" },
  Reduction: { key: "Reduction" },
  Wounds: { key: "Wounds" },
  Initiative: { key: "Initiative" },
  FreeRaise: { key: "FreeRaise", selector: "skill:iaijutsu" },
  DiceRule: { key: "DiceRule", selector: "damage" },
  Substitute: {
    key: "Substitute",
    selector: "skill:kenjutsu",
    replace: "trait:agi",
    with: "trait:ref"
  },
  TraitAdjust: { key: "TraitAdjust", trait: "str" },
  Note: { key: "Note", selector: "attack", text: "Note" },
  RollOption: { key: "RollOption", option: "quench" }
};

/**
 * An advantage that carries the given rules.
 * @param {object[]} rules
 * @param {string} [name]
 * @returns {object} Item creation data.
 */
function ruleItem(rules, name = "Quench Rules") {
  return { name, type: "advantage", system: { rules } };
}

/**
 * An Active Effect that carries the given rules.
 * @param {object[]} rules
 * @returns {object} ActiveEffect creation data.
 */
function ruleEffect(rules) {
  return { name: "Quench rule effect", system: { rules } };
}

/**
 * Pre-rule-engine shape of a Family item: the Trait bonus as a transferred effect change.
 * @param {string} trait
 * @returns {object} Item creation data.
 */
function effectFamily(trait) {
  return {
    name: "Quench effect Family",
    type: "family",
    effects: [
      {
        name: "Family bonus",
        transfer: true,
        system: { changes: [{ key: `system.traits.${trait}`, type: "add", value: "1" }] }
      }
    ]
  };
}

/**
 * Registers the `rules` batch: the rule DataModels, the engine on real actors (items, effects, worn armor,
 * predicates), the converted mechanics (Family and School bonuses, skill bonus fields, Defense Stance, Mounted,
 * Master of Blood), their migrations, the item sheet's Rules tab, and a rule reaching a roll.
 * @param {object} quench  The Quench API object.
 */
export function registerRulesBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.rules`,
    context => {
      const { describe, it, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const actors = [];
      const messages = [];
      const track = actor => (actors.push(actor), actor);

      afterEach(async () => {
        for (const actor of actors.splice(0)) {
          await actor.delete();
        }
      });

      // Chat messages go after core's pop-up cards for them have shown (helpers.js settleChatNotifications)
      after(async function () {
        this.timeout(30_000);
        await settleChatNotifications();
        for (const message of messages) {
          await message.delete();
        }
      });

      describe("Rule data models", () => {
        it("every rule key has a model that fills its defaults", () => {
          assert.sameMembers(Object.keys(MINIMAL_RULES), [...RULE_KEYS]);
          for (const source of Object.values(MINIMAL_RULES)) {
            const rule = createRule(source);
            assert.equal(rule.key, source.key);
            assert.equal(rule.priority, 100, source.key);
            assert.deepEqual(rule.predicate, [], source.key);
          }
          assert.equal(createRule(MINIMAL_RULES.RollModifier).roll, 0);
          assert.equal(createRule(MINIMAL_RULES.RollModifier).type, "untyped");
          assert.equal(createRule(MINIMAL_RULES.FreeRaise).value, 1);
          assert.isNull(createRule(MINIMAL_RULES.DiceRule).explode);
          assert.isFalse(createRule(MINIMAL_RULES.RollOption).toggleable);
        });

        it("keeps formulas, numbers, and predicate objects", () => {
          const rule = createRule({
            key: "ArmorTN",
            value: "@rings.air + 1",
            predicate: ["status:defenseStance", { not: "status:prone" }, { gte: ["ring:air", 2] }]
          });
          assert.equal(rule.value, "@rings.air + 1");
          assert.deepEqual(rule.predicate[1], { not: "status:prone" });
          assert.equal(createRule({ key: "Reduction", value: 3 }).value, 3);
        });

        it("rejects an unknown key and invalid fields", () => {
          assert.throws(() => createRule({ key: "Nope" }), /Unknown rule key/);
          assert.throws(() => createRule({ key: "RollModifier" }), /selector/);
          assert.throws(() => createRule({ key: "TraitAdjust", trait: "luck" }), /trait/);
          assert.throws(
            () => createRule({ key: "ArmorTN", value: { n: 1 } }),
            /number or a formula/
          );
          assert.throws(() => createRule({ key: "ArmorTN", value: " " }), /number or a formula/);
          assert.throws(
            () => createRule({ key: "DiceRule", selector: "x", explode: "x" }),
            /explode/
          );
        });
      });

      describe("Engine on actors", () => {
        it(
          "a rule on an item and a rule on an effect reach Armor TN, Reduction, Wounds, and Initiative",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules engine" }));
            const before = {
              armor: actor.system.armorTn.current,
              reduction: actor.system.armorTn.reduction,
              healthy: actor.system.woundLevels.healthy.value,
              init: actor.system.initiative.roll
            };
            await actor.createEmbeddedDocuments("Item", [
              ruleItem([
                { key: "Reduction", value: 2 },
                { key: "Wounds", perRank: 3 },
                { key: "Initiative", roll: 1 }
              ])
            ]);
            await actor.createEmbeddedDocuments("ActiveEffect", [
              ruleEffect([{ key: "ArmorTN", value: 5 }])
            ]);
            assert.equal(actor.system.armorTn.current, before.armor + 5);
            assert.equal(actor.system.armorTn.reduction, before.reduction + 2);
            assert.equal(actor.system.woundLevels.healthy.value, before.healthy + 3);
            assert.equal(actor.system.initiative.roll, before.init + 1);
          })
        );

        it(
          "a disabled effect's rules do not apply",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules disabled" }));
            const before = actor.system.armorTn.current;
            await actor.createEmbeddedDocuments("ActiveEffect", [
              { ...ruleEffect([{ key: "ArmorTN", value: 5 }]), disabled: true }
            ]);
            assert.equal(actor.system.armorTn.current, before);
          })
        );

        it(
          "a rule on unworn armor does not apply; worn, it does",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules armor" }));
            const [armor] = await actor.createEmbeddedDocuments("Item", [
              createArmorData("Quench Armor", 0, 0, {
                system: { rules: [{ key: "ArmorTN", value: 4 }] }
              })
            ]);
            const unworn = actor.system.armorTn.current;
            assert.notInclude([...actor.rollOptions], "armor:worn");
            await armor.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.current, unworn + 4);
            assert.include([...actor.rollOptions], "armor:worn");
          })
        );

        it(
          "seeds roll options from statuses, Rings, Traits, and the Wound Rank",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules options" }));
            await actor.toggleStatusEffect("prone", { active: true });
            const options = [...actor.rollOptions];
            assert.include(options, "status:prone");
            assert.include(options, `ring:air:${actor.system.rings.air}`);
            assert.include(options, `trait:ref:${actor.system._derived.traitsEff.ref}`);
            assert.include(options, `ring:void:${actor.system.rings.void.rank}`);
            assert.include(options, "wound:healthy");
          })
        );

        it(
          "a predicate gates a rule on the actor's options",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules predicate" }));
            await actor.createEmbeddedDocuments("Item", [
              ruleItem([{ key: "ArmorTN", value: 3, predicate: ["status:prone"] }])
            ]);
            const standing = actor.system.armorTn.current;
            await actor.toggleStatusEffect("prone", { active: true });
            // Prone itself lowers Armor TN by 10 (condition-effects.js); the rule adds 3 back
            assert.equal(actor.system.armorTn.current, Math.max(5, standing - 10 + 3));
          })
        );

        it(
          "a RollOption rule turns on a predicate of another rule",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules option" }));
            const before = actor.system.armorTn.current;
            const [item] = await actor.createEmbeddedDocuments("Item", [
              ruleItem([
                { key: "RollOption", option: "higher-ground", toggleable: true, value: false },
                { key: "ArmorTN", value: 2, predicate: ["higher-ground"] }
              ])
            ]);
            assert.equal(actor.system.armorTn.current, before);
            const rules = foundry.utils.deepClone(item._source.system.rules);
            rules[0].value = true;
            await item.update({ "system.rules": rules });
            assert.equal(actor.system.armorTn.current, before + 2);
          })
        );

        it("an invalid rule warns once and the other rules still apply", async () => {
          const watch = watchConsole(["warn"]);
          try {
            const actor = track(await createTestPC({ name: "Rules invalid" }));
            const before = actor.system.armorTn.current;
            await actor.createEmbeddedDocuments("Item", [
              ruleItem([
                { key: "ArmorTN", value: "nope(" },
                { key: "Nope" },
                { key: "ArmorTN", value: 1 }
              ])
            ]);
            await actor.update({ "system.suffered": 1 });
            assert.equal(actor.system.armorTn.current, before + 1);
          } finally {
            watch.stop();
          }
          const ruleWarnings = watch.messages.filter(m => m.includes("Quench Rules"));
          assert.lengthOf(ruleWarnings, 2, ruleWarnings.join("\n"));
        });

        it(
          "a RollModifier on a Trait reaches the Trait roll",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules roll" }));
            const ref = actor.system._derived.traitsEff.ref;
            await actor.createEmbeddedDocuments("Item", [
              ruleItem([{ key: "RollModifier", selector: "trait:ref", roll: 1, keep: 1 }])
            ]);
            assert.deepEqual(displayRollBonus(actor, { trait: "ref" }), {
              roll: 1,
              keep: 1,
              total: 0
            });
            const message = await TraitRoll({
              actor,
              traitName: "ref",
              traitRank: ref,
              askForOptions: false
            });
            messages.push(message);
            assert.include(message.rolls[0].formula, `${ref + 1}d10k${ref + 1}x10`);
          })
        );
      });

      describe("Converted mechanics", () => {
        it(
          "a Family TraitAdjust rule raises the Trait and its Ring, and XP and the Trait arrows read it",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules family" }));
            const [family] = await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench Family",
                type: "family",
                system: { rules: [{ key: "TraitAdjust", trait: "str", value: 1 }] }
              }
            ]);
            await actor.setFlag(SYS_ID, "familyItemUuid", family.uuid);
            assert.equal(actor.system.traits.str, actor._source.system.traits.str + 1);
            assert.equal(FamilyBonusService.getBonus(actor, "str"), 1);
            assert.deepEqual(getCreationFreeBonusSources(actor, "str"), { rules: 1, legacy: 0 });
          })
        );

        it(
          "a School TraitAdjust rule on the Void Ring raises it",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules void" }));
            const before = actor.system.rings.void.rank;
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench School",
                type: "school",
                system: { rules: [{ key: "TraitAdjust", trait: "void", value: 1 }] }
              }
            ]);
            assert.equal(actor.system.rings.void.rank, before + 1);
          })
        );

        it(
          "skill bonus fields act as a RollModifier and reach the skill's formula, as in 3.2.1",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules skill" }));
            const [skill] = await actor.createEmbeddedDocuments("Item", [
              createSkillData("Kenjutsu", 2, "agi", {
                system: { rollBonus: 1, keepBonus: 1, totalBonus: 3 }
              })
            ]);
            const agi = actor.system._derived.traitsEff.agi;
            assert.deepEqual(displayRollBonus(actor, { skill: "kenjutsu" }), {
              roll: 1,
              keep: 1,
              total: 3
            });
            assert.equal(skill.system.rollFormula, `${agi + 2 + 1}k${agi + 1}`);
          })
        );

        for (const [path, create] of [
          [
            "the stance template",
            actor =>
              actor.createEmbeddedDocuments("ActiveEffect", [
                getStanceEffectCreator("defenseStance")(actor)
              ])
          ],
          [
            "the token status toggle",
            actor => actor.toggleStatusEffect("defenseStance", { active: true })
          ]
        ]) {
          it(
            `Defense Stance from ${path} adds Air Ring plus Defense rank to Armor TN (p.84)`,
            clean(async () => {
              const actor = track(
                await createTestPC({
                  name: "Rules defense",
                  system: { traits: { ref: 3, awa: 3 } }
                })
              );
              await actor.createEmbeddedDocuments("Item", [createSkillData("Defense", 2, "ref")]);
              const before = actor.system.armorTn.current;
              await create(actor);
              assert.equal(actor.system.rings.air, 3);
              assert.equal(actor.system.armorTn.current, before + 3 + 2);
            })
          );
        }

        it(
          "Defense Stance keeps its bonus under a Stunned Armor TN override, as in 3.2.1",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules defense stunned" }));
            await actor.toggleStatusEffect("stunned", { active: true });
            const stunned = actor.system.armorTn.current;
            await actor.toggleStatusEffect("defenseStance", { active: true });
            assert.equal(actor.system.armorTn.current, stunned + actor.system.rings.air);
          })
        );

        it(
          "Mounted gives +1k0 on attacks against an unmounted target only (p.89)",
          clean(async () => {
            const rider = track(await createTestPC({ name: "Rules rider" }));
            const target = track(await createTestNPC({ name: "Rules target" }));
            const attackBonus = against => {
              const { modifiers } = collectCheck(rider, { kind: "attack", target: against });
              return modifiers.reduce((sum, m) => [sum[0] + m.roll, sum[1] + m.keep], [0, 0]);
            };
            assert.deepEqual(attackBonus(target), [0, 0]);
            await rider.toggleStatusEffect("mounted", { active: true });
            assert.deepEqual(attackBonus(target), [1, 0]);
            assert.deepEqual(attackBonus(null), [0, 0]);
            await target.toggleStatusEffect("mounted", { active: true });
            assert.deepEqual(attackBonus(target), [0, 0]);
          })
        );

        it(
          "Master of Blood is a RollOption the maho roll reads",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules maho" }));
            assert.isFalse(actor.rollOptions.has("master-of-blood"));
            await actor.createEmbeddedDocuments("Item", [
              ruleItem([{ key: "RollOption", option: "master-of-blood" }], "Master of Blood")
            ]);
            assert.isTrue(actor.rollOptions.has("master-of-blood"));
          })
        );
      });

      /**
       * Run migrateItemRules, holding back its summary warning (migrations report what they changed on
       * console.warn) so cleanTest still catches any other warning.
       * @param {Item[]} items
       */
      const migrateItems = async items => {
        const warn = console.warn;
        const held = [];
        console.warn = (...args) => held.push(args.join(" "));
        try {
          await migrateItemRules(items, "quench");
        } finally {
          console.warn = warn;
        }
        for (const message of held) {
          assert.match(message, /Moved the mechanics of \d+ items into rules/);
        }
      };

      describe("Migrations into rules", () => {
        it(
          "a Family Trait effect becomes a TraitAdjust rule, the Trait stays the same, and running again changes nothing",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules migrate family" }));
            const [family] = await actor.createEmbeddedDocuments("Item", [effectFamily("agi")]);
            const agi = actor.system.traits.agi;
            assert.equal(
              agi,
              actor._source.system.traits.agi + 1,
              "the effect applies before the migration"
            );

            await migrateItems(actor.items.contents);
            assert.deepEqual(family._source.system.rules, [
              { key: "TraitAdjust", trait: "agi", value: 1 }
            ]);
            assert.equal(family.effects.size, 0, "the emptied effect is deleted");
            assert.equal(actor.system.traits.agi, agi);

            await migrateItems(actor.items.contents);
            assert.lengthOf(family._source.system.rules, 1);
          })
        );

        it(
          "a Master of Blood advantage gets its RollOption once",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules migrate maho" }));
            const [item] = await actor.createEmbeddedDocuments("Item", [
              { name: "Master of Blood", type: "advantage" }
            ]);
            await migrateItems(actor.items.contents);
            await migrateItems(actor.items.contents);
            assert.deepEqual(item._source.system.rules, [
              { key: "RollOption", option: "master-of-blood" }
            ]);
            assert.isTrue(actor.rollOptions.has("master-of-blood"));
          })
        );

        it(
          "a Defense Stance effect made without rules gets them back",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules migrate stance" }));
            const before = actor.system.armorTn.current;
            await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Defense Stance", statuses: ["defenseStance"] }
            ]);
            assert.equal(actor.system.armorTn.current, before, "no rules, no bonus");
            await migrateStatusEffectRules([actor], "quench");
            assert.equal(actor.system.armorTn.current, before + actor.system.rings.air);
            await migrateStatusEffectRules([actor], "quench");
            assert.lengthOf(actor.effects.contents[0]._source.system.rules, 1);
          })
        );
      });

      describe("Item sheet Rules tab", () => {
        it(
          "saves JSON typed into the Rules field as system.rules",
          clean(async () => {
            const [item] = await Item.createDocuments([ruleItem([], "Quench sheet rules")]);
            try {
              const sheet = item.sheet;
              await sheet.render({ force: true });
              const json = '[{"key": "ArmorTN", "value": 2}]';
              await changeThroughSheet(sheet, "textarea[name=rulesJson]", json);
              assert.deepEqual(item._source.system.rules, [{ key: "ArmorTN", value: 2 }]);
              assert.equal(
                JSON.parse(sheet.element.querySelector("textarea[name=rulesJson]").value)[0].value,
                2
              );
              await sheet.close();
            } finally {
              await item.delete();
            }
          })
        );

        it("shows an error and saves nothing for text that is not a list of rules", async () => {
          const [item] = await Item.createDocuments([
            ruleItem([{ key: "Note", selector: "attack", text: "Kept" }], "Quench sheet bad rules")
          ]);
          const errors = [];
          const notify = ui.notifications.notify;
          ui.notifications.notify = function (message, type, options = {}) {
            if (type === "error") {
              errors.push(message);
            }
            return notify.call(this, message, type, { ...options, console: false });
          };
          const watch = watchConsole(["error"]);
          try {
            const sheet = item.sheet;
            await sheet.render({ force: true });
            for (const text of ["[{", '{"key": "Note"}']) {
              const input = sheet.element.querySelector("textarea[name=rulesJson]");
              input.value = text;
              input.dispatchEvent(new Event("change", { bubbles: true }));
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            await sheet.close();
          } finally {
            watch.stop();
            ui.notifications.notify = notify;
          }
          assert.lengthOf(errors, 2, errors.join("\n"));
          assert.match(errors[0], /not valid JSON/);
          assert.match(errors[1], /JSON list of objects/);
          assert.deepEqual(item._source.system.rules, [
            { key: "Note", selector: "attack", text: "Kept" }
          ]);
          await item.delete();
        });
      });
    },
    { displayName: "L5R4: Rule engine" }
  );
}
