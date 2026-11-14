import { describe, expect, it } from "vitest";
import {
  allocateRaises,
  feintBonus,
  isDead,
  maneuverCost,
  voidReduction,
  woundsTaken
} from "../../../module/utils/damage.js";
import { calculateMeleeDamage } from "../../../module/documents/item/preparation/melee-damage.js";
import { calculateBowDamage } from "../../../module/documents/item/preparation/bow-damage.js";

const owner = str => ({ system: { traits: { str } } });

describe("weapon damage pools (pp.82, 198-199)", () => {
  it("a katana (3k2) with Strength 3 rolls 6k2", () => {
    expect(
      calculateMeleeDamage({ damageRoll: 3, damageKeep: 2 }, owner(3)).derivedDamageFormula
    ).toBe("6k2");
  });

  it("a yumi (Strength 3) with a Willow Leaf arrow (2k2) rolls 5k2", () => {
    expect(calculateBowDamage({ str: 3, arrow: "willow" }, owner(3)).derivedDamageFormula).toBe(
      "5k2"
    );
  });

  it("an archer weaker than the bow uses his own Strength", () => {
    expect(calculateBowDamage({ str: 4, arrow: "willow" }, owner(2)).derivedDamageFormula).toBe(
      "4k2"
    );
  });

  it("each arrow adds its own DR (Table 3.1)", () => {
    const pool = arrow => calculateBowDamage({ str: 3, arrow }, owner(3)).derivedDamageFormula;
    expect(pool("armor")).toBe("4k1");
    expect(pool("flesh")).toBe("5k3");
    expect(pool("humming")).toBe("3k1");
    expect(pool("rope")).toBe("4k1");
  });
});

describe("maneuverCost (pp.86-87)", () => {
  it("prices each maneuver", () => {
    expect(maneuverCost({ calledShot: 3 })).toBe(3);
    expect(maneuverCost({ disarm: true })).toBe(3);
    expect(maneuverCost({ extraAttack: true })).toBe(5);
    expect(maneuverCost({ feint: true })).toBe(2);
  });

  it("Knockdown costs 2 Raises against two legs and 4 against four", () => {
    expect(maneuverCost({ knockdown: true })).toBe(2);
    expect(maneuverCost({ knockdown: true, fourLegged: true })).toBe(4);
  });

  it("adds maneuvers together and caps a Called Shot at 4", () => {
    expect(maneuverCost({ feint: true, knockdown: true, calledShot: 9 })).toBe(8);
  });
});

describe("allocateRaises", () => {
  it("maneuvers spend unspent Free Raises first; declared Raises left over are Increased Damage", () => {
    expect(allocateRaises({ raises: 3, freeRaises: 1, cost: 2 })).toEqual({
      affordable: true,
      increasedDamage: 2
    });
  });

  it("declared Raises with no maneuver are all Increased Damage", () => {
    expect(allocateRaises({ raises: 2, freeRaises: 0, cost: 0 }).increasedDamage).toBe(2);
  });

  it("refuses maneuvers the Raises do not pay for", () => {
    expect(allocateRaises({ raises: 1, freeRaises: 0, cost: 2 }).affordable).toBe(false);
  });
});

describe("feintBonus (p.86; decision 2)", () => {
  it("is half the margin over the raised TN, rounded down", () => {
    expect(feintBonus(13, 3)).toBe(6);
  });

  it("is capped at five times the Insight Rank", () => {
    expect(feintBonus(40, 1)).toBe(5);
  });

  it("is never negative", () => {
    expect(feintBonus(-3, 2)).toBe(0);
  });
});

describe("woundsTaken (pp.198, 319-320; decision 3)", () => {
  const armor = value => [{ value, except: [] }];

  it("Light Armor (Reduction 3) turns 12 damage into 9 Wounds", () => {
    expect(woundsTaken({ damage: 12, defenses: { reduction: armor(3) } }).wounds).toBe(9);
  });

  it("an attack can ignore some Reduction", () => {
    expect(
      woundsTaken({ damage: 12, ignoreReduction: 2, defenses: { reduction: armor(3) } }).wounds
    ).toBe(11);
  });

  it("Reduction that does not apply to a damage source is skipped", () => {
    const reduction = [
      { value: 10, except: ["jade"] },
      { value: 5, except: [] }
    ];
    expect(woundsTaken({ damage: 20, defenses: { reduction } }).wounds).toBe(5);
    expect(woundsTaken({ damage: 20, tags: ["jade"], defenses: { reduction } }).wounds).toBe(15);
  });

  it("Spirit halves mundane damage after Reduction, rounded down", () => {
    const defenses = { reduction: armor(5), spirit: { harmedBy: ["jade", "crystal", "obsidian"] } };
    expect(woundsTaken({ damage: 20, defenses }).wounds).toBe(7);
    expect(woundsTaken({ damage: 20, tags: ["crystal"], defenses }).wounds).toBe(15);
  });

  it("Invulnerability leaves one Wound unless the source can hurt it", () => {
    const defenses = {
      reduction: armor(5),
      invulnerable: { harmedBy: ["jade", "crystal", "obsidian", "spell", "nemuranai"], only: [] }
    };
    expect(woundsTaken({ damage: 30, defenses })).toMatchObject({ wounds: 1, invulnerable: true });
    expect(woundsTaken({ damage: 30, tags: ["jade"], defenses }).wounds).toBe(25);
  });

  it("damage Reduction absorbs leaves no Wound, even on an Invulnerable creature", () => {
    const defenses = { reduction: armor(5), invulnerable: { harmedBy: [], only: [] } };
    expect(woundsTaken({ damage: 4, defenses }).wounds).toBe(0);
  });

  it("partial Invulnerability covers only its sources", () => {
    const defenses = { invulnerable: { harmedBy: [], only: ["arrow"] } };
    expect(woundsTaken({ damage: 12, tags: ["arrow"], defenses }).wounds).toBe(1);
    expect(woundsTaken({ damage: 12, defenses }).wounds).toBe(12);
  });
});

describe("voidReduction and isDead", () => {
  it("a Void Point takes back 10 Wounds, never more than were taken (p.78)", () => {
    expect(voidReduction(14)).toBe(10);
    expect(voidReduction(6)).toBe(6);
  });

  it("Wounds past Out kill (p.82)", () => {
    expect(isDead(38, 38)).toBe(false);
    expect(isDead(39, 38)).toBe(true);
  });
});
