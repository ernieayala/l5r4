/**
 * @module config/status-effects
 * @description Every status effect: the five stances (Core Rulebook p.84) and the conditions (p.89, Fear p.90, Guard
 * p.88). Each entry is Active Effect data, so its mechanics are rules in `system.rules`, its timing is core's
 * `duration` (expiry events in module/config/expiry-events.js), and stances share the exclusive group "stance".
 * ActiveEffect.fromStatusEffect copies the entry onto the effect it creates (client/documents/active-effect.mjs:
 * 127-138), so the token HUD, the sheets, and the system's services all create the same effect.
 *
 * Selectors: "any" is every roll; "attack" every attack roll. Rules with `@level` read the effect's level (a Fear
 * Rank, days of Fatigue).
 */

import { iconPath } from "./icons.js";

const freeze = Object.freeze;

/** Until the start of the Turn of the combatant whose Turn it was when the effect began (Guard, p.88). */
const UNTIL_NEXT_TURN = freeze({ value: 1, units: "rounds", expiry: "turnStart" });

/**
 * TNModifier rules raising by 5 per level the TN of Skill rolls (attacks included), Spell Casting Rolls (maho reads
 * "spell" rules too), and physical Trait rolls (Fatigued and Fasting, p.89). A Skill roll also reads its Trait's
 * selector, so the Trait rules hold only on a Trait roll.
 * @returns {object[]}
 */
function physicalTnRules() {
  const value = "5 * @level";
  return [
    ...["skill", "attack", "spell"].map(selector => ({ key: "TNModifier", selector, value })),
    ...["sta", "str", "ref", "agi"].map(trait => ({
      key: "TNModifier",
      selector: `trait:${trait}`,
      value,
      predicate: ["check:trait"]
    }))
  ];
}

/**
 * Status effects configuration for L5R4 system.
 * @type {ReadonlyArray<object>}
 */
