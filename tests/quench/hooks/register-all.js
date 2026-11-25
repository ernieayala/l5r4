/**
 * The hooks module/hooks/register-all.js wires during init: each handler services and apps export is registered on
 * its hook (the system's own `l5r4-enhanced.immuneStatus` among them), handlers on one hook run in the order the
 * token controls and chat cards rely on, and the entry module's GM queries are in place. The Sequencer and JB2A animation hooks are wired only when both
 * modules are active. `ready` has fired before a batch runs, so the once-only `registerTokenEffects` is not visible
 * here; the effects batch (tests/quench/effects.js) calls it.
 */

import { IMMUNE_STATUS_HOOK, SYS_ID } from "../../../module/config/constants.js";
import { getBrowserIndexFields } from "../../../module/utils/browser-filter.js";
import L5R4ActiveEffect from "../../../module/documents/active-effect.js";
import {
  onPreCreateChangeOrigin,
  onPreDeleteChangeOrigin,
  onPreUpdateChangeOrigin
} from "../../../module/services/change-origin.js";
import {
  onActiveEffectAnimation,
  onCanvasReadyAnimation,
  onCreateChatMessageAnimation,
  onDeleteActorAnimation,
  onDrawTokenAnimation
} from "../../../module/services/animations/hooks.js";
import {
  isJb2aAvailable,
  isSequencerAvailable
} from "../../../module/services/animations/asset-library.js";
import {
  onCreateActiveEffectFullDefense,
  onGetSceneControlButtonsEncounter,
  onPreUpdateActorWounds,
  onUpdateActorWounds
} from "../../../module/services/effects/automation.js";
import { onImmuneStatus } from "../../../module/services/effects/apply.js";
import { bindPromptCard } from "../../../module/services/effects/prompts.js";
import { bindLegacyAttackCard, onChatMessage } from "../../../module/services/chat.js";
import {
  bindCheckCard,
  onGetChatMessageContextOptions
} from "../../../module/services/dice/check/chat-actions.js";
import { bindCheckRequestCard } from "../../../module/services/check-request.js";
import {
  onPreUpdateActorScrollingText,
  onUpdateActorScrollingText
} from "../../../module/services/scrolling-text.js";
import { bindAttackCard } from "../../../module/services/combat/attack-card.js";
import { bindDamageCards } from "../../../module/services/combat/damage.js";
import { bindLegacyDamageCard } from "../../../module/services/combat/legacy-damage.js";
import { bindFlowCards } from "../../../module/services/combat/flow.js";
import { onGetSceneControlButtonsDuel } from "../../../module/services/combat/duel.js";
import { onGetSceneControlButtonsGuard } from "../../../module/services/combat/guard.js";
import { onGetSceneControlButtonsSession } from "../../../module/services/session.js";
import { onGetFolderContextOptions } from "../../../module/services/item-transfer.js";
import EffectPanelApplication from "../../../module/apps/effect-panel.js";
import CompendiumBrowserApplication from "../../../module/apps/compendium-browser.js";

/**
 * Registers the `hooks.register-all` batch.
 * @param {object} quench - The Quench API object
 */
