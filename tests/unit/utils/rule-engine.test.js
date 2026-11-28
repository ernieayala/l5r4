import { describe, expect, it } from "vitest";
import {
  applyRollOptionRules,
  getDerivedRuleOutputs,
  getTraitAdjustTotal,
  getTraitAdjustments
} from "../../../module/utils/rule-engine.js";
import { getSelectorBonus } from "../../../module/utils/rule-bag.js";

/** A rule as its DataModel leaves it: every field present, defaults filled. */
const rule = (key, fields = {}) => ({ key, label: "", priority: 100, predicate: [], ...fields });
const entry = (r, source = "Source") => ({ rule: r, source });

const rollData = {
  rings: { air: 3, earth: 2 },
  skills: { defense: { rank: 2 } },
  honor: { rank: 4 }
};

// TraitAdjust rules
describe("getTraitAdjustments", () => {
  it("should sum numbers and formulas per Trait, the Void Ring included", () => {
    const { adjustments, errors } = getTraitAdjustments(
      [
        entry(rule("TraitAdjust", { trait: "str", value: 1 })),
        entry(rule("TraitAdjust", { trait: "str", value: "floor(@honor.rank / 2)" })),
        entry(rule("TraitAdjust", { trait: "void", value: 1 }))
      ],
      rollData,
      new Set()
    );
    expect(adjustments).toEqual({ str: 3, void: 1 });
    expect(errors).toEqual([]);
  });

  it("should skip a rule whose predicate fails and ignore other keys", () => {
    const { adjustments } = getTraitAdjustments(
      [
        entry(rule("TraitAdjust", { trait: "agi", value: 1, predicate: ["status:prone"] })),
        entry(rule("ArmorTN", { value: 5, type: "untyped" }))
      ],
      rollData,
      new Set()
    );
    expect(adjustments).toEqual({});
  });

  it("should report a formula that does not resolve and keep the other rules", () => {
    const { adjustments, errors } = getTraitAdjustments(
      [
        entry(rule("TraitAdjust", { trait: "str", value: "nope(1)" }), "Bad Family"),
        entry(rule("TraitAdjust", { trait: "str", value: 1 }))
      ],
      rollData,
      new Set()
    );
    expect(adjustments).toEqual({ str: 1 });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ source: "Bad Family", key: "TraitAdjust" });
  });
});

describe("getTraitAdjustTotal", () => {
  it("should sum numeric TraitAdjust values for one Trait", () => {
    const rules = [
      { key: "TraitAdjust", trait: "str", value: 1 },
      { key: "TraitAdjust", trait: "str", value: "2" },
      { key: "TraitAdjust", trait: "agi", value: 1 },
      { key: "RollModifier", trait: "str", value: 5 }
    ];
    expect(getTraitAdjustTotal(rules, "str")).toBe(3);
  });

  // #172
  it("should count a fractional value as whole ranks, rounded down", () => {
    expect(getTraitAdjustTotal([{ key: "TraitAdjust", trait: "str", value: 1.5 }], "str")).toBe(1);
  });

  it("should skip a formula and anything that is not a rule", () => {
    expect(
      getTraitAdjustTotal([{ key: "TraitAdjust", trait: "str", value: "@rings.air" }, null], "str")
    ).toBe(0);
    expect(getTraitAdjustTotal(undefined, "str")).toBe(0);
  });
});

// RollOption rules
describe("applyRollOptionRules", () => {
  it("should add an option, a toggle only when on, and let later predicates see earlier options", () => {
    const options = applyRollOptionRules(
      [
        entry(rule("RollOption", { option: "master-of-blood", toggleable: false, value: false })),
        entry(rule("RollOption", { option: "higher-ground", toggleable: true, value: false })),
        entry(rule("RollOption", { option: "flanking", toggleable: true, value: true })),
        entry(
          rule("RollOption", {
            option: "both",
            toggleable: false,
            value: false,
            predicate: ["flanking"]
          })
        )
      ],
      new Set()
    );
    expect([...options].sort()).toEqual(["both", "flanking", "master-of-blood"]);
  });
});

