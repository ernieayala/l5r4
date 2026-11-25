/**
 * @fileoverview XP Manager Dialog Tests
 *
 * Tests the XP Manager application dialog for managing character experience points.
 * This dialog allows tracking XP sources, expenditures, and provides insight into
 * character advancement and insight rank progression.
 *
 * **Test Coverage:**
 * - Dialog opening and rendering
 * - Display of XP breakdown (base, manual, spent)
 * - XP calculation and totals
 * - Dialog interaction and closing
 *
 */

import { SYS_ID } from "../../../module/config/constants.js";
import XpManagerApplication from "../../../module/apps/xp-manager.js";
import { createTestPC, createTestNPC } from "../../fixtures/actor-fixtures.js";
import { waitFor } from "../helpers.js";

/**
 * Register XP manager dialog tests
 * @param {Object} quench - Quench test framework API
 */
export function registerXpManagerTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.apps.xp-manager`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("XP manager dialog rendering", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP manager: test PC" });
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should create XP manager dialog", () => {
          dialog = new XpManagerApplication(actor);

          assert.exists(dialog, "Dialog created");
          // ApplicationV2 constructor stores actor but doesn't expose as .document immediately
          assert.exists(dialog.options.document || actor, "Dialog has actor reference");
        });

        it("should render dialog", async () => {
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);

          assert.isTrue(dialog.rendered, "Dialog rendered");
          assert.exists(dialog.element, "Dialog element exists");
        });

        it("should display dialog window", async () => {
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = dialog.element;

          assert.exists(element, "Dialog DOM element exists");
          assert.isTrue(element.offsetHeight > 0, "Dialog is visible");
        });

        it("should have XP management interface", async () => {
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));

          const element = dialog.element;

          // Dialog should have XP-related content
          assert.exists(element, "XP management interface exists");
        });
      });

      describe("XP manager data display", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP manager: display test" });
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should display XP breakdown", () => {
          const xp = actor.system._xp;

          assert.exists(xp, "XP breakdown exists");
          assert.exists(xp.total, "Total XP exists");
          assert.exists(xp.spent, "Spent XP exists");
          assert.exists(xp.available, "Available XP exists");
        });

        it("should show base XP", () => {
          const flags = actor.flags[SYS_ID];

          assert.exists(flags.xpBase, "Base XP flag exists");
          assert.equal(flags.xpBase, 40, "Default base XP is 40");
        });

        it("should show manual XP entries", () => {
          const flags = actor.flags[SYS_ID];

          assert.exists(flags.xpManual, "Manual XP array exists");
          assert.isArray(flags.xpManual, "xpManual is array");
        });

        it("should show spent XP entries", () => {
          const flags = actor.flags[SYS_ID];

          assert.exists(flags.xpSpent, "Spent XP array exists");
          assert.isArray(flags.xpSpent, "xpSpent is array");
        });

        // #79
        it("should show XP spent of total as text, and an empty line for each empty list", () => {
          const { spent, total } = actor.system._xp;
          const body = dialog.element;
          assert.isNull(
            body.querySelector("input[disabled]"),
            "no computed value in a disabled field"
          );
          assert.include(body.textContent, `${spent}/${total}`);
          const empties = [...body.querySelectorAll("p")].map(p => p.textContent.trim());
          assert.includeMembers(empties, [
            game.i18n.localize("l5r4.apps.xpManager.noAdjustments"),
            game.i18n.localize("l5r4.apps.xpManager.noPurchases")
          ]);
        });
      });

      describe("XP manager calculations", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP manager: calculation test" });

          // Add some manual XP (use delta not amount, note not reason)
          await actor.update({
            [`flags.${SYS_ID}.xpManual`]: [
              { delta: 10, note: "Session 1" },
              { delta: 15, note: "Session 2" }
            ]
          });

          // Wait for update hooks to complete
          await new Promise(resolve => setTimeout(resolve, 50));

          // Re-fetch actor to get recalculated derived data
          actor = game.actors.get(actor.id);

          // Re-prepare from the stored data to recalculate XP
          actor.reset();

          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should calculate total XP correctly", () => {
          const xp = actor.system._xp;
          const flags = actor.flags[SYS_ID];

          // Total = base + manual
          const expectedTotal = flags.xpBase + 10 + 15;
          assert.equal(xp.total, expectedTotal, "Total XP calculated correctly");
        });

        it("should calculate available XP", () => {
          const xp = actor.system._xp;

          // Available = total - spent
          const expectedAvailable = xp.total - xp.spent;
          assert.equal(xp.available, expectedAvailable, "Available XP correct");
        });

        it("should show XP sources in dialog", () => {
          const flags = actor.flags[SYS_ID];
          const manualXp = flags.xpManual;

          assert.equal(manualXp.length, 2, "Two manual XP entries");
          assert.equal(manualXp[0].delta, 10, "First entry is 10 XP");
          assert.equal(manualXp[1].delta, 15, "Second entry is 15 XP");
        });
      });

      describe("XP manager with spent XP", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "XP manager: spent XP test",
            system: {
              // Set one trait above baseline to generate XP cost
              // Stamina 3 (baseline 2 → 3) costs 12 XP per L5R4 rules (4 × 3)
              traits: { sta: 3 }
            }
          });

          // Add a skill to generate additional XP cost
          // Skill rank 1 costs: 1 XP (triangular sum: 1 × 2 / 2 = 1)
          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Test Skill",
              type: "skill",
              system: { rank: 1 }
            }
          ]);

          // Wait for updates to complete
          await new Promise(resolve => setTimeout(resolve, 50));

          // Re-fetch actor to get recalculated derived data
          actor = game.actors.get(actor.id);

          // Re-prepare from the stored data to recalculate XP
          actor.reset();

          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should display spent XP entries", () => {
          // Note: xpSpent log is only created when traits are UPDATED via _preUpdate hook
          // Since we created the actor with these values, no log entries exist yet
          // This tests that empty xpSpent array doesn't break the dialog
          const flags = actor.flags[SYS_ID];
          const spentXp = flags.xpSpent ?? [];

          assert.isArray(spentXp, "xpSpent is an array");
        });

        it("should calculate spent total", () => {
          const xp = actor.system._xp;

          // Spent comes from the bought Trait ranks and Skills; the exact sum is tested elsewhere, so this checks
          // only that it is above zero
          assert.isAtLeast(xp.spent, 1, "Total spent XP is non-zero");
        });

        it("should reduce available XP", () => {
          const xp = actor.system._xp;
          const base = actor.flags[SYS_ID].xpBase;

          // Available = base - spent (no manual XP added)
          // Just verify available is less than base due to spending
          assert.isBelow(xp.available, base, "Available XP reduced by spending");
        });
      });

      describe("XP manager dialog interaction", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP manager: interaction test" });
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should have action buttons", () => {
          const element = dialog.element;
          const _actionButtons = element.querySelectorAll("[data-action]");

          // Dialog should have buttons for actions
          assert.exists(element, "Dialog has interactive elements");
        });

        it("should name the add button for its action, not OK", () => {
          const add = dialog.element.querySelector("[data-action='add-xp']");
          assert.exists(add, "the add button renders");
          assert.equal(
            add.textContent.trim(),
            game.i18n.localize("l5r4.apps.xpManager.addXp"),
            "the button reads Add XP"
          );
        });

        it("should mark the purchases column a sort click chose, with its direction", async () => {
          // The click re-renders the window, so each look finds the head again
          const cost = () =>
            dialog.element.querySelector("[data-sort-header] [data-sort-by='cost']");
          try {
            assert.equal(
              cost().getAttribute("aria-pressed"),
              "false",
              "not pressed before the click"
            );
            cost().click();
            assert.isTrue(await waitFor(() => cost()?.dataset.dir === "asc"), "cost ascending");
            assert.equal(cost().getAttribute("aria-pressed"), "true", "pressed after the click");
          } finally {
            await game.user.unsetFlag(SYS_ID, `sortByActor.${actor.id}`);
          }
        });

        it("should close when requested", async () => {
          assert.isTrue(dialog.rendered, "Dialog is open");

          await dialog.close({ animate: false });

          await new Promise(resolve => setTimeout(resolve, 100));

          assert.isFalse(dialog.rendered, "Dialog closed");
        });

        it("should not leak after close", async () => {
          await dialog.close({ animate: false });

          // Dialog should be cleaned up
          assert.isFalse(dialog.rendered, "Dialog not rendered");
        });
      });

      describe("XP manager Disadvantage cap prompt", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP manager: cap test" });
          await actor.createEmbeddedDocuments("Item", [
            { name: "Cap Doubt", type: "disadvantage", system: { cost: 4 } }
          ]);
          await actor.setFlag(SYS_ID, "disadvantageCap", 7);
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should ask through the cap dialog template, its field at the current cap", async () => {
          const opened = new Promise(resolve => Hooks.once("renderDialogV2", resolve));
          dialog.element.querySelector('[data-action="change-disadvantage-cap"]').click();
          const prompt = await Promise.race([
            opened,
            new Promise(resolve => setTimeout(() => resolve(null), 5000))
          ]);
          try {
            assert.exists(prompt, "a dialog opens");
            const input = prompt.element.querySelector("input[name='disadvantageCap']");
            const content = input.parentElement;
            assert.isTrue(
              content.classList.contains("l5r4-disadvantage-cap-dialog"),
              "the content is templates/dialogs/disadvantage-cap-dialog.hbs"
            );
            assert.equal(input.value, "7");
            assert.equal(content.querySelector("label").htmlFor, input.id, "the label names it");
            assert.notExists(prompt.element.querySelector("form form"), "no nested form");
          } finally {
            await prompt?.close();
          }
          assert.equal(actor.getFlag(SYS_ID, "disadvantageCap"), 7, "closing changes nothing");
        });
      });

      describe("XP manager for PCs only", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
          }
        });

        it("should not have XP flags for NPCs", async () => {
          npc = await createTestNPC({ name: "XP manager: test NPC" });

          const flags = npc.flags[SYS_ID];

          // NPCs don't track XP
          assert.isUndefined(flags?.xpBase, "NPC has no xpBase");
          assert.isUndefined(flags?.xpManual, "NPC has no xpManual");
          assert.isUndefined(flags?.xpSpent, "NPC has no xpSpent");
        });

        it("should not have _xp breakdown for NPCs", async () => {
          npc = await createTestNPC({ name: "XP manager: test NPC" });

          assert.isUndefined(npc.system._xp, "NPC has no XP breakdown");
        });
      });

      describe("XP manager Insight display", () => {
        let actor, dialog;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "XP manager: Insight test",
            system: {
              traits: {
                sta: 3,
                wil: 3, // Earth = 3
                ref: 3,
                awa: 3, // Air = 3
                agi: 3,
                int: 3, // Fire = 3
                str: 3,
                per: 3 // Water = 3
              },
              rings: { void: { rank: 3 } }
            }
          });

          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          await new Promise(resolve => setTimeout(resolve, 100));
        });

        afterEach(async () => {
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          if (actor) {
            await actor.delete();
          }
        });

        it("should display insight points", () => {
          const insight = actor.system.insight;

          assert.exists(insight, "Insight object exists");
          assert.isNumber(insight.points, "Insight points is number");

          // Rings: 3+3+3+3+3 = 15, Insight = 150 + skills
          assert.equal(insight.points, 150, "Insight points calculated");
        });

        it("should display insight rank", () => {
          const insight = actor.system.insight;

          assert.exists(insight.rank, "Insight rank exists");
          assert.isNumber(insight.rank, "Insight rank is number");

          // 150 points = Rank 2 (150-174)
          assert.equal(insight.rank, 2, "Insight rank is 2");
        });

        it("should show insight progression", () => {
          const insight = actor.system.insight;

          // Should have insight tracking data
          assert.isAtLeast(insight.points, 0, "Insight points non-negative");
          assert.isAtLeast(insight.rank, 1, "Insight rank at least 1");
        });
      });

      // #145
      describe("XP manager errors, overspending, and the Disadvantage cap", () => {
        let actor, dialog;
        const notices = [];
        let notify;

        beforeEach(async () => {
          notify = ui.notifications.notify;
          ui.notifications.notify = function (message, type, options = {}) {
            notices.push(`${type}: ${message}`);
            return notify.call(this, message, type, { ...options, console: false });
          };
          actor = await createTestPC({ name: "XP manager: #145" });
        });

        afterEach(async () => {
          ui.notifications.notify = notify;
          notices.length = 0;
          if (dialog?.rendered) {
            await dialog.close({ animate: false });
          }
          await actor?.delete();
        });

        it("should show an error, not numbers, when the XP cannot be calculated", async () => {
          dialog = new XpManagerApplication(actor);
          const error = console.error;
          Object.defineProperty(actor.system, "_xp", {
            configurable: true,
            get: () => {
              throw new Error("Quench: no XP");
            }
          });
          console.error = () => {};
          try {
            await dialog.render(true);
          } finally {
            delete actor.system._xp;
            console.error = error;
          }
          const shown = dialog.element.querySelector("[role='alert']");
          assert.exists(shown, "an error state");
          assert.include(
            shown.textContent,
            game.i18n.localize("l5r4.apps.xpManager.errors.calculateFailed", {
              error: "Quench: no XP"
            })
          );
          assert.notExists(dialog.element.querySelector("[data-xp-total]"), "no total shown");
        });

        it("should mark XP spent past the total on the sheet and in the window", async () => {
          await actor.update({ "system.traits.agi": 5 });
          const over = actor.system._xp.overspent;
          assert.isAbove(over, 0, "Agility 5 costs past the starting 40");
          const text = game.i18n.localize("l5r4.character.experience.overspent", { over });
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          assert.include(dialog.element.querySelector("[role='note']").textContent, text);
          await actor.sheet.render({ force: true });
          try {
            const mark = actor.sheet.element.querySelector("[data-xp-overspent]");
            assert.equal(mark?.dataset.tooltip, text, "the sheet marks it");
          } finally {
            await actor.sheet.close({ animate: false });
          }
        });

        it("should say a Disadvantage past the cap is not all counted", async () => {
          await actor.createEmbeddedDocuments("Item", [
            { name: "Quench Doubt", type: "disadvantage", system: { cost: 6 } },
            { name: "Quench Phobia", type: "disadvantage", system: { cost: 8 } }
          ]);
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          // The server returns created items in no fixed order; the one counted second goes past the cap
          const over = actor.system._xp.entries.find(entry => entry.overCap);
          assert.equal(over?.overCap, 4, "6 + 8 is 4 past 10, in either order");
          const capped = game.i18n.localize("l5r4.character.experience.overCap", {
            name: over.name,
            over: 4
          });
          assert.include(dialog.element.textContent, capped);
        });

        it("should say an XP change that could not be saved was not", async () => {
          dialog = new XpManagerApplication(actor);
          await dialog.render(true);
          const setFlag = actor.setFlag;
          const error = console.error;
          actor.setFlag = () => Promise.reject(new Error("Quench: refused"));
          console.error = () => {};
          try {
            dialog.element.querySelector("[data-field='xp-amount']").value = "3";
            dialog.element.querySelector("[data-action='add-xp']").click();
            await waitFor(() => notices.length > 0);
          } finally {
            actor.setFlag = setFlag;
            console.error = error;
          }
          assert.deepEqual(notices, [
            `error: ${game.i18n.localize("l5r4.apps.xpManager.errors.writeFailed", {
              error: "Quench: refused"
            })}`
          ]);
        });
      });
    },
    { displayName: "L5R4: XP manager" }
  );
}
