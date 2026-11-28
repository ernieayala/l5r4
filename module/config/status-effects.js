/**
 * @module config/status-effects
 * @description Every status effect: the five stances and the conditions, Fear and Guard among them. Each entry is
 * Active Effect data, so its mechanics are rules in `system.rules`, its timing is core's `duration` (expiry events in
 * module/config/expiry-events.js), and stances share the exclusive group "stance". ActiveEffect.fromStatusEffect
 * copies the entry onto the effect it creates [src: client/documents/active-effect.mjs:127-138], so the token HUD,
 * the sheets, and the system's services all create the same effect.
 *
 * Selectors: "any" is every roll; "attack" every attack roll. Rules with `@level` read the effect's level (a Fear
 * Rank, days of Fatigue).
 * game-rules/36_stances.md, p.84
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/42_fear.md, p.90
 * game-rules/38_maneuvers.md, p.87
 */

import { PATHS } from "./constants.js";

/**
 * Until the start of the Turn of the combatant whose Turn it was when the effect began (Guard).
 * game-rules/38_maneuvers.md, p.87
 */
const UNTIL_NEXT_TURN = Object.freeze({ value: 1, units: "rounds", expiry: "turnStart" });

/**
 * TNModifier rules raising by 5 per level the TN of Skill rolls (attacks included), Spell Casting Rolls (maho reads
 * "spell" rules too), and physical Trait rolls (Fatigued and Fasting). An attack with a Weapon Skill reads both the
 * "skill" and the "attack" selector, and a stat block's attack only "attack", so every attack takes the "attack"
 * rule and the "skill" rule leaves attacks out (#173). A Skill roll also reads its Trait's selector, so the Trait
 * rules hold only on a Trait roll. Each status takes its own copy of the list.
 * game-rules/41_conditional_effects.md, p.89
 */
const PHYSICAL_TN_RULES = Object.freeze([
  {
    key: "TNModifier",
    selector: "skill",
    value: "5 * @level",
    predicate: [{ not: "check:attack" }]
  },
  { key: "TNModifier", selector: "attack", value: "5 * @level" },
  { key: "TNModifier", selector: "spell", value: "5 * @level" },
  { key: "TNModifier", selector: "trait:sta", value: "5 * @level", predicate: ["check:trait"] },
  { key: "TNModifier", selector: "trait:str", value: "5 * @level", predicate: ["check:trait"] },
  { key: "TNModifier", selector: "trait:ref", value: "5 * @level", predicate: ["check:trait"] },
  { key: "TNModifier", selector: "trait:agi", value: "5 * @level", predicate: ["check:trait"] }
]);

/**
 * Status effects configuration for L5R4 system.
 * @type {ReadonlyArray<object>}
 */
