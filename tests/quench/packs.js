import { SYS_ID } from "../../module/config/constants.js";
import { createRule } from "../../module/data/rules/rule-models.js";
import { getCheckContext } from "../../module/services/dice/check/collect.js";
import { DragDropHandler } from "../../module/sheets/handlers/drag-drop-handler.js";
import { RollHandler } from "../../module/sheets/handlers/roll-handler.js";
import { getArmorTnPenalty } from "../../module/utils/armor-penalties.js";
import CompendiumBrowserApplication from "../../module/apps/compendium-browser.js";
import { getAnsweredRules } from "../../module/utils/choices.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { grantQueueOf } from "../../module/documents/item/lifecycle/grants.js";
import { activationOf, updateActivation } from "../../module/services/effects/activation.js";
import { getWoundsTaken } from "../../module/utils/damage.js";
import { createShugenja, createTestPC } from "../fixtures/actor-fixtures.js";
import { cleanTest, settleChatNotifications, waitFor } from "./helpers.js";

/** The system's packs, as system.json declares them. */
const PACKS = () => game.packs.filter(pack => pack.metadata.packageName === SYS_ID);

/**
 * Registers the `packs` batch (roadmap/STAGE-15): every pack opens, every entry's rules validate, every item drops
 * on a PC, each entry in the expected-effects table changes what its page says it does, the citation shows in
 * place of the book's text, and the compendium browser filters, adds, and drags.
 * @param {object} quench  The Quench API object.
 */
