import { describe, expect, it } from "vitest";
import {
  addRuleRollOptions,
  bagEntries,
  derivedRuleOutputs,
  parseRulesJson,
  statusRules,
  traitAdjustTotal,
  traitAdjustments
} from "../../../module/utils/rule-engine.js";

/** A rule as its DataModel leaves it: every field present, defaults filled. */
const rule = (key, fields = {}) => ({ key, label: "", priority: 100, predicate: [], ...fields });
const entry = (r, source = "Source") => ({ rule: r, source });

const rollData = {
  rings: { air: 3, earth: 2 },
  skills: { defense: { rank: 2 } },
  honor: { rank: 4 }
};

describe("traitAdjustments (TraitAdjust)", () => {
  it("sums numbers and formulas per Trait, the Void Ring included", () => {
    const { adjustments, errors } = traitAdjustments(
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

  it("skips a rule whose predicate fails and ignores other keys", () => {
    const { adjustments } = traitAdjustments(
      [
        entry(rule("TraitAdjust", { trait: "agi", value: 1, predicate: ["status:prone"] })),
        entry(rule("ArmorTN", { value: 5, type: "untyped" }))
      ],
      rollData,
      new Set()
    );
    expect(adjustments).toEqual({});
  });

  it("reports a formula that does not resolve and keeps the other rules", () => {
    const { adjustments, errors } = traitAdjustments(
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

describe("traitAdjustTotal", () => {
  it("sums numeric TraitAdjust values for one Trait", () => {
    const rules = [
      { key: "TraitAdjust", trait: "str", value: 1 },
      { key: "TraitAdjust", trait: "str", value: "2" },
      { key: "TraitAdjust", trait: "agi", value: 1 },
      { key: "RollModifier", trait: "str", value: 5 }
    ];
    expect(traitAdjustTotal(rules, "str")).toBe(3);
  });

  it("skips a formula and anything that is not a rule", () => {
    expect(
      traitAdjustTotal([{ key: "TraitAdjust", trait: "str", value: "@rings.air" }, null], "str")
    ).toBe(0);
    expect(traitAdjustTotal(undefined, "str")).toBe(0);
  });
});

describe("addRuleRollOptions (RollOption)", () => {
  it("adds an option, a toggle only when on, and lets later predicates see earlier options", () => {
    const options = addRuleRollOptions(
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

describe("derivedRuleOutputs", () => {
  const out = rules =>
    derivedRuleOutputs(
      rules.map(r => entry(r)),
      rollData,
      new Set(["status:defenseStance"])
    );

  it("ArmorTN: resolves formulas and stacks by type", () => {
    const result = out([
      rule("ArmorTN", { value: "@rings.air + @skills.defense.rank", type: "untyped" }),
      rule("ArmorTN", { value: 3, type: "armor" }),
      rule("ArmorTN", { value: 5, type: "armor" })
    ]);
    expect(result.armorTn).toBe(10);
  });

  it("ArmorTN: the Defense Stance rule gives Air Ring plus Defense rank (Core Rulebook p.84)", () => {
    expect(
      out([rule("ArmorTN", { value: "@rings.air + @skills.defense.rank", type: "untyped" })])
        .armorTn
    ).toBe(5);
  });

  it("Reduction, Wounds, and Initiative add up", () => {
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

  it("skips derived rules whose predicate fails", () => {
    const result = out([rule("Reduction", { value: 2, predicate: ["status:prone"] })]);
    expect(result.reduction).toBe(0);
  });

  it("RollModifier: fills the bag by selector and the skill, trait, and ring bonuses", () => {
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
    expect(result.bonuses).toEqual({
      skill: { kenjutsu: { roll: 2, keep: 1, total: 2 } },
      trait: { ref: { roll: 0, keep: 1, total: 0 } },
      ring: { fire: { roll: 2, keep: 0, total: 0 } }
    });
    expect(result.bag.rollModifiers["skill:kenjutsu"]).toHaveLength(2);
    expect(result.bag.rollModifiers.attack[0]).toMatchObject({
      roll: 1,
      keep: 0,
      total: 0,
      label: "Source"
    });
  });

  it("RollModifier: a predicate that fails now stays out of the bonuses but stays in the bag for rolls", () => {
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
    expect(result.bonuses).toEqual({});
    expect(result.bag.rollModifiers["skill:kenjutsu"]).toHaveLength(1);
  });

  it("TNModifier, FreeRaise, DiceRule, Substitute, and Note fill their bag kinds", () => {
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

  it("reports a bad formula and leaves its rule out", () => {
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

describe("bagEntries", () => {
  const bag = {
    rollModifiers: {
      attack: [
        { roll: 1, predicate: ["target", { not: "target:status:mounted" }] },
        { roll: 2, predicate: [] }
      ],
      damage: [{ roll: 5, predicate: [] }]
    }
  };

  it("returns the selectors' entries whose predicates hold", () => {
    expect(
      bagEntries(bag, "rollModifiers", ["attack"], new Set(["target"])).map(e => e.roll)
    ).toEqual([1, 2]);
    expect(
      bagEntries(
        bag,
        "rollModifiers",
        ["attack"],
        new Set(["target", "target:status:mounted"])
      ).map(e => e.roll)
    ).toEqual([2]);
    expect(bagEntries(bag, "rollModifiers", ["attack"], new Set()).map(e => e.roll)).toEqual([2]);
  });

  it("returns nothing for a missing kind, selector, or bag", () => {
    expect(bagEntries(bag, "notes", ["attack"], new Set())).toEqual([]);
    expect(bagEntries(bag, "rollModifiers", ["spell"], new Set())).toEqual([]);
    expect(bagEntries(undefined, "rollModifiers", ["attack"], new Set())).toEqual([]);
  });
});

describe("parseRulesJson", () => {
  it("parses a list of rules, and blank text as no rules", () => {
    expect(parseRulesJson('[{"key": "Note", "selector": "attack", "text": "Hi"}]')).toEqual({
      rules: [{ key: "Note", selector: "attack", text: "Hi" }]
    });
    expect(parseRulesJson("  ")).toEqual({ rules: [] });
  });

  it("reports text that is not JSON", () => {
    const { error, detail } = parseRulesJson("[{");
    expect(error).toBe("invalidJson");
    expect(detail).toBeTruthy();
  });

  it("reports JSON that is not a list of objects with a key", () => {
    expect(parseRulesJson('{"key": "Note"}')).toEqual({ error: "notList" });
    expect(parseRulesJson('[{"selector": "attack"}]')).toEqual({ error: "notList" });
    expect(parseRulesJson("[null]")).toEqual({ error: "notList" });
    expect(parseRulesJson("[[]]")).toEqual({ error: "notList" });
  });
});

describe("statusRules", () => {
  it("copies the Defense Stance and Mounted rules, and none for other statuses", () => {
    expect(statusRules("defenseStance")).toEqual([
      { key: "ArmorTN", value: "@rings.air + @skills.defense.rank" }
    ]);
    expect(statusRules("mounted")[0]).toMatchObject({
      key: "RollModifier",
      selector: "attack",
      roll: 1
    });
    expect(statusRules("prone")).toEqual([]);
  });

  it("returns a copy, so editing it leaves the config alone", () => {
    statusRules("defenseStance")[0].value = 99;
    expect(statusRules("defenseStance")[0].value).toBe("@rings.air + @skills.defense.rank");
  });
});
