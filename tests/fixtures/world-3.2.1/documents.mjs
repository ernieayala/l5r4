/**
 * The documents of the 3.2.1 fixture world (roadmap/STAGE-12): what a world saved by l5r4-enhanced 3.2.1 on
 * Foundry 13 holds, in the shapes 3.2.1 wrote them. Every name is made up. `build-world.mjs` fills each document's
 * `system` from 3.2.1's template.json and writes the world.
 *
 * Each shape cites the 3.2.1 code that wrote it (paths at tag v3.2.1).
 */

const ICONS = "systems/l5r4-enhanced/assets/icons";
const NOW = 1762000000000;

/** Users copied from the template world: the GM the fixture is opened with. */
export const GM_ID = "sqUKAzb9g4BG5eSI";

/**
 * An Active Effect as Foundry 13 stored it: changes at the top level with a numeric mode, the duration's
 * startTime form.
 * @param {string} _id
 * @param {object} data
 * @returns {object}
 */
function effect(_id, data) {
  return {
    _id,
    name: data.name,
    img: data.img ?? "icons/svg/aura.svg",
    type: "base",
    system: {},
    changes: data.changes ?? [],
    disabled: false,
    duration: {
      startTime: 0,
      seconds: null,
      combat: null,
      rounds: null,
      turns: null,
      startRound: null,
      startTurn: null
    },
    description: "",
    origin: data.origin ?? null,
    tint: "#ffffff",
    transfer: data.transfer ?? false,
    statuses: data.statuses ?? [],
    sort: 0,
    flags: data.flags ?? {}
  };
}

/** A stance taken on the sheet (module/sheets/handlers/stance-handler.js, effect-templates.js). */
function sheetStance(_id, stanceType, status, name, icon, extra = {}) {
  return effect(_id, {
    name,
    img: `${ICONS}/${icon}`,
    statuses: [status],
    flags: { "l5r4-enhanced": { stanceType, description: `${name}`, ...extra } }
  });
}

/** A status toggled from the token HUD: core's fromStatusEffect, no system flags. */
function hudStatus(_id, status, name, icon) {
  return effect(_id, { name, img: `${ICONS}/${icon}`, statuses: [status] });
}

/** A Family or School Trait bonus effect a user made on the item (item-effects-handler.js). */
function traitBonus(_id, key, value) {
  return effect(_id, {
    name: "New",
    transfer: true,
    changes: [{ key, value: String(value), mode: 2, priority: null }]
  });
}

/** Flags 3.2.1 put on every new PC (module/documents/actor.js:156-169). */
function pcFlags(extra = {}) {
  return {
    "l5r4-enhanced": {
      xpManual: [],
      xpSpent: [],
      xpBase: 40,
      xpFreeTraitBase: {},
      traitDiscounts: {},
      migratedVersion: "3.2.1",
      ...extra
    }
  };
}

const npcFlags = () => ({ "l5r4-enhanced": { migratedVersion: "3.2.1" } });

/** An embedded or world Item. */
function item(_id, type, name, system = {}, extra = {}) {
  return { _id, type, name, system, effects: [], flags: {}, ...extra };
}

const skill = (_id, name, rank, trait, type, extra = {}) =>
  item(_id, "skill", name, { rank, trait, type, ...extra });

