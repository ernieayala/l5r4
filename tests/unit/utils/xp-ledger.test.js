import { describe, expect, it, vi } from "vitest";
import { costPricer, xpEntries, xpTotals } from "../../../module/utils/xp-ledger.js";

/** Every Trait at the starting rank 2 (p.102), no bonus, no discount. */
const traits = (overrides = {}) =>
  ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"].map(key => ({
    key,
    stored: 2,
    freeBase: 0,
    bonus: 0,
    discount: 0,
    ...overrides[key]
  }));

/** A starting character: 40 XP (p.102), the Disadvantage cap 10 (p.145). */
const build = (extra = {}) => ({
  base: 40,
  manual: 0,
  disadvantageCap: 10,
  traits: traits(),
  void: { stored: 2, freeBase: 0, bonus: 0, discount: 0 },
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

describe("the book's character creation example (Core Rulebook pp.103-104)", () => {
  // Shiba Gyukaro: Shiba family +1 Perception, Shiba Bushi School +1 Agility, both TraitAdjust rules on the stored
  // rank 2. School Skills at rank 1 for free, Meditation with its free Emphasis, Iaijutsu as the chosen Skill.
  const gyukaro = build({
    traits: traits({ per: { bonus: 1 }, agi: { bonus: 1 }, ref: { stored: 3 } }),
    void: { stored: 3, freeBase: 0, bonus: 0, discount: 0 },
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

  it("has 46 XP and spends all of it", () => {
    const totals = xpTotals(gyukaro, xpEntries(gyukaro));
    expect(totals.total).toBe(46);
    expect(totals.spent).toBe(46);
    expect(totals.available).toBe(0);
  });

  it("prices each purchase as the example does", () => {
    const { breakdown } = xpTotals(gyukaro, xpEntries(gyukaro));
    expect(breakdown).toMatchObject({
      disadvantagesGranted: 6,
      void: 18, // Void 2 to 3: 3 × 6
      traits: 12, // Reflexes 2 to 3: 3 × 4
      skills: 11, // Kenjutsu 2 and 3, Kyujutsu 2, Iaijutsu 2, Defense 2
      advantages: 5
    });
  });

  it("lists every rank bought, in order", () => {
    const kenjutsu = xpEntries(gyukaro).filter(e => e.name === "Kenjutsu");
    expect(kenjutsu.map(e => [e.from, e.to, e.delta])).toEqual([
      [1, 2, 2],
      [2, 3, 3]
    ]);
  });
});

describe("xpEntries", () => {
  it("prices a Trait rank on top of its Family or School bonus (p.103)", () => {
    // Stored 3 with a +1 bonus: the Trait goes from 3 to 4, which costs 4 × 4
    const entries = xpEntries(build({ traits: traits({ str: { stored: 3, bonus: 1 } }) }));
    expect(entries).toEqual([{ type: "trait", name: "str", from: 2, to: 3, delta: 16 }]);
  });

  it("prices a Void rank on top of its Family or School bonus, as a Trait (p.103; #44)", () => {
    // Stored 3 with a +1 Void bonus: the Void Ring goes from 3 to 4, which costs 6 × 4
    const entries = xpEntries(build({ void: { stored: 3, freeBase: 0, bonus: 1, discount: 0 } }));
    expect(entries).toEqual([{ type: "void", name: "void", from: 2, to: 3, delta: 24 }]);
  });

  it("starts above a legacy free rank and then ignores the bonus", () => {
    const entries = xpEntries(
      build({ traits: traits({ str: { stored: 4, freeBase: 1, bonus: 1 } }) })
    );
    expect(entries.map(e => [e.to, e.delta])).toEqual([[4, 16]]);
  });

  it("applies a flat Trait discount, never below 0", () => {
    const entries = xpEntries(
      build({
        traits: traits({ ref: { stored: 3, discount: -2 }, agi: { stored: 3, discount: -20 } })
      })
    );
    expect(entries.map(e => [e.name, e.delta])).toEqual([
      ["ref", 10],
      ["agi", 0]
    ]);
  });

  it("charges paid Emphases 2 each, after the free ones", () => {
    const entries = xpEntries(
      build({
        skills: [skill("Kenjutsu", 1, { emphases: ["Katana", "Wakizashi"], freeEmphasis: 1 })]
      })
    );
    expect(entries).toEqual([
      { type: "emphasis", name: "Kenjutsu", emphasis: "Wakizashi", delta: 2 }
    ]);
  });

  it("charges kata, kiho, and memorized spells, and Disadvantages give XP", () => {
    const entries = xpEntries(
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

describe("xpTotals", () => {
  it("caps the XP Disadvantages give at the cap (p.145)", () => {
    const b = build({
      items: [item("disadvantage", "A", 8), item("disadvantage", "B", 5)],
      manual: 7
    });
    expect(xpTotals(b, xpEntries(b))).toMatchObject({ total: 57, spent: 0, available: 57 });
  });
});

describe("costPricer (Cost rules)", () => {
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
    costPricer({ costs, options, rollData: { rings: { air: 3 } } });

  it("sets a new price from @cost for the matching selector", () => {
    const price = pricer({ "trait:ref": [cost("trait:ref", "@cost - 2")] });
    const entries = xpEntries(build({ traits: traits({ ref: { stored: 3 } }) }), price);
    expect(entries[0].delta).toBe(10);
  });

  it("chains rules in order, each seeing the price before it", () => {
    const price = pricer({
      "item:advantage": [cost("item:advantage", "@cost * 2"), cost("item:advantage", "@cost - 1")]
    });
    expect(price(["item:advantage"], 3)).toBe(5);
  });

  it("prices `self` only for the item that carries the rule", () => {
    const price = pricer({ self: [cost("self", 1, { itemId: "Allies" })] });
    const entries = xpEntries(
      build({ items: [item("advantage", "Allies", 4), item("advantage", "Other", 4)] }),
      price
    );
    expect(entries.map(e => e.delta)).toEqual([1, 4]);
  });

  it("reaches Skills by name or type, and Emphases", () => {
    const price = pricer({
      "skill-type:high": [cost("skill-type:high", "@cost - 1")],
      emphasis: [cost("emphasis", 1)]
    });
    const entries = xpEntries(
      build({
        skills: [skill("Theology", 2, { type: "high", emphases: ["Shinsei"] })]
      }),
      price
    );
    expect(entries.map(e => e.delta)).toEqual([1, 1]);
  });

  it("tests each rule's predicate against the actor's options", () => {
    const rule = cost("item:advantage", "@cost - 1", { predicate: ["clan:crane"] });
    expect(pricer({ "item:advantage": [rule] })(["item:advantage"], 3)).toBe(3);
    expect(
      pricer({ "item:advantage": [rule] }, new Set(["clan:crane"]))(["item:advantage"], 3)
    ).toBe(2);
  });

  it("never prices below 0, and skips and reports a formula that fails", () => {
    const report = vi.fn();
    const price = costPricer({
      costs: { "ring:void": [cost("ring:void", "@cost - 100"), cost("ring:void", "bad(")] },
      options: new Set(),
      rollData: {},
      report
    });
    expect(price(["ring:void"], 18)).toBe(0);
    expect(report).toHaveBeenCalledWith("Source", expect.any(String));
  });
});