export const STATUS_EFFECTS = Object.freeze([
  {
    id: "attackStance",
    name: "l5r4.ui.mechanics.stances.attack",
    img: `${PATHS.icons}/attack-stance.webp`,
    system: { group: "stance" }
  },
  {
    id: "fullAttackStance",
    name: "l5r4.ui.mechanics.stances.fullAttack",
    img: `${PATHS.icons}/full-attack-stance.webp`,
    // +2k1 to attack rolls, Armor TN -10; no ranged attacks in this stance, so the bonus is melee only
    // game-rules/36_stances.md, p.84
    system: {
      group: "stance",
      rules: [
        { key: "RollModifier", selector: "attack", roll: 2, keep: 1, range: "melee" },
        { key: "ArmorTN", value: -10 }
      ]
    }
  },
  {
    id: "defenseStance",
    name: "l5r4.ui.mechanics.stances.defense",
    img: `${PATHS.icons}/defence-stance.webp`,
    // Air Ring plus Defense Skill Rank to Armor TN
    // game-rules/36_stances.md, p.84
    system: {
      group: "stance",
      rules: [{ key: "ArmorTN", value: "@rings.air + @skills.defense.rank" }]
    }
  },
  {
    id: "fullDefenseStance",
    name: "l5r4.ui.mechanics.stances.fullDefense",
    img: `${PATHS.icons}/full-defense-stance.webp`,
    // The Defense / Reflexes roll gives its own effect until the next Turn (services/effects/prompts.js)
    system: { group: "stance" }
  },
  {
    id: "centerStance",
    name: "l5r4.ui.mechanics.stances.center",
    img: `${PATHS.icons}/centered-stance.webp`,
    // Its bonus comes the next Round, through the "centered" effect (documents/combat.js)
    system: { group: "stance" }
  },

  {
    id: "blinded",
    name: "l5r4.ui.statusEffects.blinded",
    img: `${PATHS.icons}/blinded.webp`,
    // -3k3 ranged and -1k1 melee attacks; base Armor TN Reflexes + 5; Water Ring 2 lower for movement
    // game-rules/41_conditional_effects.md, p.89
    system: {
      rules: [
        { key: "RollModifier", selector: "attack", roll: -3, keep: -3, range: "ranged" },
        { key: "RollModifier", selector: "attack", roll: -1, keep: -1, range: "melee" },
        { key: "ArmorTN", mode: "base", value: "@ref + 5" },
        { key: "Movement", water: -2 }
      ]
    }
  },
  {
    id: "concentration",
    name: "l5r4.ui.statusEffects.concentration",
    img: `${PATHS.icons}/concentration.webp`
  },
  {
    id: "dazed",
    name: "l5r4.ui.statusEffects.dazed",
    img: `${PATHS.icons}/dazed.webp`,
    // -3k0 to all actions, not to damage (Ernie's ruling); Earth Ring roll in the Reactions stage at TN 20, 5 lower
    // after each failure
    // game-rules/41_conditional_effects.md, p.89
    system: {
      rules: [
        { key: "RollModifier", selector: "any", roll: -3, predicate: [{ not: "check:damage" }] },
        { key: "PeriodicSave", event: "roundEnd", roll: "ring:earth", tn: 20, step: -5, min: 5 }
      ]
    }
  },
  { id: "dead", name: "l5r4.ui.statusEffects.dead", img: `${PATHS.icons}/dead.webp` },
  {
    id: "entangled",
    name: "l5r4.ui.statusEffects.entangled",
    img: `${PATHS.icons}/entangled.webp`
  },
  {
    id: "fasting",
    name: "l5r4.ui.statusEffects.fasting",
    img: `${PATHS.icons}/fasting.webp`,
    // +5 TN per level to Skill, physical Trait, and Spell Casting Rolls; the GM sets the level
    // game-rules/41_conditional_effects.md, p.89
    system: { level: 1, rules: structuredClone(PHYSICAL_TN_RULES) }
  },
  {
    id: "fatigued",
    name: "l5r4.ui.statusEffects.fatigued",
    img: `${PATHS.icons}/fatigue.webp`,
    // +5 TN per level to Skill, physical Trait, and Spell Casting Rolls
    // game-rules/41_conditional_effects.md, p.89
    system: { level: 1, rules: structuredClone(PHYSICAL_TN_RULES) }
  },
  {
    id: "feared",
    name: "l5r4.ui.statusEffects.feared",
    img: `${PATHS.icons}/fear.webp`,
    // -Xk0 to all rolls, X the Fear Rank, until the end of the encounter (STAGE-09 decision 4)
    // game-rules/42_fear.md, p.90
    duration: { expiry: "encounterEnd" },
    system: { level: 1, rules: [{ key: "RollModifier", selector: "any", roll: "-@level" }] }
  },
  {
    id: "grappled",
    name: "l5r4.ui.statusEffects.grappled",
    img: `${PATHS.icons}/grappled.webp`,
    // Armor TN 5 plus armor (STAGE-09 decision 3)
    // game-rules/41_conditional_effects.md, p.89
    system: { rules: [{ key: "ArmorTN", mode: "total", value: 5 }] }
  },
  {
    id: "guarded",
    name: "l5r4.ui.statusEffects.guarded",
    img: `${PATHS.icons}/guarded.webp`,
    // +10 Armor TN until the guard's next Turn
    // game-rules/38_maneuvers.md, p.87
    duration: UNTIL_NEXT_TURN,
    system: { rules: [{ key: "ArmorTN", value: 10 }] }
  },
  {
    id: "guarding",
    name: "l5r4.ui.statusEffects.guarding",
    img: `${PATHS.icons}/guarding.webp`,
    // -5 Armor TN until the guard's next Turn
    // game-rules/38_maneuvers.md, p.87
    duration: UNTIL_NEXT_TURN,
    system: { rules: [{ key: "ArmorTN", value: -5 }] }
  },
  {
    id: "mounted",
    name: "l5r4.ui.statusEffects.mounted",
    img: `${PATHS.icons}/mounted.webp`,
    // +1k0 on attacks against an unmounted target
    // game-rules/41_conditional_effects.md, p.89
    system: {
      rules: [
        {
          key: "RollModifier",
          selector: "attack",
          roll: 1,
          predicate: ["target", { not: "target:status:mounted" }]
        }
      ]
    }
  },
  {
    id: "prone",
    name: "l5r4.ui.statusEffects.prone",
    img: `${PATHS.icons}/prone.webp`,
    // -10 Armor TN against melee attacks; -2k0 to attacks with small and medium weapons, and no attacks with large
    // ones, which the card notes
    // game-rules/41_conditional_effects.md, p.89
    system: {
      rules: [
        { key: "ArmorTN", value: -10, range: "melee" },
        {
          key: "RollModifier",
          selector: "attack",
          roll: -2,
          predicate: [{ not: "weapon:size:large" }]
        },
        {
          key: "Note",
          selector: "attack",
          text: "l5r4.ui.effects.proneLargeWeapon",
          predicate: ["weapon:size:large"]
        }
      ]
    }
  },
  {
    id: "stunned",
    name: "l5r4.ui.statusEffects.stunned",
    img: `${PATHS.icons}/stunned.webp`,
    // Armor TN 5 plus armor; Earth Ring roll at TN 20 in the Reactions stage, or it ends after the next Round
    // game-rules/41_conditional_effects.md, p.89
    system: {
      rules: [
        { key: "ArmorTN", mode: "total", value: 5 },
        {
          key: "PeriodicSave",
          event: "roundEnd",
          roll: "ring:earth",
          tn: 20,
          onFailure: "endNextRound"
        }
      ]
    }
  }
]);

