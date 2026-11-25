import { describe, expect, it, vi } from "vitest";
import { getCostPricer, getXpEntries, getXpTotals } from "../../../module/utils/xp-ledger.js";

/**
 * Every Trait at the starting rank 2, no bonus, no discount.
 * game-rules/48_character_creation_expanded.md, p.102
 */
const traits = (overrides = {}) =>
  ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"].map(key => ({
    key,
    stored: 2,
    freeBase: 0,
    bonus: 0,
    legacy: 0,
    discount: 0,
    ...overrides[key]
  }));

/**
 * A starting character: 40 XP, the Disadvantage cap 10.
 * game-rules/48_character_creation_expanded.md, p.102
 * game-rules/63_advantages_and_disadvantages.md, p.145
 */
const build = (extra = {}) => ({
  base: 40,
  manual: 0,
  disadvantageCap: 10,
  traits: traits(),
  void: { stored: 2, freeBase: 0, bonus: 0, legacy: 0, discount: 0 },
  skills: [],
  items: [],
  ...extra
});

const skill = (name, rank, extra = {}) => ({
  name,
  type: "bugei",
  rank,
  freeRanks: 1,
  emphases: [],
  freeEmphasis: 0,
  ...extra
});

const item = (type, name, cost) => ({ id: name, type, name, cost });

describe("Book example: character creation (p.103-104)", () => {
  // Shiba Gyukaro: Shiba family +1 Perception, Shiba Bushi School +1 Agility, both TraitAdjust rules on the stored
  // rank 2. School Skills at rank 1 for free, Meditation with its free Emphasis, Iaijutsu as the chosen Skill.
  const gyukaro = build({
    traits: traits({ per: { bonus: 1 }, agi: { bonus: 1 }, ref: { stored: 3 } }),
    void: { stored: 3, freeBase: 0, bonus: 0, legacy: 0, discount: 0 },
    skills: [
      skill("Defense", 2),
      skill("Kenjutsu", 3),
      skill("Kyujutsu", 2),
      skill("Meditation", 1, { emphases: ["Void Recovery"], freeEmphasis: 1 }),
      skill("Polearms", 1),
      skill("Theology", 1, { type: "high" }),
      skill("Iaijutsu", 2)
    ],
    items: [
      item("disadvantage", "Doubt", 4),
      item("disadvantage", "Idealistic", 2),
      item("advantage", "Virtuous", 3),
      item("advantage", "Irreproachable", 2)
    ]
  });

  it("should have 46 XP and spend all of it", () => {
    const totals = getXpTotals(gyukaro, getXpEntries(gyukaro));
    expect(totals.total).toBe(46);
    expect(totals.spent).toBe(46);
    expect(totals.available).toBe(0);
  });

  it("should price each purchase as the example does", () => {
    const { breakdown } = getXpTotals(gyukaro, getXpEntries(gyukaro));
    expect(breakdown).toMatchObject({
      disadvantagesGranted: 6,
      void: 18, // Void 2 to 3: 3 × 6
      traits: 12, // Reflexes 2 to 3: 3 × 4
      skills: 11, // Kenjutsu 2 and 3, Kyujutsu 2, Iaijutsu 2, Defense 2
      advantages: 5
    });
  });

  it("should list every rank bought, in order", () => {
    const kenjutsu = getXpEntries(gyukaro).filter(e => e.name === "Kenjutsu");
    expect(kenjutsu.map(e => [e.from, e.to, e.delta])).toEqual([
      [1, 2, 2],
      [2, 3, 3]
    ]);
  });
});

