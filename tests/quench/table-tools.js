import { SYS_ID } from "../../module/config/constants.js";
import EffectPanel from "../../module/apps/effect-panel.js";
import { onHotbarDrop } from "../../module/sheets/ui/macros.js";
import { createTestNPC, createTestPC } from "../fixtures/actor-fixtures.js";
import { createSkillData } from "../fixtures/item-fixtures.js";
import { cleanTest, settleChatNotifications, waitFor } from "./helpers.js";

/**
 * Registers the `table-tools` batch (roadmap/STAGE-14): text links rendered in a journal page and clicked, a broken
 * link, the GM's request card, the effect panel, a hotbar macro, and floating Wound and Void numbers.
 * @param {object} quench  The Quench API object.
 */
export function registerTableToolsBatch(quench) {
  quench.registerBatch(
    `${SYS_ID}.table-tools`,
    context => {
      const { describe, it, before, after, afterEach, assert } = context;
      const clean = cleanTest(assert);
      const created = [];
      const posted = [];
      let hook;

      before(async function () {
        if (!canvas.scene) {
          this.skip();
        }
        await settleChatNotifications();
        hook = Hooks.on("createChatMessage", message => posted.push(message));
      });

      afterEach(async () => {
        canvas.tokens.setTargets([]);
        canvas.tokens.releaseAll();
        // Newest first: a token goes before its actor
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

      /** Keep a document for cleanup. */
      const track = doc => (created.push(doc), doc);

      /** A token for an actor on the viewed scene, drawn. */
      const placeToken = async (actor, x = 0) => {
        const data = (await actor.getTokenDocument({ x, y: 0 })).toObject();
        const [token] = await canvas.scene.createEmbeddedDocuments("Token", [data]);
        track(token);
        await waitFor(() => token.object);
        return token;
      };

      /** A PC with Kenjutsu 2 and a token the user controls, so links and macros act for it. */
      const actingPC = async () => {
        const actor = track(
          await createTestPC({ name: "Tools samurai", system: { traits: { agi: 3, wil: 3 } } })
        );
        await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 2, "agi")]);
        const token = await placeToken(actor);
        token.object.control({ releaseOthers: true });
        return { actor, token };
      };

      /**
       * Show a journal entry with one text page holding this text, as a reader sees it: the entry's sheet, whose pages
       * render enriched (a page's own sheet opens its editor). Returns the sheet and its element.
       */
      const journalWith = async text => {
        const entry = track(
          await foundry.documents.JournalEntry.implementation.create({
            name: "Tools journal",
            pages: [{ name: "Links", type: "text", text: { content: `<p>${text}</p>` } }]
          })
        );
        await entry.sheet.render({ force: true });
        await waitFor(() => entry.sheet.element?.querySelector("enriched-content"));
        return { sheet: entry.sheet, element: entry.sheet.element };
      };

      /** The next roll dialog: its form values, then cancelled or answered. */
      const nextDialog = (answer = "ok") =>
        new Promise(resolve =>
          Hooks.once("renderDialogV2", app => {
            const form = app.element.querySelector("form") ?? app.element;
            const values = Object.fromEntries(
              [...form.querySelectorAll("input[name]")].map(i => [i.name, i.value])
            );
            if (answer === "ok") {
              app.element.querySelector('[data-action="ok"]').click();
            } else {
              app.close();
            }
            resolve({ title: app.title, values });
          })
        );

      describe("Text links (pp.79-80, 82, 89, 90)", () => {
        it(
          "a Check link opens the roll dialog for the acting character, filled with its TN",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const { actor } = await actingPC();
            const { sheet, element } = await journalWith("@Check[skill=Kenjutsu|tn=20]");
            const dialog = nextDialog("cancel");
            element.querySelector(".l5r4-link[data-link-type='Check']").click();
            const { values } = await dialog;
            assert.equal(values.tn, "20");
            assert.include(element.querySelector(".l5r4-link").textContent, "Kenjutsu");
            await sheet.close({ animate: false });
            assert.isOk(actor);
          })
        );

        it(
          "a Damage link posts a damage card with its Apply buttons",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const { actor } = await actingPC();
            const { sheet, element } = await journalWith("@Damage[3k2+1]");
            const dialog = nextDialog("ok");
            element.querySelector(".l5r4-link[data-link-type='Damage']").click();
            await dialog;
            const card = await waitFor(() =>
              posted.find(m => m.type === "roll" && m.system.kind === "damage")
            );
            assert.isTrue(Boolean(card));
            const message = posted.find(m => m.type === "roll" && m.system.kind === "damage");
            assert.equal(message.system.actorUuid, actor.uuid);
            assert.deepInclude(message.system.pool, { roll: 3, keep: 2, bonus: 1 });
            // A link's damage has no target, so the card applies to the selected tokens
            assert.include(message.content, "damage-apply-selected");
            await sheet.close({ animate: false });
          })
        );

        it(
          "a Condition link applies its status to the targeted token",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const npc = track(await createTestNPC({ name: "Tools target" }));
            const token = await placeToken(npc, 200);
            canvas.tokens.setTargets([token.id]);
            const { sheet, element } = await journalWith("@Condition[dazed]");
            element.querySelector(".l5r4-link[data-link-type='Condition']").click();
            assert.isTrue(await waitFor(() => token.actor.statuses.has("dazed")));
            await sheet.close({ animate: false });
          })
        );

        it(
          "a Fear link starts the Fear test at TN 5 + 5 × Rank on the targeted token (p.90)",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const pc = track(await createTestPC({ name: "Tools frightened" }));
            const token = await placeToken(pc, 200);
            canvas.tokens.setTargets([token.id]);
            const { sheet, element } = await journalWith("@Fear[2]");
            element.querySelector(".l5r4-link[data-link-type='Fear']").click();
            assert.isTrue(
              await waitFor(() =>
                posted.some(m => m.type === "roll" && m.system.actorUuid === token.actor.uuid)
              )
            );
            const roll = posted.find(
              m => m.type === "roll" && m.system.actorUuid === token.actor.uuid
            );
            assert.equal(roll.system.tn.base, 15);
            await sheet.close({ animate: false });
          })
        );

        it(
          "a link that does not parse renders broken, with its reason",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const { sheet, element } = await journalWith("@Fear[11] @Check[trait=luck]");
            const broken = [...element.querySelectorAll(".l5r4-link-broken")];
            assert.lengthOf(broken, 2);
            assert.include(broken[0].textContent, game.i18n.localize("l5r4.ui.links.error.fear"));
            assert.isNull(element.querySelector(".l5r4-link[data-link-type]"));
            await sheet.close({ animate: false });
          })
        );
      });

      describe("Request card", () => {
        it(
          "a GM's Check link posts a request card that rolls for the clicking user's character",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const { actor } = await actingPC();
            const { sheet, element } = await journalWith("@Check[trait=wil|tn=10]");
            element.querySelector(".l5r4-link-request").click();
            assert.isTrue(await waitFor(() => posted.some(m => m.type === "checkRequest")));
            const card = posted.find(m => m.type === "checkRequest");
            assert.deepInclude(card.system, { trait: "wil", tn: 10 });
            const html = await card.renderHTML();
            const dialog = nextDialog("ok");
            html.querySelector("[data-action='check-request-roll']").click();
            await dialog;
            assert.isTrue(
              await waitFor(() =>
                posted.some(
                  m =>
                    m.type === "roll" &&
                    m.system.actorUuid === actor.uuid &&
                    m.system.kind === "trait"
                )
              )
            );
            await sheet.close({ animate: false });
          })
        );
      });

      describe("Effect panel", () => {
        it(
          "lists the controlled token's effects with how long they last, and removes one",
          clean(async function () {
            this.timeout(10_000);
            const { actor } = await actingPC();
            await actor.toggleStatusEffect("dazed", { active: true });
            await EffectPanel.toggle();
            const panel = foundry.applications.instances.get(`${SYS_ID}-effect-panel`);
            try {
              await waitFor(() => panel.element?.querySelector(".l5r4-effect-panel-row"));
              const row = panel.element.querySelector(".l5r4-effect-panel-row");
              assert.include(row.textContent, game.i18n.localize("EFFECT.dazed"));
              assert.include(
                row.querySelector(".l5r4-effect-panel-lasts").textContent,
                game.i18n.localize("l5r4.ui.effectPanel.noEnd")
              );
              // A status has no source, so its own sheet opens
              const source = await fromUuid(row.dataset.sourceUuid);
              row.querySelector("[data-action='openSource']").click();
              assert.isTrue(
                await waitFor(() => source.sheet?.rendered),
                "the source's sheet opens"
              );
              await source.sheet.close({ animate: false });
              row.querySelector("[data-action='removeEffect']").click();
              assert.isTrue(await waitFor(() => !actor.statuses.has("dazed")), "removed");
            } finally {
              await panel.close({ animate: false });
            }
          })
        );
      });

      describe("Hotbar macros", () => {
        it(
          "a dropped skill makes one macro per user, which opens the skill's roll",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const { actor } = await actingPC();
            const skill = actor.items.getName("Kenjutsu");
            const slot = 50;
            const before = game.user.hotbar[slot] ?? null;
            assert.isFalse(
              onHotbarDrop(ui.hotbar, skill.toDragData(), slot),
              "core's handling cancelled"
            );
            const key = `item:${skill.uuid}`;
            assert.isTrue(
              await waitFor(() => game.macros.some(m => m.getFlag(SYS_ID, "macro") === key))
            );
            const macro = game.macros.find(m => m.getFlag(SYS_ID, "macro") === key);
            track(macro);
            try {
              onHotbarDrop(ui.hotbar, skill.toDragData(), slot);
              await new Promise(resolve => setTimeout(resolve, 300));
              assert.lengthOf(
                game.macros.filter(m => m.getFlag(SYS_ID, "macro") === key),
                1,
                "dropping again reuses it"
              );
              const dialog = nextDialog("cancel");
              await macro.execute();
              const { title } = await dialog;
              assert.include(title, "Kenjutsu");
            } finally {
              await game.user.assignHotbarMacro(before ? game.macros.get(before) : null, slot);
            }
          })
        );

        it(
          "a drop this system does not make a macro for is left to core",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const journal = track(
              await foundry.documents.JournalEntry.implementation.create({ name: "Tools plain" })
            );
            assert.isUndefined(onHotbarDrop(ui.hotbar, journal.toDragData(), 50));
          })
        );
      });

      describe("Floating numbers", () => {
        it(
          "an update floats the Wound and Void change over the token, unless the setting is off",
          clean(async function () {
            // A sheet render and a roll can outrun Mocha's 2 s default
            this.timeout(10_000);
            const { actor } = await actingPC();
            const shown = [];
            const scrolling = canvas.interface.createScrollingText;
            canvas.interface.createScrollingText = (origin, text) => {
              shown.push(text);
              return Promise.resolve();
            };
            const setting = game.settings.get(SYS_ID, "floatingNumbers");
            try {
              await game.settings.set(SYS_ID, "floatingNumbers", true);
              await actor.update({ "system.suffered": 5, "system.rings.void.value": 1 });
              assert.includeMembers(shown, [
                `+5 ${game.i18n.localize("l5r4.ui.floating.wounds")}`,
                `−1 ${game.i18n.localize("l5r4.ui.floating.void")}`
              ]);
              shown.length = 0;
              await game.settings.set(SYS_ID, "floatingNumbers", false);
              await actor.update({ "system.suffered": 8 });
              assert.lengthOf(shown, 0);
            } finally {
              canvas.interface.createScrollingText = scrolling;
              await game.settings.set(SYS_ID, "floatingNumbers", setting);
            }
          })
        );
      });
    },
    {
      displayName:
        "L5R4: Table tools (links, request cards, effect panel, macros, floating numbers)"
    }
  );
}