/**
 * Statuses an actor can hold once per origin: a Concentration per spell held, a Guard per protector. Every other
 * status is held once, so applying it again updates the one held (applyEffect, #177).
 * game-rules/38_maneuvers.md, p.87
 * game-rules/67_universal_spells.md, p.166
 */
export const PER_ORIGIN_STATUSES = Object.freeze(["concentration", "guarded"]);

/**
 * Effects the system creates that the token HUD does not offer: Center Stance's bonus the next Round, the Full
 * Defense roll's Armor TN bonus, and a Void Point spent on Armor TN. Same shape as STATUS_EFFECTS, built by the
 * services that create them.
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/36_stances.md, p.84
 * @type {Readonly<Record<string, object>>}
 */
export const SYSTEM_EFFECTS = Object.freeze({
  // +1k1 plus the Void Ring on one roll the player picks during the Turn, for one Round (decision 7)
  // game-rules/36_stances.md, p.84
  centered: {
    name: "l5r4.ui.effects.centered",
    img: `${PATHS.icons}/centered-stance.webp`,
    duration: { value: 1, units: "rounds", expiry: "roundEnd" },
    system: {
      rules: [
        {
          key: "RollModifier",
          selector: "any",
          roll: 1,
          keep: 1,
          total: "@rings.void.rank",
          optional: true,
          consumes: true
        }
      ]
    }
  },
  // Half the Defense / Reflexes roll, rounded up, until the next Turn; the value is set on creation
  // game-rules/36_stances.md, p.84
  fullDefense: {
    name: "l5r4.ui.effects.fullDefense",
    img: `${PATHS.icons}/full-defense-stance.webp`,
    duration: UNTIL_NEXT_TURN
  },
  // +10 Armor TN for the Round, declared at its start
  // game-rules/25_rings_and_traits.md, p.78
  voidArmor: {
    name: "l5r4.ui.effects.voidArmor",
    img: `${PATHS.icons}/void.webp`,
    duration: { value: 0, units: "rounds", expiry: "roundEnd" },
    system: { rules: [{ key: "ArmorTN", value: 10 }] }
  }
});
