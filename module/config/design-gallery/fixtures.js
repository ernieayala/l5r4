/**
 * @module config/design-gallery/fixtures
 * @description Values the design gallery's samples share (module/apps/design-gallery.js): the template root, sample
 * text, Wound Ranks, one row per Item subtype, and the check card's and check dialog's contexts. A value
 * `{ i18n, data }` is a phrase the gallery localizes before rendering.
 */

/** The system's template root, as the samples name it. */
export const T = "systems/l5r4-enhanced/templates";

/** Sample document text: a sentence long enough to wrap. */
export const DESCRIPTION = Object.freeze({ i18n: "l5r4.apps.designGallery.sample.description" });

/** Wound Ranks at Earth 2, with the current rank set by each sample. */
export const WOUND_LEVELS = Object.freeze({
  healthy: { value: 10, penalty: 0, penaltyEff: 0, current: true },
  nicked: { value: 14, penalty: 3, penaltyEff: 3, current: false },
  grazed: { value: 18, penalty: 5, penaltyEff: 5, current: false },
  hurt: { value: 22, penalty: 10, penaltyEff: 10, current: false },
  injured: { value: 26, penalty: 15, penaltyEff: 15, current: false },
  crippled: { value: 30, penalty: 20, penaltyEff: 20, current: false },
  down: { value: 34, penalty: 40, penaltyEff: 40, current: false },
  out: { value: 38, penalty: 0, penaltyEff: 0, current: false }
});

/** One row per Item subtype, in the shape the sheet's sorted lists give the section partials. */
export const ROWS = Object.freeze({
  skills: [
    {
      id: "gallerySkill1",
      name: "Kenjutsu",
      type: "skill",
      system: {
        rank: 3,
        trait: "agi",
        school: true,
        roll: 7,
        keep: 4,
        rollFormula: "7k4",
        trainedEmphases: ["Katana"],
        description: DESCRIPTION
      }
    },
    {
      id: "gallerySkill2",
      name: { i18n: "l5r4.apps.designGallery.sample.longName" },
      type: "skill",
      system: { rank: 1, trait: "awa", roll: 4, keep: 3, rollFormula: "4k3", trainedEmphases: [] }
    }
  ],
  weapons: [
    {
      id: "galleryWeapon1",
      name: "Katana",
      type: "weapon",
      attackFormula: "7k4",
      system: {
        damageRoll: 3,
        damageKeep: 2,
        derivedDamageFormula: "3k2",
        description: DESCRIPTION
      }
    },
    {
      id: "galleryWeapon2",
      name: "Yumi",
      type: "weapon",
      attackFormula: "6k3",
      system: {
        damageRoll: 2,
        damageKeep: 2,
        derivedDamageFormula: "2k2",
        isBow: true,
        arrow: "willow"
      }
    }
  ],
  armors: [
    {
      id: "galleryArmor1",
      name: "Light Armor",
      type: "armor",
      system: { bonus: 5, reduction: 3, equipped: true, description: DESCRIPTION }
    }
  ],
  items: [{ id: "galleryItem1", name: "Traveling pack", type: "commonItem", system: {} }],
  spells: [
    {
      id: "gallerySpell1",
      name: "Path to Inner Peace",
      type: "spell",
      system: { ring: "water", mastery: 1, castFormula: "5k3", description: DESCRIPTION }
    }
  ],
  techniques: [
    {
      id: "galleryTechnique1",
      name: "Way of the Crane",
      type: "technique",
      system: { rank: 1, description: DESCRIPTION }
    }
  ],
  kihos: [
    {
      id: "galleryKiho1",
      name: "Cleansing Spirit",
      type: "kiho",
      system: { ring: "water", mastery: 2, type: "internal" }
    }
  ],
  katas: [
    {
      id: "galleryKata1",
      name: "Striking as Air",
      type: "kata",
      system: { ring: "air", mastery: 3, description: DESCRIPTION }
    },
    {
      id: "galleryKata2",
      name: "Striking as Fire",
      type: "kata",
      system: { ring: "fire", mastery: 3 }
    }
  ],
  tattoos: [
    {
      id: "galleryTattoo1",
      name: "Bamboo",
      type: "tattoo",
      system: { effect: { i18n: "l5r4.apps.designGallery.sample.tattooEffect" } }
    }
  ],
  advantages: [
    {
      id: "galleryAdvantage1",
      name: "Quick",
      type: "advantage",
      system: { type: "physical", cost: 6, description: DESCRIPTION }
    }
  ],
  disadvantages: [
    {
      id: "galleryDisadvantage1",
      name: "Proud",
      type: "disadvantage",
      system: { type: "mental", cost: 2 }
    }
  ]
});

/** A check card's context, shared by its variants. */
export const CHECK = Object.freeze({
  kind: "skill",
  label: "Kenjutsu",
  target: { name: "" },
  appliedModifiers: [{ label: { i18n: "l5r4.apps.designGallery.sample.modifier" }, text: "+1k0" }],
  tn: {
    effective: 20,
    raises: 1,
    freeRaisesToTN: 0,
    woundPenalty: 3,
    modifiers: [{ label: { i18n: "l5r4.apps.designGallery.sample.modifier" }, value: 5 }]
  },
  outcome: { success: true },
  outcomeText: { i18n: "l5r4.ui.mechanics.rolls.success" },
  notes: [],
  maneuverNotes: [],
  sources: [],
  conditions: []
});

/** The check dialog's context with every part the roll can offer. */
export const DIALOG = Object.freeze({
  pool: "7k4",
  modifiers: [
    {
      label: { i18n: "l5r4.apps.designGallery.sample.modifier" },
      text: "+1k0",
      enabled: true,
      range: ""
    },
    {
      label: { i18n: "l5r4.apps.designGallery.sample.modifierOff" },
      text: "+0k1",
      enabled: false,
      range: "melee"
    }
  ],
  substitutes: [
    { label: { i18n: "l5r4.apps.designGallery.sample.substitute" }, text: "Agility → Reflexes" }
  ],
  hasTn: true,
  tn: 20,
  tnModifiers: [{ label: { i18n: "l5r4.apps.designGallery.sample.modifier" }, value: 5 }],
  woundPenalty: 3,
  raisesAllowed: true,
  maxRaises: 2,
  minRaises: 0,
  freeRaises: 1,
  voidAllowed: true,
  voidPoints: 2,
  voidOverLimit: true,
  emphases: ["Katana"],
  isAttack: true,
  ranged: false,
  socialResistance: true,
  honorRank: 6,
  embraceTaint: true
});
