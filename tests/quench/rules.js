import { SYS_ID } from "../../module/config/constants.js";
import { RULE_KEYS } from "../../module/config/rule-keys.js";
import { createRule } from "../../module/data/rules/rule-models.js";
import { FamilyBonusService } from "../../module/services/family-bonus-service.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";
import { displayRollBonus } from "../../module/utils/mechanics.js";
import { T } from "../../module/utils/localization.js";
import { applyEffect } from "../../module/services/effects/apply.js";
import { TraitRoll } from "../../module/services/dice/rolls/trait-roll.js";
import { SkillRoll } from "../../module/services/dice/rolls/skill-roll.js";
import { getCreationFreeBonusSources } from "../../module/utils/xp-calculations.js";
import { migrateItemRules } from "../../module/setup/migrations/items/item-rules.js";
import { migrateStatusEffectRules } from "../../module/setup/migrations/actors/status-effect-rules.js";
import { migrateUnlinkedTokens } from "../../module/setup/migrations/actors/unlinked-tokens.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createArmorData, createSkillData } from "../fixtures/item-fixtures.js";
import {
  changeThroughSheet,
  cleanTest,
  settleChatNotifications,
  waitFor,
  watchConsole
} from "./helpers.js";

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
  RollOption: { key: "RollOption", option: "quench" },
  Movement: { key: "Movement" },
  ApplyCondition: { key: "ApplyCondition", selector: "attack", condition: "dazed" },
  ConditionImmunity: { key: "ConditionImmunity", condition: "feared" },
  PeriodicSave: { key: "PeriodicSave", roll: "ring:earth" },
  Resource: { key: "Resource", slug: "void" },
  DamageSource: { key: "DamageSource" },
  Invulnerability: { key: "Invulnerability" },
  Spirit: { key: "Spirit" },
  OpponentModifier: { key: "OpponentModifier", selector: "attack" },
  RaiseRule: { key: "RaiseRule", selector: "attack" },
  UnskilledAs: { key: "UnskilledAs", selector: "skill-type:bugei" },
  ActionCost: { key: "ActionCost", selector: "attack" },
  Cost: { key: "Cost", selector: "self" },
  Ledger: { key: "Ledger" },
  Prerequisite: { key: "Prerequisite" },
  ChoiceSet: { key: "ChoiceSet" },
  GrantItem: { key: "GrantItem", uuid: "Item.quench" }
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
          assert.equal(createRule(MINIMAL_RULES.ArmorTN).mode, "add");
          assert.isNull(createRule(MINIMAL_RULES.ArmorTN).range);
          assert.isFalse(createRule(MINIMAL_RULES.RollModifier).optional);
          assert.deepInclude(createRule(MINIMAL_RULES.PeriodicSave), {
            event: "roundEnd",
            tn: 20,
            step: 0,
            min: 5,
            onFailure: "retry"
          });
          assert.deepInclude(createRule(MINIMAL_RULES.Resource), { max: 1, per: "round" });
          assert.isNull(createRule(MINIMAL_RULES.ApplyCondition).level);
          assert.equal(createRule(MINIMAL_RULES.Cost).value, "@cost");
          assert.deepInclude(createRule(MINIMAL_RULES.Ledger), {
            track: "honor",
            direction: "gain",
            value: "@points"
          });
          assert.deepInclude(createRule(MINIMAL_RULES.ChoiceSet), {
            flag: "choice",
            selection: null
          });
          assert.deepInclude(createRule(MINIMAL_RULES.GrantItem), {
            rank: 0,
            skillRank: 1,
            emphasis: ""
          });
          assert.equal(createRule(MINIMAL_RULES.ActionCost).action, "simple");
          assert.deepInclude(createRule(MINIMAL_RULES.RaiseRule), {
            maneuver: null,
            cost: 0,
            cap: 0,
            minimum: 0
          });
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
            // Prone's own -10 counts against melee attacks only (p.89), so the Armor TN shows the rule's +3
            assert.equal(actor.system.armorTn.current, standing + 3);
            assert.equal(actor.system.armorTn.vs.melee, -10);
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
          "a RollModifier on a Trait reaches the Trait roll made without the dialog (#42)",
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
            assert.include(message.rolls[0].formula, `${ref + 1}d10xa10k${ref + 1}`);
          })
        );

        it(
          "Mounted gives +1k0 to a Skill weapon attack on an unmounted target (p.89; #41)",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules rider" }));
            const target = track(await createTestNPC({ name: "Rules footman" }));
            const [, katana] = await actor.createEmbeddedDocuments("Item", [
              createSkillData("Kenjutsu", 2, "agi"),
              { name: "Katana", type: "weapon", system: { associatedSkill: "kenjutsu" } }
            ]);
            await actor.toggleStatusEffect("mounted", { active: true });
            const [token] = await canvas.scene.createEmbeddedDocuments("Token", [
              (await target.getTokenDocument({ x: 0, y: 0 })).toObject()
            ]);
            try {
              await waitFor(() => token.object);
              canvas.tokens.setTargets([token.id]);
              const agi = actor.system.traits.agi;
              const message = await SkillRoll({
                actor,
                actorTrait: agi,
                skillRank: 2,
                skillName: "Kenjutsu",
                skillTrait: "agi",
                askForOptions: false,
                rollType: "attack",
                weaponId: katana.id
              });
              messages.push(message);
              assert.deepInclude(
                message.system.pool,
                { roll: agi + 3, keep: agi },
                "Agility + 2 + 1"
              );
            } finally {
              canvas.tokens.setTargets([]);
              await token.delete();
            }
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
          "Insight counts a School's Void bonus but not an effect's (p.104)",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules insight" }));
            const before = actor.system.insight.points;
            await actor.createEmbeddedDocuments("Item", [
              {
                name: "Quench School",
                type: "school",
                system: { rules: [{ key: "TraitAdjust", trait: "void", value: 1 }] }
              }
            ]);
            assert.equal(actor.system.insight.points, before + 10, "the School's Void rank");
            await actor.createEmbeddedDocuments("ActiveEffect", [
              ruleEffect([
                { key: "TraitAdjust", trait: "void", value: 1 },
                { key: "TraitAdjust", trait: "str", value: 1 },
                { key: "TraitAdjust", trait: "per", value: 1 }
              ])
            ]);
            assert.equal(actor.system.rings.void.rank, actor._source.system.rings.void.rank + 2);
            assert.equal(actor.system.rings.water, actor._source.system.traits.str + 1);
            assert.equal(
              actor.system.insight.points,
              before + 10,
              "the effect's ranks do not count"
            );
          })
        );

        it(
          "a Lost character adds the Taint Rank to physical Trait rolls and has no Void Points (p.279)",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules lost" }));
            await actor.update({ "system.shadowTaint.rank": 5 });
            assert.equal(actor.system.rings.void.max, 0, "no Void Points");
            const lost = T("l5r4.ui.taint.lost");
            const bonusOn = spec =>
              collectAndRoll(actor, spec).then(message =>
                message.system.modifiers.filter(m => m.label === lost).map(m => m.total)
              );
            assert.deepEqual(await bonusOn({ traitName: "agi" }), [5], "Agility");
            assert.deepEqual(await bonusOn({ traitName: "int" }), [], "Intelligence is mental");
            await actor.update({ "system.shadowTaint.rank": 4 });
            assert.deepEqual(await bonusOn({ traitName: "agi" }), [], "Rank 4 is not Lost");
            assert.equal(
              actor.system.rings.void.max,
              actor.system.rings.void.rank - 1,
              "Level 4: one less"
            );
          })
        );

        it(
          "a wound penalty modifier never gives Healthy a penalty (p.82)",
          clean(async () => {
            const pc = track(await createTestPC({ name: "Rules healthy" }));
            const npc = track(await createTestNPC({ name: "Rules healthy NPC" }));
            for (const actor of [pc, npc]) {
              await actor.update({ "system.woundsPenaltyMod": 5 });
              assert.equal(actor.system.woundLevels.healthy.penaltyEff, 0, actor.type);
              assert.equal(actor.system.woundLevels.nicked.penaltyEff, 8, "Nicked 3 + 5");
            }
            // The NPC sheet's rows
            assert.equal(npc.system.visibleWoundLevels.healthy.penaltyEff, 0);
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
          ["the stance template", actor => applyEffect(actor, "defenseStance")],
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
          "a Stunned Armor TN is 5 plus armor; the Defense Stance adds nothing to it (p.89; STAGE-09 decision 3)",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules defense stunned" }));
            await actor.toggleStatusEffect("stunned", { active: true });
            const stunned = actor.system.armorTn.current;
            assert.equal(stunned, 5 + actor.system.armorTn.bonus);
            await actor.toggleStatusEffect("defenseStance", { active: true });
            assert.equal(actor.system.armorTn.current, stunned);
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
          "a Skill at Rank 10 gives a Free Raise on its own rolls (p.133)",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules mastery" }));
            const [skill] = await actor.createEmbeddedDocuments("Item", [
              createSkillData("Kenjutsu", 9, "agi")
            ]);
            assert.equal(collectCheck(actor, { kind: "skill", skill: "kenjutsu" }).freeRaises, 0);
            await skill.update({ "system.rank": 10 });
            assert.equal(collectCheck(actor, { kind: "skill", skill: "kenjutsu" }).freeRaises, 1);
            assert.equal(
              collectCheck(actor, { kind: "skill", skill: "iaijutsu" }).freeRaises,
              0,
              "only that Skill's rolls"
            );
          })
        );

        it(
          "modifiers of one type count once in the roll, as on the sheet",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules typed" }));
            await actor.createEmbeddedDocuments("Item", [
              ruleItem(
                [{ key: "RollModifier", selector: "trait", roll: 1, keep: 1, type: "kata" }],
                "Quench A"
              ),
              ruleItem(
                [{ key: "RollModifier", selector: "trait", roll: 1, keep: 1, type: "kata" }],
                "Quench B"
              )
            ]);
            const agi = actor.system.traits.agi;
            const message = await TraitRoll({
              actor,
              traitName: "agi",
              traitRank: agi,
              askForOptions: false
            });
            messages.push(message);
            assert.deepInclude(
              message.system.pool,
              { roll: agi + 1, keep: agi + 1 },
              "the Trait plus one +1k1"
            );
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
      /** A Trait roll with no dialog, kept for cleanup. */
      const collectAndRoll = async (actor, { traitName }) => {
        const message = await TraitRoll({
          actor,
          traitName,
          traitRank: actor.system.traits[traitName],
          askForOptions: false
        });
        messages.push(message);
        return message;
      };

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
          "an item's 3.2.1 Free Raises become a FreeRaise rule on any roll, once",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules migrate free raises" }));
            const [item] = await actor.createEmbeddedDocuments("Item", [
              { name: "Lucky charm", type: "commonItem", system: { freeRaises: 2 } }
            ]);
            await migrateItems(actor.items.contents);
            await migrateItems(actor.items.contents);
            assert.deepEqual(item._source.system.rules, [
              { key: "FreeRaise", selector: "any", value: 2 }
            ]);
            assert.equal(item._source.system.freeRaises, 0);
            assert.equal(collectCheck(actor, { kind: "skill" }).freeRaises, 2, "counted once");
            assert.equal(collectCheck(actor, { kind: "damage" }).freeRaises, 0, "not on damage");
          })
        );

        it(
          "a Master of Blood advantage gets its RollOption and its +10 TN on other spells once (p.280)",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules migrate maho" }));
            const [item] = await actor.createEmbeddedDocuments("Item", [
              { name: "Master of Blood", type: "advantage" }
            ]);
            await migrateItems(actor.items.contents);
            await migrateItems(actor.items.contents);
            assert.deepEqual(item._source.system.rules, [
              { key: "RollOption", option: "master-of-blood" },
              {
                key: "TNModifier",
                selector: "spell",
                value: 10,
                predicate: [{ not: "check:maho" }]
              }
            ]);
            assert.isTrue(actor.rollOptions.has("master-of-blood"));
            const tn = kind => collectCheck(actor, { kind }).tnModifiers.map(m => m.value);
            assert.deepEqual(tn("spell"), [10], "a spell");
            assert.deepEqual(tn("maho"), [], "not maho");
          })
        );

        it(
          "a Defense Stance effect made without rules gets them back",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Rules migrate stance" }));
            const before = actor.system.armorTn.current;
            const created = await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Defense Stance", statuses: ["defenseStance"] },
              { name: "Fear 3", statuses: ["feared"] }
            ]);
            // The server's result is not always in request order
            const stance = created.find(e => e.statuses.has("defenseStance"));
            const fear = created.find(e => e.statuses.has("feared"));
            // Stored as 3.2.1 left them: no rules, no group, Fear's Rank in a flag
            await stance.update({ "system.rules": [], "system.group": "" });
            await fear.update({
              "system.rules": [],
              "system.level": null,
              "duration.expiry": null,
              [`flags.${SYS_ID}.fearRank`]: 3
            });
            assert.equal(actor.system.armorTn.current, before, "no rules, no bonus");
            await migrateStatusEffectRules([actor], "quench");
            assert.equal(actor.system.armorTn.current, before + actor.system.rings.air);
            assert.equal(stance.system.group, "stance");
            assert.equal(fear.system.level, 3, "Fear Rank moved to the level");
            assert.equal(fear.duration.expiry, "encounterEnd", "Fear ends with the encounter");
            assert.equal(
              collectCheck(actor, { kind: "skill" }).modifiers[0].roll,
              -3,
              "Fear 3: -3k0"
            );
            await migrateStatusEffectRules([actor], "quench");
            assert.lengthOf(stance._source.system.rules, 1, "running again adds nothing");
          })
        );

        it(
          "an unlinked token's own effects get their rules and stay tracked, and nothing is added to its delta",
          clean(async () => {
            const actor = track(
              await createTestNPC({
                name: "Rules migrate token",
                prototypeToken: { actorLink: false }
              })
            );
            await actor.createEmbeddedDocuments("ActiveEffect", [
              { name: "Quench Actor Note", statuses: [] }
            ]);
            const data = await actor.getTokenDocument({ x: 0, y: 0 });
            const [token] = await canvas.scene.createEmbeddedDocuments("Token", [data.toObject()]);
            try {
              const [fear] = await token.actor.createEmbeddedDocuments("ActiveEffect", [
                { name: "Fear 2", statuses: ["feared"] }
              ]);
              // Stored as 3.2.1 left it in the delta
              await fear.update({
                "system.rules": [],
                "system.level": null,
                "duration.expiry": null,
                [`flags.${SYS_ID}.fearRank`]: 2
              });
              // An effect with no expiry is not tracked, as one loaded from a 3.2.1 world is not
              foundry.documents.ActiveEffect.registry.delete(fear);
              // Core copies the actor's effects into the delta when the token's first own effect is made
              const deltaIds = token.delta.effects.map(e => e.id);
              await migrateUnlinkedTokens([token], "quench");
              const migrated = token.delta.effects.get(fear.id);
              assert.equal(migrated.system.level, 2);
              assert.isNotEmpty(migrated.system.rules);
              assert.equal(migrated.duration.expiry, "encounterEnd");
              assert.isTrue(
                foundry.documents.ActiveEffect.registry.has(migrated),
                "tracked, so the end of the encounter reaches it"
              );
              assert.sameMembers(
                token.delta.effects.map(e => e.id),
                deltaIds,
                "the migration adds nothing to the delta"
              );
            } finally {
              await token.delete();
            }
          })
        );
      });

      describe("Item sheet Rules tab, JSON view", () => {
        it(
          "saves JSON typed into the Rules field as system.rules",
          clean(async () => {
            const [item] = await Item.createDocuments([ruleItem([], "Quench sheet rules")]);
            try {
              const sheet = item.sheet;
              sheet.rulesMode = "json";
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
            sheet.rulesMode = "json";
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