/** World items: one of every type 3.2.1 had, with the shapes its migrations still accepted. */
export const WORLD_ITEMS = [
  item("fxWiAdvantage001", "advantage", "Fixture Keen Eyes", { cost: 3, type: "physical" }),
  item("fxWiArmor0000001", "armor", "Fixture Lacquered Plate", {
    bonus: 10,
    reduction: 3,
    armorType: "heavy",
    keywords: ["heavy", "samurai"]
  }),
  item("fxWiBow000000001", "bow", "Fixture Half Bow", {
    damageRoll: 2,
    damageKeep: 2,
    str: 2,
    range: 250
  }),
  item("fxWiClan00000001", "clan", "Fixture Heron Clan"),
  item("fxWiCommonItem01", "commonItem", "Fixture Traveling Pack", {
    keywords: ["gear"]
  }),
  item("fxWiDisadvantg01", "disadvantage", "Fixture Bad Temper", { cost: 2, type: "mental" }),
  item(
    "fxWiFamily000001",
    "family",
    "Fixture Shiro Family",
    {},
    {
      effects: [traitBonus("fxWeFamilyBonus1", "system.traits.per", 1)]
    }
  ),
  item(
    "fxWiSchool000001",
    "school",
    "Fixture Lantern Bushi School",
    {},
    {
      effects: [traitBonus("fxWeSchoolBonus1", "system.traits.agi", 1)]
    }
  ),
  item("fxWiKata00000001", "kata", "Fixture Still Water Style", {
    ring: "water",
    mastery: 3,
    cost: 3
  }),
  item("fxWiKiho00000001", "kiho", "Fixture Falling Leaf", {
    ring: "air",
    mastery: 2,
    type: "martial",
    cost: 2
  }),
  // Pre-3.0 snake_case keys and an emphasis string, both still accepted by 3.2.1 (schema-map.js, emphasis.js)
  item("fxWiSkill0000001", "skill", "Fixture Brushwork", {
    rank: 2,
    trait: "awa",
    type: "high",
    emphasis: "Calligraphy, Painting",
    mastery_3: "",
    insight_bonus: 0
  }),
  item("fxWiSpell0000001", "spell", "Fixture Ember Call", {
    ring: "fire",
    mastery: 1,
    keywords: ["thunder", "fire"],
    maho: false
  }),
  item("fxWiTattoo000001", "tattoo", "Fixture Crane Ink", { effect: "" }),
  item("fxWiTechnique001", "technique", "Fixture Lantern Strike", { rank: 1 }),
  item("fxWiWeapon000001", "weapon", "Fixture Long Blade", {
    damageRoll: 3,
    damageKeep: 2,
    associatedSkill: "Kenjutsu",
    keywords: ["samurai", "sword"]
  }),
  item("fxWiMasterBlood1", "advantage", "Master of Blood", { cost: 4, type: "spiritual" })
].map(doc => ({
  ...doc,
  flags: { "l5r4-enhanced": { migratedVersion: "3.2.1" } }
}));

