/**
 * @module config/design-gallery/contexts
 * @description The base contexts the design gallery's samples render from, shaped as the sheets' and services' own
 * contexts, and the evaluated rolls its dice rows show. A sample's `context` names one of these; its `with` is
 * merged over it.
 */

import { SORT_COLUMNS } from "../sort-keys.js";
import { ROWS, WOUND_LEVELS } from "./fixtures.js";

/** The base contexts the samples render from, shaped as the sheets' and services' own contexts. */
export const GALLERY_CONTEXTS = Object.freeze({
  pc: {
    actor: {
      name: { i18n: "l5r4.apps.designGallery.sample.pcName" },
      type: "pc",
      img: "icons/svg/mystery-man.svg"
    },
    editable: false,
    isGM: true,
    system: {
      clan: "Crane",
      school: "Kakita Bushi",
      insight: { rank: 2, points: 162, autoCalculate: true },
      _xp: { spent: 34, total: 52 },
      rings: { earth: 1, air: 3, water: 5, fire: 10, void: { rank: 2, value: 1 } },
      traits: { sta: 1, wil: 2, ref: 3, awa: 4, str: 5, per: 6, agi: 10, int: 10 },
      honor: { rank: 6, points: 5 },
      glory: { rank: 1, points: 0 },
      status: { rank: 10, points: 9 },
      shadowTaint: { rank: 0, points: 0 },
      initiative: { roll: 5, keep: 3, totalMod: 0, useVoid: false },
      movement: { showSimple: true, simpleAction: 15, freeAction: 5, maximum: 20 },
      armorTn: { current: 20, reduction: 3 },
      suffered: 0,
      wounds: { healRate: 6, mod: 0, max: 38 },
      woundLevels: WOUND_LEVELS,
      wealth: { koku: 3, bu: 5, zeni: 10 },
      spellSlots: { water: 0, air: 1, fire: 9, earth: 3, void: 0 },
      notes: ""
    },
    traitsEff: { sta: 1, wil: 2, ref: 3, awa: 4, str: 5, per: 6, agi: 10, int: 10 },
    currentStance: "attackStance",
    initiativeFormula: "5k3",
    voidArmor: false,
    collapsedSections: {},
    sortColumns: SORT_COLUMNS,
    sortState: { spells: { key: "name", dir: "asc" } },
    activeItemIds: [],
    enriched: { notes: "" },
    skills: [],
    weapons: [],
    bows: [],
    armors: [],
    items: [],
    spells: [],
    techniques: [],
    kihos: [],
    katas: [],
    tattoos: [],
    advantages: [],
    disadvantages: []
  },
  npc: {
    actor: {
      name: { i18n: "l5r4.apps.designGallery.sample.npcName" },
      type: "npc",
      img: "icons/svg/mystery-man.svg"
    },
    editable: false,
    showNpcVoidPoints: true,
    summary: {
      citation: { i18n: "l5r4.ui.ruleSummary.citation", data: { book: "L5R4", page: 300 } }
    },
    system: {
      rings: { earth: 3, air: 2, water: 2, fire: 3, void: { rank: 2, value: 2 } },
      traits: { sta: 3, wil: 3, ref: 2, awa: 2, str: 3, per: 2, agi: 3, int: 3 },
      initiative: { roll: 4, keep: 2, totalMod: 0, useVoid: false },
      movement: { showSimple: false, simpleAction: 10, freeAction: 5, maximum: 15 },
      armor: { armorTn: 25, reduction: 3 },
      suffered: 12,
      woundMode: "formula",
      wounds: { max: 57 },
      visibleWoundLevels: {
        healthy: { value: 15, penaltyEff: 0, current: false },
        nicked: { value: 21, penaltyEff: 3, current: true },
        out: { value: 57, penaltyEff: 40, current: false }
      },
      fear: { rank: 3 },
      notes: ""
    },
    traitsEff: { sta: 3, wil: 3, ref: 2, awa: 2, str: 3, per: 2, agi: 3, int: 3 },
    currentStance: "",
    initiativeFormula: "4k2",
    collapsedSections: {},
    sortColumns: SORT_COLUMNS,
    enriched: { notes: "" },
    firstEmptyAttack: "attack3",
    attacks: [
      {
        key: "attack1",
        num: 1,
        attack: { name: "Claws", roll: 6, keep: 3, modifier: 0, type: "simple" },
        damage: { roll: 4, keep: 2, modifier: 2, type: "Slashing" },
        actionLabel: "Simple",
        attackPool: "6k3",
        damagePool: "4k2+2",
        hasDamage: true,
        attackLabel: "Claws",
        damageLabel: { i18n: "l5r4.ui.common.damage" }
      },
      {
        key: "attack2",
        num: 2,
        attack: { name: "", roll: 5, keep: 2, modifier: 0, type: "complex" },
        damage: { roll: 3, keep: 2, modifier: 0 },
        actionLabel: "Complex",
        attackPool: "5k2",
        damagePool: "3k2",
        hasDamage: true,
        attackLabel: { i18n: "l5r4.ui.mechanics.combat.attack" },
        damageLabel: { i18n: "l5r4.ui.common.damage" }
      }
    ],
    skills: ROWS.skills
  },
  item: {
    item: {
      name: "Katana",
      type: "weapon",
      img: "icons/svg/sword.svg"
    },
    editable: false,
    currentTab: "details",
    summary: {
      citation: { i18n: "l5r4.ui.ruleSummary.citation", data: { book: "L5R4", page: 200 } }
    },
    system: {
      isBow: false,
      size: "medium",
      minStrength: 0,
      fallbackTrait: "agi",
      keywords: "Samurai",
      nemuranai: false,
      price: { koku: 20, bu: 0, zeni: 0 }
    },
    effects: []
  },
  plain: {}
});

