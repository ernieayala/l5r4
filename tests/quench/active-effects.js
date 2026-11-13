import { SYS_ID } from "../../module/config/constants.js";
import { STATUS_EFFECTS } from "../../module/config/status-effects.js";
import { getStanceEffectCreator } from "../../module/services/stance/core/effect-templates.js";
import { spendVoidPoint } from "../../module/services/dice/resources/void-manager.js";
import { spendElementalSlot } from "../../module/services/dice/resources/spell-slot-manager.js";
import { SpellCastRoll } from "../../module/services/dice/rolls/spell-cast-roll.js";
import { MahoCastRoll } from "../../module/services/dice/rolls/maho-cast-roll.js";
import { applyLongRest } from "../../module/services/rest.js";
import { VoidPointsHandler } from "../../module/sheets/handlers/void-points-handler.js";
import { PcAdjustmentHandler } from "../../module/sheets/handlers/pc-adjustment-handler.js";
import { PcActionsHandler } from "../../module/sheets/handlers/pc-actions-handler.js";
import { buildXpHistory } from "../../module/services/xp/xp-calculator.js";
import { migrateEffectFreeTraitBase } from "../../module/setup/migrations/actors/xp-free-trait-base.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createBow, createKatana } from "../fixtures/item-fixtures.js";

/**
 * A Family or School item whose TraitAdjust rule adds +1 to a Trait (the form a 3.2.1 Trait effect migrates to).
 * @param {"family"|"school"} type  Item type.
 * @param {string} trait  Trait key.
 * @returns {object}  Item creation data.
 */
function creationBonusItem(type, trait) {
  return {
    name: `Quench ${type}`,
    type,
    system: { rules: [{ key: "TraitAdjust", trait, value: 1 }] }
  };
}

/**
 * Sum of the XP history's entries for one Trait.
 * @param {Actor} actor  The PC.
 * @param {string} trait  Trait key.
 * @returns {Promise<number>}  XP the history charges for that Trait.
 */
async function historyTraitXp(actor, trait) {
  const label = game.i18n.localize(`l5r4.ui.mechanics.traits.${trait}`);
  const history = await buildXpHistory(actor);
  return history
    .filter(e => e.type === "trait" && e.traitLabel === label)
    .reduce((a, e) => a + e.delta, 0);
}

/**
 * Resolves on the next update of the actor, so a click handler that does not return its promise can be awaited.
 * @param {Actor} actor  The actor to watch.
 * @returns {Promise<void>}
 */
function nextUpdate(actor) {
  return new Promise(resolve => {
    const id = Hooks.on("updateActor", doc => {
      if (doc.id === actor.id) {
        Hooks.off("updateActor", id);
        resolve();
      }
    });
  });
}

/**
 * An Active Effect on the actor that adds `value` to each key, in the v14 shape.
 * @param {Record<string, number>} adds  Change keys to amounts.
 * @returns {object}  ActiveEffect creation data.
 */
function addEffect(adds) {
  return {
    name: "Quench add",
    system: {
      changes: Object.entries(adds).map(([key, value]) => ({ key, type: "add", value }))
    }
  };
}

/**
 * Batch `l5r4-enhanced.active-effects` (roadmap Stage 3): effects use the v14 shape, Trait changes in the
 * "initial" phase reach every value derived from the Trait, and read-then-write sites store the stored value
 * plus the change, never an effect bonus (AUTOMATION.md B6).
 * @param {object} quench  The Quench API object.
 */
