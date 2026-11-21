/**
 * @module apps/effect-panel
 * @description A floating panel listing the effects on the controlled token's actor, else the user's character
 * (roadmap/STAGE-14): each effect's name, icon, source, and how long it lasts, with buttons to open its source and to
 * remove an effect the user owns. A token-controls button opens and closes it; it redraws when control changes and
 * when effects or the actor change (module/hooks/register-all.js wires both).
 */
import { SYS_ID } from "../config/constants.js";
import { F, T } from "../utils/localization.js";
import { getEffectEnd, getUsesLeft } from "../utils/effect-duration.js";
import { getUsesSpent } from "../utils/effects.js";
import { currentPeriodOf } from "../services/effects/uses.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** The panel, once opened. */
let panel = null;

/**
 * The effect panel window, one per client.
 */
export default class EffectPanelApplication extends HandlebarsApplicationMixin(ApplicationV2) {
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
      "open-source": EffectPanelApplication.#onOpenSource,
      "delete-effect": EffectPanelApplication.#onDeleteEffect
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
    context.effects = actor
      ? actor.appliedEffects.map(effect => this.#buildRow(actor, effect))
      : [];
    context.empty = actor
      ? F("l5r4.apps.effectPanel.none", { name: actor.name })
      : T("l5r4.apps.effectPanel.noActor");
    return context;
  }

  /**
   * Open the panel, or close it when it is open.
   * @returns {Promise<EffectPanelApplication>} The panel, once rendered or closed
   */
  static openOrClose() {
    if (panel?.rendered) {
      return panel.close();
    }
    panel ??= new EffectPanelApplication();
    return panel.render({ force: true });
  }

  /** Redraw the open panel. Hooks call it with their own arguments, which it ignores. */
  static renderIfOpen() {
    if (panel?.rendered) {
      panel.render();
    }
  }

  /**
   * Add the panel's button to the token controls.
   * @param {Record<string, object>} controls
   */
  static onGetSceneControlButtons(controls) {
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
      onChange: () => EffectPanelApplication.openOrClose()
    };
  }

  /**
   * Open an effect's source sheet, or the effect's own when it has none.
   * @this {EffectPanelApplication}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element
   */
  static async #onOpenSource(_event, element) {
    const doc = await fromUuid(element.closest("[data-uuid]").dataset.sourceUuid);
    doc?.sheet?.render({ force: true });
  }

  /**
   * Remove an effect the user owns.
   * @this {EffectPanelApplication}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element
   */
  static async #onDeleteEffect(_event, element) {
    const effect = await fromUuid(element.closest("[data-uuid]").dataset.uuid);
    if (effect?.isOwner) {
      await effect.delete();
    }
  }

  /**
   * One effect's row.
   * @param {Actor} actor
   * @param {ActiveEffect} effect
   * @returns {object}
   */
  #buildRow(actor, effect) {
    const phrases = [getEffectEnd(effect.duration)];
    for (const rule of effect.system.rules ?? []) {
      if (rule.key === "Resource" && Number.isFinite(Number(rule.max))) {
        const spent = getUsesSpent(
          actor.getFlag(SYS_ID, "uses")?.[rule.slug],
          currentPeriodOf(actor, rule.per)
        );
        phrases.push(getUsesLeft(Number(rule.max), spent));
      }
    }
    const source = this.#sourceOf(effect);
    return {
      uuid: effect.uuid,
      name: effect.name,
      img: effect.img,
      source: source?.name ?? "",
      sourceUuid: source?.uuid ?? effect.uuid,
      lasts: phrases.map(({ key, data }) => F(key, formatPhraseData(data))).join("; "),
      canRemove: effect.parent === actor && effect.isOwner
    };
  }

  /**
   * What an effect came from: the item carrying it, else its origin, else nothing.
   * @param {ActiveEffect} effect
   * @returns {foundry.abstract.Document|null}
   */
  #sourceOf(effect) {
    if (effect.parent?.documentName === "Item") {
      return effect.parent;
    }
    return effect.origin ? (fromUuidSync(effect.origin, { strict: false }) ?? null) : null;
  }
}

/**
 * Localize the label keys inside a phrase's data (an expiry event's name).
 * @param {object} data
 * @returns {object}
 */
function formatPhraseData(data) {
  return data.event ? { ...data, event: T(data.event) } : data;
}
