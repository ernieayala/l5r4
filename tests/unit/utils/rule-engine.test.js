import { describe, expect, it } from "vitest";
import {
  addRuleRollOptions,
  bagEntries,
  derivedRuleOutputs,
  parseRulesJson,
  selectorBonus,
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

  it("ArmorTN: resolves each rule's value with its mode, type, and range for resolveArmorTn", () => {
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

  it("ArmorTN: the Defense Stance rule gives Air Ring plus Defense rank (Core Rulebook p.84)", () => {
    const [armor] = out([
      rule("ArmorTN", { value: "@rings.air + @skills.defense.rank", type: "untyped", mode: "add" })
    ]).armor;
    expect(armor.value).toBe(5);
  });

  it("formulas read the carrying effect's level as @level (Fear Rank, p.90)", () => {
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
    const [modifier] = derivedRuleOutputs([fear], rollData, new Set()).bag.rollModifiers.any;
    expect(modifier.roll).toBe(-3);
  });

  it("Movement adds Water Ring ranks for movement (Blinded, p.89)", () => {
    expect(out([rule("Movement", { water: -2 })]).movementWater).toBe(-2);
  });

  it("ConditionImmunity collects the statuses the actor cannot gain", () => {
    expect([...out([rule("ConditionImmunity", { condition: "feared" })]).immunities]).toEqual([
      "feared"
    ]);
  });

  it("PeriodicSave keeps the effect it ends; a save on an item has none and is skipped", () => {
    const save = rule("PeriodicSave", {
      event: "roundEnd",
      roll: "ring:earth",
      tn: 20,
      step: -5,
      min: 5,
      onFailure: "retry"
    });
    const result = derivedRuleOutputs(
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

  it("Resource adds the maxima of one slug", () => {
    const result = out([
      rule("Resource", { slug: "void", max: 1, per: "round" }),
      rule("Resource", { slug: "void", max: "@rings.earth - 1", per: "round" })
    ]);
    expect(result.resources).toEqual({ void: { max: 2, per: "round" } });
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

  it("RollModifier: fills the bag by selector, which selectorBonus stacks for a sheet formula", () => {
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
    expect(selectorBonus(result.bag, ["skill:kenjutsu"], options)).toEqual({
      roll: 2,
      keep: 1,
      total: 2
    });
    expect(selectorBonus(result.bag, ["skill:kenjutsu", "trait:ref"], options)).toEqual({
      roll: 2,
      keep: 2,
      total: 2
    });
    expect(selectorBonus(result.bag, ["ring:fire"], options)).toEqual({
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

  it("RollModifier: keeps its predicate in the bag, tested when a roll or sheet reads it", () => {
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
    expect(selectorBonus(result.bag, ["skill:kenjutsu"], new Set()).roll).toBe(0);
    expect(selectorBonus(result.bag, ["skill:kenjutsu"], new Set(["target"])).roll).toBe(1);
  });

  it("RollModifier: optional and range-limited modifiers wait for the dialog, not the sheet formula", () => {
    const base = {
      selector: "attack",
      keep: 0,
      total: 0,
      type: "untyped",
      optional: false,
      consumes: false
    };
    const result = derivedRuleOutputs(
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
    expect(selectorBonus(result.bag, ["attack"], new Set()).roll).toBe(2);
    const [, melee, centered, item] = result.bag.rollModifiers.attack;
    expect(melee.range).toBe("melee");
    expect(centered).toMatchObject({ optional: true, consumes: "E" });
    // An item's rule has no effect for `consumes` to end
    expect(item.consumes).toBeNull();
  });

  it("ApplyCondition fills its bag kind", () => {
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
  it("copies a status's rules, and none for a status without them", () => {
    expect(statusRules("defenseStance")).toEqual([
      { key: "ArmorTN", value: "@rings.air + @skills.defense.rank" }
    ]);
    expect(statusRules("mounted")[0]).toMatchObject({
      key: "RollModifier",
      selector: "attack",
      roll: 1
    });
    // Prone: -10 Armor TN against melee, -2k0 to attacks (p.89)
    expect(statusRules("prone")).toEqual([
      { key: "ArmorTN", value: -10, range: "melee" },
      { key: "RollModifier", selector: "attack", roll: -2 }
    ]);
    expect(statusRules("attackStance")).toEqual([]);
  });

  it("returns a copy, so editing it leaves the config alone", () => {
    statusRules("defenseStance")[0].value = 99;
    expect(statusRules("defenseStance")[0].value).toBe("@rings.air + @skills.defense.rank");
  });
});