export function registerActiveEffectsBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.active-effects`,
    context => {
      const { describe, it, afterEach, assert } = context;
      let actor;

      afterEach(async () => {
        await actor?.delete();
        actor = null;
      });

      describe("Effect data", () => {
        it("core's base type uses the system model: rules, and changes default to phase initial", async () => {
          actor = await createTestPC({ name: "AE model" });
          const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.traits.ref": 1 })
          ]);
          assert.equal(effect.type, "base");
          assert.deepEqual(effect.system.rules, []);
          assert.equal(effect.system.changes[0].phase, "initial");
        });

        it("CONFIG.statusEffects holds the system's statuses only, by id, with their images", () => {
          assert.deepEqual(
            CONFIG.statusEffects.map(s => s.id),
            STATUS_EFFECTS.map(s => s.id)
          );
          for (const status of STATUS_EFFECTS) {
            assert.equal(CONFIG.statusEffects[status.id]?.img, status.img, status.id);
          }
        });

        it("a toggled status and a stance template keep their image (14.370 drops icon)", async () => {
          actor = await createTestPC({ name: "AE img" });
          const prone = await actor.toggleStatusEffect("prone", { active: true });
          assert.equal(prone.img, CONFIG.statusEffects.prone.img);
          const template = getStanceEffectCreator("fullAttackStance")(actor);
          const [stance] = await actor.createEmbeddedDocuments("ActiveEffect", [template]);
          assert.equal(stance.img, template.img);
          assert.notEqual(stance.img, CONFIG.ActiveEffect.documentClass.DEFAULT_ICON);
        });
      });

      describe("Trait changes reach derived values", () => {
        it("Stamina and Willpower raise Earth and the wound thresholds; Reflexes raises Armor TN", async () => {
          actor = await createTestPC({
            name: "AE traits",
            system: { traits: { sta: 2, wil: 2, ref: 2 } }
          });
          assert.equal(actor.system.rings.earth, 2);
          assert.equal(actor.system.armorTn.current, 15);
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.traits.sta": 1, "system.traits.wil": 1, "system.traits.ref": 1 })
          ]);
          assert.equal(actor._source.system.traits.sta, 2, "stored Stamina unchanged");
          assert.equal(actor.system.rings.earth, 3, "Earth = lower of Stamina 3 and Willpower 3");
          assert.equal(actor.system.woundLevels.healthy.value, 15, "Healthy = Earth 3 x 5");
          assert.equal(actor.system.armorTn.current, 20, "Armor TN = Reflexes 3 x 5 + 5");
        });

        it("Strength raised by an effect reaches melee and bow damage (#29)", async () => {
          actor = await createTestPC({ name: "AE strength", system: { traits: { str: 2 } } });
          await actor.createEmbeddedDocuments("Item", [createKatana(), createBow()]);
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.traits.str": 1 })
          ]);
          const katana = actor.items.getName("Katana");
          const yumi = actor.items.getName("Yumi");
          assert.equal(katana.system.derivedDamageFormula, "6k2", "Katana 3k2 + Strength 3");
          assert.equal(katana.damageFormula, "6k2", "sheet formula");
          assert.equal(
            yumi.system.derivedDamageFormula,
            "5k2",
            "lower of bow Strength 3 and archer Strength 3, plus the Willow Leaf arrow 2k2"
          );
        });
      });

      describe("Spending writes the stored value (B6)", () => {
        it("a Void Point spent with an effect bonus to the pool", async () => {
          actor = await createTestPC({
            name: "AE void",
            system: { rings: { void: { rank: 2, value: 2 } } }
          });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.rings.void.value": 1 })
          ]);
          assert.equal(actor.system.rings.void.value, 3, "prepared pool includes the bonus");
          const result = await spendVoidPoint(actor);
          assert.isTrue(result.success);
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
          assert.equal(actor.system.rings.void.value, 2, "prepared 1 + 1");
        });

        it("a spell slot spent with an effect bonus to the slots", async () => {
          actor = await createTestPC({ name: "AE slots", system: { spellSlots: { fire: 2 } } });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.spellSlots.fire": 1 })
          ]);
          const result = await spendElementalSlot(actor, "fire");
          assert.isTrue(result.success);
          assert.equal(actor._source.system.spellSlots.fire, 1, "stored 2 - 1");
          assert.equal(actor.system.spellSlots.fire, 2, "prepared 1 + 1");
        });

        it("casting a spell spends the slot from the stored count", async () => {
          actor = await createTestPC({ name: "AE cast", system: { spellSlots: { fire: 2 } } });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.spellSlots.fire": 1 })
          ]);
          const [spell] = await actor.createEmbeddedDocuments("Item", [
            { name: "Quench spell", type: "spell", system: { ring: "fire", mastery: 1 } }
          ]);
          const message = await SpellCastRoll({ actor, spell, showDialog: false });
          assert.ok(message, "cast posted");
          assert.equal(actor._source.system.spellSlots.fire, 1, "stored 2 - 1");
        });

        it("maho adds its blood cost and Taint to the stored values", async () => {
          actor = await createTestPC({ name: "AE maho" });
          // The +10 to Fire rolls makes the TN 10 cast certain, so the Taint write always runs
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({
              "system.suffered": 5,
              "system.shadowTaint.points": 3,
              "system.bonuses.ring.fire.total": 10
            })
          ]);
          const [spell] = await actor.createEmbeddedDocuments("Item", [
            { name: "Quench maho", type: "spell", system: { ring: "fire", mastery: 1, maho: true } }
          ]);
          const message = await MahoCastRoll({ actor, spell, showDialog: false });
          assert.ok(message, "cast posted");
          assert.equal(actor._source.system.suffered, 2, "stored 0 + blood cost 2 (Mastery 1 x 2)");
          assert.equal(actor._source.system.shadowTaint.points, 1, "stored 0 + Taint 1");
        });

        it("a long rest heals from the stored Wounds", async () => {
          actor = await createTestPC({ name: "AE rest", system: { suffered: 10 } });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.suffered": 5 })
          ]);
          const healRate = actor.system.wounds.healRate;
          assert.isAbove(healRate, 0);
          assert.isBelow(healRate, 10);
          await applyLongRest(actor);
          assert.equal(actor._source.system.suffered, 10 - healRate, "stored 10 - heal rate");
        });

        it("the Void dots step from the stored Void Points", async () => {
          actor = await createTestPC({ name: "AE void dots" });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.rings.void.value": 1 })
          ]);
          await VoidPointsHandler.adjust({ actor, element: null }, null, -1);
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
        });

        it("the spell slot adjuster steps from the stored slots", async () => {
          actor = await createTestPC({
            name: "AE slot adjust",
            system: { spellSlots: { fire: 2 } }
          });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.spellSlots.fire": 1 })
          ]);
          await PcAdjustmentHandler.adjustSpellSlot(
            { actor },
            null,
            { dataset: { path: "system.spellSlots.fire" } },
            -1
          );
          assert.equal(actor._source.system.spellSlots.fire, 1, "stored 2 - 1");
        });

        it("the rank/points adjuster steps from the stored rank", async () => {
          actor = await createTestPC({ name: "AE rank adjust" });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.honor.rank": 1 })
          ]);
          await PcAdjustmentHandler.adjustRankPoints(
            { actor },
            { shiftKey: true },
            { dataset: { key: "honor" } },
            1
          );
          assert.equal(actor._source.system.honor.rank, 3, "Honor: stored 2 + 1");
        });
      });

      describe("Void Points spent through a confirmation write the stored value (B6)", () => {
        let combat;
        let confirm;

        afterEach(async () => {
          foundry.applications.api.DialogV2.confirm = confirm;
          await combat?.delete();
          combat = null;
        });

        /** A PC with a +1 Void Points effect, in a combat, with the confirmation answered yes. */
        async function setUp(name) {
          confirm = foundry.applications.api.DialogV2.confirm;
          foundry.applications.api.DialogV2.confirm = async () => true;
          actor = await createTestPC({ name });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.rings.void.value": 1 })
          ]);
          combat = await Combat.create({ scene: null, active: true });
          const [combatant] = await combat.createEmbeddedDocuments("Combatant", [
            { actorId: actor.id }
          ]);
          return combatant;
        }

        it("for +10 Initiative", async () => {
          const combatant = await setUp("AE initiative");
          await actor.update({ "system.initiative.useVoid": true });
          await combat.rollInitiative(combatant.id);
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
        });

        it("for +10 Armor TN", async () => {
          await setUp("AE armor void");
          await combat.startCombat();
          assert.equal(game.combat?.id, combat.id, "the handler reads game.combat");
          await PcActionsHandler.handleToggleArmorVoid({ actor }, null, { checked: true });
          assert.isTrue(actor.system.armorTn.useVoid, "Void spent on Armor TN");
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
        });
      });

      describe("Chat damage buttons write the stored value (B6)", () => {
        let token;

        afterEach(async () => {
          await token?.delete();
          token = null;
        });

        /**
         * Puts a controlled token of a PC with Wound and Void Point effects on the viewed scene, then renders a
         * chat card with both damage buttons.
         */
        async function setUp(name) {
          actor = await createTestPC({ name, prototypeToken: { actorLink: true } });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.suffered": 5, "system.rings.void.value": 1 })
          ]);
          const tokenData = await actor.getTokenDocument({ x: 0, y: 0 });
          [token] = await canvas.scene.createEmbeddedDocuments("Token", [tokenData.toObject()]);
          for (let i = 0; i < 50 && !token.object; i++) {
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          token.object.control({ releaseOthers: true });
          // An unsaved message: renderHTML still fires renderChatMessageHTML, and nothing is posted to the chat log,
          // whose pop-up card rejects when its message is deleted mid-animation (client/applications/sidebar/tabs/
          // chat.mjs:1318-1321)
          const message = new ChatMessage.implementation({
            content:
              '<button data-action="apply-wounds" data-damage="7"></button>' +
              '<button data-action="reduce-wounds-void" data-damage="15"></button>'
          });
          return message.renderHTML();
        }

        it("Apply Wounds adds the damage to the stored Wounds", async () => {
          const html = await setUp("AE apply wounds");
          const updated = nextUpdate(actor);
          html.querySelector("[data-action='apply-wounds']").click();
          await updated;
          assert.equal(actor._source.system.suffered, 7, "stored 0 + 7");
          assert.equal(actor.system.suffered, 12, "prepared 7 + 5");
        });

        it("Reduce with Void spends from the stored Void Points and adds to the stored Wounds", async () => {
          const html = await setUp("AE reduce wounds");
          const updated = nextUpdate(actor);
          html.querySelector("[data-action='reduce-wounds-void']").click();
          await updated;
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
          assert.equal(actor._source.system.suffered, 5, "stored 0 + (15 - 10)");
        });
      });

      describe("XP for a Trait with a creation bonus (#29, Core Rulebook p.103)", () => {
        it("a TraitAdjust rule bonus counts toward each bought rank and marks no free rank", async () => {
          actor = await createTestPC({ name: "AE xp", system: { traits: { str: 2 } } });
          await actor.createEmbeddedDocuments("Item", [
            creationBonusItem("family", "str"),
            creationBonusItem("school", "str")
          ]);
          assert.equal(actor.system.traits.str, 4, "stored 2 + Family 1 + School 1");
          await actor.update({ "system.traits.str": 3 });
          assert.notOk(actor.getFlag(SYS_ID, "xpFreeTraitBase")?.str, "no free stored rank");
          assert.equal(actor.system._xp.breakdown.traits, 20, "Strength 4 to 5 costs 4 x 5");
          assert.equal(await historyTraitXp(actor, "str"), 20, "the history charges the same");
        });

        it("the legacy trait and bonus fields still make the raise to 3 the free rank", async () => {
          actor = await createTestPC({ name: "Legacy xp", system: { traits: { str: 2 } } });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Legacy family", type: "family", system: { trait: "str", bonus: 1 } }
          ]);
          await actor.update({ "system.traits.str": 3 });
          assert.equal(actor.getFlag(SYS_ID, "xpFreeTraitBase")?.str, 1, "free stored rank");
          assert.equal(actor.system._xp.breakdown.traits, 0, "the Family rank is free");
          await actor.update({ "system.traits.str": 4 });
          assert.equal(actor.system._xp.breakdown.traits, 16, "Strength 3 to 4 costs 4 x 4");
          assert.equal(await historyTraitXp(actor, "str"), 16, "the history charges the same");
        });

        it("the migration clears a free rank marked for a TraitAdjust rule bonus", async () => {
          actor = await createTestPC({ name: "AE xp migration", system: { traits: { str: 3 } } });
          await actor.createEmbeddedDocuments("Item", [
            creationBonusItem("family", "str"),
            creationBonusItem("school", "str")
          ]);
          await actor.setFlag(SYS_ID, "xpFreeTraitBase", { str: 1 });
          await actor.setFlag(SYS_ID, "xpRetroactiveVersion", 123);
          assert.equal(actor.system._xp.breakdown.traits, 0, "the flag hides the bought rank");
          await migrateEffectFreeTraitBase([actor], "quench");
          assert.equal(actor.getFlag(SYS_ID, "xpFreeTraitBase").str, 0);
          assert.equal(actor.getFlag(SYS_ID, "xpRetroactiveVersion"), 0, "history rebuilds");
          assert.equal(actor.system._xp.breakdown.traits, 20, "Strength 4 to 5 costs 4 x 5");
        });
      });
    },
    { displayName: "L5R4: Active Effects" }
  );
}
