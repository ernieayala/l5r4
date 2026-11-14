import { SYS_ID } from "../../module/config/constants.js";

/** The world tests/fixtures/world-3.2.1/build-world.mjs writes. */
const FIXTURE_WORLD = "l5r4-321-fixture";

/**
 * Registers the `world-upgrade` batch (roadmap/STAGE-12): what each 3.2.1 shape in the fixture world became after
 * the world was opened in this version. It runs only in that world, after its migrations; elsewhere it skips.
 * Ids and names are the fixture's (tests/fixtures/world-3.2.1/documents.mjs).
 * @param {object} quench  The Quench API object.
 */
export function registerWorldUpgradeBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.world-upgrade`,
    context => {
      const { describe, it, before, assert } = context;
      const actor = id => game.actors.get(id);
      const effectWith = (doc, status) => doc.effects.find(e => e.statuses.has(status));

      before(function () {
        if (game.world.id !== FIXTURE_WORLD) {
          this.skip();
        }
      });

      it("ran the migrations for this version", () => {
        assert.equal(game.settings.get(SYS_ID, "lastMigratedVersion"), game.system.version);
        for (const doc of [...game.actors, ...game.items]) {
          assert.equal(doc.getFlag(SYS_ID, "migratedVersion"), game.system.version, doc.name);
        }
      });

      describe("Family and School bonuses", () => {
        it("Active Effect Trait bonuses are TraitAdjust rules, applied once", () => {
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

        it("the free Family rank flag is cleared for a rule bonus, and XP history stays", () => {
          const pc = actor("fxPcLantern00001");
          assert.equal(pc.getFlag(SYS_ID, "xpFreeTraitBase").per, 0);
          assert.lengthOf(pc.getFlag(SYS_ID, "xpManual"), 1);
        });

        it("world Family and School items carry the same rules", () => {
          assert.deepEqual(game.items.get("fxWiFamily000001").system.rules, [
            { key: "TraitAdjust", trait: "per", value: 1 }
          ]);
          assert.deepEqual(game.items.get("fxWiSchool000001").system.rules, [
            { key: "TraitAdjust", trait: "agi", value: 1 }
          ]);
        });
      });

      describe("Stances and conditions", () => {
        it("a stance taken on the 3.2.1 sheet has its rules and group", () => {
          const pc = actor("fxPcLantern00001");
          const stance = effectWith(pc, "fullAttackStance");
          assert.equal(stance.system.group, "stance");
          assert.isNotEmpty(stance.system.rules);
          assert.equal(pc.system.armorTn.current, 15, "20 base + 5 armor - 10 Full Attack");
        });

        it("Fear keeps its Rank as its level and ends with the encounter", () => {
          const fear = effectWith(actor("fxPcFearful00001"), "feared");
          assert.equal(fear.system.level, 3);
          assert.isNotEmpty(fear.system.rules);
          assert.equal(fear.duration.expiry, "encounterEnd");
        });

        it("conditions from the token HUD and the Condition Manager have their rules", () => {
          const pc = actor("fxPcFearful00001");
          assert.includeMembers(
            effectWith(pc, "dazed").system.rules.map(r => r.key),
            ["RollModifier", "PeriodicSave"]
          );
          assert.isNotEmpty(effectWith(pc, "mounted").system.rules);
        });

        it("an automatic Prone keeps the flag that lets it end with Down", () => {
          const prone = effectWith(actor("fxNpLegacyWnd001"), "prone");
          assert.isTrue(prone.getFlag(SYS_ID, "autoApplied"));
          assert.isNotEmpty(prone.system.rules);
        });

        it("an unlinked token's own stance and Fear are migrated in its delta", () => {
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
        it("Traits stored as {rank} are numbers", () => {
          const traits = actor("fxPcOldShape0001").system.traits;
          assert.equal(traits.sta, 3);
          assert.equal(traits.wil, 3);
        });

        it("an emphasis string becomes trained Emphases", () => {
          const skill = actor("fxPcOldShape0001").items.get("fxPiOldShapeMed1");
          assert.deepEqual(skill.system.trainedEmphases, ["Void Recovery", "Fasting"]);
        });

        it("bows are weapons marked as bows, in the world and on actors", () => {
          for (const bow of [
            game.items.get("fxWiBow000000001"),
            actor("fxPcOldShape0001").items.get("fxPiOldShapeBow1")
          ]) {
            assert.equal(bow.type, "weapon");
            assert.isTrue(bow.system.isBow);
          }
        });

        it("keyword lists are comma-separated text", () => {
          const spell = actor("fxPcShugenja0001").items.get("fxPiShugenjaSpl1");
          assert.equal(spell.system.keywords, "thunder, fire");
        });

        it("pre-3.0 NPC wound levels become manual wound levels", () => {
          const levels = actor("fxNpLegacyWnd001").system.manualWoundLevels;
          assert.deepInclude(levels.healthy, { value: 20, penalty: 0 });
          assert.deepInclude(levels.nicked, { value: 40, penalty: 5 });
          assert.deepInclude(levels.out, { value: 60, penalty: 40 });
        });

        it("a stored 2k2 NPC Initiative becomes the formula, Insight Rank 1 + Reflexes (p.81; #30)", () => {
          const npc = actor("fxNpFormula00001");
          assert.deepInclude(npc._source.system.initiative, { roll: 0, keep: 0 });
          assert.deepInclude(npc.system.initiative, { roll: 3, keep: 2 }, "Reflexes 2");
        });

        it("an item's 3.2.1 Free Raises become a FreeRaise rule on any roll", () => {
          const lucky = game.items.get("fxWiFreeRaise001");
          assert.deepEqual(lucky.system.rules, [{ key: "FreeRaise", selector: "any", value: 1 }]);
          assert.equal(lucky._source.system.freeRaises, 0);
        });

        it("Master of Blood carries its rules, in the world and on actors", () => {
          assert.deepEqual(
            game.items.get("fxWiMasterBlood1").system.rules.map(r => r.key),
            ["RollOption", "TNModifier"]
          );
          assert.isTrue(actor("fxPcShugenja0001").rollOptions.has("master-of-blood"));
        });
      });

      describe("Chat, combat, and sheets", () => {
        it("3.2.1 chat cards keep their rolls", () => {
          // Modules post their own welcome cards, so the fixture's messages are read by id
          assert.deepEqual(
            ["fxMsAttack000001", "fxMsDamage000001"].map(
              id => game.messages.get(id).rolls[0].total
            ),
            [24, 14]
          );
        });

        it("the combat keeps its Round and Initiative", () => {
          const combat = game.combats.get("fxCbCombat000001");
          assert.equal(combat.round, 2);
          assert.sameMembers(
            combat.combatants.map(c => c.initiative),
            [27, 18]
          );
        });

        it("every actor and world item sheet opens", async function () {
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
    { displayName: "L5R4: 3.2.1 world upgrade (fixture world only)" }
  );
}
