/**
 * @module apps/effect-panel
 * @description A floating panel listing the effects on the controlled token's actor, else the user's character
 * (roadmap/STAGE-14): each effect's name, icon, source, and how long it lasts, with buttons to open its source and to
 * remove an effect the user owns. A token-controls button opens and closes it; it redraws when control changes and
 * when effects or the actor change.
 */

import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { effectEnd, usesLeft } from "../utils/effect-duration.js";
import { usesSpent } from "../utils/effects.js";
import { currentPeriod } from "../services/effects/uses.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The panel, once opened. */
let panel = null;

export default class EffectPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${SYS_ID}-effect-panel`,
    classes: ["l5r4", "l5r4-effect-panel"],
    window: {
      title: "l5r4.apps.effectPanel.title",
      icon: "fa-solid fa-hourglass-half",
      resizable: true
    },
    position: { width: 320, height: "auto", top: 80, left: 120 },
    actions: {
      "open-source": EffectPanel.#onOpenSource,
      "delete-effect": EffectPanel.#onDeleteEffect
    }
  };

  static PARTS = {
    effects: { template: `systems/${SYS_ID}/templates/apps/effect-panel.hbs` }
  };

  /**
   * The actor the panel shows: the controlled token's, else the user's character.
   * @type {Actor|null}
   */
  get actor() {
    return canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;
    context.actor = actor;
    context.effects = actor ? actor.appliedEffects.map(effect => this.#row(actor, effect)) : [];
    context.empty = actor
      ? F("l5r4.apps.effectPanel.none", { name: actor.name })
      : T("l5r4.apps.effectPanel.noActor");
    return context;
  }

  /**
   * One effect's row.
   * @param {Actor} actor
   * @param {ActiveEffect} effect
   * @returns {object}
   */
  #row(actor, effect) {
    const phrases = [effectEnd(effect.duration)];
    for (const rule of effect.system.rules ?? []) {
      if (rule.key === "Resource" && Number.isFinite(Number(rule.max))) {
        const spent = usesSpent(
          actor.getFlag(SYS_ID, "uses")?.[rule.slug],
          currentPeriod(actor, rule.per)
        );
        phrases.push(usesLeft(Number(rule.max), spent));
      }
    }
    const source = this.#source(effect);
    return {
      uuid: effect.uuid,
      name: effect.name,
      img: effect.img,
      source: source?.name ?? "",
      sourceUuid: source?.uuid ?? effect.uuid,
      lasts: phrases.map(({ key, data }) => F(key, localizedData(data))).join("; "),
      canRemove: effect.parent === actor && effect.isOwner
    };
  }

  /**
   * What an effect came from: the item carrying it, else its origin, else nothing.
   * @param {ActiveEffect} effect
   * @returns {foundry.abstract.Document|null}
   */
  #source(effect) {
    if (effect.parent?.documentName === "Item") {
      return effect.parent;
    }
    return effect.origin ? (fromUuidSync(effect.origin, { strict: false }) ?? null) : null;
  }

  /**
   * Open an effect's source sheet, or the effect's own when it has none.
   * @this {EffectPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #onOpenSource(_event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.sourceUuid);
    doc?.sheet?.render({ force: true });
  }

  /**
   * Remove an effect the user owns.
   * @this {EffectPanel}
   * @param {PointerEvent} _event
   * @param {HTMLElement} target
   */
  static async #onDeleteEffect(_event, target) {
    const effect = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if (effect?.isOwner) {
      await effect.delete();
    }
  }

  /** Open the panel, or close it when it is open. */
  static toggle() {
    if (panel?.rendered) {
      return panel.close();
    }
    panel ??= new EffectPanel();
    return panel.render({ force: true });
  }

  /** Redraw the open panel. */
  static refresh() {
    if (panel?.rendered) {
      panel.render();
    }
  }
}

/**
 * Localize the label keys inside a phrase's data (an expiry event's name).
 * @param {object} data
 * @returns {object}
 */
function localizedData(data) {
  return data.event ? { ...data, event: T(data.event) } : data;
}

/**
 * Add the panel's button to the token controls.
 * @param {Record<string, object>} controls
 */
function onGetSceneControlButtons(controls) {
  if (!controls.tokens) {
    return;
  }
  const tools = controls.tokens.tools;
  tools[`${SYS_ID}-effects`] = {
    name: `${SYS_ID}-effects`,
    order: Object.keys(tools).length,
    title: "l5r4.apps.effectPanel.title",
    icon: "fa-solid fa-hourglass-half",
    button: true,
    onChange: () => EffectPanel.toggle()
  };
}

/** Register the panel's button and the hooks that redraw it, once during init. */
export function initializeEffectPanel() {
  Hooks.on("getSceneControlButtons", onGetSceneControlButtons);
  for (const hook of [
    "controlToken",
    "createActiveEffect",
    "updateActiveEffect",
    "deleteActiveEffect",
    "updateActor",
    "updateCombat"
  ]) {
    Hooks.on(hook, () => EffectPanel.refresh());
  }
}
