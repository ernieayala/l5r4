import { SYS_ID } from "../../module/config/constants.js";
import { STATUS_EFFECTS } from "../../module/config/status-effects.js";
import { applyEffect, effectsOf } from "../../module/services/effects/apply.js";
import { spendVoidPoint } from "../../module/services/dice/resources/void-points.js";
import { rollSpellCast } from "../../module/services/dice/rolls/spell-cast-roll.js";
import { rollMahoCast } from "../../module/services/dice/rolls/maho-cast-roll.js";
import { applyLongRest } from "../../module/services/rest.js";
import { VoidPointsHandler } from "../../module/sheets/handlers/void-points-handler.js";
import { PcAdjustmentHandler } from "../../module/sheets/handlers/pc-adjustment-handler.js";
import { PcActionsHandler } from "../../module/sheets/handlers/pc-actions-handler.js";
import { buildXpHistory } from "../../module/services/xp/calculator.js";
import { migrateEffectFreeTraitBase } from "../../module/setup/migrations/actors/xp-free-trait-base.js";
import { createTestPC } from "../fixtures/actor-fixtures.js";
import { createBow, createKatana } from "../fixtures/item-fixtures.js";
import { spendCastSlot } from "./helpers.js";

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
export function registerActiveEffectsTests(quench) {
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
        it("should use core's base type with the system model: rules, and changes in phase initial", async () => {
          actor = await createTestPC({ name: "Active effects: model" });
          const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.traits.ref": 1 })
          ]);
          assert.equal(effect.type, "base");
          assert.deepEqual(effect.system.rules, []);
          assert.equal(effect.system.changes[0].phase, "initial");
        });

        it("should hold only the system's statuses in CONFIG.statusEffects, by id, with their images", () => {
          assert.deepEqual(
            CONFIG.statusEffects.map(s => s.id),
            STATUS_EFFECTS.map(s => s.id)
          );
          for (const status of STATUS_EFFECTS) {
            assert.equal(CONFIG.statusEffects[status.id]?.img, status.img, status.id);
          }
        });

        // Core 14.370 drops the icon field, so the image is the only picture an effect has
        it("should keep the image of a toggled status and a stance template", async () => {
          actor = await createTestPC({ name: "Active effects: img" });
          const prone = await actor.toggleStatusEffect("prone", { active: true });
          assert.equal(prone.img, CONFIG.statusEffects.prone.img);
          const stance = await applyEffect(actor, "fullAttackStance");
          assert.equal(stance.img, CONFIG.statusEffects.fullAttackStance.img);
          assert.notEqual(stance.img, CONFIG.ActiveEffect.documentClass.DEFAULT_ICON);
        });
      });

      describe("Trait changes reach derived values", () => {
        it("should raise Earth and the wound thresholds from Stamina and Willpower, Armor TN from Reflexes", async () => {
          actor = await createTestPC({
            name: "Active effects: traits",
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

        // #29
        it("should carry Strength raised by an effect to melee and bow damage", async () => {
          actor = await createTestPC({
            name: "Active effects: strength",
            system: { traits: { str: 2 } }
          });
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

      // roadmap/AUTOMATION.md B6
      describe("Spending writes the stored value", () => {
        it("should write the stored value for a Void Point spent with an effect bonus to the pool", async () => {
          actor = await createTestPC({
            name: "Active effects: void",
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

        it("should write the stored value for a spell slot spent with an effect bonus to the slots", async () => {
          actor = await createTestPC({
            name: "Active effects: slots",
            system: { spellSlots: { fire: 2 } }
          });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.spellSlots.fire": 1 })
          ]);
          const result = await spendCastSlot(actor, "fire");
          assert.isTrue(result.success);
          assert.equal(actor._source.system.spellSlots.fire, 1, "stored 2 - 1");
          assert.equal(actor.system.spellSlots.fire, 2, "prepared 1 + 1");
        });

        it("should spend the slot from the stored count when casting a spell", async () => {
          actor = await createTestPC({
            name: "Active effects: cast",
            system: { spellSlots: { fire: 2 } }
          });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.spellSlots.fire": 1 })
          ]);
          const [spell] = await actor.createEmbeddedDocuments("Item", [
            { name: "Quench spell", type: "spell", system: { ring: "fire", mastery: 1 } }
          ]);
          const message = await rollSpellCast({ actor, spell, showDialog: false });
          assert.ok(message, "cast posted");
          assert.equal(actor._source.system.spellSlots.fire, 1, "stored 2 - 1");
        });

        it("should add the maho blood cost and Taint to the stored values", async () => {
          actor = await createTestPC({ name: "Active effects: maho" });
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
          const message = await rollMahoCast({ actor, spell, showDialog: false });
          assert.ok(message, "cast posted");
          assert.equal(actor._source.system.suffered, 2, "stored 0 + blood cost 2 (Mastery 1 x 2)");
          assert.equal(actor._source.system.shadowTaint.points, 1, "stored 0 + Taint 1");
        });

        it("should heal from the stored Wounds on a long rest", async () => {
          actor = await createTestPC({ name: "Active effects: rest", system: { suffered: 10 } });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.suffered": 5 })
          ]);
          const healRate = actor.system.wounds.healRate;
          assert.isAbove(healRate, 0);
          assert.isBelow(healRate, 10);
          await applyLongRest(actor);
          assert.equal(actor._source.system.suffered, 10 - healRate, "stored 10 - heal rate");
        });

        it("should step the Void dots from the stored Void Points", async () => {
          actor = await createTestPC({ name: "Active effects: void dots" });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.rings.void.value": 1 })
          ]);
          await VoidPointsHandler.updateVoidPoints({ actor, element: null }, null, -1);
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
        });

        it("should step the spell slot adjuster from the stored slots", async () => {
          actor = await createTestPC({
            name: "Active effects: slot adjust",
            system: { spellSlots: { fire: 2 } }
          });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.spellSlots.fire": 1 })
          ]);
          await PcAdjustmentHandler.updateSpellSlot(
            { actor },
            null,
            { dataset: { path: "system.spellSlots.fire" } },
            -1
          );
          assert.equal(actor._source.system.spellSlots.fire, 1, "stored 2 - 1");
        });

        it("should step the rank/points adjuster from the stored rank", async () => {
          actor = await createTestPC({ name: "Active effects: rank adjust" });
          await actor.createEmbeddedDocuments("ActiveEffect", [
            addEffect({ "system.honor.rank": 1 })
          ]);
          await PcAdjustmentHandler.updateRankPoints(
            { actor },
            { shiftKey: true },
            { dataset: { key: "honor" } },
            1
          );
          assert.equal(actor._source.system.honor.rank, 3, "Honor: stored 2 + 1");
        });
      });

      // roadmap/AUTOMATION.md B6
      describe("Void Points spent through a confirmation write the stored value", () => {
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

        it("should write the stored value for +10 Initiative", async () => {
          const combatant = await setUp("Active effects: initiative");
          await actor.update({ "system.initiative.useVoid": true });
          await combat.rollInitiative(combatant.id);
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
        });

        it("should write the stored value for +10 Armor TN", async () => {
          await setUp("Active effects: armor void");
          await combat.startCombat();
          let content = "";
          let buttons = {};
          foundry.applications.api.DialogV2.confirm = async options => {
            content = options.content;
            buttons = {
              title: options.window?.title,
              yes: options.yes?.label,
              no: options.no?.label
            };
            return true;
          };
          await PcActionsHandler.updateArmorVoid({ actor }, null, { checked: true });
          assert.equal(
            foundry.utils.parseHTML(content).textContent,
            game.i18n.localize("l5r4.ui.effects.voidArmorQuestion"),
            "the question renders from its template"
          );
          assert.deepEqual(
            buttons,
            {
              title: game.i18n.localize("l5r4.ui.effects.voidArmorTitle"),
              yes: game.i18n.localize("l5r4.ui.common.spendVoidPoint"),
              no: game.i18n.localize("l5r4.ui.common.cancel")
            },
            "the title and buttons are localized and the buttons name the action"
          );
          assert.equal(
            actor.effects.filter(e => e.getFlag("l5r4-enhanced", "effectId") === "voidArmor")
              .length,
            1,
            "Void spent on Armor TN"
          );
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
        });

        // #197, Ernie's ruling: declared at the start of the Round, whoever's Turn it is
        // game-rules/25_rings_and_traits.md, p.78
        it("should allow Void for Armor TN during the Round's first Turn only, whoever's Turn it is", async () => {
          const mine = await setUp("Active effects: armor void timing");
          const other = await createTestPC({ name: "Active effects: first to act" });
          try {
            await combat.createEmbeddedDocuments("Combatant", [
              { actorId: other.id, initiative: 30 }
            ]);
            await mine.update({ initiative: 10 });
            await combat.startCombat();
            assert.equal(combat.combatant.actorId, other.id, "the other acts first");
            const armorVoid = () => effectsOf(actor, "voidArmor");
            const element = { checked: true };
            await PcActionsHandler.updateArmorVoid({ actor }, null, element);
            assert.lengthOf(armorVoid(), 1, "spent during the first Turn, on another's Turn");
            await actor.deleteEmbeddedDocuments(
              "ActiveEffect",
              armorVoid().map(e => e.id)
            );
            await combat.nextTurn();
            const late = { checked: true };
            await PcActionsHandler.updateArmorVoid({ actor }, null, late);
            assert.isFalse(late.checked, "refused past the Round's start");
            assert.lengthOf(armorVoid(), 0);
          } finally {
            await other.delete();
          }
        });
      });

      // roadmap/AUTOMATION.md B6
      describe("Chat damage buttons write the stored value", () => {
        let token;

        afterEach(async () => {
          await token?.delete();
          token = null;
        });

        /**
         * Puts a controlled token of a PC with Wound and Void Point effects on the viewed scene, then renders a
         * chat card with both damage buttons, each carrying the given `data-damage`.
         */
        async function setUp(name, { apply = "7", reduce = "15" } = {}) {
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
          // whose pop-up card rejects when its message is deleted mid-animation
          // [src: client/applications/sidebar/tabs/chat.mjs:1318-1321]
          // The two damage buttons of a posted card, built as elements and stored as the message's HTML
          const card = document.createElement("div");
          for (const [action, damage] of [
            ["apply-wounds", apply],
            ["reduce-wounds-void", reduce]
          ]) {
            const button = document.createElement("button");
            button.dataset.action = action;
            button.dataset.damage = damage;
            card.append(button);
          }
          const message = new ChatMessage.implementation({ content: card.innerHTML });
          return message.renderHTML();
        }

        it("should add the damage to the stored Wounds on Apply Wounds", async () => {
          const html = await setUp("Active effects: apply wounds");
          const updated = nextUpdate(actor);
          html.querySelector("[data-action='apply-wounds']").click();
          await updated;
          assert.equal(actor._source.system.suffered, 7, "stored 0 + 7");
          assert.equal(actor.system.suffered, 12, "prepared 7 + 5");
        });

        it("should spend the stored Void Points and add to the stored Wounds on Reduce with Void", async () => {
          const html = await setUp("Active effects: reduce wounds");
          const updated = nextUpdate(actor);
          html.querySelector("[data-action='reduce-wounds-void']").click();
          await updated;
          assert.equal(actor._source.system.rings.void.value, 1, "stored 2 - 1");
          assert.equal(actor._source.system.suffered, 5, "stored 0 + (15 - 10)");
        });

        // docs/design-system/patterns/chat-cards.md, CC5: a pre-4.0.0 card's attributes are untrusted
        it("should apply at most 99 damage from a forged card's data-damage", async () => {
          const html = await setUp("Active effects: forged damage", {
            apply: "500",
            reduce: "500"
          });
          let updated = nextUpdate(actor);
          html.querySelector("[data-action='apply-wounds']").click();
          await updated;
          assert.equal(actor._source.system.suffered, 99, "stored 0 + 99, the card's 500 clamped");
          updated = nextUpdate(actor);
          html.querySelector("[data-action='reduce-wounds-void']").click();
          await updated;
          assert.equal(actor._source.system.suffered, 99 + 89, "stored 99 + (99 - 10)");
        });
      });

      // #29
      // game-rules/48_character_creation_expanded.md, p.103
      describe("XP for a Trait with a creation bonus", () => {
        it("should count a TraitAdjust rule bonus toward each bought rank and mark no free rank", async () => {
          actor = await createTestPC({
            name: "Active effects: xp",
            system: { traits: { str: 2 } }
          });
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

        it("should still make the raise to 3 the free rank from the legacy trait and bonus fields", async () => {
          actor = await createTestPC({
            name: "Active effects: legacy xp",
            system: { traits: { str: 2 } }
          });
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

        // game-rules/48_character_creation_expanded.md, p.102
        it("should make two free ranks from a legacy Family and School bonus to one Trait", async () => {
          actor = await createTestPC({
            name: "Active effects: legacy xp double",
            system: { traits: { str: 2 } }
          });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Legacy family", type: "family", system: { trait: "str", bonus: 1 } },
            { name: "Legacy school", type: "school", system: { trait: "str", bonus: 1 } }
          ]);
          await actor.update({ "system.traits.str": 4 });
          assert.equal(actor.getFlag(SYS_ID, "xpFreeTraitBase")?.str, 2, "ranks 3 and 4");
          assert.equal(actor.system._xp.breakdown.traits, 0, "both ranks are free");
          await actor.update({ "system.traits.str": 5 });
          assert.equal(actor.system._xp.breakdown.traits, 20, "Strength 4 to 5 costs 4 x 5");
        });

        it("should make the raise to Void 3 free from a legacy Void bonus", async () => {
          actor = await createTestPC({ name: "Active effects: legacy xp void" });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Legacy school", type: "school", system: { trait: "void", bonus: 1 } }
          ]);
          await actor.update({ "system.rings.void.rank": 3 });
          assert.equal(actor.getFlag(SYS_ID, "xpFreeTraitBase")?.void, 1, "free stored rank");
          assert.equal(actor.system._xp.breakdown.void, 0, "the School rank is free");
          await actor.update({ "system.rings.void.rank": 4 });
          assert.equal(actor.system._xp.breakdown.void, 24, "Void 3 to 4 costs 6 x 4");
        });

        // #44
        it("should count a TraitAdjust Void bonus toward each bought Void rank", async () => {
          actor = await createTestPC({ name: "Active effects: xp void" });
          await actor.createEmbeddedDocuments("Item", [creationBonusItem("school", "void")]);
          assert.equal(actor.system.rings.void.rank, 3, "stored 2 + School 1");
          await actor.update({ "system.rings.void.rank": 3 });
          assert.notOk(actor.getFlag(SYS_ID, "xpFreeTraitBase")?.void, "no free stored rank");
          assert.equal(actor.system._xp.breakdown.void, 24, "Void 3 to 4 costs 6 x 4");
        });

        // #43
        // game-rules/80_brotherhood_of_shinsei.md, p.231
        // game-rules/86_kata.md, p.259
        it("should cost a kata and a kiho their Mastery Level", async () => {
          actor = await createTestPC({ name: "Active effects: xp kata" });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Quench kata", type: "kata", system: { mastery: 3 } },
            { name: "Quench kiho", type: "kiho", system: { mastery: 4 } }
          ]);
          assert.equal(actor.system._xp.breakdown.kata, 3);
          assert.equal(actor.system._xp.breakdown.kiho, 4);
        });

        it("should clear in the migration a free rank marked for a TraitAdjust rule bonus", async () => {
          actor = await createTestPC({
            name: "Active effects: xp migration",
            system: { traits: { str: 3 } }
          });
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
    { displayName: "L5R4: Active effects" }
  );
}
