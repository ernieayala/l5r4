/**
 * @module sheets/handlers/roll-handler
 * @description Sheet actions that start rolls. Each handler reads what to roll from the sheet (an item row or data-*
 * attributes) and hands it to a roll service; the roll pipeline (module/services/dice/check/) gathers every
 * modifier, so handlers add none (AUTOMATION.md B1-B3). A normal click shows the roll dialog; Shift-click skips it.
 */

import {
  getEffectiveTrait,
  getRollParams,
  getWeaponSkillTrait,
  ringRankOf
} from "../../utils/mechanics.js";
import { toTraitKey } from "../../utils/trait-keys.js";
import { toInt } from "../../utils/type-coercion.js";
import { F, T } from "../../utils/localization.js";
import { rollSkill } from "../../services/dice/rolls/skill-roll.js";
import { rollPool } from "../../services/dice/rolls/simple-roll.js";
import { rollTrait } from "../../services/dice/rolls/trait-roll.js";
import { rollRing } from "../../services/dice/rolls/ring-roll.js";
import { rollSpellCast } from "../../services/dice/rolls/spell-cast-roll.js";
import { rollMahoCast } from "../../services/dice/rolls/maho-cast-roll.js";

/**
 * Static roll actions for actor sheets.
 *
 * A roll already in progress for the same actor, roll type, and item is ignored, so a double click rolls once.
 */
export class RollHandler {
  /**
   * Rolls in progress, keyed "actorId-rollType-itemId" or "actorId-rollType".
   * @type {Set<string>}
   */
  static #rollInProgress = new Set();