export const STATUS_EFFECTS = freeze([
  {
    id: "attackStance",
    name: "l5r4.ui.mechanics.stances.attack",
    img: iconPath("attack-stance.webp"),
    system: { group: "stance" }
  },
  {
    id: "fullAttackStance",
    name: "l5r4.ui.mechanics.stances.fullAttack",
    img: iconPath("full-attack-stance.webp"),
    // +2k1 to attack rolls, Armor TN -10 (p.84)
    system: {
      group: "stance",
      rules: [
        { key: "RollModifier", selector: "attack", roll: 2, keep: 1 },
        { key: "ArmorTN", value: -10 }
      ]
    }
  },
  {
    id: "defenseStance",
    name: "l5r4.ui.mechanics.stances.defense",
    img: iconPath("defence-stance.webp"),
    // Air Ring plus Defense Skill Rank to Armor TN (p.84)
    system: {
      group: "stance",
      rules: [{ key: "ArmorTN", value: "@rings.air + @skills.defense.rank" }]
    }
  },
  {
    id: "fullDefenseStance",
    name: "l5r4.ui.mechanics.stances.fullDefense",
    img: iconPath("full-defense-stance.webp"),
    // The Defense / Reflexes roll gives its own effect until the next Turn (services/effects/prompts.js)
    system: { group: "stance" }
  },
  {
    id: "centerStance",
    name: "l5r4.ui.mechanics.stances.center",
    img: iconPath("centered-stance.webp"),
    // Its bonus comes the next Round, through the "centered" effect (documents/combat.js)
    system: { group: "stance" }
  },

  {
    id: "blinded",
    name: "EFFECT.blinded",
    img: iconPath("blinded.webp"),
    // -3k3 ranged and -1k1 melee attacks; base Armor TN Reflexes + 5; Water Ring 2 lower for movement (p.89)
    system: {
      rules: [
        { key: "RollModifier", selector: "attack", roll: -3, keep: -3, range: "ranged" },
        { key: "RollModifier", selector: "attack", roll: -1, keep: -1, range: "melee" },
        { key: "ArmorTN", mode: "base", value: "@ref + 5" },
        { key: "Movement", water: -2 }
      ]
    }
  },
  { id: "concentration", name: "EFFECT.concentration", img: iconPath("concentration.webp") },
  {
    id: "dazed",
    name: "EFFECT.dazed",
    img: iconPath("dazed.webp"),
    // -3k0 to all actions; Earth Ring roll in the Reactions stage at TN 20, 5 lower after each failure (p.89)
    system: {
      rules: [
        { key: "RollModifier", selector: "any", roll: -3 },
        { key: "PeriodicSave", event: "roundEnd", roll: "ring:earth", tn: 20, step: -5, min: 5 }
      ]
    }
  },
  { id: "dead", name: "EFFECT.dead", img: iconPath("dead.webp") },
  { id: "entangled", name: "EFFECT.entangled", img: iconPath("entangled.webp") },
  {
    id: "fasting",
    name: "EFFECT.fasting",
    img: iconPath("fasting.webp"),
    // +5 TN per level to Skill, physical Trait, and Spell Casting Rolls; the GM sets the level (p.89)
    system: { level: 1, rules: physicalTnRules() }
  },
  {
    id: "fatigued",
    name: "EFFECT.fatigued",
    img: iconPath("fatigue.webp"),
    // +5 TN per level to Skill, physical Trait, and Spell Casting Rolls (p.89)
    system: { level: 1, rules: physicalTnRules() }
  },
  {
    id: "feared",
    name: "EFFECT.feared",
    img: iconPath("fear.webp"),
    // -Xk0 to all rolls, X the Fear Rank, until the end of the encounter (p.90; STAGE-09 decision 4)
    duration: { expiry: "encounterEnd" },
    system: { level: 1, rules: [{ key: "RollModifier", selector: "any", roll: "-@level" }] }
  },
  {
    id: "grappled",
    name: "EFFECT.grappled",
    img: iconPath("grappled.webp"),
    // Armor TN 5 plus armor (p.89; STAGE-09 decision 3)
    system: { rules: [{ key: "ArmorTN", mode: "total", value: 5 }] }
  },
  {
    id: "guarded",
    name: "EFFECT.guarded",
    img: iconPath("guarded.webp"),
    // +10 Armor TN until the guard's next Turn (p.88)
    duration: UNTIL_NEXT_TURN,
    system: { rules: [{ key: "ArmorTN", value: 10 }] }
  },
  {
    id: "guarding",
    name: "EFFECT.guarding",
    img: iconPath("guarding.webp"),
    // -5 Armor TN until the guard's next Turn (p.88)
    duration: UNTIL_NEXT_TURN,
    system: { rules: [{ key: "ArmorTN", value: -5 }] }
  },
  {
    id: "mounted",
    name: "EFFECT.mounted",
    img: iconPath("mounted.webp"),
    // +1k0 on attacks against an unmounted target (p.89)
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
    name: "EFFECT.prone",
    img: iconPath("prone.webp"),
    // -10 Armor TN against melee attacks; -2k0 to attacks (p.89)
    system: {
      rules: [
        { key: "ArmorTN", value: -10, range: "melee" },
        { key: "RollModifier", selector: "attack", roll: -2 }
      ]
    }
  },
  {
    id: "stunned",
    name: "EFFECT.stunned",
    img: iconPath("stunned.webp"),
    // Armor TN 5 plus armor; Earth Ring roll at TN 20 in the Reactions stage, or it ends after the next Round (p.89)
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
 * Effects the system creates that the token HUD does not offer: Center Stance's bonus the next Round (p.84), the
 * Full Defense roll's Armor TN bonus (p.84), and a Void Point spent on Armor TN (p.78). Same shape as
 * STATUS_EFFECTS, built by the services that create them.
 * @type {Readonly<Record<string, object>>}
 */
export const SYSTEM_EFFECTS = freeze({
  // +1k1 plus the Void Ring on one roll the player picks during the Turn, for one Round (p.84; decision 7)
  centered: {
    name: "l5r4.ui.effects.centered",
    img: iconPath("centered-stance.webp"),
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
  // Half the Defense / Reflexes roll, rounded up, until the next Turn (p.84); the value is set on creation
  fullDefense: {
    name: "l5r4.ui.effects.fullDefense",
    img: iconPath("full-defense-stance.webp"),
    duration: UNTIL_NEXT_TURN
  },
  // +10 Armor TN for the Round, declared at its start (p.78)
  voidArmor: {
    name: "l5r4.ui.effects.voidArmor",
    img: iconPath("void.webp"),
    duration: { value: 0, units: "rounds", expiry: "roundEnd" },
    system: { rules: [{ key: "ArmorTN", value: 10 }] }
  }
});

/**
 * Stances a condition rules out (p.89): Dazed allows only Defense and Full Defense, Prone only Attack and Defense;
 * Fatigued and Mounted forbid Full Attack (p.84). The sheet warns and still lets the player choose.
 * @type {Readonly<Record<string, ReadonlyArray<string>>>}
 */
export const STANCE_LIMITS = freeze({
  dazed: freeze(["attackStance", "fullAttackStance", "centerStance"]),
  prone: freeze(["fullAttackStance", "fullDefenseStance", "centerStance"]),
  fatigued: freeze(["fullAttackStance"]),
  mounted: freeze(["fullAttackStance"])
});