describe("getXpEntries", () => {
  // game-rules/48_character_creation_expanded.md, p.103
  it("should price and name a Trait rank on top of its Family or School bonus", () => {
    // Stored 3 with a +1 bonus: the Trait goes from 3 to 4, which costs 4 × 4
    const entries = getXpEntries(build({ traits: traits({ str: { stored: 3, bonus: 1 } }) }));
    expect(entries).toEqual([{ type: "trait", name: "str", from: 3, to: 4, delta: 16 }]);
  });

  // game-rules/48_character_creation_expanded.md, p.103
  // #44
  it("should price and name a Void rank on top of its Family or School bonus, as a Trait", () => {
    // Stored 3 with a +1 Void bonus: the Void Ring goes from 3 to 4, which costs 6 × 4
    const entries = getXpEntries(
      build({ void: { stored: 3, freeBase: 0, bonus: 1, legacy: 0, discount: 0 } })
    );
    expect(entries).toEqual([{ type: "void", name: "void", from: 3, to: 4, delta: 24 }]);
  });

  it("should start above a legacy free rank and then ignore the bonus", () => {
    const entries = getXpEntries(
      build({ traits: traits({ str: { stored: 4, freeBase: 1, bonus: 1, legacy: 1 } }) })
    );
    expect(entries.map(e => [e.to, e.delta])).toEqual([[4, 16]]);
  });

  // #154
  it("should keep a School rule's bonus beside a legacy free rank, for a Trait and the Void Ring", () => {
    const trait = { stored: 4, freeBase: 1, bonus: 2, legacy: 1 };
    const entries = getXpEntries(
      build({ traits: traits({ agi: trait }), void: { ...trait, discount: 0 } })
    );
    expect(entries).toEqual([
      { type: "trait", name: "agi", from: 4, to: 5, delta: 20 },
      { type: "void", name: "void", from: 4, to: 5, delta: 30 }
    ]);
  });

  it("should apply a flat Trait discount, never below 0", () => {
    const entries = getXpEntries(
      build({
        traits: traits({ ref: { stored: 3, discount: -2 }, agi: { stored: 3, discount: -20 } })
      })
    );
    expect(entries.map(e => [e.name, e.delta])).toEqual([
      ["ref", 10],
      ["agi", 0]
    ]);
  });

  it("should charge paid Emphases 2 each, after the free ones", () => {
    const entries = getXpEntries(
      build({
        skills: [skill("Kenjutsu", 1, { emphases: ["Katana", "Wakizashi"], freeEmphasis: 1 })]
      })
    );
    expect(entries).toEqual([
      { type: "emphasis", name: "Kenjutsu", emphasis: "Wakizashi", delta: 2 }
    ]);
  });

  it("should charge kata, kiho, and memorized spells, and give XP for Disadvantages", () => {
    const entries = getXpEntries(
      build({
        items: [
          item("kata", "Striking as Air", 3),
          item("kiho", "Air Fist", 2),
          item("spell", "Sense", 1),
          item("disadvantage", "Proud", 3)
        ]
      })
    );
    expect(entries.map(e => e.delta)).toEqual([3, 2, 1, -3]);
  });
});

describe("getXpTotals", () => {
  // game-rules/63_advantages_and_disadvantages.md, p.145
  it("should cap the XP Disadvantages give at the cap", () => {
    const b = build({
      items: [item("disadvantage", "A", 8), item("disadvantage", "B", 5)],
      manual: 7
    });
    expect(getXpTotals(b, getXpEntries(b))).toMatchObject({ total: 57, spent: 0, available: 57 });
  });
});

// #145
// game-rules/63_advantages_and_disadvantages.md, p.145
describe("Disadvantage XP past the cap", () => {
  const build = (costs, cap = 10) => ({
    base: 40,
    manual: 0,
    disadvantageCap: cap,
    traits: [],
    void: { stored: 2, freeBase: 0, bonus: 0, legacy: 0, discount: 0 },
    skills: [],
    items: costs.map((cost, i) => ({ id: `d${i}`, type: "disadvantage", name: `D${i}`, cost }))
  });

  it("should mark the XP each Disadvantage gives past the cap, in order", () => {
    const entries = getXpEntries(build([6, 8]));
    expect(entries.map(e => e.overCap)).toEqual([undefined, 4]);
    expect(getXpTotals(build([6, 8]), entries).breakdown.disadvantagesGranted).toBe(10);
  });

  it("should mark a whole Disadvantage once the cap is reached", () => {
    expect(getXpEntries(build([10, 3])).map(e => e.overCap)).toEqual([undefined, 3]);
  });

  it("should mark nothing at or under the cap", () => {
    expect(getXpEntries(build([4, 6])).some(e => e.overCap)).toBe(false);
  });
});

