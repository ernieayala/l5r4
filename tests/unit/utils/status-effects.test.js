/**
 * The status effects carry the book's numbers as rules: each is run through the rule engine and Armor TN resolution
 * the way a prepared actor runs it, and 3.2.1's stored effects get the same data.
 * game-rules/36_stances.md, p.84
 * game-rules/38_maneuvers.md, p.87
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/42_fear.md, p.90
 */
import { describe, expect, it } from "vitest";
import { STATUS_EFFECTS, SYSTEM_EFFECTS } from "../../../module/config/status-effects.js";
import {
  derivedRuleOutputs,
  selectorBonus,
  bagEntries
} from "../../../module/utils/rule-engine.js";
import { resolveArmorTn } from "../../../module/utils/effects.js";
import { stackModifiers } from "../../../module/utils/modifier-stacking.js";
import { statusEffectUpdate } from "../../../module/utils/status-data.js";

/** Fill a status rule's defaults the way its DataModel would. */
const DEFAULTS = {
  label: "",
  priority: 100,
  predicate: [],
  type: "untyped",
  mode: "add",
  range: null,
  roll: 0,
  keep: 0,
  total: 0,
  optional: false,
  consumes: false,
  step: 0,
  min: 5,
  onFailure: "retry"
};

/**
 * The derived outputs of one status at a level, for an actor with Reflexes 3, Air 3, Defense 2, Void 2.
 * @param {object} status
 * @param {number} [level]
 */
function run(status, level = status.system?.level) {
  const entries = (status.system?.rules ?? []).map(rule => ({
    rule: { ...DEFAULTS, ...rule },
    source: status.id,
    effectUuid: `Actor.a.ActiveEffect.${status.id}`,
    ...(level === undefined ? {} : { level })
  }));
  const rollData = {
    ref: 3,
    rings: { air: 3, void: { rank: 2 } },
    skills: { defense: { rank: 2 } }
  };
  return derivedRuleOutputs(entries, rollData, new Set());
}

const byId = id => STATUS_EFFECTS.find(s => s.id === id);
// Reflexes 3 (base 20), light armor +5
const armorTn = out =>
  resolveArmorTn({ base: 20, armor: 5, other: 0, rules: out.armor, stack: stackModifiers });

// game-rules/36_stances.md, p.84
describe("Stances", () => {
  it("should share the exclusive group", () => {
    const stances = STATUS_EFFECTS.filter(s => s.system?.group === "stance").map(s => s.id);
    expect(stances).toHaveLength(5);
  });

  // Full Attack allows no ranged attacks
  it("should give Full Attack +2k1 to melee attacks only, and Armor TN -10", () => {
    const out = run(byId("fullAttackStance"));
    expect(bagEntries(out.bag, "rollModifiers", ["attack"], new Set())).toMatchObject([
      { roll: 2, keep: 1, range: "melee" }
    ]);
    expect(armorTn(out).current).toBe(15);
  });

  it("should give Defense the Air Ring plus Defense rank to Armor TN", () => {
    expect(armorTn(run(byId("defenseStance"))).current).toBe(25 + 3 + 2);
  });

  // roadmap/STAGE-09 decision 7
  it("should give Center +1k1 plus the Void Ring on one roll next Round, offered unticked", () => {
    const [bonus] = run({ id: "centered", ...SYSTEM_EFFECTS.centered }).bag.rollModifiers.any;
    // Ticking it ends the effect that carries it
    expect(bonus).toMatchObject({
      roll: 1,
      keep: 1,
      total: 2,
      optional: true,
      consumes: "Actor.a.ActiveEffect.centered"
    });
  });
});