export function registerHookWiringTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.hooks.register-all`,
    context => {
      const { describe, it, assert } = context;

      /** Where a handler sits among a hook's registered functions, or -1 when it is not registered. */
      const positionOf = (hook, fn) =>
        (Hooks.events[hook] ?? []).findIndex(entry => entry.fn === fn);

      /** Assert each handler is registered on its hook, in the order given. */
      const assertWiredInOrder = (hook, handlers) => {
        const positions = handlers.map(fn => positionOf(hook, fn));
        positions.forEach((position, i) =>
          assert.isAtLeast(position, 0, `${handlers[i].name} is registered on ${hook}`)
        );
        assert.deepEqual(
          positions,
          [...positions].sort((a, b) => a - b),
          `${hook} runs its handlers in the order they were wired`
        );
      };

      describe("Change origin", () => {
        it("should stamp each Actor, Item, Active Effect, and chat message change with its client", () => {
          for (const documentName of ["Actor", "Item", "ActiveEffect", "ChatMessage"]) {
            assertWiredInOrder(`preCreate${documentName}`, [onPreCreateChangeOrigin]);
            assertWiredInOrder(`preUpdate${documentName}`, [onPreUpdateChangeOrigin]);
            assertWiredInOrder(`preDelete${documentName}`, [onPreDeleteChangeOrigin]);
          }
        });
      });

      describe("Effects and actor updates", () => {
        it("should wire the Wound tracking, Full Defense, and floating number handlers", () => {
          assertWiredInOrder("preUpdateActor", [
            onPreUpdateActorWounds,
            onPreUpdateActorScrollingText
          ]);
          assertWiredInOrder("updateActor", [onUpdateActorWounds, onUpdateActorScrollingText]);
          assertWiredInOrder("createActiveEffect", [onCreateActiveEffectFullDefense]);
        });

        it("should redraw the effect panel on control, effect, actor, and combat changes", () => {
          for (const hook of [
            "controlToken",
            "createActiveEffect",
            "updateActiveEffect",
            "deleteActiveEffect",
            "updateActor",
            "updateCombat"
          ]) {
            assertWiredInOrder(hook, [EffectPanelApplication.renderIfOpen]);
          }
        });

        it("should wire the immunity notice to the system's immuneStatus hook", () => {
          assertWiredInOrder(IMMUNE_STATUS_HOOK, [onImmuneStatus]);
          assert.notProperty(L5R4ActiveEffect, "onImmuneStatus", "no slot on the document class");
        });

        it("should wire the animation hooks only when Sequencer and JB2A are both active", () => {
          const wired = isSequencerAvailable() && isJb2aAvailable();
          for (const [hook, fn] of [
            ["createActiveEffect", onActiveEffectAnimation],
            ["updateActiveEffect", onActiveEffectAnimation],
            ["deleteActiveEffect", onActiveEffectAnimation],
            ["deleteActor", onDeleteActorAnimation],
            ["canvasReady", onCanvasReadyAnimation],
            ["drawToken", onDrawTokenAnimation],
            ["createChatMessage", onCreateChatMessageAnimation]
          ]) {
            assert.equal(positionOf(hook, fn) >= 0, wired, `${fn.name} on ${hook}`);
          }
        });
      });

      describe("Chat", () => {
        it("should wire every chat card binder in order", () => {
          assertWiredInOrder("renderChatMessageHTML", [
            bindLegacyAttackCard,
            bindCheckCard,
            bindPromptCard,
            bindCheckRequestCard,
            bindAttackCard,
            bindDamageCards,
            bindFlowCards,
            bindLegacyDamageCard
          ]);
        });

        it("should wire inline Roll and Keep notation and the roll card's context menu", () => {
          assertWiredInOrder("chatMessage", [onChatMessage]);
          assertWiredInOrder("getChatMessageContextOptions", [onGetChatMessageContextOptions]);
        });

        it("should register the damage and flow GM queries", () => {
          assert.isFunction(CONFIG.queries[`${SYS_ID}.damage`]);
          assert.isFunction(CONFIG.queries[`${SYS_ID}.flow`]);
        });
      });

      describe("Token controls and sidebars", () => {
        it("should add the token controls in their order", () => {
          assertWiredInOrder("getSceneControlButtons", [
            onGetSceneControlButtonsEncounter,
            EffectPanelApplication.onGetSceneControlButtons,
            onGetSceneControlButtonsDuel,
            onGetSceneControlButtonsGuard,
            onGetSceneControlButtonsSession
          ]);
        });

        it("should wire the compendium browser's button and index fields", () => {
          assertWiredInOrder("renderCompendiumDirectory", [
            CompendiumBrowserApplication.onRenderCompendiumDirectory
          ]);
          for (const documentName of ["Item", "Actor"]) {
            for (const field of getBrowserIndexFields(documentName)) {
              assert.include(CONFIG[documentName].compendiumIndexFields, field, documentName);
            }
          }
        });

        it("should wire the Item folder export and import entries", () => {
          assertWiredInOrder("getFolderContextOptions", [onGetFolderContextOptions]);
        });
      });
    },
    { displayName: "L5R4: Hook wiring" }
  );
}