/** The five PCs. */
export const PCS = [
  {
    _id: "fxPcLantern00001",
    name: "Fixture Lantern Bushi",
    type: "pc",
    // A Family and School with Active Effect Trait bonuses; the free Family rank flagged for XP
    system: {
      traits: { sta: 3, wil: 2, str: 2, per: 2, ref: 3, awa: 2, agi: 3, int: 2 },
      rings: { void: { rank: 2, value: 2 } },
      xp: 14,
      clan: "Fixture Heron Clan",
      school: "Fixture Lantern Bushi School",
      honor: { rank: 5, points: 5 },
      glory: { rank: 1, points: 2 },
      suffered: 6,
      wealth: { koku: 3, bu: 2, zeni: 10 }
    },
    items: [
      item(
        "fxPiLanternFam01",
        "family",
        "Fixture Shiro Family",
        {},
        {
          effects: [traitBonus("fxPeLanternFam01", "system.traits.per", 1)]
        }
      ),
      item(
        "fxPiLanternSch01",
        "school",
        "Fixture Lantern Bushi School",
        {},
        {
          effects: [
            traitBonus("fxPeLanternSch01", "system.traits.agi", 1),
            traitBonus("fxPeLanternSch02", "system.rings.void.rank", 1)
          ]
        }
      ),
      skill("fxPiLanternKen01", "Kenjutsu", 3, "agi", "bugei", {
        trainedEmphases: ["Katana"],
        school: true,
        freeRanks: 1
      }),
      skill("fxPiLanternDef01", "Defense", 2, "ref", "bugei", { school: true, freeRanks: 1 }),
      item("fxPiLanternBld01", "weapon", "Fixture Long Blade", {
        damageRoll: 3,
        damageKeep: 2,
        associatedSkill: "Kenjutsu",
        keywords: ["samurai", "sword"]
      }),
      item("fxPiLanternArm01", "armor", "Fixture Light Plate", {
        bonus: 5,
        reduction: 1,
        equipped: true,
        armorType: "light"
      }),
      item("fxPiLanternAdv01", "advantage", "Fixture Keen Eyes", { cost: 3 })
    ],
    effects: [
      sheetStance(
        "fxPeLanternStnc1",
        "fullAttack",
        "fullAttackStance",
        "Full Attack Stance",
        "full-attack-stance.webp",
        {
          attackBonus: { roll: 2, keep: 1 }
        }
      )
    ],
    flags: pcFlags({
      familyItemUuid: "Actor.fxPcLantern00001.Item.fxPiLanternFam01",
      familyName: "Fixture Shiro Family",
      schoolItemUuid: "Actor.fxPcLantern00001.Item.fxPiLanternSch01",
      xpFreeTraitBase: { per: 1 },
      xpManual: [{ id: "fxXpManual000001", delta: 10, note: "Fixture session one", ts: NOW }],
      xpRetroactiveVersion: 123456,
      traitDiscounts: { ref: -1 },
      allowArmorStacking: false
    })
  },
  {
    _id: "fxPcFearful00001",
    name: "Fixture Fearful Courtier",
    type: "pc",
    // Conditions made every way 3.2.1 made them
    system: {
      traits: { sta: 2, wil: 3, str: 2, per: 3, ref: 2, awa: 3, agi: 2, int: 3 },
      honor: { rank: 3, points: 2 },
      shadowTaint: { rank: 0, points: 0 }
    },
    items: [
      skill("fxPiFearfulCou01", "Courtier", 3, "awa", "high", { trainedEmphases: ["Gossip"] }),
      skill("fxPiFearfulEtq01", "Etiquette", 2, "awa", "high")
    ],
    effects: [
      effect("fxPeFearfulFear1", {
        name: "Fear 3",
        img: `${ICONS}/fear.webp`,
        statuses: ["feared"],
        flags: { "l5r4-enhanced": { fearRank: 3 } }
      }),
      hudStatus("fxPeFearfulDaze1", "dazed", "Dazed", "dazed.webp"),
      effect("fxPeFearfulMnt01", {
        name: "Mounted/Higher",
        img: `${ICONS}/mounted.webp`,
        statuses: ["mounted"],
        flags: { "l5r4-enhanced": { conditionId: "mounted" } }
      })
    ],
    flags: pcFlags()
  },
  {
    _id: "fxPcOldShape0001",
    name: "Fixture Old Shape Monk",
    type: "pc",
    // Pre-3.0 keys 3.2.1 still read: snake_case fields, Traits stored as {rank}
    system: {
      traits: {
        sta: { rank: 3 },
        wil: { rank: 3 },
        str: { rank: 2 },
        per: { rank: 2 },
        ref: { rank: 2 },
        awa: { rank: 2 },
        agi: { rank: 2 },
        int: { rank: 2 }
      },
      armor_tn: { reduction: 0, current: 15, mod: 0 },
      shadow_taint: { rank: 0, points: 0 },
      initiative: { roll_mod: 1, keep_mod: 0, total_mod: 2 }
    },
    items: [
      skill("fxPiOldShapeMed1", "Meditation", 3, "void", "low", {
        emphasis: "Void Recovery; Fasting",
        mastery_3: "",
        insight_bonus: 0,
        roll_bonus: 0
      }),
      item("fxPiOldShapeBow1", "bow", "Fixture Half Bow", { damageRoll: 2, damageKeep: 2, str: 2 }),
      item("fxPiOldShapeKih1", "kiho", "Fixture Falling Leaf", {
        ring: "air",
        mastery: 2,
        type: "martial",
        cost: 2
      }),
      item("fxPiOldShapeArm1", "armor", "Fixture Old Robe", { equiped: true, specialRues: "" })
    ],
    effects: [],
    flags: pcFlags()
  },
  {
    _id: "fxPcLeftover0001",
    name: "Fixture Leftover Guard",
    type: "pc",
    // What 3.2.1's own migrations left behind (cleanup.js writes null), and a Full Defense with its stored roll
    system: {
      traits: { sta: 3, wil: 2, str: 3, per: 2, ref: 3, awa: 2, agi: 2, int: 2 },
      wound_lvl: null,
      armor_tn: null,
      shadow_taint: null,
      armor: null,
      wounds: { heal_rate: null },
      initiative: { roll_mod: null, keep_mod: null, total_mod: null, useVoid: true },
      armorTn: { useVoid: true, voidRound: 2 }
    },
    items: [skill("fxPiLeftoverDef1", "Defense", 3, "ref", "bugei")],
    effects: [
      sheetStance(
        "fxPeLeftoverStn1",
        "fullDefense",
        "fullDefenseStance",
        "Full Defense Stance",
        "full-defense-stance.webp"
      )
    ],
    flags: pcFlags({ fullDefenseRoll: { total: 23, formula: "5d10k3x10", timestamp: NOW } })
  },
  {
    _id: "fxPcShugenja0001",
    name: "Fixture Ember Shugenja",
    type: "pc",
    // A Family with the legacy trait/bonus fields instead of an effect; spells, a tattoo, a technique; Master of Blood
    system: {
      traits: { sta: 2, wil: 3, str: 2, per: 2, ref: 2, awa: 3, agi: 2, int: 3 },
      rings: { void: { rank: 3, value: 1 } },
      spellSlots: { water: 1, fire: 3, earth: 1, air: 2, void: 1 },
      insight: { rank: 1, points: 0, autoCalculate: true }
    },
    items: [
      item("fxPiShugenjaFam1", "family", "Fixture Ember Family", { trait: "int", bonus: 1 }),
      item("fxPiShugenjaSpl1", "spell", "Fixture Ember Call", {
        ring: "fire",
        mastery: 1,
        keywords: ["thunder", "fire"],
        memorized: true
      }),
      item("fxPiShugenjaSpl2", "spell", "Fixture Blood Whisper", {
        ring: "earth",
        mastery: 2,
        keywords: ["maho"],
        maho: true
      }),
      item("fxPiShugenjaTat1", "tattoo", "Fixture Crane Ink"),
      item("fxPiShugenjaTec1", "technique", "Fixture Ember Gift", {
        rank: 1,
        shugenja: true,
        affinity: "fire"
      }),
      item("fxPiShugenjaMoB1", "advantage", "Master of Blood", { cost: 4, type: "spiritual" }),
      skill("fxPiShugenjaSpc1", "Spellcraft", 3, "int", "high"),
      item("fxPiShugenjaKat1", "kata", "Fixture Still Water Style", {
        ring: "water",
        mastery: 3,
        cost: 3
      })
    ],
    effects: [
      hudStatus("fxPeShugenjaCon1", "concentration", "Concentration", "concentration.webp")
    ],
    flags: pcFlags({
      familyItemUuid: "Actor.fxPcShugenja0001.Item.fxPiShugenjaFam1",
      familyName: "Fixture Ember Family"
    })
  }
];