  /**
   * The element an action targets: the delegated element, or the event's current target.
   * @param {HTMLElement|null} element
   * @param {Event} event
   * @returns {HTMLElement}
   */
  static #getElement(element, event) {
    return element || event.currentTarget;
  }

  /**
   * Run a roll unless the same roll is already in progress.
   * @param {string} key - Roll key
   * @param {function(): Promise<*>} roll
   * @returns {Promise<*>}
   */
  static async #rollOnce(key, roll) {
    if (RollHandler.#rollInProgress.has(key)) {
      return undefined;
    }
    RollHandler.#rollInProgress.add(key);
    try {
      return await roll();
    } finally {
      RollHandler.#rollInProgress.delete(key);
    }
  }

  /**
   * Roll a Skill from its row: (Skill + Trait)k(Trait).
   * game-rules/29_types_of_rolls.md, p.79
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element inside the skill row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollClickedSkill(context, event, element) {
    event.preventDefault();
    const row = RollHandler.#getElement(element, event)?.closest?.("[data-item-id]");
    const item = row ? context.actor.items.get(row.dataset.itemId) : null;
    if (!item) {
      return undefined;
    }
    return RollHandler.rollSkill(context.actor, item, !event.shiftKey);
  }

  /**
   * Roll a Skill item: (Skill + Trait)k(Trait) with its own Trait. The sheet's row and a hotbar macro both
   * roll through here.
   * game-rules/29_types_of_rolls.md, p.79
   * @param {Actor} actor
   * @param {Item} item - A skill the actor owns
   * @param {boolean} askForOptions - Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollSkill(actor, item, askForOptions) {
    const traitKey = toTraitKey(item.system?.trait);
    if (!traitKey) {
      console.warn("[L5R4] Skill is missing system.trait; cannot roll:", item?.name);
      return undefined;
    }
    return RollHandler.#rollOnce(`${actor.id}-skill-${item.id}`, () =>
      rollSkill({
        actor,
        traitRank: getEffectiveTrait(actor, traitKey),
        skillRank: toInt(item.system?.rank),
        skillName: item.name,
        skillTrait: traitKey,
        askForOptions
      })
    );
  }

  /**
   * Roll an NPC attack from data-roll / data-keep (plus data-trait and data-modifier).
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollNpcAttack(context, event, element) {
    event.preventDefault();
    const el = RollHandler.#getElement(element, event);
    const params = getRollParams(el, context.actor);
    // The stat block pairs attack N with damage N; the attack stores it for its damage button. dataset is user input.
    const num = ["1", "2", "3"].includes(el.dataset.attackNum) ? el.dataset.attackNum : null;
    const damage = num ? context.actor.system[`damage${num}`] : null;
    return RollHandler.#rollOnce(`${context.actor.id}-attack-${params.label}`, () =>
      rollPool({
        roll: params.roll + params.traitBonus,
        keep: params.keep + params.traitBonus,
        modifier: toInt(el.dataset.modifier),
        rollName: params.label,
        askForOptions: !event.shiftKey,
        rollType: "attack",
        actor: context.actor,
        damage:
          damage && (damage.roll || damage.keep)
            ? {
                label: params.label,
                roll: toInt(damage.roll),
                keep: toInt(damage.keep),
                bonus: toInt(damage.modifier)
              }
            : null
      })
    );
  }

  /**
   * Attack with a weapon from its row: its associated Skill with that Skill's Trait, or the fallback Trait alone as
   * an Unskilled Roll when the character lacks the Skill.
   * game-rules/30_skill_rolls_expanded.md, p.80
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element inside the weapon row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollClickedWeaponAttack(context, event, element) {
    event.preventDefault();
    const weapon = RollHandler.rowItemOf(context.actor, element);
    if (!weapon || (weapon.type !== "weapon" && weapon.type !== "bow")) {
      ui.notifications?.warn(T("l5r4.ui.notifications.noValidWeapon"));
      return undefined;
    }
    return RollHandler.rollWeaponAttack(context.actor, weapon, !event.shiftKey);
  }

  /**
   * Attack with a weapon item: its associated Skill with that Skill's Trait, or the fallback Trait alone as an
   * Unskilled Roll when the character lacks the Skill. The sheet's row and a hotbar macro both attack through
   * here.
   * game-rules/30_skill_rolls_expanded.md, p.80
   * @param {Actor} actor
   * @param {Item} weapon - A weapon or bow the actor owns
   * @param {boolean} askForOptions - Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollWeaponAttack(actor, weapon, askForOptions) {
    const id = weapon.id;
    const weaponSkill = getWeaponSkillTrait(actor, weapon);
    const associatedSkill = weapon.system.associatedSkill || null;
    const skillItem = RollHandler.#skillItemOf(actor, associatedSkill);
    const skillTrait = skillItem?.system.trait || weapon.system.fallbackTrait || "agi";

    return RollHandler.#rollOnce(`${actor.id}-weapon-attack-${id}`, () =>
      weaponSkill.skillRank > 0 && skillItem
        ? rollSkill({
            traitRank: weaponSkill.traitValue,
            skillRank: weaponSkill.skillRank,
            skillName: associatedSkill,
            skillTrait,
            askForOptions,
            actor,
            rollType: "attack",
            weaponId: id
          })
        : RollHandler.#rollUnskilledAttack(actor, weapon, {
            traitValue: weaponSkill.traitValue,
            askForOptions,
            skillName: associatedSkill,
            skillTrait
          })
    );
  }

  /**
   * Roll NPC damage from data-roll / data-keep (plus data-trait and data-modifier).
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollNpcDamage(context, event, element) {
    event.preventDefault();
    const el = RollHandler.#getElement(element, event);
    const params = getRollParams(el, context.actor);
    return RollHandler.#rollOnce(`${context.actor.id}-damage-${params.label}`, () =>
      rollPool({
        roll: params.roll + params.traitBonus,
        keep: params.keep + params.traitBonus,
        modifier: toInt(el.dataset.modifier),
        rollName: params.label,
        askForOptions: !event.shiftKey,
        rollType: "damage",
        actor: context.actor
      })
    );
  }

  /**
   * Roll a Trait: roll and keep its rank.
   * game-rules/29_types_of_rolls.md, p.80
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element inside the trait block
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollClickedTrait(context, event, element) {
    event.preventDefault();
    const block = element.closest("[data-trait-block]");
    // The rank element inside this trait block names the Trait
    const traitKey = toTraitKey(
      block?.querySelector("[data-action='adjust-trait']")?.dataset.trait ||
        element.dataset.traitName ||
        "ref"
    );
    return RollHandler.rollTrait(context.actor, traitKey, !event.shiftKey);
  }

  /**
   * Roll a Trait by key: roll and keep its rank. An NPC's goes through its stat-block roll. The sheet and a
   * hotbar macro both roll through here.
   * game-rules/29_types_of_rolls.md, p.80
   * @param {Actor} actor
   * @param {string} traitKey
   * @param {boolean} askForOptions - Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollTrait(actor, traitKey, askForOptions) {
    const options = { traitRank: getEffectiveTrait(actor, traitKey), askForOptions, actor };
    return RollHandler.#rollOnce(`${actor.id}-trait-${traitKey}`, () =>
      actor.type === "npc"
        ? rollPool({ ...options, traitName: traitKey })
        : rollTrait({ ...options, traitName: traitKey })
    );
  }

  /**
   * Roll an NPC Ring from data-ring-key and data-ring-rank.
   * game-rules/29_types_of_rolls.md, p.80
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - The clicked element
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollClickedNpcRing(context, event, element) {
    event?.preventDefault?.();
    const ringKey = String(element?.dataset?.ringKey || "void").toLowerCase();
    return RollHandler.rollRing(context.actor, ringKey, !event?.shiftKey);
  }

  /**
   * Roll a Ring by key: roll and keep its rank. A PC's dialog can make it a Spell Casting Roll; an NPC's goes
   * through its stat-block roll. Both sheets and a hotbar macro roll through here.
   * game-rules/29_types_of_rolls.md, p.80
   * @param {Actor} actor
   * @param {string} ring - air, earth, fire, water, or void
   * @param {boolean} askForOptions - Show the roll dialog
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static rollRing(actor, ring, askForOptions) {
    const rank = ringRankOf(actor, ring);
    const ringName = T(`l5r4.ui.mechanics.rings.${ring}`);
    return RollHandler.#rollOnce(`${actor.id}-ring-${ring}`, () =>
      actor.type === "npc"
        ? rollPool({ rollName: ringName, ringName: ring, ringRank: rank, askForOptions, actor })
        : rollRing({ ringRank: rank, ringName, ringKey: ring, askForOptions, actor })
    );
  }

  /**
   * Cast the spell of the clicked row: a maho spell through the maho roll, any other through the Spell Casting
   * Roll.
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @param {HTMLElement} element - Element inside the spell row
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollClickedSpellCast(context, event, element) {
    event?.preventDefault?.();
    const spell = RollHandler.rowItemOf(context.actor, element);
    if (!spell || spell.type !== "spell") {
      return undefined;
    }
    return RollHandler.rollSpellCast(context.actor, spell, !event?.shiftKey);
  }

  /**
   * Cast a spell item: a maho spell through the maho roll, any other through the Spell Casting Roll. Both sheets'
   * rows and a hotbar macro cast through here.
   * @param {Actor} actor
   * @param {Item} spell - A spell the actor owns
   * @param {boolean} showDialog
   * @returns {Promise<ChatMessage|null>}
   */
  static rollSpellCast(actor, spell, showDialog) {
    const cast = spell.system.maho ? rollMahoCast : rollSpellCast;
    return cast({ actor, spell, showDialog });
  }

  /**
   * Roll an XkY pool from the clicked element's data-roll, data-keep, data-rolllabel, data-trait, and
   * data-rolltype ("attack", "damage", or a plain roll).
   * @param {object} context - Sheet context with `actor`
   * @param {Event} event - Click event
   * @returns {Promise<ChatMessage|null|undefined>}
   */
  static async rollNpcPool(context, event) {
    event?.preventDefault?.();
    const ds = event.currentTarget?.dataset || {};
    const rollType = ds.rolltype || "simple";
    const rollName = `${ds.rolllabel || ""} ${ds.trait || ""}`.trim();
    return RollHandler.#rollOnce(`${context.actor.id}-simple-${rollType}-${rollName}`, () =>
      rollPool({
        roll: toInt(ds.roll),
        keep: toInt(ds.keep),
        rollName,
        askForOptions: !event.shiftKey,
        rollType,
        actor: context.actor
      })
    );
  }

  /**
   * The item of the row the element sits in.
   * @param {Actor} actor
   * @param {HTMLElement} element
   * @returns {Item|null}
   */
  static rowItemOf(actor, element) {
    const row = element.closest("[data-item-id]");
    const id = row?.dataset?.itemId || row?.dataset?.documentId || row?.dataset?.id;
    return id ? actor.items.get(id) : null;
  }

  /**
   * The actor's skill item with this name, matched without regard to case.
   * @param {Actor} actor
   * @param {string|null} skillName - A weapon's associated Skill
   * @returns {Item|null|undefined} The skill; null when the weapon names none
   */
  static #skillItemOf(actor, skillName) {
    return skillName
      ? actor.items.find(
          i => i.type === "skill" && i.name.toLowerCase() === skillName.toLowerCase()
        )
      : null;
  }

  /**
   * Attack with a weapon's fallback Trait alone, as an Unskilled Roll: roll and keep the Trait.
   * game-rules/30_skill_rolls_expanded.md, p.80
   * @param {Actor} actor
   * @param {Item} weapon - A weapon or bow the actor owns
   * @param {object} attack
   * @param {number} attack.traitValue - The Trait's rank
   * @param {boolean} attack.askForOptions - Show the roll dialog
   * @param {string|null} attack.skillName - The weapon's associated Skill, which the actor lacks
   * @param {string} attack.skillTrait - The Trait rolled
   * @returns {Promise<ChatMessage|null>}
   */
  static #rollUnskilledAttack(actor, weapon, { traitValue, askForOptions, skillName, skillTrait }) {
    return rollPool({
      roll: traitValue,
      keep: traitValue,
      rollName: F("l5r4.ui.mechanics.rolls.weaponAttackRoll", { weapon: weapon.name }),
      askForOptions,
      rollType: "attack",
      actor,
      unskilled: true,
      weaponId: weapon.id,
      isBow: weapon.type === "bow" || Boolean(weapon.system.isBow),
      skillName,
      skillTrait
    });
  }
}
