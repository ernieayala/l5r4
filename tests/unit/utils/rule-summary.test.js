import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RULE_KEYS } from "../../../module/config/rule-keys.js";
import {
  poolText,
  ruleSummary,
  rulesSummary,
  selectorPhrase,
  signed,
  sourceCitation,
  SUMMARY_KEYS
} from "../../../module/utils/rule-summary.js";

const lang = JSON.parse(readFileSync("lang/en.json", "utf8"));

/** Whether a dotted key holds a string in lang/en.json. */
const hasKey = key => typeof key.split(".").reduce((node, part) => node?.[part], lang) === "string";

/** Every localization key a phrase uses, nested phrases included. */
const keysOf = phrase => [
  phrase.key,
  ...Object.values(phrase.data ?? {})
    .filter(value => value && typeof value === "object")
    .flatMap(keysOf)
];

/** One rule per key, with every optional field set, so each variant's key is used. */
const SAMPLES = [
  {
    key: "RollModifier",
    selector: "skill:kenjutsu",
    roll: 1,
    keep: 1,
    total: 5,
    range: "melee",
    optional: true
  },
  { key: "TNModifier", selector: "trait:ref", value: -5 },
  { key: "ArmorTN", value: 5, range: "ranged" },
  { key: "ArmorTN", value: 10, mode: "base" },
  { key: "ArmorTN", value: 5, mode: "total" },
  { key: "Reduction", value: 3 },
  { key: "Reduction", value: 10, except: ["jade"] },
  { key: "Wounds", perRank: 2, penalty: -1 },
  { key: "Initiative", roll: 1, keep: 0, total: 0 },
  { key: "FreeRaise", selector: "ring:fire", value: 1 },
  { key: "DiceRule", selector: "damage", explode: 9, rerollOnes: true },
  { key: "Substitute", selector: "skill", replace: "trait:agi", with: "trait:ref" },
  { key: "TraitAdjust", trait: "void", value: 1 },
  { key: "Note", selector: "attack", text: "Katana, Core Rulebook p.204" },
  { key: "RollOption", option: "higher-ground", toggleable: true },
  { key: "Movement", water: -2 },
  { key: "ApplyCondition", selector: "attack", condition: "dazed" },
  { key: "ConditionImmunity", condition: "fatigued" },
  { key: "PeriodicSave", roll: "ring:earth", tn: 20 },
  { key: "Resource", slug: "void", max: 2, per: "skirmish" },
  { key: "DamageSource", selector: "damage", tags: ["jade"], ignoreReduction: 5 },
  { key: "Invulnerability", harmedBy: ["jade", "crystal"] },
  { key: "Spirit", harmedBy: ["jade"] },
  { key: "OpponentModifier", selector: "attack", roll: -1, range: "melee" },
  { key: "RaiseRule", selector: "attack", maneuver: "feint", cost: -1, cap: 1, minimum: 1 },
  { key: "UnskilledAs", selector: "skill-type:low", rank: 1 },
  { key: "ActionCost", selector: "spell", action: "complex" },
  { key: "Cost", selector: "emphasis", value: "@cost - 1" },
  { key: "Cost", selector: "self", value: 2 },
  { key: "Cost", selector: "item:kata", value: 1 },
  { key: "Ledger", track: "glory", direction: "loss", value: "@points + 1" },
  { key: "Prerequisite", requires: ["skill:kenjutsu"], label: "Kenjutsu 1" },
  { key: "ChoiceSet", flag: "weapon", prompt: "Pick a weapon skill" },
  { key: "ChoiceSet", flag: "weapon", selection: "Kenjutsu" },
  { key: "GrantItem", uuid: "Compendium.l5r4-enhanced.skills.Item.abc", rank: 2 }
];