/** Evaluated rolls in core's stored shape, so a dice row renders the same dice every time. */
export const GALLERY_ROLLS = Object.freeze({
  skilled: {
    class: "Roll",
    options: {},
    dice: [],
    formula: "6d10xa10k3 + 0",
    terms: [
      {
        class: "L5R4Die",
        options: { flavor: null },
        evaluated: true,
        number: 6,
        faces: 10,
        modifiers: ["xa10", "k3"],
        results: [
          { result: 17, active: true, exploded: true },
          { result: 8, active: true },
          { result: 6, active: true },
          { result: 5, active: false, discarded: true },
          { result: 3, active: false, discarded: true },
          { result: 1, active: false, discarded: true }
        ]
      },
      { class: "OperatorTerm", options: {}, evaluated: true, operator: "+" },
      { class: "NumericTerm", options: { flavor: null }, evaluated: true, number: 0 }
    ],
    total: 31,
    evaluated: true
  },
  unskilled: {
    class: "Roll",
    options: {},
    dice: [],
    formula: "4d10k2 + 0",
    terms: [
      {
        class: "L5R4Die",
        options: { flavor: null },
        evaluated: true,
        number: 4,
        faces: 10,
        modifiers: ["k2"],
        results: [
          { result: 10, active: true },
          { result: 7, active: true },
          { result: 4, active: false, discarded: true },
          { result: 2, active: false, discarded: true }
        ]
      },
      { class: "OperatorTerm", options: {}, evaluated: true, operator: "+" },
      { class: "NumericTerm", options: { flavor: null }, evaluated: true, number: 0 }
    ],
    total: 17,
    evaluated: true
  },
  emphasis: {
    class: "Roll",
    options: {},
    dice: [],
    formula: "5d10r1xa10k3 + 5",
    terms: [
      {
        class: "L5R4Die",
        options: { flavor: null },
        evaluated: true,
        number: 5,
        faces: 10,
        modifiers: ["r1", "xa10", "k3"],
        results: [
          { result: 1, active: false, rerolled: true },
          { result: 9, active: true },
          { result: 7, active: true },
          { result: 6, active: true },
          { result: 4, active: false, discarded: true },
          { result: 2, active: false, discarded: true }
        ]
      },
      { class: "OperatorTerm", options: {}, evaluated: true, operator: "+" },
      { class: "NumericTerm", options: { flavor: null }, evaluated: true, number: 5 }
    ],
    total: 27,
    evaluated: true
  }
});
