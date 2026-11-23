import { describe, expect, it } from "vitest";
import {
  getRaiseAllocation,
  getFeintBonus,
  isDead,
  getManeuverCost,
  canReduceWithVoid,
  getVoidReduction,
  getWoundsTaken
} from "../../../module/utils/damage.js";
import { getMeleeDamage } from "../../../module/documents/item/preparation/melee-damage.js";
import { getBowDamage } from "../../../module/documents/item/preparation/bow-damage.js";

const owner = str => ({ system: { traits: { str } } });

// game-rules/32_attack_and_defense.md, p.82
// game-rules/74_weapons.md, p.198-199
describe("Weapon damage pools", () => {
  it("should roll 6k2 for a 3k2 katana with Strength 3", () => {
    expect(
      getMeleeDamage({ damageRoll: 3, damageKeep: 2, addsStrength: true }, owner(3))
        .derivedDamageFormula
    ).toBe("6k2");
  });

  // game-rules/74_weapons.md, p.202
  it("should add no Strength to a 1k1 shuriken", () => {
    expect(
      getMeleeDamage({ damageRoll: 1, damageKeep: 1, addsStrength: false }, owner(3))
        .derivedDamageFormula
    ).toBe("1k1");
  });

  it("should roll 5k2 for a Strength 3 yumi with a 2k2 Willow Leaf arrow", () => {
    expect(getBowDamage({ str: 3, arrow: "willow" }, owner(3)).derivedDamageFormula).toBe("5k2");
  });

  it("should use the archer's own Strength when it is below the bow's", () => {
    expect(getBowDamage({ str: 4, arrow: "willow" }, owner(2)).derivedDamageFormula).toBe("4k2");
  });

  // Table 3.1
  // game-rules/74_weapons.md, p.199
  it("should add each arrow's own DR", () => {
    const pool = arrow => getBowDamage({ str: 3, arrow }, owner(3)).derivedDamageFormula;
    expect(pool("armor")).toBe("4k1");
    expect(pool("flesh")).toBe("5k3");
    expect(pool("humming")).toBe("3k1");
    expect(pool("rope")).toBe("4k1");
  });
});

// game-rules/38_maneuvers.md, p.86-87
describe("getManeuverCost", () => {
  it("should price each maneuver", () => {
    expect(getManeuverCost({ calledShot: 3 })).toBe(3);
    expect(getManeuverCost({ disarm: true })).toBe(3);
    expect(getManeuverCost({ extraAttack: true })).toBe(5);
    expect(getManeuverCost({ feint: true })).toBe(2);
  });

  it("should cost Knockdown 2 Raises against two legs and 4 against four", () => {
    expect(getManeuverCost({ knockdown: true })).toBe(2);
    expect(getManeuverCost({ knockdown: true, fourLegged: true })).toBe(4);
  });

  it("should add maneuvers together and cap a Called Shot at 4", () => {
    expect(getManeuverCost({ feint: true, knockdown: true, calledShot: 9 })).toBe(8);
  });

  // roadmap/STAGE-11
  it("should take a RaiseRule's change to a chosen maneuver's cost, never below 0", () => {
    expect(getManeuverCost({ feint: true, knockdown: true }, { feint: -1 })).toBe(3);
    expect(getManeuverCost({ disarm: true }, { disarm: -5 })).toBe(0);
    expect(getManeuverCost({ calledShot: 2 }, { calledShot: 1 })).toBe(3);
    // A change to a maneuver not chosen adds nothing
    expect(getManeuverCost({ feint: true }, { extraAttack: -2, calledShot: 3 })).toBe(2);
  });
});

describe("getRaiseAllocation", () => {
  it("should spend unspent Free Raises on maneuvers first, leftover declared Raises as Increased Damage", () => {
    expect(getRaiseAllocation({ raises: 3, freeRaises: 1, cost: 2 })).toEqual({
      affordable: true,
      increasedDamage: 2
    });
  });

  // game-rules/28_raises.md, p.79
  // #5
  it("should make all declared Raises with no maneuver Increased Damage", () => {
    expect(getRaiseAllocation({ raises: 2, freeRaises: 0, cost: 0 }).increasedDamage).toBe(2);
  });

  it("should refuse maneuvers the Raises do not pay for", () => {
    expect(getRaiseAllocation({ raises: 1, freeRaises: 0, cost: 2 }).affordable).toBe(false);
  });
});