describe("ruleSummary", () => {
  it("should have a summary key for every rule key, each in lang/en.json", () => {
    for (const key of RULE_KEYS) {
      expect(SUMMARY_KEYS[key], key).toBe(`l5r4.ui.ruleSummary.${key}`);
      expect(hasKey(SUMMARY_KEYS[key]), key).toBe(true);
    }
  });

  it("should cover every rule key with a sample, and every key a sample uses is in lang/en.json", () => {
    expect(new Set(SAMPLES.map(rule => rule.key))).toEqual(new Set(RULE_KEYS));
    for (const rule of SAMPLES) {
      const keys = ruleSummary(rule).flatMap(keysOf);
      expect(keys.length, rule.key).toBeGreaterThan(0);
      for (const key of keys.filter(k => k.startsWith("l5r4."))) {
        expect(hasKey(key), `${rule.key}: ${key}`).toBe(true);
      }
    }
  });

  it("should write a modifier's pool and the rolls it names", () => {
    const [line, range, optional] = ruleSummary(SAMPLES[0]);
    expect(line).toEqual({
      key: "l5r4.ui.ruleSummary.RollModifier",
      data: {
        bonus: "+1k1+5",
        rolls: {
          key: "l5r4.ui.ruleSummary.selector.named",
          data: { name: { key: "l5r4.ui.ruleSummary.text", data: { text: "Kenjutsu" } } }
        }
      }
    });
    expect(range.key).toBe("l5r4.ui.ruleSummary.range.melee");
    expect(optional.key).toBe("l5r4.ui.ruleSummary.optional");
  });

  it("should say an ActionCost limited to one attack range is limited to it", () => {
    const rule = { key: "ActionCost", selector: "attack", action: "simple", range: "melee" };
    expect(ruleSummary(rule).map(line => line.key)).toEqual([
      "l5r4.ui.ruleSummary.ActionCost",
      "l5r4.ui.ruleSummary.range.melee"
    ]);
    expect(ruleSummary({ ...rule, range: null })).toHaveLength(1);
  });

  it("should name a Trait through its own key and a condition through its status name", () => {
    expect(selectorPhrase("trait:ref").data.name.key).toBe("l5r4.ui.mechanics.traits.ref");
    expect(ruleSummary(SAMPLES[16])[0].data.condition.key).toBe("EFFECT.dazed");
  });

  it("should name a granted item through the resolver it is given", () => {
    const [line] = ruleSummary(SAMPLES.at(-1), { itemName: () => "Kenjutsu" });
    expect(line.data).toEqual({ item: "Kenjutsu", rank: 2 });
  });

  it("should say when a rule has a predicate", () => {
    const [line] = ruleSummary({
      key: "RollModifier",
      selector: "attack",
      roll: 1,
      predicate: ["status:mounted"]
    });
    expect(line.key).toBe("l5r4.ui.ruleSummary.when");
    expect(line.data.when).toBe("status:mounted");
    expect(line.data.rule.key).toBe("l5r4.ui.ruleSummary.RollModifier");
  });

  it("should give a line, not an error, for an unknown or broken rule", () => {
    expect(ruleSummary({ key: "Nope" })).toEqual([
      { key: "l5r4.ui.ruleSummary.unknown", data: { key: "Nope" } }
    ]);
    expect(ruleSummary(null)[0].key).toBe("l5r4.ui.ruleSummary.unknown");
    expect(ruleSummary({ key: "TNModifier" })[0].data.value).toBe("+0");
  });

  it("should join the lines of a rule list, and take a missing list as none", () => {
    expect(rulesSummary([SAMPLES[1], SAMPLES[5]])).toHaveLength(2);
    expect(rulesSummary(undefined)).toEqual([]);
  });
});

describe("The signed and poolText helpers", () => {
  it("should sign numbers and keep formulas as written", () => {
    expect(signed(2)).toBe("+2");
    expect(signed(-1)).toBe("-1");
    expect(signed("@rings.air")).toBe("@rings.air");
  });

  it("should write a pool as dice and a flat bonus", () => {
    expect(poolText({ roll: 1 })).toBe("+1k0");
    expect(poolText({ keep: 1, total: 5 })).toBe("+0k1+5");
    expect(poolText({ total: -5 })).toBe("-5");
    expect(poolText({})).toBe("+0");
  });
});

describe("sourceCitation", () => {
  it("should cite the book and printed page", () => {
    expect(sourceCitation({ book: "core", page: 204 })).toEqual({
      key: "l5r4.ui.ruleSummary.citation",
      data: { book: { key: "l5r4.ui.sources.core", data: {} }, page: 204 }
    });
    expect(hasKey("l5r4.ui.sources.core")).toBe(true);
  });

  it("should be null for an item that cites nothing", () => {
    expect(sourceCitation({ book: "", page: 0 })).toBeNull();
    expect(sourceCitation({ book: "core", page: 0 })).toBeNull();
    expect(sourceCitation(undefined)).toBeNull();
  });
});