/** The five NPCs. */
export const NPCS = [
  {
    _id: "fxNpManual000001",
    name: "Fixture Manual Ronin",
    type: "npc",
    system: {
      traits: { sta: 3, wil: 2, str: 3, per: 2, ref: 3, awa: 2, agi: 3, int: 2 },
      attack1: { name: "Blade", roll: 6, keep: 3, modifier: 0, type: "melee" },
      damage1: { roll: 6, keep: 2, modifier: 0, type: "" },
      woundMode: "manual",
      nrWoundLvls: 3,
      suffered: 12
    },
    items: [],
    effects: [hudStatus("fxNeManualProne1", "prone", "Prone", "prone.webp")],
    flags: npcFlags()
  },
  {
    _id: "fxNpFormula00001",
    name: "Fixture Formula Bandit",
    type: "npc",
    system: {
      traits: { sta: 3, wil: 3, str: 2, per: 2, ref: 2, awa: 2, agi: 2, int: 2 },
      woundMode: "formula",
      woundsMultiplier: 2,
      woundsPenaltyMod: 0,
      woundsMod: 0
    },
    items: [],
    effects: [],
    flags: npcFlags()
  },
  {
    _id: "fxNpLegacyWnd001",
    name: "Fixture Legacy Wound Oni",
    type: "npc",
    // Pre-3.0 NPC wounds: wound_lvl with string and negative penalties (npc-wounds.js), Fear on the stat block
    system: {
      traits: { sta: 5, wil: 4, str: 5, per: 2, ref: 3, awa: 1, agi: 3, int: 1 },
      armor: { armor_tn: 25, reduction: 5 },
      wound_lvl: {
        healthy: { value: "20", penalty: "0" },
        nicked: { value: "40", penalty: "-5" },
        out: { value: "60", penalty: 40 }
      },
      fear: { rank: 3 }
    },
    items: [],
    effects: [
      effect("fxNeLegacyAutoP1", {
        name: "Auto: Prone",
        img: `${ICONS}/prone.webp`,
        statuses: ["prone"],
        flags: { "l5r4-enhanced": { autoApplied: true, appliedReason: "maxWounds" } }
      })
    ],
    flags: npcFlags()
  },
  {
    _id: "fxNpArmed0000001",
    name: "Fixture Armed Guard",
    type: "npc",
    system: {
      traits: { sta: 2, wil: 2, str: 3, per: 2, ref: 3, awa: 2, agi: 3, int: 2 },
      attack1: { name: "Spear", roll: 5, keep: 3, modifier: 0, type: "melee" },
      damage1: { roll: 5, keep: 2, modifier: 0, type: "" },
      attack2: { name: "Bow", roll: 4, keep: 2, modifier: 0, type: "ranged" },
      damage2: { roll: 4, keep: 2, modifier: 0, type: "" }
    },
    items: [
      item("fxNiArmedSpear01", "weapon", "Fixture Spear", {
        damageRoll: 2,
        damageKeep: 2,
        associatedSkill: "Spears"
      })
    ],
    effects: [
      sheetStance(
        "fxNeArmedAttack1",
        "attack",
        "attackStance",
        "Attack Stance",
        "attack-stance.webp"
      )
    ],
    flags: npcFlags()
  },
  {
    _id: "fxNpUnlinked0001",
    name: "Fixture Unlinked Bandit",
    type: "npc",
    // Placed unlinked on the scene; its token holds its own stance and Fear in the actor delta
    system: { traits: { sta: 2, wil: 2, str: 2, per: 2, ref: 3, awa: 2, agi: 2, int: 2 } },
    items: [],
    effects: [],
    flags: npcFlags(),
    prototypeToken: { actorLink: false }
  }
];