export function registerPacksTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.packs`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const created = [];
      const posted = [];
      let hook;

      before(async () => {
        await settleChatNotifications();
        hook = Hooks.on("createChatMessage", message => posted.push(message));
      });

      afterEach(async () => {
        canvas.tokens?.releaseAll();
        for (const doc of created.splice(0).reverse()) {
          await doc.delete();
        }
      });

      after(async function () {
        this.timeout(30_000);
        Hooks.off("createChatMessage", hook);
        await settleChatNotifications();
        for (const message of posted) {
          if (game.messages.has(message.id)) {
            await message.delete();
          }
        }
      });

      const track = doc => (created.push(doc), doc);

      /** A pack entry by pack and name. */
      const entry = async (pack, name) => {
        const collection = game.packs.get(`${SYS_ID}.${pack}`);
        const id = collection.index.find(e => e.name === name)?._id;
        return collection.getDocument(id);
      };

      /**
       * Answer every purchase dialog until the returned function is called, as a GM would: a choice takes the next
       * of `picks` (its first option once they run out), an unmet prerequisite is answered `confirm`, and a second
       * School is answered `school` (module/services/purchase.js, askSchool).
       * @param {string[]} [picks]
       * @param {"yes"|"no"} [confirm]
       * @param {"add"|"replace"} [school]
       * @returns {function(): void}  Stops answering
       */
      const answerPurchase = (picks = [], confirm = "yes", school = "add") => {
        const queue = [...picks];
        const id = Hooks.on("renderDialogV2", app => {
          const select = app.element.querySelector("[name='selection']");
          if (select) {
            if (queue.length) {
              select.value = queue.shift();
            }
            app.element.querySelector("[data-action='ok']").click();
          } else {
            (
              app.element.querySelector(`[data-action='${confirm}']`) ??
              app.element.querySelector(`[data-action='${school}']`)
            )?.click();
          }
        });
        return () => Hooks.off("renderDialogV2", id);
      };

      /** Drop a pack entry on an actor, answering its purchase dialogs, once its grants have run. */
      const drop = async (
        actor,
        pack,
        name,
        { picks = [], confirm = "yes", school = "add" } = {}
      ) => {
        const stop = answerPurchase(picks, confirm, school);
        try {
          const source = await entry(pack, name);
          const item = await DragDropHandler.onItemDrop({ actor }, null, { uuid: source.uuid });
          await grantQueueOf(actor);
          return item;
        } finally {
          stop();
        }
      };

      /** A PC, optionally of a Clan, holding a copy of a pack entry, through the drop path. */
      const holding = async (
        pack,
        name,
        { traits = { str: 2, ref: 2, agi: 2 }, clan = null, picks = [] } = {}
      ) => {
        const actor = track(
          await createTestPC({ name: `Compendium packs: ${name}`, system: { traits } })
        );
        if (clan) {
          await actor.createEmbeddedDocuments("Item", [{ name: clan, type: "clan" }]);
        }
        // An unmet prerequisite is refused, so a row fails when its setup misses one
        const item = await drop(actor, pack, name, { picks, confirm: "no" });
        assert.ok(item, `${name} was added`);
        return { actor, item };
      };

      /**
       * The rule keys a document carries that the actor's rule list lacks: each rule, its choices answered, reaches
       * `actor.rules` under the document's name unless validation skipped it (module/documents/actor/rules.js,
       * rulesOf). Counted per key, so a second rule of one key needs its own entry.
       * @param {Actor} actor
       * @param {{name: string, system: {rules: object[]}}} doc  An owned item or an applied effect
       * @returns {string[]}
       */
      const missingRules = (actor, doc) => {
        const reached = actor.rules.filter(e => e.source === doc.name).map(e => e.rule.key);
        return doc.system.rules
          .map(rule => rule.key)
          .filter(key => {
            const at = reached.indexOf(key);
            return at < 0 || !reached.splice(at, 1);
          });
      };

      /** Make an owned item's rules apply as play does: armor worn, a kata, kiho, or tattoo activated. */
      const applyItem = async (actor, item) => {
        if (item.type === "armor") {
          await item.update({ "system.equipped": true });
        } else if (!item.system.rulesActive && ["kata", "kiho", "tattoo"].includes(item.type)) {
          await updateActivation(actor, item);
        }
      };

      /**
       * The XP an actor's entry of a type and name cost.
       * game-rules/48_character_creation_expanded.md, p.102-103
       */
      const xpOf = (actor, type, name) =>
        actor.system._xp.entries.find(e => e.type === type && e.name === name)?.delta;

      describe("Packs", () => {
        it(
          "should open every pack system.json declares, with entries",
          clean(async () => {
            const packs = PACKS();
            assert.sameMembers(
              packs.map(p => p.metadata.name),
              game.system.packs.map(p => p.name)
            );
            for (const pack of packs) {
              const documents = await pack.getDocuments();
              assert.isAbove(documents.length, 0, pack.metadata.name);
            }
          })
        );

        it(
          "should cite a Core Rulebook page on every entry and validate its rules",
          clean(async () => {
            for (const pack of PACKS()) {
              for (const doc of await pack.getDocuments()) {
                assert.equal(doc.system.source.book, "core", doc.name);
                assert.isAbove(doc.system.source.page, 0, doc.name);
                assert.equal(doc.system.description ?? "", "", `${doc.name}: description`);
                // The actor fills a choice in before it validates (module/documents/actor/rules.js), so each rule is
                // checked as it reads once each ChoiceSet has an answer
                for (const rule of getAnsweredRules(doc.system.rules)) {
                  assert.doesNotThrow(
                    () => createRule(rule),
                    undefined,
                    `${doc.name}: ${rule.key}`
                  );
                }
              }
            }
          })
        );

        // The title names the coverage check's generic rule check (tools/coverage/packs.mjs, roadmap/STAGE-16
        // decision 5): every entry is checked, the full and partial ones among them
        it(
          "should drop every item on a PC so every full or partial entry's rules reach the actor",
          clean(async function () {
            this.timeout(240_000);
            // One actor per pack takes every entry of it, so the GM adds those whose prerequisites it misses
            // anyway, and each School is added beside the others
            const stop = answerPurchase();
            let count = 0;
            try {
              for (const pack of PACKS().filter(p => p.documentName === "Item")) {
                const actor = track(
                  await createTestPC({
                    name: `Compendium packs: collector (${pack.metadata.name})`
                  })
                );
                const dropped = [];
                for (const index of pack.index) {
                  const item = await DragDropHandler.onItemDrop({ actor }, null, {
                    uuid: index.uuid
                  });
                  assert.ok(item, `${pack.metadata.name}: ${index.name}`);
                  assert.isNull(item.folder, `${index.name} keeps no pack folder`);
                  // Checked before the next drop, which replaces a Clan or Family and ends an activation's group
                  await applyItem(actor, item);
                  assert.deepEqual(missingRules(actor, item), [], `${index.name}: rules skipped`);
                  dropped.push(item);
                }
                // Schools grant in the background; the actor is deleted only once that work is done
                await grantQueueOf(actor);
                // A Clan or Family replaces the one before it; everything else stays
                // game-rules/48_character_creation_expanded.md, p.102
                for (const item of dropped.filter(i => !["clan", "family"].includes(i.type))) {
                  assert.ok(actor.items.has(item.id), `${item.type} ${item.name} stayed`);
                }
                for (const type of ["clan", "family"].filter(t =>
                  dropped.some(i => i.type === t)
                )) {
                  assert.lengthOf(
                    actor.items.filter(i => i.type === type),
                    1,
                    type
                  );
                }
                count += dropped.length;
              }
            } finally {
              stop();
            }
            assert.isAbove(count, 0, "the packs' indexes held entries");
          })
        );
      });

      // game-rules/73_armor.md, p.198
      // game-rules/74_weapons.md, p.198-205
      describe("Expected effects: armor and weapons", () => {
        // game-rules/73_armor.md, p.198
        it(
          "should give worn Heavy Armor Armor TN +10, Reduction 5, and +5 TN on Agility and Reflexes Skills",
          clean(async () => {
            const { actor, item } = await holding("armor", "Heavy Armor");
            await item.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.bonus, 10);
            assert.equal(actor.system.armorTn.reduction, 5);
            assert.equal(getArmorTnPenalty(actor, "kenjutsu", "agi"), 5);
          })
        );

        // game-rules/73_armor.md, p.198
        it(
          "should give worn Light Armor +5 TN on Athletics",
          clean(async () => {
            const { actor, item } = await holding("armor", "Light Armor");
            await item.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.bonus, 5);
            assert.equal(getArmorTnPenalty(actor, "athletics"), 5);
            assert.equal(getArmorTnPenalty(actor, "kenjutsu", "agi"), 0);
          })
        );

        // game-rules/73_armor.md, p.198
        it(
          "should give Riding Armor +4, and +12 on horseback",
          clean(async () => {
            const { actor, item } = await holding("armor", "Riding Armor");
            await item.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.bonus, 4);
            await actor.toggleStatusEffect("mounted", { active: true });
            assert.equal(actor.system.armorTn.bonus, 12);
          })
        );

        // game-rules/74_weapons.md, p.198, 204
        it(
          "should give a Katana DR 3k2 plus Strength",
          clean(async () => {
            const { item } = await holding("weapons", "Katana");
            assert.equal(item.system.derivedDamageFormula, "5k2");
            assert.equal(item.system.associatedSkill, "Kenjutsu");
          })
        );

        // game-rules/74_weapons.md, p.202
        it(
          "should give a Shuriken no Strength and no exploding dice",
          clean(async () => {
            const { item } = await holding("weapons", "Shuriken");
            assert.equal(item.system.derivedDamageFormula, "1k1");
            assert.isNull(item.system.damageExplode);
          })
        );

        // game-rules/74_weapons.md, p.199-200
        it(
          "should give a Dai-kyu the lower of bow and wielder Strength plus 2k2, and +10 TN on foot",
          clean(async () => {
            const { item } = await holding("weapons", "Dai-kyu");
            assert.equal(item.system.derivedDamageFormula, "4k2");
            assert.equal(item.system.minStrength, 3);
            assert.equal(item.system.tnOnFoot, 10);
          })
        );
      });

      // game-rules/59_high_skills.md, p.135-139
      // game-rules/60_bugei_skills.md, p.139-143
      // game-rules/61_merchant_skills.md, p.143-144
      // game-rules/62_low_skills.md, p.144-145
      describe("Expected effects: Mastery Ability of each Skill", () => {
        /** A PC holding a pack Skill at a rank, and optionally a pack weapon. */
        const skilled = async (skillName, rank, weaponName = null) => {
          const { actor, item: skill } = await holding("skills", skillName);
          await skill.update({ "system.rank": rank });
          const weapon = weaponName
            ? await DragDropHandler.onItemDrop({ actor }, null, {
                uuid: (await entry("weapons", weaponName)).uuid
              })
            : null;
          return { actor, skill, weapon };
        };

        // game-rules/60_bugei_skills.md, p.141
        it(
          "should give Kenjutsu 3 +1k0 on a sword's damage, not a spear's, and explode on 9 at Kenjutsu 7",
          clean(async () => {
            const { actor, skill, weapon } = await skilled("Kenjutsu", 2, "Katana");
            const damage = w => getCheckContext(actor, { kind: "damage", weapon: w });
            assert.notOk(
              damage(weapon).modifiers.some(m => m.roll === 1),
              "rank 2"
            );
            await skill.update({ "system.rank": 3 });
            assert.ok(
              damage(weapon).modifiers.some(m => m.roll === 1),
              "rank 3"
            );
            const spear = await DragDropHandler.onItemDrop({ actor }, null, {
              uuid: (await entry("weapons", "Yari")).uuid
            });
            assert.notOk(
              damage(spear).modifiers.some(m => m.roll === 1),
              "a spear is no sword"
            );
            assert.isNull(damage(weapon).explode);
            await skill.update({ "system.rank": 7 });
            assert.equal(damage(weapon).explode, 9);
          })
        );

        // game-rules/60_bugei_skills.md, p.141
        it(
          "should ignore 2 Reduction at Heavy Weapons 3, and make Knockdown cheaper at 5",
          clean(async () => {
            const { actor, skill, weapon } = await skilled("Heavy Weapons", 3, "Tetsubo");
            assert.equal(getCheckContext(actor, { kind: "damage", weapon }).ignoreReduction, 2);
            const attack = () =>
              getCheckContext(actor, { kind: "attack", skill: "heavy weapons", weapon }).raises
                .maneuverCosts.knockdown ?? 0;
            assert.equal(attack(), 0, "rank 3");
            await skill.update({ "system.rank": 5 });
            assert.equal(attack(), -1, "rank 5");
          })
        );

        // game-rules/60_bugei_skills.md, p.141
        it(
          "should make Disarm cheaper at Knives 5 with a sai, not with a tanto",
          clean(async () => {
            const { actor, weapon: sai } = await skilled("Knives", 5, "Sai");
            const tanto = await DragDropHandler.onItemDrop({ actor }, null, {
              uuid: (await entry("weapons", "Tanto")).uuid
            });
            const disarm = w =>
              getCheckContext(actor, { kind: "attack", skill: "knives", weapon: w }).raises
                .maneuverCosts.disarm ?? 0;
            assert.equal(disarm(sai), -1);
            assert.equal(disarm(tanto), 0);
          })
        );

        // game-rules/59_high_skills.md, p.138
        it(
          "should give Spellcraft 5 +1k0 on Spell Casting Rolls",
          clean(async () => {
            const { actor, skill } = await skilled("Spellcraft", 4);
            const spell = () => getCheckContext(actor, { kind: "spell", ring: "fire" }).modifiers;
            assert.notOk(
              spell().some(m => m.roll === 1),
              "rank 4"
            );
            await skill.update({ "system.rank": 5 });
            assert.ok(
              spell().some(m => m.roll === 1),
              "rank 5"
            );
          })
        );

        // game-rules/60_bugei_skills.md, p.139
        it(
          "should give Defense 5 Armor TN +3 in the Defense Stance only",
          clean(async () => {
            const { actor, skill } = await skilled("Defense", 5);
            const outOfStance = actor.system.armorTn.current;
            await skill.update({ "system.rank": 4 });
            assert.equal(actor.system.armorTn.current, outOfStance, "no stance, no bonus");
            await actor.toggleStatusEffect("defenseStance", { active: true });
            const atFour = actor.system.armorTn.current;
            await skill.update({ "system.rank": 5 });
            // The stance adds the Defense rank, so rank 5 is 1 more from it, and the Mastery adds 3
            // game-rules/36_stances.md, p.84
            assert.equal(actor.system.armorTn.current - atFour, 4);
          })
        );

        // game-rules/60_bugei_skills.md, p.139
        it(
          "should add the Battle rank to Initiative at Battle 5",
          clean(async () => {
            const { actor, skill } = await skilled("Battle", 4);
            assert.equal(actor.system.initiative.totalMod, 0);
            await skill.update({ "system.rank": 5 });
            assert.equal(actor.system.initiative.totalMod, 5);
          })
        );

        // game-rules/60_bugei_skills.md, p.140
        it(
          "should give Hunting 5 an optional +1k0 on Stealth, off until the roller ticks it",
          clean(async () => {
            const { actor } = await skilled("Hunting", 5);
            const modifier = getCheckContext(actor, {
              kind: "skill",
              skill: "stealth"
            }).modifiers.find(m => m.roll === 1);
            assert.ok(modifier);
            assert.isFalse(modifier.enabled);
          })
        );

        // game-rules/58_skills_overview.md, p.133
        it(
          "should give a pack Skill its Free Raise at Rank 10",
          clean(async () => {
            const { actor } = await skilled("Investigation", 10);
            assert.equal(
              getCheckContext(actor, { kind: "skill", skill: "investigation" }).freeRaises,
              1
            );
          })
        );
      });

      // game-rules/63_advantages_and_disadvantages.md, p.146
      // game-rules/64_advantages.md, p.146-155
      // game-rules/65_disadvantages.md, p.156-162
      // game-rules/83_ancestors.md, p.241-244
      describe("Expected effects: Advantages and Disadvantages", () => {
        /** The sum of an actor's modifiers named `label` on a check. */
        const fromRule = (actor, spec, label) =>
          getCheckContext(actor, spec)
            .modifiers.filter(m => m.label === label)
            .reduce((sum, m) => ({ roll: sum.roll + m.roll, keep: sum.keep + m.keep }), {
              roll: 0,
              keep: 0
            });

        // game-rules/83_ancestors.md, p.241-242
        it(
          "should give a Lion with Akodo +1k0 on Kenjutsu, not on Iaijutsu, and refuse a second Ancestor",
          clean(async () => {
            const { actor } = await holding("advantages", "Akodo", { clan: "Lion" });
            const bugei = skill => fromRule(actor, { kind: "skill", skill }, "Akodo: Bugei Skills");
            assert.deepEqual(bugei("kenjutsu"), { roll: 1, keep: 0 });
            assert.deepEqual(bugei("iaijutsu"), { roll: 0, keep: 0 });
            assert.notOk(
              await drop(actor, "advantages", "Ikoma", { confirm: "no" }),
              "Ikoma refused"
            );
          })
        );

        // #81
        // game-rules/64_advantages.md, p.146
        // game-rules/62_low_skills.md, p.144-145
        it(
          "should offer Balance on the Skill and Trait rolls that resist, never on attack or damage",
          clean(async () => {
            const { actor } = await holding("advantages", "Balance");
            const offered = spec =>
              getCheckContext(actor, spec).modifiers.some(m =>
                m.label.startsWith("Resisting Intimidation or Temptation")
              );
            assert.isTrue(offered({ kind: "skill", skill: "etiquette", trait: "wil" }), "skill");
            assert.isTrue(offered({ kind: "trait", trait: "wil" }), "Willpower");
            assert.isFalse(offered({ kind: "attack", skill: "kenjutsu", trait: "agi" }), "attack");
            assert.isFalse(offered({ kind: "damage" }), "damage");
          })
        );

        // #81
        // game-rules/64_advantages.md, p.154
        // game-rules/100_poison.md, p.332
        it(
          "should offer Jurojin's Blessing on the Trait and Ring rolls that resist poison, not damage",
          clean(async () => {
            const { actor } = await holding("advantages", "Seven Fortunes' Blessing (Jurojin)");
            const offered = spec =>
              getCheckContext(actor, spec).modifiers.some(
                m => m.label === "Resisting a disease or poison"
              );
            assert.isTrue(offered({ kind: "trait", trait: "sta" }), "Stamina");
            assert.isTrue(offered({ kind: "ring", ring: "earth" }), "Earth");
            assert.isFalse(offered({ kind: "skill", skill: "kenjutsu", trait: "agi" }), "skill");
            assert.isFalse(offered({ kind: "damage" }), "damage");
          })
        );

        // game-rules/83_ancestors.md, p.243
        it(
          "should add Intelligence to a Phoenix's Armor TN with Shiba",
          clean(async () => {
            const actor = track(
              await createTestPC({
                name: "Compendium packs: Shiba",
                system: { traits: { int: 3 } }
              })
            );
            await actor.createEmbeddedDocuments("Item", [{ name: "Phoenix", type: "clan" }]);
            const before = actor.system.armorTn.current;
            assert.ok(await drop(actor, "advantages", "Shiba", { confirm: "no" }));
            assert.equal(actor.system.armorTn.current - before, 3);
          })
        );

        // game-rules/64_advantages.md, p.148
        it(
          "should make Stamina and Willpower ranks cost 1 less with Elemental Blessing, Earth, not Reflexes",
          clean(async () => {
            const { actor } = await holding("advantages", "Elemental Blessing", {
              traits: { sta: 3, wil: 3, ref: 3 },
              picks: ["earth"]
            });
            assert.equal(xpOf(actor, "trait", "sta"), 11);
            assert.equal(xpOf(actor, "trait", "wil"), 11);
            assert.equal(xpOf(actor, "trait", "ref"), 12);
          })
        );

        // game-rules/64_advantages.md, p.149
        it(
          "should give Friend of the Elements, Water, a Free Raise on Strength Trait rolls only",
          clean(async () => {
            const { actor } = await holding("advantages", "Friend of the Elements", {
              picks: ["water"]
            });
            const freeRaises = spec => getCheckContext(actor, spec).freeRaises;
            assert.equal(freeRaises({ kind: "trait", trait: "str" }), 1);
            assert.equal(freeRaises({ kind: "trait", trait: "ref" }), 0);
            assert.equal(freeRaises({ kind: "skill", skill: "athletics", trait: "str" }), 0);
          })
        );

        // game-rules/64_advantages.md, p.146, 149, 155
        it(
          "should cost 4 for 4 ranks of Wealthy, 3 for a Crane, and 1 with Blissful Betrothal too",
          clean(async () => {
            const { actor, item } = await holding("advantages", "Wealthy");
            await item.update({ "system.cost": 4 });
            assert.equal(xpOf(actor, "advantage", "Wealthy"), 4);
            await actor.createEmbeddedDocuments("Item", [{ name: "Crane", type: "clan" }]);
            assert.equal(xpOf(actor, "advantage", "Wealthy"), 3);
            assert.ok(await drop(actor, "advantages", "Blissful Betrothal", { confirm: "no" }));
            assert.equal(xpOf(actor, "advantage", "Wealthy"), 1);
          })
        );

        // game-rules/64_advantages.md, p.147
        it(
          "should count an Unskilled Low Skill roll as rank 1 with Crafty, not a High Skill",
          clean(async () => {
            const { actor } = await holding("advantages", "Crafty");
            for (const name of ["Stealth", "Courtier"]) {
              const skill = await drop(actor, "skills", name);
              await skill.update({ "system.rank": 0 });
            }
            assert.equal(
              getCheckContext(actor, { kind: "skill", skill: "stealth" }).unskilledAs,
              1
            );
            assert.equal(
              getCheckContext(actor, { kind: "skill", skill: "courtier" }).unskilledAs,
              0
            );
          })
        );

        // game-rules/64_advantages.md, p.151
        // game-rules/65_disadvantages.md, p.162
        it(
          "should give Large +1k0 damage with a large weapon, not a katana, and refuse Small beside it",
          clean(async () => {
            const { actor } = await holding("advantages", "Large");
            const damage = weapon => fromRule(actor, { kind: "damage", weapon }, "Large").roll;
            assert.equal(damage(await drop(actor, "weapons", "Tetsubo")), 1);
            assert.equal(damage(await drop(actor, "weapons", "Katana")), 0);
            assert.notOk(
              await drop(actor, "disadvantages", "Small", { confirm: "no" }),
              "Small refused"
            );
          })
        );

        // game-rules/65_disadvantages.md, p.160
        // game-rules/64_advantages.md, p.154
        it(
          "should add 5 to each penalty past Healthy for Low Pain Threshold, 3 less for Strength of the Earth",
          clean(async () => {
            const { actor: frail } = await holding("disadvantages", "Low Pain Threshold");
            const { actor: tough } = await holding("advantages", "Strength of the Earth");
            // Healthy and Out carry no penalty, whatever the modifier (decision 14, #102)
            for (const [key, level] of Object.entries(frail.system.woundLevels)) {
              const unpenalized = key === "healthy" || key === "out";
              const base = unpenalized ? 0 : level.penalty;
              assert.equal(level.penaltyEff, unpenalized ? 0 : base + 5, `frail ${key}`);
              assert.equal(
                tough.system.woundLevels[key].penaltyEff,
                Math.max(0, base - 3),
                `tough ${key}`
              );
            }
          })
        );

        // game-rules/65_disadvantages.md, p.162
        it(
          "should count Strength one rank lower with Weakness, Strength",
          clean(async () => {
            const { actor } = await holding("disadvantages", "Weakness", {
              traits: { str: 3 },
              picks: ["str"]
            });
            assert.equal(actor.system.traits.str, 2);
          })
        );

        // game-rules/65_disadvantages.md, p.156
        it(
          "should give Antisocial -1k0 on Social Skill rolls, -1k1 in the 4-point version",
          clean(async () => {
            for (const [version, keep] of [
              ["minor", 0],
              ["major", -1]
            ]) {
              const { actor } = await holding("disadvantages", "Antisocial", { picks: [version] });
              await drop(actor, "skills", "Courtier");
              assert.deepEqual(
                fromRule(actor, { kind: "skill", skill: "courtier" }, "Antisocial"),
                { roll: -1, keep },
                version
              );
            }
          })
        );

        // game-rules/64_advantages.md, p.148
        it(
          "should refuse Paragon beside Dark Paragon",
          clean(async () => {
            const { actor } = await holding("advantages", "Dark Paragon", { picks: ["control"] });
            assert.notOk(await drop(actor, "advantages", "Paragon", { confirm: "no" }));
            assert.notOk(actor.items.some(i => i.name === "Paragon"));
          })
        );

        // game-rules/64_advantages.md, p.154
        it(
          "should need the Shadowlands Taint for Touch of the Spirit Realms, Jigoku",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Compendium packs: Jigoku" }));
            const jigoku = "Touch of the Spirit Realms (Jigoku)";
            assert.notOk(await drop(actor, "advantages", jigoku, { confirm: "no" }), "no Taint");
            assert.ok(await drop(actor, "disadvantages", "Shadowlands Taint"));
            assert.ok(await drop(actor, "advantages", jigoku, { confirm: "no" }), "with Taint");
          })
        );
      });

      // game-rules/48_character_creation_expanded.md, p.102-104
      // game-rules/50_crab_schools.md, p.105-108
      // game-rules/51_crane_schools.md, p.109-111
      // game-rules/52_dragon_schools.md, p.112-115
      // game-rules/53_lion_schools.md, p.116-119
      // game-rules/54_mantis_schools.md, p.120-122
      // game-rules/55_phoenix_schools.md, p.123-125
      // game-rules/56_scorpion_schools.md, p.126-129
      // game-rules/57_unicorn_schools.md, p.129-132
      // game-rules/84_advanced_schools_and_alternate_paths.md, p.245-257
      describe("Expected effects: Schools and Techniques", () => {
        const owns = (actor, type, name) =>
          actor.items.some(item => item.type === type && item.name === name);

        // game-rules/48_character_creation_expanded.md, p.102
        // game-rules/50_crab_schools.md, p.106
        it(
          "should grant a dropped School's Skills, with Emphasis, and its Rank 1 Technique only",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Compendium packs: Hida" }));
            assert.ok(await drop(actor, "schools", "Hida Bushi School"));
            for (const skill of [
              "Athletics",
              "Defense",
              "Heavy Weapons",
              "Intimidation",
              "Kenjutsu"
            ]) {
              assert.ok(owns(actor, "skill", skill), skill);
            }
            const heavy = actor.items.find(i => i.type === "skill" && i.name === "Heavy Weapons");
            assert.equal(heavy.system.rank, 1);
            assert.include(heavy.system.trainedEmphases, "Tetsubo");
            assert.equal(heavy.system.freeEmphasis, 1, "the Emphasis is the School's, free");
            assert.ok(owns(actor, "technique", "The Way of the Crab"), "Rank 1 Technique");
            assert.notOk(owns(actor, "technique", "The Mountain Does Not Move"), "no Rank 2 yet");
            assert.equal(actor.system.traits.sta, 3, "+1 Stamina");
          })
        );

        // game-rules/84_advanced_schools_and_alternate_paths.md, p.245-247
        it(
          "should keep both Schools on Add, and start an Advanced School at its Rank 1",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Compendium packs: Defender" }));
            assert.ok(await drop(actor, "schools", "Hida Bushi School"));
            // The GM adds it although the character misses its requirements
            const advanced = await drop(actor, "schools", "Defender of the Wall", {
              school: "add"
            });
            assert.ok(advanced);
            // Its rank is set by hand, not taken from Insight Rank, so its Rank 2 and 3 wait for the player
            assert.equal(advanced.system.rank, 1);
            assert.isFalse(advanced.system.shugenja);
            assert.sameMembers(
              actor.items.filter(i => i.type === "school").map(i => i.name),
              ["Hida Bushi School", "Defender of the Wall"]
            );
            assert.ok(owns(actor, "technique", "The Flames of Purity"));
            assert.notOk(owns(actor, "technique", "Hida's Strength"), "Advanced Rank 2 waits");
          })
        );

        // A Technique's Focus-roll bonus is offered on a duel's Focus roll only (#118)
        // game-rules/51_crane_schools.md, p.109
        // game-rules/84_advanced_schools_and_alternate_paths.md, p.247
        it(
          "should offer The Way of the Crane's and Mirumoto's Strength's Focus bonus on the Focus roll only",
          clean(async function () {
            this.timeout(30_000);
            for (const [name, label] of [
              ["The Way of the Crane", "Focus roll, Center Stance this Round or the last"],
              [
                "Mirumoto's Strength",
                "Mirumoto's Strength: Focus roll in an iaijutsu duel, won Assessment or not"
              ]
            ]) {
              const { actor } = await holding("techniques", name);
              const offered = stage =>
                getCheckContext(actor, {
                  kind: stage === "strike" ? "attack" : "skill",
                  skill: "iaijutsu",
                  options: [`duel:${stage}`]
                }).modifiers.some(m => m.label === label);
              assert.isFalse(offered("assessment"), `${name}: Assessment`);
              assert.isTrue(offered("focus"), `${name}: Focus`);
              assert.isFalse(offered("strike"), `${name}: Strike`);
            }
          })
        );

        it("should stop grant work queued for a character deleted meanwhile, and report no grant error", async function () {
          this.timeout(30_000);
          const actor = await createTestPC({ name: "Compendium packs: Deleted" });
          const source = await entry("schools", "Hida Bushi School");
          const grants = source.system.rules.filter(r => r.key === "GrantItem" && !r.rank);
          const logged = [];
          const original = console.error;
          console.error = (...args) => logged.push(args.map(String).join(" "));
          const stop = answerPurchase();
          try {
            await DragDropHandler.onItemDrop({ actor }, null, { uuid: source.uuid });
            // The School's Skills and Technique are still being granted when the character goes
            await actor.delete();
            await grantQueueOf(actor);
          } finally {
            stop();
            console.error = original;
          }
          assert.notOk(
            logged.some(line => line.includes("Grants for")),
            "the system reports no grant failure"
          );
          // A request already sent when the character went fails at the server, and core logs it; the rest of
          // the queue never runs (each of the School's grants would fail otherwise)
          assert.isBelow(logged.length, grants.length, logged.join("\n"));
        });

        // game-rules/48_character_creation_expanded.md, p.102
        it(
          "should swap the School on Replace and take back what it granted",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Compendium packs: Switch" }));
            assert.ok(await drop(actor, "schools", "Hida Bushi School"));
            assert.ok(await drop(actor, "schools", "Kakita Bushi School", { school: "replace" }));
            assert.deepEqual(
              actor.items.filter(i => i.type === "school").map(i => i.name),
              ["Kakita Bushi School"]
            );
            assert.notOk(owns(actor, "technique", "The Way of the Crab"));
            assert.equal(actor.system.school, "Kakita Bushi School");
          })
        );

        // game-rules/50_crab_schools.md, p.106
        it(
          "should give The Mountain Does Not Move Reduction equal to the Earth Ring",
          clean(async () => {
            const { actor } = await holding("techniques", "The Mountain Does Not Move", {
              traits: { sta: 3, wil: 3 }
            });
            assert.equal(actor.system.rings.earth, 3);
            assert.equal(actor.system.armorTn.reduction, 3);
          })
        );

        // game-rules/53_lion_schools.md, p.117
        it(
          "should attack as a Simple Action with a Samurai weapon under Strength of My Ancestors, not a spear",
          clean(async () => {
            const { actor } = await holding("techniques", "Strength of My Ancestors");
            const actions = name =>
              (async () => {
                const weapon = await drop(actor, "weapons", name);
                return getCheckContext(actor, { kind: "attack", weapon }).actions;
              })();
            assert.deepEqual(
              (await actions("Katana")).map(a => a.action),
              ["simple"]
            );
            assert.lengthOf(await actions("Yari"), 0);
          })
        );

        // game-rules/56_scorpion_schools.md, p.126
        it(
          "should show the Strike From Above, Strike From Below note on a melee attack's card only",
          clean(async () => {
            const { actor } = await holding("techniques", "Strike From Above, Strike From Below");
            const notes = async ranged => {
              const message = await rollCheck({
                actor,
                kind: "attack",
                label: "Packs attack",
                base: { roll: 3, keep: 2 },
                tn: 5,
                ranged,
                askForOptions: false
              });
              posted.push(message);
              return message.system.notes.filter(n => n.includes("Strike From Above"));
            };
            assert.lengthOf(await notes(false), 1, "melee");
            assert.lengthOf(await notes(true), 0, "ranged");
          })
        );

        // game-rules/56_scorpion_schools.md, p.129
        it(
          "should roll School Rank more dice with Strike From Darkness, through @school.rank",
          clean(async () => {
            const { actor } = await holding("techniques", "Strike From Darkness");
            await actor.createEmbeddedDocuments("Item", [
              { name: "Packs School", type: "school", system: { rank: 3 } }
            ]);
            const unaware = getCheckContext(actor, { kind: "attack" }).modifiers.find(m =>
              m.label.includes("unaware")
            );
            assert.equal(unaware.roll, 3);
          })
        );
      });

      // game-rules/52_dragon_schools.md, p.115
      // game-rules/86_kata.md, p.259-260
      // game-rules/87_kiho.md, p.261-267
      describe("Expected effects: kata, kiho, and tattoos", () => {
        /** A PC at a School Rank, holding a pack entry. */
        const ranked = async (pack, name, rank, traits) => {
          const { actor, item } = await holding(pack, name, { traits });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Packs Togashi", type: "school", system: { rank } }
          ]);
          return { actor, item };
        };

        // game-rules/52_dragon_schools.md, p.115
        it(
          "should give Bamboo Armor TN +2 x School Rank +5 while activated, for 2 x School Rank Rounds",
          clean(async () => {
            const { actor, item } = await ranked("tattoos", "Bamboo", 2);
            // Reflexes 2, no armor: the base Armor TN, so owning the tattoo adds nothing
            // game-rules/32_attack_and_defense.md, p.82
            const before = actor.system.armorTn.current;
            assert.equal(before, 15, "owned, not active: no bonus");
            await updateActivation(actor, item);
            assert.equal(actor.system.armorTn.current - before, 9);
            const effect = activationOf(actor, item);
            assert.deepInclude(effect._source.duration, { value: 4, units: "rounds" });
            await updateActivation(actor, item);
            assert.equal(actor.system.armorTn.current, before, "ended");
          })
        );

        // game-rules/52_dragon_schools.md, p.115
        it(
          "should end Bamboo when Crab is activated, one tattoo at a time",
          clean(async () => {
            const { actor, item: bamboo } = await ranked("tattoos", "Bamboo", 1);
            const crab = await drop(actor, "tattoos", "Crab");
            await updateActivation(actor, bamboo);
            await updateActivation(actor, crab);
            assert.notOk(activationOf(actor, bamboo), "Bamboo ended");
            assert.ok(activationOf(actor, crab));
            assert.equal(actor.system.armorTn.reduction, actor.system.rings.earth);
          })
        );

        // game-rules/52_dragon_schools.md, p.115
        it(
          "should keep Mantis always active, with Fear immunity while owned and no activation",
          clean(async () => {
            const { actor, item } = await holding("tattoos", "Mantis");
            assert.isTrue(item.system.passive);
            await updateActivation(actor, item);
            assert.notOk(activationOf(actor, item), "a passive tattoo is not activated");
            await actor.toggleStatusEffect("feared", { active: true });
            assert.isFalse(actor.statuses.has("feared"));
          })
        );

        // game-rules/86_kata.md, p.259
        it(
          "should need Air 3 for Striking as Air, then add the Air Ring to Armor TN in the Defense Stance",
          clean(async () => {
            const low = track(await createTestPC({ name: "Compendium packs: Low Air" }));
            assert.notOk(await drop(low, "kata", "Striking as Air", { confirm: "no" }), "Air 2");
            const { actor, item } = await holding("kata", "Striking as Air", {
              traits: { ref: 3, awa: 3 }
            });
            await updateActivation(actor, item);
            const base = actor.system.armorTn.current;
            await actor.toggleStatusEffect("defenseStance", { active: true });
            const defense = actor.items.find(i => i.name === "Defense")?.system.rank ?? 0;
            // The stance itself adds Air + Defense; the kata adds Air again
            // game-rules/36_stances.md, p.84
            assert.equal(actor.system.armorTn.current - base, 2 * actor.system.rings.air + defense);
          })
        );

        // game-rules/87_kiho.md, p.262
        it(
          "should add Insight Rank + Air Ring to Armor TN while Soul of the Four Winds is active",
          clean(async () => {
            // Air 4 reaches its Mastery Level 4
            // game-rules/87_kiho.md, p.261
            const { actor, item } = await holding("kiho", "Soul of the Four Winds", {
              traits: { str: 2, ref: 4, awa: 4, agi: 2 }
            });
            const before = actor.system.armorTn.current;
            await updateActivation(actor, item);
            assert.equal(
              actor.system.armorTn.current - before,
              actor.system.insight.rank + actor.system.rings.air
            );
          })
        );
      });

      // game-rules/99_creatures.md, p.318-331
      describe("Creatures", () => {
        const pack = () => game.packs.get(`${SYS_ID}.creatures`);
        /**
         * A creature imported from the pack as a new actor. Core keeps the pack's id on import and replaces a world
         * actor with that id [src: client/documents/abstract/document-collection.mjs:369-394], which the cleanup
         * would then delete (#99).
         */
        const imported = async name =>
          track(
            await game.actors.importFromCompendium(
              pack(),
              pack().index.find(e => e.name === name)._id,
              {},
              { keepId: false }
            )
          );

        // #99
        it(
          "should import a new actor each time, leaving the world's copy of the creature",
          clean(async () => {
            const first = await imported("Kappa");
            const second = await imported("Kappa");
            assert.notEqual(second.id, first.id);
            assert.isTrue(game.actors.has(first.id), "the first copy is still in the world");
          })
        );

        // The creatures pack is GM-only (roadmap/STAGE-15 decision 7)
        it(
          "should keep the pack the GM's, with no access for players",
          clean(async function () {
            const player = game.users.find(user => user.role === CONST.USER_ROLES.PLAYER);
            if (!player) {
              this.skip();
            }
            // [src: client/documents/collections/compendium-collection.mjs:433-455]
            assert.isFalse(pack().testUserPermission(player, "LIMITED"), "a player");
            assert.isTrue(pack().testUserPermission(game.user, "OWNER"), "the GM");
            assert.isTrue(
              game.packs.get(`${SYS_ID}.skills`).testUserPermission(player, "OBSERVER")
            );
          })
        );

        it(
          "should import every creature as an NPC with its page; every creature's rules reach it",
          clean(async function () {
            this.timeout(60_000);
            assert.isAbove(pack().index.size, 0);
            for (const index of pack().index) {
              const actor = await imported(index.name);
              assert.equal(actor.type, "npc", index.name);
              assert.isAbove(actor.system.source.page, 317, index.name);
              // The special abilities' rules and the Skills' own rules reach the creature
              for (const doc of [...actor.appliedEffects, ...actor.items]) {
                assert.deepEqual(missingRules(actor, doc), [], `${index.name}: ${doc.name}`);
              }
            }
          })
        );

        // game-rules/99_creatures.md, p.319, 329
        it(
          "should give the Oni Reduction 24, 12 against jade, Invulnerable save to jade, and Fear 3",
          clean(async () => {
            const oni = await imported("Oni (Ugulu no Oni)");
            const { reduction, ruleReduction } = oni.system.armorTn;
            const defenses = {
              reduction: [{ value: reduction - ruleReduction, except: [] }, ...oni.reductionParts],
              invulnerable: oni.damageDefenses.invulnerable,
              spirit: oni.damageDefenses.spirit
            };
            assert.equal(reduction, 24);
            assert.equal(getWoundsTaken({ damage: 40, defenses }).wounds, 1, "a steel blade");
            assert.equal(
              getWoundsTaken({ damage: 40, tags: ["jade"], defenses }).wounds,
              28,
              "a jade blade"
            );
            assert.equal(oni.system.fear.rank, 3);
            assert.equal(oni.system.shadowTaint.rank, 6);
            // 124: Dead, its unused Wound levels in between leaving the threshold alone
            assert.equal(oni.system.woundLevels.out.value, 124);
          })
        );

        // game-rules/99_creatures.md, p.320
        it(
          "should give the Dog Hunting 3 with Tracking, and move it as Water 3 with Swift 2",
          clean(async () => {
            const dog = await imported("Dog");
            const hunting = dog.items.find(i => i.type === "skill" && i.name === "Hunting");
            assert.equal(hunting.system.rank, 3);
            assert.include(hunting.system.trainedEmphases, "Tracking");
            assert.equal(dog.system.movement.simpleAction, (dog.system.rings.water + 2) * 10);
          })
        );

        // game-rules/99_creatures.md, p.330
        it(
          "should give the Tsuno two attacks, Tsuno blade 7k3 and unarmed 6k3, with their damage",
          clean(async () => {
            const tsuno = await imported("Tsuno");
            const pools = ["attack1", "damage1", "attack2", "damage2"].map(
              key => `${tsuno.system[key].roll}k${tsuno.system[key].keep}`
            );
            assert.deepEqual(pools, ["7k3", "6k3", "6k3", "3k2"]);
          })
        );
      });

      // game-rules/66_magic_and_spell_casting.md, p.163-164
      // game-rules/67_universal_spells.md, p.164-166
      // game-rules/68_air_spells.md, p.167-173
      // game-rules/69_earth_spells.md, p.173-180
      // game-rules/70_fire_spells.md, p.180-186
      // game-rules/71_water_spells.md, p.187-193
      // game-rules/72_void_spells.md, p.193-197
      // game-rules/88_maho.md, p.267-274
      describe("Expected effects: spells", () => {
        /**
         * The index entries of the spells pack matching a test. The index the world loads at startup holds core's
         * fields only; getIndex reads the configured ones (CONFIG.Item.compendiumIndexFields).
         */
        const spells = async test =>
          (await game.packs.get(`${SYS_ID}.spells`).getIndex()).filter(e => test(e.system ?? {}));

        // game-rules/66_magic_and_spell_casting.md, p.163
        it(
          "should cast a pack Fire spell of Mastery Level 1 at TN 10, 5 + 5 x Mastery Level",
          clean(async () => {
            const [fire] = await spells(s => s.ring === "fire" && s.mastery === 1 && !s.maho);
            assert.ok(fire, "a Fire spell of Mastery Level 1");
            const actor = track(await createShugenja({ name: "Compendium packs: caster" }));
            const spell = await DragDropHandler.onItemDrop({ actor }, null, {
              uuid: fire.uuid
            });
            const message = await RollHandler.rollSpellCast(actor, spell, false);
            posted.push(message);
            assert.equal(message.system.tn.base, 10);
            assert.equal(message.system.kind, "spell");
          })
        );

        it(
          "should list only Fire spells of Mastery Level 2 on the browser's Spells tab filtered to them",
          clean(async () => {
            const expected = (await spells(s => s.ring === "fire" && s.mastery === 2)).length;
            assert.isAbove(expected, 0, "Fire spells of Mastery Level 2 exist");
            await CompendiumBrowserApplication.open();
            const app = foundry.applications.instances.get(`${SYS_ID}-compendium-browser`);
            try {
              app.tab = "spells";
              app.search = "";
              app.choices = { ring: "fire", mastery: "2" };
              await app.render();
              const rows = [...app.element.querySelectorAll("[data-uuid]")];
              assert.lengthOf(rows, expected);
              for (const row of rows) {
                assert.include(row.textContent, "Fire, Mastery Level 2");
              }
            } finally {
              await app.close({ animate: false });
            }
          })
        );
      });

      describe("Citation in place of the book's text", () => {
        it(
          "should show the page under the item sheet's name, and end the chat card with it",
          clean(async () => {
            const { item } = await holding("weapons", "Katana");
            await item.sheet.render({ force: true });
            try {
              assert.isTrue(
                await waitFor(() => item.sheet.element?.querySelector("[data-citation]"))
              );
              const citation = item.sheet.element.querySelector("[data-citation]");
              assert.equal(citation.textContent.trim(), "Core Rulebook p.204");
            } finally {
              await item.sheet.close({ animate: false });
            }
            const message = await item.roll();
            assert.include(message.content, "Core Rulebook p.204");
            assert.include(message.content, "Void Point");
          })
        );
      });

      describe("Compendium browser", () => {
        /** The open browser, on a tab. */
        const openOn = async tab => {
          await CompendiumBrowserApplication.open();
          const app = foundry.applications.instances.get(`${SYS_ID}-compendium-browser`);
          app.tab = tab;
          app.choices = {};
          app.search = "";
          await app.render();
          return app;
        };

        it(
          "should filter the Equipment tab by group, size, and name",
          clean(async () => {
            const app = await openOn("equipment");
            try {
              app.choices = { folder: "Swords", size: "medium" };
              app.search = "ka";
              await app.render();
              const names = [...app.element.querySelectorAll("[data-action='open-entry']")].map(
                a => a.textContent
              );
              assert.sameMembers(names, ["Katana"]);
              const row = app.element.querySelector("[data-uuid]");
              assert.include(row.textContent, "DR 3k2");
              assert.include(row.textContent, "Core Rulebook p.204");
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        // #79
        it(
          "should say that nothing matches in one line in the list's place, and announce the count",
          clean(async () => {
            const app = await openOn("equipment");
            try {
              app.search = "no entry is called this";
              await app.render();
              const part = app.element.querySelector("[data-application-part='results']");
              assert.isNull(part.querySelector("ul, li"), "no list holds the empty line");
              assert.equal(
                part.querySelector("p:not([aria-live])").textContent.trim(),
                game.i18n.localize("l5r4.apps.compendiumBrowser.none")
              );
              assert.ok(part.querySelector("p[aria-live='polite']"), "the count is announced");
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "should switch tabs, clear filters, open a name's sheet, and import a creature",
          clean(async () => {
            const app = await openOn("equipment");
            const before = new Set(game.actors.map(a => a.id));
            try {
              app.element.querySelector("[data-action='select-tab'][data-tab='creatures']").click();
              assert.isTrue(await waitFor(() => app.tab === "creatures"));
              await waitFor(() => app.element.querySelector("[data-action='import-entry']"));

              app.search = "Oni";
              await app.render();
              app.element.querySelector("[data-action='clear-filters']").click();
              assert.isTrue(await waitFor(() => app.search === ""), "the search is cleared");

              app.search = "Kappa";
              await app.render();
              const row = app.element.querySelector("[data-uuid]");
              const entry = await fromUuid(row.dataset.uuid);
              row.querySelector("[data-action='open-entry']").click();
              assert.isTrue(await waitFor(() => entry.sheet?.rendered), "the entry's sheet opens");
              await entry.sheet.close({ animate: false });

              row.querySelector("[data-action='import-entry']").click();
              const imported = () => game.actors.find(a => !before.has(a.id) && a.name === "Kappa");
              assert.isTrue(await waitFor(imported), "the creature is in the world");
              track(imported());
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        // roadmap/STAGE-18 decision 13, #100
        it(
          "should ask on Import whether to replace a creature the world holds or add a new one",
          clean(async function () {
            this.timeout(20_000);
            const app = await openOn("equipment");
            const before = new Set(game.actors.map(a => a.id));
            const copies = () => game.actors.filter(a => !before.has(a.id) && a.name === "Kappa");
            try {
              app.element.querySelector("[data-action='select-tab'][data-tab='creatures']").click();
              assert.isTrue(await waitFor(() => app.tab === "creatures"));
              app.search = "Kappa";
              await app.render();
              const importButton = () => app.element.querySelector("[data-action='import-entry']");

              importButton().click();
              assert.isTrue(await waitFor(() => copies().length === 1), "the first Import adds it");
              const [first] = copies().map(track);
              await first.update({ "system.suffered": 3 });

              let asked = null;
              Hooks.once("renderDialogV2", dialog => {
                asked = dialog;
              });
              importButton().click();
              assert.isTrue(await waitFor(() => asked !== null), "a repeat Import asks");
              asked.element.querySelector("[data-action='copy']").click();
              assert.isTrue(await waitFor(() => copies().length === 2), "New adds a second copy");
              copies()
                .filter(a => a.id !== first.id)
                .forEach(track);
              assert.equal(first.system.suffered, 3, "the world's copy keeps its Wounds");
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "should put the item on the controlled token's actor through the purchase path on Add",
          clean(async function () {
            if (!canvas.scene) {
              this.skip();
            }
            const actor = track(await createTestPC({ name: "Compendium packs: shopper" }));
            const [token] = await canvas.scene.createEmbeddedDocuments("Token", [
              (await actor.getTokenDocument({ x: 0, y: 0 })).toObject()
            ]);
            track(token);
            await waitFor(() => token.object);
            token.object.control({ releaseOthers: true });
            const app = await openOn("equipment");
            try {
              app.search = "Tetsubo";
              await app.render();
              app.element.querySelector("[data-action='add-entry']").click();
              assert.isTrue(await waitFor(() => actor.items.some(i => i.name === "Tetsubo")));
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "should drag a row from its icon as an Item drop a sheet takes, without core cancelling it",
          clean(async () => {
            const app = await openOn("equipment");
            try {
              app.search = "Light Armor";
              await app.render();
              // A user grabs the icon or the name, which carry no draggable attribute
              // [src: client/game.mjs:2239-2245]
              const icon = app.element.querySelector("[data-uuid] img");
              const transfer = new DataTransfer();
              const event = new DragEvent("dragstart", {
                dataTransfer: transfer,
                bubbles: true,
                cancelable: true
              });
              icon.dispatchEvent(event);
              assert.isFalse(event.defaultPrevented, "core cancelled the drag");
              const data = JSON.parse(transfer.getData("text/plain"));
              assert.equal(data.type, "Item");
              const actor = track(await createTestPC({ name: "Compendium packs: dragger" }));
              const item = await DragDropHandler.onItemDrop({ actor }, null, data);
              assert.equal(item.name, "Light Armor");
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "should list an entry added to a world compendium since, once reopened",
          clean(async () => {
            const pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
              label: "Packs Quench pack",
              type: "Item"
            });
            try {
              const app = await openOn("equipment");
              await app.close({ animate: false });
              await foundry.documents.Item.implementation.create(
                { name: "Quench Lantern", type: "commonItem" },
                { pack: pack.collection }
              );
              const reopened = await openOn("equipment");
              reopened.search = "Quench Lantern";
              await reopened.render();
              assert.lengthOf(reopened.element.querySelectorAll("[data-uuid]"), 1);
              await reopened.close({ animate: false });
            } finally {
              await pack.deleteCompendium();
            }
          })
        );

        it(
          "should open it from a Browse button in the Compendium sidebar",
          clean(async () => {
            const id = `${SYS_ID}-compendium-browser`;
            await foundry.applications.instances.get(id)?.close({ animate: false });
            await ui.compendium.render({ force: true });
            assert.isTrue(
              await waitFor(() => ui.compendium.element.querySelector("[data-l5r4-browser]"))
            );
            const browse = ui.compendium.element.querySelector("button[data-l5r4-browser]");
            assert.isNotNull(browse.querySelector("i[inert]"));
            assert.equal(
              browse.querySelector("span").textContent,
              game.i18n.localize("l5r4.apps.compendiumBrowser.open")
            );
            browse.click();
            assert.isTrue(await waitFor(() => foundry.applications.instances.get(id)?.rendered));
            await foundry.applications.instances.get(id).close({ animate: false });
          })
        );
      });
    },
    { displayName: "L5R4: Compendium packs and browser" }
  );
}