// game-rules/38_maneuvers.md, p.86
// roadmap/STAGE-10 decision 2
describe("getFeintBonus", () => {
  it("should be half the margin over the raised TN, rounded down", () => {
    expect(getFeintBonus(13, 3)).toBe(6);
  });

  it("should be capped at five times the Insight Rank", () => {
    expect(getFeintBonus(40, 1)).toBe(5);
  });

  it("should never be negative", () => {
    expect(getFeintBonus(-3, 2)).toBe(0);
  });
});

// game-rules/73_armor.md, p.198
// game-rules/99_creatures.md, p.319-320
// roadmap/STAGE-10 decision 3
describe("getWoundsTaken", () => {
  const armor = value => [{ value, except: [] }];

  it("should turn 12 damage into 9 Wounds through Light Armor's Reduction 3", () => {
    expect(getWoundsTaken({ damage: 12, defenses: { reduction: armor(3) } }).wounds).toBe(9);
  });

  it("should let an attack ignore some Reduction", () => {
    expect(
      getWoundsTaken({ damage: 12, ignoreReduction: 2, defenses: { reduction: armor(3) } }).wounds
    ).toBe(11);
  });

  it("should skip Reduction that does not apply to a damage source", () => {
    const reduction = [
      { value: 10, except: ["jade"] },
      { value: 5, except: [] }
    ];
    expect(getWoundsTaken({ damage: 20, defenses: { reduction } }).wounds).toBe(5);
    expect(getWoundsTaken({ damage: 20, tags: ["jade"], defenses: { reduction } }).wounds).toBe(15);
  });

  it("should halve mundane damage to a Spirit after Reduction, rounded down", () => {
    const defenses = { reduction: armor(5), spirit: { harmedBy: ["jade", "crystal", "obsidian"] } };
    expect(getWoundsTaken({ damage: 20, defenses }).wounds).toBe(7);
    expect(getWoundsTaken({ damage: 20, tags: ["crystal"], defenses }).wounds).toBe(15);
  });

  it("should leave one Wound through Invulnerability unless the source can hurt it", () => {
    const defenses = {
      reduction: armor(5),
      invulnerable: { harmedBy: ["jade", "crystal", "obsidian", "spell", "nemuranai"], only: [] }
    };
    expect(getWoundsTaken({ damage: 30, defenses })).toMatchObject({
      wounds: 1,
      invulnerable: true
    });
    expect(getWoundsTaken({ damage: 30, tags: ["jade"], defenses }).wounds).toBe(25);
  });

  it("should leave no Wound from damage Reduction absorbs, even on an Invulnerable creature", () => {
    const defenses = { reduction: armor(5), invulnerable: { harmedBy: [], only: [] } };
    expect(getWoundsTaken({ damage: 4, defenses }).wounds).toBe(0);
  });

  it("should apply partial Invulnerability to its sources only", () => {
    const defenses = { invulnerable: { harmedBy: [], only: ["arrow"] } };
    expect(getWoundsTaken({ damage: 12, tags: ["arrow"], defenses }).wounds).toBe(1);
    expect(getWoundsTaken({ damage: 12, defenses }).wounds).toBe(12);
  });
});

describe("The getVoidReduction and isDead helpers", () => {
  // game-rules/25_rings_and_traits.md, p.78
  it("should take back 10 Wounds for a Void Point, never more than were taken", () => {
    expect(getVoidReduction(14)).toBe(10);
    expect(getVoidReduction(6)).toBe(6);
  });

  // game-rules/25_rings_and_traits.md, p.78
  it("should allow a Void Point on a result only once, before an undo, with a Void Point left", () => {
    const fresh = { voidSpent: false, undone: false };
    expect(canReduceWithVoid(fresh, 1)).toBe(true);
    expect(canReduceWithVoid(fresh, 0)).toBe(false);
    expect(canReduceWithVoid({ ...fresh, voidSpent: true }, 2)).toBe(false);
    expect(canReduceWithVoid({ ...fresh, undone: true }, 2)).toBe(false);
  });

  // game-rules/33_wounds.md, p.82
  it("should kill at Wounds past Out", () => {
    expect(isDead(38, 38)).toBe(false);
    expect(isDead(39, 38)).toBe(true);
  });
});