/** Tokens on the scene: a linked PC, an unlinked NPC whose delta carries effects and an item. */
export const TOKENS = [
  { _id: "fxTkLantern00001", actorId: "fxPcLantern00001", actorLink: true, x: 400, y: 400 },
  {
    _id: "fxTkUnlinked0001",
    actorId: "fxNpUnlinked0001",
    actorLink: false,
    x: 700,
    y: 400,
    delta: {
      items: [
        item("fxDiUnlinkedKnf1", "weapon", "Fixture Knife", { damageRoll: 1, damageKeep: 1 })
      ],
      effects: [
        sheetStance(
          "fxDeUnlinkedStn1",
          "defense",
          "defenseStance",
          "Defense Stance",
          "defence-stance.webp"
        ),
        effect("fxDeUnlinkedFer1", {
          name: "Fear 2",
          img: `${ICONS}/fear.webp`,
          statuses: ["feared"],
          flags: { "l5r4-enhanced": { fearRank: 2 } }
        })
      ]
    }
  },
  { _id: "fxTkArmed0000001", actorId: "fxNpArmed0000001", actorLink: true, x: 900, y: 400 }
];

/** 3.2.1 chat cards: an attack with its damage button and a damage card (templates/chat/*.hbs at v3.2.1). */
export const MESSAGES = [
  {
    _id: "fxMsAttack000001",
    speaker: {
      actor: "fxPcLantern00001",
      alias: "Fixture Lantern Bushi",
      scene: "fxScScene0000001",
      token: "fxTkLantern00001"
    },
    flavor: "",
    // The button carried the weapon's prepared dice, the wielder's Strength included: 3k2 + Strength 2
    // (simple-roll.js weaponData, weapon-roll.js)
    content:
      '<div class="chat-card l5r4-roll"><div class="dice-flavor">Fixture Long Blade Attack</div>' +
      '<div class="l5r4-tn-result">Success vs TN 15</div>' +
      '<button class="l5r4-damage-button" data-weapon-id="fxPiLanternBld01" data-actor-id="fxPcLantern00001" ' +
      'data-weapon-name="Fixture Long Blade" data-damage-roll="5" data-damage-keep="2" data-attack-raises="0" ' +
      'data-stance-roll="0" data-stance-keep="0">Damage Roll (Fixture Long Blade)</button></div>',
    flags: {
      "l5r4-enhanced": {
        attackRaises: 0,
        weaponId: "fxPiLanternBld01",
        targetActorId: "fxNpArmed0000001"
      }
    },
    rolls: [rollJson(6, 3, [9, 8, 7, 4, 2, 1], 24)]
  },
  {
    _id: "fxMsDamage000001",
    speaker: {
      actor: "fxPcLantern00001",
      alias: "Fixture Lantern Bushi",
      scene: "fxScScene0000001",
      token: "fxTkLantern00001"
    },
    flavor: "",
    content:
      '<div class="chat-card l5r4-roll l5r4-damage-roll"><div class="dice-flavor">Damage</div>' +
      '<div class="damage-actions flexrow -gap-sm">' +
      '<button type="button" class="apply-wounds-btn" data-action="apply-wounds" data-damage="14" ' +
      'data-actor-id="fxNpArmed0000001">Apply Wounds</button>' +
      '<button type="button" class="reduce-wounds-btn" data-action="reduce-wounds-void" data-damage="14" ' +
      'data-actor-id="fxNpArmed0000001">Reduce with Void</button></div></div>',
    flags: {},
    rolls: [rollJson(5, 2, [8, 6, 3, 2, 1], 14)]
  }
];