// game-rules/41_conditional_effects.md, p.89
describe("Conditions", () => {
  it("should give Blinded -3k3 ranged, -1k1 melee, base Armor TN Reflexes + 5, Water -2 to move", () => {
    const out = run(byId("blinded"));
    const attacks = bagEntries(out.bag, "rollModifiers", ["attack"], new Set());
    expect(attacks.map(a => [a.roll, a.keep, a.range])).toEqual([
      [-3, -3, "ranged"],
      [-1, -1, "melee"]
    ]);
    expect(armorTn(out).current).toBe(3 + 5 + 5);
    expect(out.movementWater).toBe(-2);
  });

  it("should give Dazed -3k0 except on damage; Earth save at TN 20, 5 lower per failure, never below 5", () => {
    const out = run(byId("dazed"));
    expect(selectorBonus(out.bag, ["any"], new Set(["check:skill"])).roll).toBe(-3);
    expect(selectorBonus(out.bag, ["any"], new Set(["check:damage"])).roll).toBe(0);
    expect(out.saves[0]).toMatchObject({
      event: "roundEnd",
      roll: "ring:earth",
      tn: 20,
      step: -5,
      min: 5
    });
  });

  // roadmap/STAGE-09 decision 3
  it("should set Stunned and Grappled to Armor TN 5 plus armor, nothing else", () => {
    expect(armorTn(run(byId("stunned"))).current).toBe(10);
    expect(armorTn(run(byId("grappled"))).current).toBe(10);
    expect(run(byId("stunned")).saves[0]).toMatchObject({ tn: 20, onFailure: "endNextRound" });
  });

  it("should give Prone -10 Armor TN in melee only, -2k0 to small and medium weapons, a large one noted", () => {
    const out = run(byId("prone"));
    expect(armorTn(out)).toMatchObject({ current: 25, vs: { melee: -10, ranged: 0 } });
    const medium = new Set(["weapon:size:medium"]);
    const large = new Set(["weapon:size:large"]);
    expect(selectorBonus(out.bag, ["attack"], medium).roll).toBe(-2);
    expect(selectorBonus(out.bag, ["attack"], large).roll).toBe(0);
    expect(bagEntries(out.bag, "notes", ["attack"], large)).toHaveLength(1);
    expect(bagEntries(out.bag, "notes", ["attack"], medium)).toHaveLength(0);
  });

  // Each roll takes the penalty once
  it("should give Fatigued and Fasting +5 TN per level on Skill, physical Trait, and Spell Casting Rolls", () => {
    for (const id of ["fatigued", "fasting"]) {
      const out = run(byId(id), 2);
      // The selectors and options the roll pipeline gives each kind of roll (collect.js)
      const tn = (selectors, kind) =>
        bagEntries(
          out.bag,
          "tnModifiers",
          ["any", kind, ...selectors],
          new Set([`check:${kind}`])
        ).map(e => e.value);
      expect(tn(["skill:kenjutsu", "trait:agi"], "skill")).toEqual([10]);
      expect(tn(["skill:kenjutsu", "trait:agi"], "attack")).toEqual([10]);
      expect(tn(["trait:str"], "trait")).toEqual([10]);
      expect(tn(["trait:int"], "trait")).toEqual([]);
      expect(tn(["ring:fire"], "spell")).toEqual([10]);
      expect(tn(["spell", "ring:earth"], "maho")).toEqual([10]);
    }
  });

  // game-rules/38_maneuvers.md, p.87
  it("should give Guarded +10 and Guarding -5 Armor TN until the guard's next Turn", () => {
    expect(armorTn(run(byId("guarded"))).current).toBe(35);
    expect(armorTn(run(byId("guarding"))).current).toBe(20);
    expect(byId("guarded").duration).toEqual({ value: 1, units: "rounds", expiry: "turnStart" });
  });
});

// game-rules/42_fear.md, p.90
describe("Fear", () => {
  it("should give -Xk0 to every roll at Fear Rank X, ending with the encounter", () => {
    expect(selectorBonus(run(byId("feared"), 3).bag, ["any"], new Set()).roll).toBe(-3);
    expect(byId("feared").duration).toEqual({ expiry: "encounterEnd" });
  });
});

// Effects 3.2.1 stored
describe("statusEffectUpdate", () => {
  it("should give a stance its rules and group", () => {
    const update = statusEffectUpdate({
      _id: "e1",
      statuses: ["fullAttackStance"],
      system: { rules: [], group: "", level: null }
    });
    expect(update).toMatchObject({ _id: "e1", "system.group": "stance" });
    expect(update["system.rules"]).toHaveLength(2);
  });

  it("should move a Fear effect's Rank from its flag to its level", () => {
    const update = statusEffectUpdate({
      _id: "e2",
      statuses: ["feared"],
      system: { rules: [], group: "", level: null },
      flags: { "l5r4-enhanced": { fearRank: 4 } }
    });
    expect(update["system.level"]).toBe(4);
  });

  it("should give a stored Fear effect its end with the encounter", () => {
    const update = statusEffectUpdate({
      _id: "e5",
      statuses: ["feared"],
      system: { rules: [], group: "", level: null },
      duration: { value: null, units: "seconds", expiry: null }
    });
    expect(update["duration.expiry"]).toBe("encounterEnd");
  });

  it("should leave out a timed duration, which needs a start the old effect does not have", () => {
    const update = statusEffectUpdate({
      _id: "e6",
      statuses: ["guarded"],
      system: { rules: [], group: "", level: null },
      duration: { value: null, units: "seconds", expiry: null }
    });
    expect(update).not.toHaveProperty(["duration.expiry"]);
  });

  it("should change nothing on an effect already up to date, or one with no known status", () => {
    const current = {
      _id: "e3",
      statuses: ["defenseStance"],
      system: { rules: [{ key: "ArmorTN", value: 1 }], group: "stance", level: null }
    };
    expect(statusEffectUpdate(current)).toBeNull();
    expect(statusEffectUpdate({ _id: "e4", statuses: [], system: {} })).toBeNull();
  });
});
