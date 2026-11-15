import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { xpEntries, xpTotals } from "../module/utils/xp-ledger.js";

/** A pack source's entry by name. */
const entry = (pack, name) => {
  const found = JSON.parse(readFileSync(`src/packs/${pack}.json`, "utf8")).entries.find(
    e => e.name === name
  );
  if (!found) {
    throw new Error(`${pack} has no entry ${name}`);
  }
  return found;
};

/** The name a pack reference names: "@entry[skills/Lore: Theology]" is "Lore: Theology". */
const referenced = uuid => uuid.match(/^@entry\[skills\/(.+)\]$/)?.[1];

/**
 * Shiba Gyukaro, the character the book's character creation example builds, from the pack entries: the Shiba
 * family and the Shiba Bushi School give their Trait bonuses and the School its Skills at rank 1 with Meditation's
 * Emphasis; the player picks Iaijutsu as the School's Bugei or High Skill, then spends XP as the example does.
 * game-rules/48_character_creation_expanded.md, p.103-104
 */
function gyukaro() {
  const family = entry("families", "Shiba");
  const school = entry("schools", "Shiba Bushi School");
  const bonus = {};
  for (const rule of [...family.system.rules, ...school.system.rules]) {
    if (rule.key === "TraitAdjust") {
      bonus[rule.trait] = (bonus[rule.trait] ?? 0) + rule.value;
    }
  }
  const grants = school.system.rules
    .filter(r => r.key === "GrantItem" && referenced(r.uuid))
    .map(r => ({
      name: referenced(r.uuid),
      emphasis: r.emphasis ?? "",
      skillRank: r.skillRank ?? 1
    }));
  grants.push({ name: "Iaijutsu", emphasis: "", skillRank: 1 });
  // The ranks the example buys: Kenjutsu to 3, Kyujutsu, Iaijutsu, and Defense to 2
  // game-rules/48_character_creation_expanded.md, p.104
  const bought = { Kenjutsu: 3, Kyujutsu: 2, Iaijutsu: 2, Defense: 2 };
  const item = (pack, name) => {
    const { type, system } = entry(pack, name);
    return { id: name, type, name, cost: system.cost };
  };
  return {
    base: 40,
    manual: 0,
    disadvantageCap: 10,
    traits: ["sta", "wil", "str", "per", "ref", "awa", "agi", "int"].map(key => ({
      key,
      stored: key === "ref" ? 3 : 2,
      freeBase: 0,
      bonus: bonus[key] ?? 0,
      discount: 0
    })),
    void: { stored: 3, freeBase: 0, bonus: 0, discount: 0 },
    skills: grants.map(grant => ({
      name: grant.name,
      type: entry("skills", grant.name).system.type,
      rank: bought[grant.name] ?? grant.skillRank,
      freeRanks: grant.skillRank,
      emphases: grant.emphasis ? [grant.emphasis] : [],
      freeEmphasis: grant.emphasis ? 1 : 0
    })),
    items: [
      item("disadvantages", "Doubt"),
      item("disadvantages", "Idealistic"),
      item("advantages", "Virtuous"),
      item("advantages", "Irreproachable")
    ]
  };
}

describe("Book example: character creation from the pack entries (p.103-104)", () => {
  it("should give the Shiba family's Perception and the Shiba Bushi School's Agility", () => {
    const { traits } = gyukaro();
    expect(traits.find(t => t.key === "per").bonus).toBe(1);
    expect(traits.find(t => t.key === "agi").bonus).toBe(1);
  });

  it("should have 46 XP and spend all of it, priced as the example does", () => {
    const build = gyukaro();
    const totals = xpTotals(build, xpEntries(build));
    expect(totals).toMatchObject({ total: 46, spent: 46, available: 0 });
    expect(totals.breakdown).toMatchObject({
      disadvantagesGranted: 6,
      void: 18,
      traits: 12,
      skills: 11,
      advantages: 5
    });
  });
});
