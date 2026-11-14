/**
 * The status effects carry the book's numbers as rules (Core Rulebook pp.84, 88-90): each is run through the rule
 * engine and Armor TN resolution the way a prepared actor runs it, and 3.2.1's stored effects get the same data.
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

describe("stances (p.84)", () => {
  it("share the exclusive group", () => {
    const stances = STATUS_EFFECTS.filter(s => s.system?.group === "stance").map(s => s.id);
    expect(stances).toHaveLength(5);
  });

  it("Full Attack: +2k1 to attacks, Armor TN -10", () => {
    const out = run(byId("fullAttackStance"));
    expect(selectorBonus(out.bag, ["attack"], new Set())).toEqual({ roll: 2, keep: 1, total: 0 });
    expect(armorTn(out).current).toBe(15);
  });

  it("Defense: Air Ring plus Defense rank to Armor TN", () => {
    expect(armorTn(run(byId("defenseStance"))).current).toBe(25 + 3 + 2);
  });

  it("Center: next Round, +1k1 plus the Void Ring on one roll, offered unticked (decision 7)", () => {
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

describe("conditions (p.89)", () => {
  it("Blinded: -3k3 ranged and -1k1 melee attacks, base Armor TN Reflexes + 5, Water -2 for movement", () => {
    const out = run(byId("blinded"));
    const attacks = bagEntries(out.bag, "rollModifiers", ["attack"], new Set());
    expect(attacks.map(a => [a.roll, a.keep, a.range])).toEqual([
      [-3, -3, "ranged"],
      [-1, -1, "melee"]
    ]);
    expect(armorTn(out).current).toBe(3 + 5 + 5);
    expect(out.movementWater).toBe(-2);
  });

  it("Dazed: -3k0 to every roll; Earth save at TN 20, 5 lower per failure, never below 5", () => {
    const out = run(byId("dazed"));
    expect(selectorBonus(out.bag, ["any"], new Set()).roll).toBe(-3);
    expect(out.saves[0]).toMatchObject({
      event: "roundEnd",
      roll: "ring:earth",
      tn: 20,
      step: -5,
      min: 5
    });
  });

  it("Stunned and Grappled: Armor TN 5 plus armor, nothing else (decision 3)", () => {
    expect(armorTn(run(byId("stunned"))).current).toBe(10);
    expect(armorTn(run(byId("grappled"))).current).toBe(10);
    expect(run(byId("stunned")).saves[0]).toMatchObject({ tn: 20, onFailure: "endNextRound" });
  });

  it("Prone: -10 Armor TN against melee only, -2k0 to attacks", () => {
    const out = run(byId("prone"));
    expect(armorTn(out)).toMatchObject({ current: 25, vs: { melee: -10, ranged: 0 } });
    expect(selectorBonus(out.bag, ["attack"], new Set()).roll).toBe(-2);
  });

  it("Fatigued and Fasting: +5 TN per level on Skill, physical Trait, and Spell Casting Rolls, once each", () => {
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

  it("Guarded +10 and Guarding -5 Armor TN until the guard's next Turn (p.88)", () => {
    expect(armorTn(run(byId("guarded"))).current).toBe(35);
    expect(armorTn(run(byId("guarding"))).current).toBe(20);
    expect(byId("guarded").duration).toEqual({ value: 1, units: "rounds", expiry: "turnStart" });
  });
});

describe("Fear (p.90)", () => {
  it("-Xk0 to every roll at Fear Rank X, ending with the encounter", () => {
    expect(selectorBonus(run(byId("feared"), 3).bag, ["any"], new Set()).roll).toBe(-3);
    expect(byId("feared").duration).toEqual({ expiry: "encounterEnd" });
  });
});

describe("statusEffectUpdate (3.2.1 effects)", () => {
  it("gives a stance its rules and group", () => {
    const update = statusEffectUpdate({
      _id: "e1",
      statuses: ["fullAttackStance"],
      system: { rules: [], group: "", level: null }
    });
    expect(update).toMatchObject({ _id: "e1", "system.group": "stance" });
    expect(update["system.rules"]).toHaveLength(2);
  });

  it("moves a Fear effect's Rank from its flag to its level", () => {
    const update = statusEffectUpdate({
      _id: "e2",
      statuses: ["feared"],
      system: { rules: [], group: "", level: null },
      flags: { "l5r4-enhanced": { fearRank: 4 } }
    });
    expect(update["system.level"]).toBe(4);
  });

  it("changes nothing on an effect already up to date, or one with no known status", () => {
    const current = {
      _id: "e3",
      statuses: ["defenseStance"],
      system: { rules: [{ key: "ArmorTN", value: 1 }], group: "stance", level: null }
    };
    expect(statusEffectUpdate(current)).toBeNull();
    expect(statusEffectUpdate({ _id: "e4", statuses: [], system: {} })).toBeNull();
  });
});
