import { SYS_ID } from "../../module/config/constants.js";
import { createRule } from "../../module/data/rules/rule-models.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";
import { DragDropHandler } from "../../module/sheets/handlers/drag-drop-handler.js";
import { getArmorTNPenalty } from "../../module/utils/armor-penalties.js";
import CompendiumBrowser from "../../module/apps/compendium-browser.js";
import { PcRollHandler } from "../../module/sheets/handlers/pc-roll-handler.js";
import { answeredRules } from "../../module/utils/choices.js";
import { rollCheck } from "../../module/services/dice/check/roll-check.js";
import { grantsSettled } from "../../module/documents/item/lifecycle/grants.js";
import { activationOf, toggleActivation } from "../../module/services/effects/activation.js";
import { woundsTaken } from "../../module/utils/damage.js";
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
export function registerPacksBatch(quench) {
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
          const item = await DragDropHandler.handleItemDrop({ actor }, null, { uuid: source.uuid });
          await grantsSettled(actor);
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
        const actor = track(await createTestPC({ name: `Packs ${name}`, system: { traits } }));
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
       * collectRules). Counted per key, so a second rule of one key needs its own entry.
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
          await toggleActivation(actor, item);
        }
      };

      /** The XP an actor's entry of a type and name cost (pp.102-103). */
      const xpOf = (actor, type, name) =>
        actor.system._xp.entries.find(e => e.type === type && e.name === name)?.delta;

      describe("Packs", () => {
        it(
          "every pack system.json declares opens, with entries",
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
          "every entry cites a Core Rulebook page and its rules validate",
          clean(async () => {
            for (const pack of PACKS()) {
              for (const doc of await pack.getDocuments()) {
                assert.equal(doc.system.source.book, "core", doc.name);
                assert.isAbove(doc.system.source.page, 0, doc.name);
                assert.equal(doc.system.description ?? "", "", `${doc.name}: description`);
                // The actor fills a choice in before it validates (module/documents/actor/rules.js), so each rule is
                // checked as it reads once each ChoiceSet has an answer
                for (const rule of answeredRules(doc.system.rules)) {
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
          "every item drops on a PC through the sheet's drop path, and every full or partial entry's rules reach the actor",
          clean(async function () {
            this.timeout(240_000);
            // One actor per pack takes every entry of it, so the GM adds those whose prerequisites it misses
            // anyway, and each School is added beside the others
            const stop = answerPurchase();
            let count = 0;
            try {
              for (const pack of PACKS().filter(p => p.documentName === "Item")) {
                const actor = track(
                  await createTestPC({ name: `Packs collector (${pack.metadata.name})` })
                );
                const dropped = [];
                for (const index of pack.index) {
                  const item = await DragDropHandler.handleItemDrop({ actor }, null, {
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
                await grantsSettled(actor);
                // A Clan or Family replaces the one before it (p.102); everything else stays
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

      describe("Expected effects (pp.198-205)", () => {
        it(
          "Heavy Armor worn: Armor TN +10, Reduction 5, +5 TN on Agility and Reflexes Skill Rolls (p.198)",
          clean(async () => {
            const { actor, item } = await holding("armor", "Heavy Armor");
            await item.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.bonus, 10);
            assert.equal(actor.system.armorTn.reduction, 5);
            assert.equal(getArmorTNPenalty(actor, "kenjutsu", "agi"), 5);
          })
        );

        it(
          "Light Armor worn: +5 TN on Athletics (p.198)",
          clean(async () => {
            const { actor, item } = await holding("armor", "Light Armor");
            await item.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.bonus, 5);
            assert.equal(getArmorTNPenalty(actor, "athletics"), 5);
            assert.equal(getArmorTNPenalty(actor, "kenjutsu", "agi"), 0);
          })
        );

        it(
          "Riding Armor: +4, and +12 on horseback (p.198)",
          clean(async () => {
            const { actor, item } = await holding("armor", "Riding Armor");
            await item.update({ "system.equipped": true });
            assert.equal(actor.system.armorTn.bonus, 4);
            await actor.toggleStatusEffect("mounted", { active: true });
            assert.equal(actor.system.armorTn.bonus, 12);
          })
        );

        it(
          "Katana: DR 3k2 plus Strength (pp.198, 204)",
          clean(async () => {
            const { item } = await holding("weapons", "Katana");
            assert.equal(item.system.derivedDamageFormula, "5k2");
            assert.equal(item.system.associatedSkill, "Kenjutsu");
          })
        );

        it(
          "Shuriken: no Strength, no exploding dice (p.202)",
          clean(async () => {
            const { item } = await holding("weapons", "Shuriken");
            assert.equal(item.system.derivedDamageFormula, "1k1");
            assert.isNull(item.system.damageExplode);
          })
        );

        it(
          "Dai-kyu with a Willow Leaf: the lower of bow and wielder Strength plus 2k2; +10 TN on foot (pp.199-200)",
          clean(async () => {
            const { item } = await holding("weapons", "Dai-kyu");
            assert.equal(item.system.derivedDamageFormula, "4k2");
            assert.equal(item.system.minStrength, 3);
            assert.equal(item.system.tnOnFoot, 10);
          })
        );
      });

      describe("Expected effects: Skill Mastery Abilities (pp.135-145)", () => {
        /** A PC holding a pack Skill at a rank, and optionally a pack weapon. */
        const skilled = async (skillName, rank, weaponName = null) => {
          const { actor, item: skill } = await holding("skills", skillName);
          await skill.update({ "system.rank": rank });
          const weapon = weaponName
            ? await DragDropHandler.handleItemDrop({ actor }, null, {
                uuid: (await entry("weapons", weaponName)).uuid
              })
            : null;
          return { actor, skill, weapon };
        };

        it(
          "Kenjutsu 3: +1k0 on a sword's damage, not at 2 and not with a spear; Kenjutsu 7: dice explode on 9 (p.141)",
          clean(async () => {
            const { actor, skill, weapon } = await skilled("Kenjutsu", 2, "Katana");
            const damage = w => collectCheck(actor, { kind: "damage", weapon: w });
            assert.notOk(
              damage(weapon).modifiers.some(m => m.roll === 1),
              "rank 2"
            );
            await skill.update({ "system.rank": 3 });
            assert.ok(
              damage(weapon).modifiers.some(m => m.roll === 1),
              "rank 3"
            );
            const spear = await DragDropHandler.handleItemDrop({ actor }, null, {
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

        it(
          "Heavy Weapons: ignore 2 Reduction at 3, a cheaper Knockdown at 5 (p.141)",
          clean(async () => {
            const { actor, skill, weapon } = await skilled("Heavy Weapons", 3, "Tetsubo");
            assert.equal(collectCheck(actor, { kind: "damage", weapon }).ignoreReduction, 2);
            const attack = () =>
              collectCheck(actor, { kind: "attack", skill: "heavy weapons", weapon }).raises
                .maneuverCosts.knockdown ?? 0;
            assert.equal(attack(), 0, "rank 3");
            await skill.update({ "system.rank": 5 });
            assert.equal(attack(), -1, "rank 5");
          })
        );

        it(
          "Knives 5: a cheaper Disarm with a sai, not with a tanto (p.141)",
          clean(async () => {
            const { actor, weapon: sai } = await skilled("Knives", 5, "Sai");
            const tanto = await DragDropHandler.handleItemDrop({ actor }, null, {
              uuid: (await entry("weapons", "Tanto")).uuid
            });
            const disarm = w =>
              collectCheck(actor, { kind: "attack", skill: "knives", weapon: w }).raises
                .maneuverCosts.disarm ?? 0;
            assert.equal(disarm(sai), -1);
            assert.equal(disarm(tanto), 0);
          })
        );

        it(
          "Spellcraft 5: +1k0 on Spell Casting Rolls (p.138)",
          clean(async () => {
            const { actor, skill } = await skilled("Spellcraft", 4);
            const spell = () => collectCheck(actor, { kind: "spell", ring: "fire" }).modifiers;
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

        it(
          "Defense 5: Armor TN +3 in the Defense Stance only (p.139)",
          clean(async () => {
            const { actor, skill } = await skilled("Defense", 5);
            const outOfStance = actor.system.armorTn.current;
            await skill.update({ "system.rank": 4 });
            assert.equal(actor.system.armorTn.current, outOfStance, "no stance, no bonus");
            await actor.toggleStatusEffect("defenseStance", { active: true });
            const atFour = actor.system.armorTn.current;
            await skill.update({ "system.rank": 5 });
            // The stance adds the Defense rank (p.84), so rank 5 is 1 more from it, and the Mastery adds 3
            assert.equal(actor.system.armorTn.current - atFour, 4);
          })
        );

        it(
          "Battle 5: the Battle rank is added to Initiative (p.139)",
          clean(async () => {
            const { actor, skill } = await skilled("Battle", 4);
            assert.equal(actor.system.initiative.totalMod, 0);
            await skill.update({ "system.rank": 5 });
            assert.equal(actor.system.initiative.totalMod, 5);
          })
        );

        it(
          "Hunting 5: an optional +1k0 on Stealth, off until the roller ticks it (p.140)",
          clean(async () => {
            const { actor } = await skilled("Hunting", 5);
            const modifier = collectCheck(actor, {
              kind: "skill",
              skill: "stealth"
            }).modifiers.find(m => m.roll === 1);
            assert.ok(modifier);
            assert.isFalse(modifier.enabled);
          })
        );

        it(
          "Rank 10 of a pack Skill gives its Free Raise (p.133)",
          clean(async () => {
            const { actor } = await skilled("Investigation", 10);
            assert.equal(
              collectCheck(actor, { kind: "skill", skill: "investigation" }).freeRaises,
              1
            );
          })
        );
      });

      describe("Expected effects: Advantages and Disadvantages (pp.146-162, 241-244)", () => {
        /** The sum of an actor's modifiers named `label` on a check. */
        const fromRule = (actor, spec, label) =>
          collectCheck(actor, spec)
            .modifiers.filter(m => m.label === label)
            .reduce((sum, m) => ({ roll: sum.roll + m.roll, keep: sum.keep + m.keep }), {
              roll: 0,
              keep: 0
            });

        it(
          "Akodo (p.242): a Lion gets +1k0 on Kenjutsu, not on Iaijutsu; no second Ancestor (p.241)",
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

        it(
          "Shiba (p.243): a Phoenix adds Intelligence to Armor TN",
          clean(async () => {
            const actor = track(
              await createTestPC({ name: "Packs Shiba", system: { traits: { int: 3 } } })
            );
            await actor.createEmbeddedDocuments("Item", [{ name: "Phoenix", type: "clan" }]);
            const before = actor.system.armorTn.current;
            assert.ok(await drop(actor, "advantages", "Shiba", { confirm: "no" }));
            assert.equal(actor.system.armorTn.current - before, 3);
          })
        );

        it(
          "Elemental Blessing, Earth (p.148): Stamina and Willpower ranks cost 1 less, Reflexes does not",
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

        it(
          "Friend of the Elements, Water (p.149): a Free Raise on Strength Trait rolls only",
          clean(async () => {
            const { actor } = await holding("advantages", "Friend of the Elements", {
              picks: ["water"]
            });
            const freeRaises = spec => collectCheck(actor, spec).freeRaises;
            assert.equal(freeRaises({ kind: "trait", trait: "str" }), 1);
            assert.equal(freeRaises({ kind: "trait", trait: "ref" }), 0);
            assert.equal(freeRaises({ kind: "skill", skill: "athletics", trait: "str" }), 0);
          })
        );

        it(
          "Wealthy (pp.146, 149, 155): 4 ranks cost 4, 3 for a Crane, 1 with Blissful Betrothal too",
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

        it(
          "Crafty (p.147): an Unskilled Low Skill roll counts as rank 1, a High Skill does not",
          clean(async () => {
            const { actor } = await holding("advantages", "Crafty");
            for (const name of ["Stealth", "Courtier"]) {
              const skill = await drop(actor, "skills", name);
              await skill.update({ "system.rank": 0 });
            }
            assert.equal(collectCheck(actor, { kind: "skill", skill: "stealth" }).unskilledAs, 1);
            assert.equal(collectCheck(actor, { kind: "skill", skill: "courtier" }).unskilledAs, 0);
          })
        );

        it(
          "Large (p.151): +1k0 damage with a large weapon, not with a katana; not with Small (p.162)",
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

        it(
          "Low Pain Threshold (p.160): +5 on each Wound Rank's penalty past Healthy; Strength of the Earth (p.154): 3 less",
          clean(async () => {
            const { actor: frail } = await holding("disadvantages", "Low Pain Threshold");
            const { actor: tough } = await holding("advantages", "Strength of the Earth");
            for (const [key, level] of Object.entries(frail.system.woundLevels)) {
              const base = key === "healthy" ? 0 : level.penalty;
              assert.equal(level.penaltyEff, key === "healthy" ? 0 : base + 5, `frail ${key}`);
              assert.equal(
                tough.system.woundLevels[key].penaltyEff,
                Math.max(0, base - 3),
                `tough ${key}`
              );
            }
          })
        );

        it(
          "Weakness, Strength (p.162): Strength counts one rank lower",
          clean(async () => {
            const { actor } = await holding("disadvantages", "Weakness", {
              traits: { str: 3 },
              picks: ["str"]
            });
            assert.equal(actor.system.traits.str, 2);
          })
        );

        it(
          "Antisocial (p.156): -1k0 on Social Skill rolls, -1k1 in the 4-point version",
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

        it(
          "Paragon (p.148): refused beside Dark Paragon",
          clean(async () => {
            const { actor } = await holding("advantages", "Dark Paragon", { picks: ["control"] });
            assert.notOk(await drop(actor, "advantages", "Paragon", { confirm: "no" }));
            assert.notOk(actor.items.some(i => i.name === "Paragon"));
          })
        );

        it(
          "Touch of the Spirit Realms (Jigoku) (p.154): needs the Shadowlands Taint",
          clean(async () => {
            const actor = track(await createTestPC({ name: "Packs Jigoku" }));
            const jigoku = "Touch of the Spirit Realms (Jigoku)";
            assert.notOk(await drop(actor, "advantages", jigoku, { confirm: "no" }), "no Taint");
            assert.ok(await drop(actor, "disadvantages", "Shadowlands Taint"));
            assert.ok(await drop(actor, "advantages", jigoku, { confirm: "no" }), "with Taint");
          })
        );
      });

      describe("Expected effects: Schools and Techniques (pp.102-132, 245-257)", () => {
        const owns = (actor, type, name) =>
          actor.items.some(item => item.type === type && item.name === name);

        it(
          "a School drop grants its Skills, with Emphasis, and its Rank 1 Technique only (pp.102, 106)",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Packs Hida" }));
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

        it(
          "a second School asks: Add keeps both, and an Advanced School starts at its Rank 1 (pp.245-247)",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Packs Defender" }));
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

        it("grant work queued for a character deleted meanwhile stops, and reports no grant error", async function () {
          this.timeout(30_000);
          const actor = await createTestPC({ name: "Packs Deleted" });
          const source = await entry("schools", "Hida Bushi School");
          const grants = source.system.rules.filter(r => r.key === "GrantItem" && !r.rank);
          const logged = [];
          const original = console.error;
          console.error = (...args) => logged.push(args.map(String).join(" "));
          const stop = answerPurchase();
          try {
            await DragDropHandler.handleItemDrop({ actor }, null, { uuid: source.uuid });
            // The School's Skills and Technique are still being granted when the character goes
            await actor.delete();
            await grantsSettled(actor);
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

        it(
          "Replace swaps the School and takes back what it granted (p.102)",
          clean(async function () {
            this.timeout(30_000);
            const actor = track(await createTestPC({ name: "Packs Switch" }));
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

        it(
          "The Mountain Does Not Move: Reduction equal to the Earth Ring (p.106)",
          clean(async () => {
            const { actor } = await holding("techniques", "The Mountain Does Not Move", {
              traits: { sta: 3, wil: 3 }
            });
            assert.equal(actor.system.rings.earth, 3);
            assert.equal(actor.system.armorTn.reduction, 3);
          })
        );

        it(
          "Strength of My Ancestors: a Samurai-keyword weapon attacks as a Simple Action, a spear does not (p.117)",
          clean(async () => {
            const { actor } = await holding("techniques", "Strength of My Ancestors");
            const actions = name =>
              (async () => {
                const weapon = await drop(actor, "weapons", name);
                return collectCheck(actor, { kind: "attack", weapon }).actions;
              })();
            assert.deepEqual(
              (await actions("Katana")).map(a => a.action),
              ["simple"]
            );
            assert.lengthOf(await actions("Yari"), 0);
          })
        );

        it(
          "Strike From Above, Strike From Below: the Simple Action note shows on a melee attack's card only (p.126)",
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

        it(
          "@school.rank: Strike From Darkness rolls School Rank more dice (p.129)",
          clean(async () => {
            const { actor } = await holding("techniques", "Strike From Darkness");
            await actor.createEmbeddedDocuments("Item", [
              { name: "Packs School", type: "school", system: { rank: 3 } }
            ]);
            const unaware = collectCheck(actor, { kind: "attack" }).modifiers.find(m =>
              m.label.includes("unaware")
            );
            assert.equal(unaware.roll, 3);
          })
        );
      });

      describe("Expected effects: kata, kiho, and tattoos (pp.115, 259-267)", () => {
        /** A PC at a School Rank, holding a pack entry. */
        const ranked = async (pack, name, rank, traits) => {
          const { actor, item } = await holding(pack, name, { traits });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Packs Togashi", type: "school", system: { rank } }
          ]);
          return { actor, item };
        };

        it(
          "Bamboo: Armor TN +2 x School Rank +5 only while activated, for 2 x School Rank Rounds (p.115)",
          clean(async () => {
            const { actor, item } = await ranked("tattoos", "Bamboo", 2);
            // Reflexes 2, no armor: the base Armor TN (p.82), so owning the tattoo adds nothing
            const before = actor.system.armorTn.current;
            assert.equal(before, 15, "owned, not active: no bonus");
            await toggleActivation(actor, item);
            assert.equal(actor.system.armorTn.current - before, 9);
            const effect = activationOf(actor, item);
            assert.deepInclude(effect._source.duration, { value: 4, units: "rounds" });
            await toggleActivation(actor, item);
            assert.equal(actor.system.armorTn.current, before, "ended");
          })
        );

        it(
          "one tattoo at a time: activating Crab ends Bamboo (p.115)",
          clean(async () => {
            const { actor, item: bamboo } = await ranked("tattoos", "Bamboo", 1);
            const crab = await drop(actor, "tattoos", "Crab");
            await toggleActivation(actor, bamboo);
            await toggleActivation(actor, crab);
            assert.notOk(activationOf(actor, bamboo), "Bamboo ended");
            assert.ok(activationOf(actor, crab));
            assert.equal(actor.system.armorTn.reduction, actor.system.rings.earth);
          })
        );

        it(
          "Mantis: always active, Fear immunity while owned, and no activation (p.115)",
          clean(async () => {
            const { actor, item } = await holding("tattoos", "Mantis");
            assert.isTrue(item.system.passive);
            await toggleActivation(actor, item);
            assert.notOk(activationOf(actor, item), "a passive tattoo is not activated");
            await actor.toggleStatusEffect("feared", { active: true });
            assert.isFalse(actor.statuses.has("feared"));
          })
        );

        it(
          "Striking as Air: needs Air 3; executed, Armor TN + Air Ring in the Defense Stance only (p.259)",
          clean(async () => {
            const low = track(await createTestPC({ name: "Packs Low Air" }));
            assert.notOk(await drop(low, "kata", "Striking as Air", { confirm: "no" }), "Air 2");
            const { actor, item } = await holding("kata", "Striking as Air", {
              traits: { ref: 3, awa: 3 }
            });
            await toggleActivation(actor, item);
            const base = actor.system.armorTn.current;
            await actor.toggleStatusEffect("defenseStance", { active: true });
            const defense = actor.items.find(i => i.name === "Defense")?.system.rank ?? 0;
            // The stance itself adds Air + Defense (p.84); the kata adds Air again
            assert.equal(actor.system.armorTn.current - base, 2 * actor.system.rings.air + defense);
          })
        );

        it(
          "Soul of the Four Winds: Armor TN + Insight Rank + Air Ring while active (p.262)",
          clean(async () => {
            const { actor, item } = await holding("kiho", "Soul of the Four Winds");
            const before = actor.system.armorTn.current;
            await toggleActivation(actor, item);
            assert.equal(
              actor.system.armorTn.current - before,
              actor.system.insight.rank + actor.system.rings.air
            );
          })
        );
      });

      describe("Creatures (pp.318-331)", () => {
        const pack = () => game.packs.get(`${SYS_ID}.creatures`);
        /** A creature imported from the pack, as the GM's Import does. */
        const imported = async name =>
          track(
            await game.actors.importFromCompendium(
              pack(),
              pack().index.find(e => e.name === name)._id
            )
          );

        it(
          "the pack is the GM's: players have no access (decision 7)",
          clean(async function () {
            const player = game.users.find(user => user.role === CONST.USER_ROLES.PLAYER);
            if (!player) {
              this.skip();
            }
            // client/documents/collections/compendium-collection.mjs:433-455
            assert.isFalse(pack().testUserPermission(player, "LIMITED"), "a player");
            assert.isTrue(pack().testUserPermission(game.user, "OWNER"), "the GM");
            assert.isTrue(
              game.packs.get(`${SYS_ID}.skills`).testUserPermission(player, "OBSERVER")
            );
          })
        );

        it(
          "every creature imports as an NPC with its page, every creature's rules reach it, and no console error",
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

        it(
          "Oni: Reduction 24, 12 against jade; Invulnerable save to jade; Fear 3 (pp.319, 329)",
          clean(async () => {
            const oni = await imported("Oni (Ugulu no Oni)");
            const { reduction, ruleReduction } = oni.system.armorTn;
            const defenses = {
              reduction: [{ value: reduction - ruleReduction, except: [] }, ...oni.reductionParts],
              invulnerable: oni.damageDefenses.invulnerable,
              spirit: oni.damageDefenses.spirit
            };
            assert.equal(reduction, 24);
            assert.equal(woundsTaken({ damage: 40, defenses }).wounds, 1, "a steel blade");
            assert.equal(
              woundsTaken({ damage: 40, tags: ["jade"], defenses }).wounds,
              28,
              "a jade blade"
            );
            assert.equal(oni.system.fear.rank, 3);
            assert.equal(oni.system.shadowTaint.rank, 6);
            // 124: Dead, its unused Wound levels in between leaving the threshold alone
            assert.equal(oni.system.woundLevels.out.value, 124);
          })
        );

        it(
          "Dog: Hunting 3 with Tracking, and Swift 2 moves it as Water 3 (p.320)",
          clean(async () => {
            const dog = await imported("Dog");
            const hunting = dog.items.find(i => i.type === "skill" && i.name === "Hunting");
            assert.equal(hunting.system.rank, 3);
            assert.include(hunting.system.trainedEmphases, "Tracking");
            assert.equal(dog.system.movement.simpleAction, (dog.system.rings.water + 2) * 10);
          })
        );

        it(
          "Tsuno: two attacks, Tsuno blade 7k3 and unarmed 6k3, with their damage (p.330)",
          clean(async () => {
            const tsuno = await imported("Tsuno");
            const pools = ["attack1", "damage1", "attack2", "damage2"].map(
              key => `${tsuno.system[key].roll}k${tsuno.system[key].keep}`
            );
            assert.deepEqual(pools, ["7k3", "6k3", "6k3", "3k2"]);
          })
        );
      });

      describe("Expected effects: spells (pp.163-197, 267-274)", () => {
        /**
         * The index entries of the spells pack matching a test. The index the world loads at startup holds core's
         * fields only; getIndex reads the configured ones (CONFIG.Item.compendiumIndexFields).
         */
        const spells = async test =>
          (await game.packs.get(`${SYS_ID}.spells`).getIndex()).filter(e => test(e.system ?? {}));

        it(
          "a pack Fire spell of Mastery Level 1 casts at TN 10 (5 + 5 x ML, p.163)",
          clean(async () => {
            const [fire] = await spells(s => s.ring === "fire" && s.mastery === 1 && !s.maho);
            assert.ok(fire, "a Fire spell of Mastery Level 1");
            const actor = track(await createShugenja({ name: "Packs caster" }));
            const spell = await DragDropHandler.handleItemDrop({ actor }, null, {
              uuid: fire.uuid
            });
            const message = await PcRollHandler.castSpell(actor, spell, false);
            posted.push(message);
            assert.equal(message.system.tn.base, 10);
            assert.equal(message.system.kind, "spell");
          })
        );

        it(
          "the browser's Spells tab, filtered to Fire and Mastery Level 2, lists only those",
          clean(async () => {
            const expected = (await spells(s => s.ring === "fire" && s.mastery === 2)).length;
            assert.isAbove(expected, 0, "Fire spells of Mastery Level 2 exist");
            await CompendiumBrowser.open();
            const app = foundry.applications.instances.get(`${SYS_ID}-compendium-browser`);
            try {
              app.tab = "spells";
              app.search = "";
              app.choices = { ring: "fire", mastery: "2" };
              await app.render();
              const rows = [...app.element.querySelectorAll(".l5r4-browser-row")];
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
          "the item sheet shows the page under the name, and the chat card ends with it",
          clean(async () => {
            const { item } = await holding("weapons", "Katana");
            await item.sheet.render({ force: true });
            try {
              assert.isTrue(
                await waitFor(() => item.sheet.element?.querySelector(".l5r4-citation"))
              );
              const citation = item.sheet.element.querySelector(".l5r4-citation");
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
          await CompendiumBrowser.open();
          const app = foundry.applications.instances.get(`${SYS_ID}-compendium-browser`);
          app.tab = tab;
          app.choices = {};
          app.search = "";
          await app.render();
          return app;
        };

        it(
          "filters the Equipment tab by group, size, and name",
          clean(async () => {
            const app = await openOn("equipment");
            try {
              app.choices = { folder: "Swords", size: "medium" };
              app.search = "ka";
              await app.render();
              const names = [...app.element.querySelectorAll(".l5r4-browser-name")].map(
                a => a.textContent
              );
              assert.sameMembers(names, ["Katana"]);
              const row = app.element.querySelector(".l5r4-browser-row");
              assert.include(row.textContent, "DR 3k2");
              assert.include(row.textContent, "Core Rulebook p.204");
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "a tab switches the list, Clear filters empties the search, a name opens its sheet, and Import brings in a creature",
          clean(async () => {
            const app = await openOn("equipment");
            const before = new Set(game.actors.map(a => a.id));
            try {
              app.element.querySelector("[data-action='selectTab'][data-tab='creatures']").click();
              assert.isTrue(await waitFor(() => app.tab === "creatures"));
              await waitFor(() => app.element.querySelector("[data-action='importEntry']"));

              app.search = "Oni";
              await app.render();
              app.element.querySelector("[data-action='clearFilters']").click();
              assert.isTrue(await waitFor(() => app.search === ""), "the search is cleared");

              app.search = "Kappa";
              await app.render();
              const row = app.element.querySelector(".l5r4-browser-row");
              const entry = await fromUuid(row.dataset.uuid);
              row.querySelector("[data-action='openEntry']").click();
              assert.isTrue(await waitFor(() => entry.sheet?.rendered), "the entry's sheet opens");
              await entry.sheet.close({ animate: false });

              row.querySelector("[data-action='importEntry']").click();
              const imported = () => game.actors.find(a => !before.has(a.id) && a.name === "Kappa");
              assert.isTrue(await waitFor(imported), "the creature is in the world");
              track(imported());
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "Add puts the item on the controlled token's actor through the purchase path",
          clean(async function () {
            if (!canvas.scene) {
              this.skip();
            }
            const actor = track(await createTestPC({ name: "Packs shopper" }));
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
              app.element.querySelector("[data-action='addEntry']").click();
              assert.isTrue(await waitFor(() => actor.items.some(i => i.name === "Tetsubo")));
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "a row drags from its icon as an Item drop a sheet takes, and core does not cancel the drag",
          clean(async () => {
            const app = await openOn("equipment");
            try {
              app.search = "Light Armor";
              await app.render();
              // A user grabs the icon or the name, which carry no draggable attribute (client/game.mjs:2239-2245)
              const icon = app.element.querySelector(".l5r4-browser-row .l5r4-browser-icon");
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
              const actor = track(await createTestPC({ name: "Packs dragger" }));
              const item = await DragDropHandler.handleItemDrop({ actor }, null, data);
              assert.equal(item.name, "Light Armor");
            } finally {
              await app.close({ animate: false });
            }
          })
        );

        it(
          "reopened, it lists an entry added to a world compendium since",
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
              assert.lengthOf(reopened.element.querySelectorAll(".l5r4-browser-row"), 1);
              await reopened.close({ animate: false });
            } finally {
              await pack.deleteCompendium();
            }
          })
        );

        it(
          "the Compendium sidebar has a Browse button that opens it",
          clean(async () => {
            const id = `${SYS_ID}-compendium-browser`;
            await foundry.applications.instances.get(id)?.close({ animate: false });
            await ui.compendium.render({ force: true });
            assert.isTrue(
              await waitFor(() => ui.compendium.element.querySelector("[data-l5r4-browser]"))
            );
            ui.compendium.element.querySelector("[data-l5r4-browser]").click();
            assert.isTrue(await waitFor(() => foundry.applications.instances.get(id)?.rendered));
            await foundry.applications.instances.get(id).close({ animate: false });
          })
        );
      });
    },
    { displayName: "L5R4: Compendium packs and browser" }
  );
}