describe("getDerivedRuleOutputs", () => {
  const out = rules =>
    getDerivedRuleOutputs(
      rules.map(r => entry(r)),
      rollData,
      new Set(["status:defenseStance"])
    );

  it("should resolve each ArmorTN rule's value with its mode, type, and range for getArmorTn", () => {
    const result = out([
      rule("ArmorTN", {
        value: "@rings.air + @skills.defense.rank",
        type: "untyped",
        mode: "add",
        range: null
      }),
      rule("ArmorTN", { value: "@ref + 5", type: "untyped", mode: "base", range: null }),
      rule("ArmorTN", { value: -10, type: "untyped", mode: "add", range: "melee" })
    ]);
    expect(result.armor).toEqual([
      { mode: "add", value: 5, type: "untyped", range: null },
      { mode: "base", value: 5, type: "untyped", range: null },
      { mode: "add", value: -10, type: "untyped", range: "melee" }
    ]);
  });

  // game-rules/36_stances.md, p.84
  it("should give Air Ring plus Defense rank through the Defense Stance ArmorTN rule", () => {
    const [armor] = out([
      rule("ArmorTN", { value: "@rings.air + @skills.defense.rank", type: "untyped", mode: "add" })
    ]).armor;
    expect(armor.value).toBe(5);
  });

  // Fear Rank
  // game-rules/42_fear.md, p.90
  it("should read the carrying effect's level as @level in formulas", () => {
    const fear = {
      rule: rule("RollModifier", {
        selector: "any",
        roll: "-@level",
        keep: 0,
        total: 0,
        type: "untyped"
      }),
      source: "Feared",
      effectUuid: "Actor.a.ActiveEffect.f",
      level: 3
    };
    const [modifier] = getDerivedRuleOutputs([fear], rollData, new Set()).bag.rollModifiers.any;
    expect(modifier.roll).toBe(-3);
  });

  // #172: counts of dice, Raises, and ranks are whole; flat amounts are left as they come
  it("should round counts of dice, Raises, and ranks down", () => {
    const result = out([
      rule("RollModifier", {
        selector: "any",
        roll: "@rings.air / 2",
        keep: "-@rings.air / 2",
        total: "@rings.air / 2",
        type: "untyped"
      }),
      rule("FreeRaise", { selector: "any", value: "@rings.air / 2" }),
      rule("RaiseRule", { selector: "any", maneuver: null, cost: 0.5, cap: 1.5, minimum: 0 }),
      rule("UnskilledAs", { selector: "any", rank: 1.9 }),
      rule("Initiative", { roll: 1.5, keep: 1.5, total: 1.5 }),
      rule("Movement", { water: -1.5 })
    ]);
    const [modifier] = result.bag.rollModifiers.any;
    expect([modifier.roll, modifier.keep, modifier.total]).toEqual([1, -2, 1.5]);
    expect(result.bag.freeRaises.any[0].value).toBe(1);
    expect(result.bag.raiseRules.any[0]).toMatchObject({ cost: 0, cap: 1, minimum: 0 });
    expect(result.bag.unskilledAs.any[0].rank).toBe(1);
    expect(result.initiative).toEqual({ roll: 1, keep: 1, total: 1.5 });
    expect(result.movementWater).toBe(-2);
  });

  // #172
  it("should report a rule whose value is not a finite number and leave it out", () => {
    const result = out([
      rule("TNModifier", { selector: "any", value: "1/0", type: "untyped" }),
      rule("ArmorTN", { value: "0/0", type: "untyped", mode: "add", range: null })
    ]);
    expect(result.bag.tnModifiers.any).toBeUndefined();
    expect(result.armor).toEqual([]);
    expect(result.errors.map(e => e.key)).toEqual(["ArmorTN", "TNModifier"]);
  });

  // #172: a Cost or Ledger rule on an effect resolves later, and keeps the effect's level for it
  it("should carry the effect's level to Cost and Ledger rules", () => {
    const onEffect = r => ({
      rule: r,
      source: "Effect",
      effectUuid: "Actor.a.ActiveEffect.e",
      level: 2
    });
    const result = getDerivedRuleOutputs(
      [
        onEffect(rule("Cost", { selector: "emphasis", value: "@cost - @level" })),
        onEffect(rule("Ledger", { track: "honor", direction: "gain", value: "@points * @level" }))
      ],
      rollData,
      new Set()
    );
    expect(result.bag.costs.emphasis[0].level).toBe(2);
    expect(result.ledger[0].level).toBe(2);
  });

  // Blinded
  // game-rules/41_conditional_effects.md, p.89
  it("should add Water Ring ranks for movement through Movement", () => {
    expect(out([rule("Movement", { water: -2 })]).movementWater).toBe(-2);
  });

  it("should collect the statuses the actor cannot gain through ConditionImmunity", () => {
    expect([...out([rule("ConditionImmunity", { condition: "feared" })]).immunities]).toEqual([
      "feared"
    ]);
  });

  it("should keep the effect a PeriodicSave ends; a save on an item has none and is skipped", () => {
    const save = rule("PeriodicSave", {
      event: "roundEnd",
      roll: "ring:earth",
      tn: 20,
      step: -5,
      min: 5,
      onFailure: "retry"
    });
    const result = getDerivedRuleOutputs(
      [
        { rule: save, source: "Dazed", effectUuid: "Actor.a.ActiveEffect.d" },
        { rule: save, source: "Some item" }
      ],
      rollData,
      new Set()
    );
    expect(result.saves).toEqual([
      {
        effectUuid: "Actor.a.ActiveEffect.d",
        source: "Dazed",
        event: "roundEnd",
        roll: "ring:earth",
        tn: 20,
        step: -5,
        min: 5,
        onFailure: "retry"
      }
    ]);
  });

  it("should add the Resource maxima of one slug", () => {
    const result = out([
      rule("Resource", { slug: "void", max: 1, per: "round" }),
      rule("Resource", { slug: "void", max: "@rings.earth - 1", per: "round" })
    ]);
    expect(result.resources).toEqual({ void: { max: 2, per: "round" } });
  });

  it("should add up Reduction, Wounds, and Initiative", () => {
    const result = out([
      rule("Reduction", { value: 2 }),
      rule("Reduction", { value: 1 }),
      rule("Wounds", { perRank: "@rings.earth", penalty: -1 }),
      rule("Initiative", { roll: 1, keep: 0, total: 5 }),
      rule("Initiative", { roll: 0, keep: 1, total: 0 })
    ]);
    expect(result.reduction).toBe(3);
    expect(result.woundsPerRank).toBe(2);
    expect(result.woundPenalty).toBe(-1);
    expect(result.initiative).toEqual({ roll: 1, keep: 1, total: 5 });
  });

  it("should skip derived rules whose predicate fails", () => {
    const result = out([rule("Reduction", { value: 2, predicate: ["status:prone"] })]);
    expect(result.reduction).toBe(0);
  });

  it("should fill the RollModifier bag by selector, which getSelectorBonus stacks for a sheet formula", () => {
    const result = out([
      rule("RollModifier", {
        selector: "skill:kenjutsu",
        roll: 1,
        keep: 0,
        total: 0,
        type: "untyped"
      }),
      rule("RollModifier", {
        selector: "skill:kenjutsu",
        roll: 1,
        keep: 1,
        total: 2,
        type: "untyped"
      }),
      rule("RollModifier", { selector: "trait:ref", roll: 0, keep: 1, total: 0, type: "untyped" }),
      rule("RollModifier", { selector: "ring:fire", roll: 2, keep: 0, total: 0, type: "untyped" }),
      rule("RollModifier", { selector: "attack", roll: 1, keep: 0, total: 0, type: "untyped" })
    ]);
    const options = new Set();
    expect(getSelectorBonus(result.bag, ["skill:kenjutsu"], { options })).toEqual({
      roll: 2,
      keep: 1,
      total: 2
    });
    expect(getSelectorBonus(result.bag, ["skill:kenjutsu", "trait:ref"], { options })).toEqual({
      roll: 2,
      keep: 2,
      total: 2
    });
    expect(getSelectorBonus(result.bag, ["ring:fire"], { options })).toEqual({
      roll: 2,
      keep: 0,
      total: 0
    });
    expect(result.bag.rollModifiers["skill:kenjutsu"]).toHaveLength(2);
    expect(result.bag.rollModifiers.attack[0]).toMatchObject({
      roll: 1,
      keep: 0,
      total: 0,
      label: "Source"
    });
  });

  it("should keep a RollModifier's predicate in the bag, tested when a roll or sheet reads it", () => {
    const result = out([
      rule("RollModifier", {
        selector: "skill:kenjutsu",
        roll: 1,
        keep: 0,
        total: 0,
        type: "untyped",
        predicate: ["target"]
      })
    ]);
    expect(result.bag.rollModifiers["skill:kenjutsu"]).toHaveLength(1);
    expect(getSelectorBonus(result.bag, ["skill:kenjutsu"], { options: new Set() }).roll).toBe(0);
    expect(
      getSelectorBonus(result.bag, ["skill:kenjutsu"], { options: new Set(["target"]) }).roll
    ).toBe(1);
  });

  it("should hold optional and range-limited RollModifiers for the dialog, not the sheet formula", () => {
    const base = {
      selector: "attack",
      keep: 0,
      total: 0,
      type: "untyped",
      optional: false,
      consumes: false
    };
    const result = getDerivedRuleOutputs(
      [
        entry(rule("RollModifier", { ...base, roll: 2, range: null })),
        entry(rule("RollModifier", { ...base, roll: -1, range: "melee" })),
        {
          rule: rule("RollModifier", {
            ...base,
            roll: 1,
            optional: true,
            consumes: true,
            range: null
          }),
          source: "Centered",
          effectUuid: "E"
        },
        entry(
          rule("RollModifier", { ...base, roll: 1, optional: true, consumes: true, range: null }),
          "Item"
        )
      ],
      rollData,
      new Set()
    );
    expect(getSelectorBonus(result.bag, ["attack"], { options: new Set() }).roll).toBe(2);
    const [, melee, centered, item] = result.bag.rollModifiers.attack;
    expect(melee.range).toBe("melee");
    expect(centered).toMatchObject({ optional: true, consumes: "E" });
    // An item's rule has no effect for `consumes` to end
    expect(item.consumes).toBeNull();
  });

  it("should fill the ApplyCondition bag kind", () => {
    const result = out([
      rule("ApplyCondition", {
        selector: "attack",
        condition: "dazed",
        level: null,
        label: "Stunning Blow"
      })
    ]);
    expect(result.bag.applyConditions.attack[0]).toMatchObject({
      label: "Stunning Blow",
      condition: "dazed",
      level: null
    });
  });

  it("should fill the TNModifier, FreeRaise, DiceRule, Substitute, and Note bag kinds", () => {
    const result = out([
      rule("TNModifier", { selector: "spell", value: -5, type: "untyped", label: "Affinity" }),
      rule("FreeRaise", { selector: "skill:iaijutsu", value: "floor(@honor.rank / 2)" }),
      rule("DiceRule", { selector: "damage", explode: 9, rerollOnes: false }),
      rule("Substitute", { selector: "skill:kenjutsu", replace: "trait:agi", with: "trait:ref" }),
      rule("Note", { selector: "attack", text: "Strike first" })
    ]);
    expect(result.bag.tnModifiers.spell[0]).toMatchObject({
      value: -5,
      type: "untyped",
      label: "Affinity"
    });
    expect(result.bag.freeRaises["skill:iaijutsu"][0]).toMatchObject({ value: 2 });
    expect(result.bag.diceRules.damage[0]).toMatchObject({ explode: 9, rerollOnes: false });
    expect(result.bag.substitutes["skill:kenjutsu"][0]).toMatchObject({
      replace: "trait:agi",
      with: "trait:ref"
    });
    expect(result.bag.notes.attack[0]).toMatchObject({ text: "Strike first" });
  });

  // roadmap/STAGE-11
  it("should fill the OpponentModifier, RaiseRule, UnskilledAs, ActionCost, and Cost bag kinds", () => {
    const result = getDerivedRuleOutputs(
      [
        entry(
          rule("OpponentModifier", {
            selector: "attack",
            roll: -1,
            keep: 0,
            total: "@rings.air",
            type: "untyped",
            range: null
          })
        ),
        entry(
          rule("RaiseRule", {
            selector: "attack",
            maneuver: "feint",
            cost: -1,
            cap: 1,
            minimum: 0
          })
        ),
        entry(rule("UnskilledAs", { selector: "skill-type:bugei", rank: 1 })),
        entry(rule("ActionCost", { selector: "attack", action: "simple" })),
        {
          rule: rule("Cost", { selector: "self", value: "@cost - 1" }),
          source: "Allies",
          itemId: "I"
        }
      ],
      rollData,
      new Set()
    );
    expect(result.bag.opponentModifiers.attack[0]).toMatchObject({ roll: -1, total: 3 });
    expect(result.bag.raiseRules.attack[0]).toMatchObject({ maneuver: "feint", cost: -1, cap: 1 });
    expect(result.bag.unskilledAs["skill-type:bugei"][0]).toMatchObject({ rank: 1 });
    expect(result.bag.actionCosts.attack[0]).toMatchObject({ action: "simple" });
    // A Cost formula waits for the price it changes
    expect(result.bag.costs.self[0]).toMatchObject({ value: "@cost - 1", itemId: "I" });
  });

  it("should keep Ledger rules with their formulas for the change they size", () => {
    const result = out([
      rule("Ledger", { track: "honor", direction: "loss", value: "@points * 2" }),
      rule("Ledger", { track: "taint", direction: "gain", value: 0, predicate: ["status:prone"] })
    ]);
    expect(result.ledger).toEqual([
      { track: "honor", direction: "loss", value: "@points * 2", source: "Source" }
    ]);
  });

  it("should report a bad formula and leave its rule out", () => {
    const result = out([
      rule("Wounds", { perRank: 2, penalty: "bad(" }),
      rule("RollModifier", { selector: "attack", roll: "bad(", keep: 0, total: 0, type: "untyped" })
    ]);
    expect(result.woundsPerRank).toBe(0);
    expect(result.woundPenalty).toBe(0);
    expect(result.bag.rollModifiers).toEqual({});
    expect(result.errors.map(e => e.key)).toEqual(["Wounds", "RollModifier"]);
  });
});
