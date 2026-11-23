import { describe, expect, it } from "vitest";
import { LINK_PATTERN, parseLink } from "../../../module/utils/link-syntax.js";

describe("Check links in parseLink", () => {
  it("should read a Skill with a Trait and a TN", () => {
    expect(parseLink("Check", "skill=Kenjutsu|trait=agi|tn=20")).toEqual({
      ok: true,
      type: "Check",
      label: "",
      skill: "Kenjutsu",
      trait: "agi",
      ring: "",
      tn: 20
    });
  });

  it("should read a Trait alone, a Ring with a TN, and a label", () => {
    expect(parseLink("Check", "trait=ref")).toMatchObject({ ok: true, trait: "ref", tn: null });
    expect(parseLink("Check", "ring=water|tn=15", " Swim ")).toMatchObject({
      ok: true,
      ring: "water",
      tn: 15,
      label: "Swim"
    });
  });

  it("should let a Skill roll with the Void Ring, and a Skill name its own Trait", () => {
    expect(parseLink("Check", "skill=Meditation|trait=void")).toMatchObject({
      ok: true,
      trait: "void"
    });
    expect(parseLink("Check", "skill=Etiquette")).toMatchObject({ ok: true, trait: "" });
  });

  it("should reject an unknown Trait or Ring, both at once, nothing to roll, and a bad TN", () => {
    const error = params => parseLink("Check", params).error;
    expect(error("trait=luck")).toBe("l5r4.ui.links.errors.trait");
    expect(error("trait=void")).toBe("l5r4.ui.links.errors.trait");
    expect(error("ring=wood")).toBe("l5r4.ui.links.errors.ring");
    expect(error("trait=agi|ring=fire")).toBe("l5r4.ui.links.errors.traitAndRing");
    expect(error("skill=Kenjutsu|ring=fire")).toBe("l5r4.ui.links.errors.skillWithRing");
    expect(error("tn=20")).toBe("l5r4.ui.links.errors.nothingToRoll");
    for (const tn of ["0", "-5", "12.5", "abc", "1000"]) {
      expect(error(`trait=agi|tn=${tn}`), tn).toBe("l5r4.ui.links.errors.tn");
    }
    expect(error("trait=agi|speed=3")).toBe("l5r4.ui.links.errors.unknownKey");
    expect(error("agi")).toBe("l5r4.ui.links.errors.syntax");
  });
});

describe("Damage, condition, and Fear links in parseLink", () => {
  it("should read a Roll & Keep pool with an optional bonus", () => {
    expect(parseLink("Damage", "3k2")).toMatchObject({
      ok: true,
      pool: { roll: 3, keep: 2, bonus: 0 }
    });
    expect(parseLink("Damage", "6k2+5")).toMatchObject({ pool: { roll: 6, keep: 2, bonus: 5 } });
    expect(parseLink("Damage", "4k1-2")).toMatchObject({ pool: { roll: 4, keep: 1, bonus: -2 } });
  });

  it("should reject a pool that is not whole dice in range", () => {
    for (const pool of ["0k1", "3k0", "31k2", "3k", "2d10", "3.5k2", ""]) {
      expect(parseLink("Damage", pool).error, pool).toBe("l5r4.ui.links.errors.pool");
    }
  });

  it("should read a condition by its status id and reject another", () => {
    expect(parseLink("Condition", "dazed")).toMatchObject({ ok: true, condition: "dazed" });
    expect(parseLink("Condition", "Dazed").error).toBe("l5r4.ui.links.errors.condition");
    expect(parseLink("Condition", "sleepy").error).toBe("l5r4.ui.links.errors.condition");
  });

  // game-rules/42_fear.md, p.90
  it("should read a Fear Rank from 1 to 10 and reject one outside", () => {
    expect(parseLink("Fear", "2")).toMatchObject({ ok: true, rank: 2 });
    expect(parseLink("Fear", "10")).toMatchObject({ ok: true, rank: 10 });
    for (const rank of ["0", "11", "2.5", "two"]) {
      expect(parseLink("Fear", rank).error, rank).toBe("l5r4.ui.links.errors.fear");
    }
  });
});

describe("LINK_PATTERN", () => {
  it("should find each link and its label in text", () => {
    const text = "Roll @Check[trait=ref]{Dodge} then @Fear[3] and @Damage[2k2].";
    expect([...text.matchAll(LINK_PATTERN)].map(m => [m[1], m[2], m[3]])).toEqual([
      ["Check", "trait=ref", "Dodge"],
      ["Fear", "3", undefined],
      ["Damage", "2k2", undefined]
    ]);
  });
});