/**
 * A Roll as Foundry 13 serialized it on a message: one exploding XkY pool.
 * @returns {string}
 */
function rollJson(number, keep, results, total) {
  const kept = [...results].sort((a, b) => b - a).slice(0, keep);
  return JSON.stringify({
    class: "Roll",
    options: {},
    dice: [],
    formula: `${number}d10k${keep}x10`,
    terms: [
      {
        class: "Die",
        options: {},
        evaluated: true,
        number,
        faces: 10,
        modifiers: [`k${keep}`, "x10"],
        results: results.map(result => {
          const active = kept.includes(result) && kept.splice(kept.indexOf(result), 1);
          return active ? { result, active: true } : { result, active: false, discarded: true };
        })
      }
    ],
    total,
    evaluated: true
  });
}

/** A combat in its second round, as 3.2.1 left it (no system flags on combatants). */
export const COMBAT = {
  _id: "fxCbCombat000001",
  scene: "fxScScene0000001",
  active: true,
  round: 2,
  turn: 0,
  combatants: [
    {
      _id: "fxCtLantern00001",
      actorId: "fxPcLantern00001",
      tokenId: "fxTkLantern00001",
      sceneId: "fxScScene0000001",
      initiative: 27
    },
    {
      _id: "fxCtUnlinked0001",
      actorId: "fxNpUnlinked0001",
      tokenId: "fxTkUnlinked0001",
      sceneId: "fxScScene0000001",
      initiative: 18
    }
  ]
};

/** World settings 3.2.1 stored, values JSON-encoded as core stores them. */
export const SETTINGS = [
  ["l5r4-enhanced.lastMigratedVersion", "3.2.1"],
  ["l5r4-enhanced.runMigration", true],
  ["l5r4-enhanced.forceMigration", false],
  ["l5r4-enhanced.LtException", false],
  ["l5r4-enhanced.customEmphases", ["Fixture Gossip"]]
];

/** User flags 3.2.1 wrote for the GM (module/utils/sorting.js, section-state.js). */
export const GM_FLAGS = {
  "l5r4-enhanced": {
    sortByActor: { fxPcLantern00001: { skills: { key: "rank", dir: "desc" } } },
    collapsedSections: { fxPcLantern00001: { kata: true } }
  }
};