describe("XP spent past the total", () => {
  it("should give how far spending goes past the total, and 0 within it", () => {
    const traits = [{ key: "agi", stored: 5, freeBase: 0, bonus: 0, legacy: 0, discount: 0 }];
    const b = {
      base: 40,
      manual: 0,
      disadvantageCap: 10,
      traits,
      void: { stored: 2, freeBase: 0, bonus: 0, legacy: 0, discount: 0 },
      skills: [],
      items: []
    };
    // Agility 2 to 5 costs 12 + 16 + 20 = 48 against 40
    expect(getXpTotals(b, getXpEntries(b))).toMatchObject({ spent: 48, overspent: 8 });
    b.manual = 10;
    expect(getXpTotals(b, getXpEntries(b)).overspent).toBe(0);
  });
});

// Cost rules
describe("getCostPricer", () => {
  const cost = (selector, value, extra = {}) => ({
    label: "Rule",
    source: "Source",
    predicate: [],
    weaponId: null,
    itemId: null,
    selector,
    value,
    ...extra
  });
  const pricer = (costs, options = new Set()) =>
    getCostPricer({ costs, options, rollData: { rings: { air: 3 } } });

  it("should set a new price from @cost for the matching selector", () => {
    const price = pricer({ "trait:ref": [cost("trait:ref", "@cost - 2")] });
    const entries = getXpEntries(build({ traits: traits({ ref: { stored: 3 } }) }), price);
    expect(entries[0].delta).toBe(10);
  });

  it("should chain rules in order, each seeing the price before it", () => {
    const price = pricer({
      "item:advantage": [cost("item:advantage", "@cost * 2"), cost("item:advantage", "@cost - 1")]
    });
    expect(price(["item:advantage"], 3)).toBe(5);
  });

  it("should price `self` only for the item that carries the rule", () => {
    const price = pricer({ self: [cost("self", 1, { itemId: "Allies" })] });
    const entries = getXpEntries(
      build({ items: [item("advantage", "Allies", 4), item("advantage", "Other", 4)] }),
      price
    );
    expect(entries.map(e => e.delta)).toEqual([1, 4]);
  });

  // #174: an effect's `self` rule carries no item id, and a Trait's or Skill's price passes none
  it("should never price a Trait or Skill rank with a `self` rule that names no item", () => {
    const price = pricer({ self: [cost("self", "@cost * 0")] });
    expect(price(["trait:ref"], 16)).toBe(16);
    expect(price(["skill:kenjutsu"], 3, null)).toBe(3);
  });

  it("should reach Skills by name or type, and Emphases", () => {
    const price = pricer({
      "skill-type:high": [cost("skill-type:high", "@cost - 1")],
      emphasis: [cost("emphasis", 1)]
    });
    const entries = getXpEntries(
      build({
        skills: [skill("Theology", 2, { type: "high", emphases: ["Shinsei"] })]
      }),
      price
    );
    expect(entries.map(e => e.delta)).toEqual([1, 1]);
  });

  it("should test each rule's predicate against the actor's options", () => {
    const rule = cost("item:advantage", "@cost - 1", { predicate: ["clan:crane"] });
    expect(pricer({ "item:advantage": [rule] })(["item:advantage"], 3)).toBe(3);
    expect(
      pricer({ "item:advantage": [rule] }, new Set(["clan:crane"]))(["item:advantage"], 3)
    ).toBe(2);
  });

  it("should never price below 0, and skip and report a formula that fails", () => {
    const report = vi.fn();
    const price = getCostPricer({
      costs: { "ring:void": [cost("ring:void", "@cost - 100"), cost("ring:void", "bad(")] },
      options: new Set(),
      rollData: {},
      report
    });
    expect(price(["ring:void"], 18)).toBe(0);
    expect(report).toHaveBeenCalledWith("Source", expect.any(String));
  });
});
