import { SYS_ID, MIGRATION_FLAG, MIGRATION_SCHEMA } from "../../module/config/constants.js";

/** The world tests/fixtures/world-3.2.1/build-world.mjs writes. */
const FIXTURE_WORLD = "l5r4-321-fixture";

/**
 * Registers the `world-upgrade` batch (roadmap/STAGE-12): what each 3.2.1 shape in the fixture world became after
 * the world was opened in this version. It runs only in that world, after its migrations; elsewhere it skips.
 * Ids and names are the fixture's (tests/fixtures/world-3.2.1/documents.mjs).
 * @param {object} quench  The Quench API object.
 */
export function registerWorldUpgradeTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.world-upgrade`,
    context => {
      const { describe, it, before, assert } = context;
      const actor = id => game.actors.get(id);
      const effectWith = (doc, status) => doc.effects.find(e => e.statuses.has(status));

      /**
       * An actor as the database stores it, its items and effects in it: the server's answer to a get, before any
       * client builds a document from it, so the data models' migrateData has not reshaped it.
       * @param {string} id
       * @returns {Promise<object>}
       */
      const storedActor = async id => {
        const response = await foundry.helpers.SocketInterface.dispatch("modifyDocument", {
          type: "Actor",
          action: "get",
          operation: { query: { _id: id } }
        });
        return response.result[0];
      };

      before(function () {
        if (game.world.id !== FIXTURE_WORLD) {
          this.skip();
        }
      });

      it("should have brought every actor, item, and scene to the current migration schema", () => {
        for (const doc of [...game.actors, ...game.items, ...game.scenes]) {
          assert.equal(doc.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA, doc.name);
        }
      });

      describe("Family and School bonuses", () => {
        it("should turn Active Effect Trait bonuses into TraitAdjust rules, applied once", () => {
          const pc = actor("fxPcLantern00001");
          const family = pc.items.get("fxPiLanternFam01");
          const school = pc.items.get("fxPiLanternSch01");
          assert.deepEqual(family.system.rules, [{ key: "TraitAdjust", trait: "per", value: 1 }]);
          assert.deepEqual(school.system.rules, [
            { key: "TraitAdjust", trait: "agi", value: 1 },
            { key: "TraitAdjust", trait: "void", value: 1 }
          ]);
          assert.equal(
            family.effects.size + school.effects.size,
            0,
            "the emptied effects are gone"
          );
          assert.equal(pc.system.traits.per, 3);
          assert.equal(pc.system.traits.agi, 4);
          assert.equal(pc.system.rings.void.rank, 3);
        });

        // #182: writing the migrated system back replaces only the system
        it("should keep every stored flag when the system is written back", async () => {
          const stored = await storedActor("fxPcLantern00001");
          assert.lengthOf(stored.flags[SYS_ID].xpManual, 1);
          assert.equal(stored.flags[SYS_ID].xpBase, 40);
          assert.property(stored.flags[SYS_ID], "xpFreeTraitBase");
        });

        it("should clear the free Family rank flag for a rule bonus and keep the XP history", () => {
          const pc = actor("fxPcLantern00001");
          assert.equal(pc.getFlag(SYS_ID, "xpFreeTraitBase").per, 0);
          assert.lengthOf(pc.getFlag(SYS_ID, "xpManual"), 1);
        });

        it("should give world Family and School items the same rules", () => {
          assert.deepEqual(game.items.get("fxWiFamily000001").system.rules, [
            { key: "TraitAdjust", trait: "per", value: 1 }
          ]);
          assert.deepEqual(game.items.get("fxWiSchool000001").system.rules, [
            { key: "TraitAdjust", trait: "agi", value: 1 }
          ]);
        });
      });

      describe("Stances and conditions", () => {
        it("should give a stance taken before the upgrade its rules and group", () => {
          const pc = actor("fxPcLantern00001");
          const stance = effectWith(pc, "fullAttackStance");
          assert.equal(stance.system.group, "stance");
          assert.isNotEmpty(stance.system.rules);
          assert.equal(pc.system.armorTn.current, 15, "20 base + 5 armor - 10 Full Attack");
        });

        it("should keep Fear's Rank as its level and end it with the encounter", () => {
          const fear = effectWith(actor("fxPcFearful00001"), "feared");
          assert.equal(fear.system.level, 3);
          assert.isNotEmpty(fear.system.rules);
          assert.equal(fear.duration.expiry, "encounterEnd");
        });

        it("should give conditions from the token HUD and the Condition Manager their rules", () => {
          const pc = actor("fxPcFearful00001");
          assert.includeMembers(
            effectWith(pc, "dazed").system.rules.map(r => r.key),
            ["RollModifier", "PeriodicSave"]
          );
          assert.isNotEmpty(effectWith(pc, "mounted").system.rules);
        });

        it("should keep the flag that lets an automatic Prone end with Down", () => {
          const prone = effectWith(actor("fxNpLegacyWnd001"), "prone");
          assert.isTrue(prone.getFlag(SYS_ID, "autoApplied"));
          assert.isNotEmpty(prone.system.rules);
        });

        it("should migrate an unlinked token's own stance and Fear in its delta", () => {
          const token = game.scenes.get("fxScScene0000001").tokens.get("fxTkUnlinked0001");
          const stance = effectWith(token.delta, "defenseStance");
          const fear = effectWith(token.delta, "feared");
          assert.equal(stance.system.group, "stance");
          assert.isNotEmpty(stance.system.rules);
          assert.equal(fear.system.level, 2);
          assert.equal(fear.duration.expiry, "encounterEnd");
          assert.deepEqual(
            token.actor.items.map(i => i.name),
            ["Fixture Knife"]
          );
        });
      });

      describe("Older data shapes", () => {
        it("should turn Traits stored as {rank} into numbers", () => {
          const traits = actor("fxPcOldShape0001").system.traits;
          assert.equal(traits.sta, 3);
          assert.equal(traits.wil, 3);
        });

        it("should turn an emphasis string into trained Emphases", () => {
          const skill = actor("fxPcOldShape0001").items.get("fxPiOldShapeMed1");
          assert.deepEqual(skill.system.trainedEmphases, ["Void Recovery", "Fasting"]);
        });

        it("should make bows weapons marked as bows, in the world and on actors", () => {
          for (const bow of [
            game.items.get("fxWiBow000000001"),
            actor("fxPcOldShape0001").items.get("fxPiOldShapeBow1")
          ]) {
            assert.equal(bow.type, "weapon");
            assert.isTrue(bow.system.isBow);
          }
        });

        it("should store keyword lists as comma-separated text", () => {
          const spell = actor("fxPcShugenja0001").items.get("fxPiShugenjaSpl1");
          assert.equal(spell.system.keywords, "thunder, fire");
        });

        it("should turn pre-3.0 NPC wound levels into manual wound levels", () => {
          const levels = actor("fxNpLegacyWnd001").system.manualWoundLevels;
          assert.deepInclude(levels.healthy, { value: 20, penalty: 0 });
          assert.deepInclude(levels.nicked, { value: 40, penalty: 5 });
          assert.deepInclude(levels.out, { value: 60, penalty: 40 });
        });

        // game-rules/31_combat_round.md, p.81
        // #30
        it("should turn a stored 2k2 NPC Initiative into Insight Rank 1 + Reflexes", () => {
          const npc = actor("fxNpFormula00001");
          assert.deepInclude(npc._source.system.initiative, { roll: 0, keep: 0 });
          assert.deepInclude(npc.system.initiative, { roll: 3, keep: 2 }, "Reflexes 2");
        });

        it("should turn an item's freeRaises field into a FreeRaise rule on any roll", () => {
          const lucky = game.items.get("fxWiFreeRaise001");
          assert.deepEqual(lucky.system.rules, [{ key: "FreeRaise", selector: "any", value: 1 }]);
          assert.equal(lucky._source.system.freeRaises, 0);
        });

        // #182: the database keeps nothing older that could win on the next load
        it("should write the converted data back and remove every legacy key from the database", async () => {
          const oni = await storedActor("fxNpLegacyWnd001");
          assert.notProperty(oni.system, "wound_lvl");
          assert.notProperty(oni.system.armor, "armor_tn");
          assert.deepInclude(oni.system.manualWoundLevels.nicked, { value: 40, penalty: 5 });
          assert.equal(oni.system.armor.armorTn, 25, "3.2.1's armor_tn, over its template's 10");
          const monk = await storedActor("fxPcOldShape0001");
          for (const key of ["armor_tn", "shadow_taint"]) {
            assert.notProperty(monk.system, key);
          }
          assert.deepInclude(monk.system.shadowTaint, { rank: 0, points: 0 });
          // 3.2.1's schema map kept its template's camelCase value over the snake_case one
          assert.deepInclude(monk.system.initiative, { rollMod: 0, totalMod: 0 });
          assert.notProperty(monk.system.initiative, "roll_mod");
          const leftover = await storedActor("fxPcLeftover0001");
          for (const key of ["wound_lvl", "armor_tn", "shadow_taint", "armor"]) {
            assert.notProperty(leftover.system, key);
          }
          const kata = (await storedActor("fxPcShugenja0001")).items.find(
            i => i._id === "fxPiShugenjaKat2"
          );
          assert.notProperty(kata.system, "cost");
          assert.notProperty(kata.flags[SYS_ID] ?? {}, "legacyCost");
        });

        // #182: a single-leaf edit after the upgrade survives the next load
        it("should keep a later edit to a converted value over the old key", async () => {
          const oni = actor("fxNpLegacyWnd001");
          await oni.update({ "system.manualWoundLevels.nicked.value": 45 });
          // Built from the stored data, as the next load builds it
          const reloaded = new CONFIG.Actor.documentClass(await storedActor(oni.id));
          assert.equal(reloaded.system.manualWoundLevels.nicked.value, 45);
          await oni.update({ "system.manualWoundLevels.nicked.value": 40 });
        });

        // #182: migrations read stored data
        it("should leave an NPC's stored Armor TN as it was under an Armor TN effect", () => {
          const oni = actor("fxNpLegacyWnd001");
          assert.equal(oni._source.system.armor.armorTn, 25);
          assert.equal(oni.system.armor.armorTn, 30, "the effect's +5 applies once");
        });

        // #182, Ernie's ruling: a 3.2.1 kiho at cost 0 is a School kiho
        it("should make a kiho left at cost 0 a School kiho and keep a bought one bought", () => {
          const monk = actor("fxPcOldShape0001");
          assert.isTrue(monk.items.get("fxPiOldShapeKih2").system.schoolKiho);
          assert.isFalse(monk.items.get("fxPiOldShapeKih1").system.schoolKiho);
        });

        // #182: the GM is told what changed, in one note
        it("should tell the GM of School kiho, XP changes, and Free Raises that now wait", () => {
          const note = game.messages.find(m =>
            m.content.includes(game.i18n.localize("l5r4.system.migration.notesTitle"))
          );
          assert.exists(note, "one note for the GM");
          assert.includeMembers(note.whisper, [game.user.id]);
          const said = text => assert.include(note.content, text);
          said(
            game.i18n.localize("l5r4.system.migration.kihoSchool", {
              name: "Fixture Old Shape Monk",
              item: "Fixture Empty Hand"
            })
          );
          said(
            game.i18n.localize("l5r4.system.migration.xpChanged", {
              name: "Fixture Ember Shugenja",
              item: "Fixture Iron Stance",
              before: 1,
              after: 3
            })
          );
          said(
            game.i18n.localize("l5r4.system.migration.freeRaisesNarrowed", {
              name: "Fixture Old Shape Monk",
              item: "Fixture Old Robe"
            })
          );
        });

        it("should give Master of Blood its rules, in the world and on actors", () => {
          assert.deepEqual(
            game.items.get("fxWiMasterBlood1").system.rules.map(r => r.key),
            ["RollOption", "TNModifier"]
          );
          assert.isTrue(actor("fxPcShugenja0001").rollOptions.has("master-of-blood"));
        });
      });

      describe("Chat, combat, and sheets", () => {
        it("should keep the rolls of chat cards posted before the upgrade", () => {
          // Modules post their own welcome cards, so the fixture's messages are read by id
          assert.deepEqual(
            ["fxMsAttack000001", "fxMsDamage000001"].map(
              id => game.messages.get(id).rolls[0].total
            ),
            [24, 14]
          );
        });

        it("should keep the combat's Round and Initiative", () => {
          const combat = game.combats.get("fxCbCombat000001");
          assert.equal(combat.round, 2);
          assert.sameMembers(
            combat.combatants.map(c => c.initiative),
            [27, 18]
          );
        });

        it("should open every actor and world item sheet", async function () {
          this.timeout(60_000);
          for (const doc of [...game.actors, ...game.items]) {
            await doc.sheet.render({ force: true });
            assert.isTrue(doc.sheet.rendered, doc.name);
            // Skips 14.370's close animation, which this check does not need
            await doc.sheet.close({ animate: false });
          }
        });
      });
    },
    { displayName: "L5R4: World upgrade from 3.2.1" }
  );
}
