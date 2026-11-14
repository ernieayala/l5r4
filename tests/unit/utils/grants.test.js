import { describe, expect, it } from "vitest";
import { grantSkill, pendingGrants, ungrantSkill } from "../../../module/utils/grants.js";

const rule = (uuid, rank = 0, extra = {}) => ({ uuid, rank, skillRank: 1, emphasis: "", ...extra });
const record = (uuid, extra = {}) => ({
  uuid,
  itemId: "i",
  created: true,
  freeRanks: 1,
  emphasis: "",
  freeEmphasis: 0,
  ...extra
});
const skill = (extra = {}) => ({
  rank: 0,
  freeRanks: 0,
  trainedEmphases: [],
  freeEmphasis: 0,
  ...extra
});

describe("pendingGrants", () => {
  // A School's Skills at once, its Techniques by School Rank (Core Rulebook pp.102, 104; STAGE-11 decision 2)
  const school = [
    rule("Item.kenjutsu"),
    rule("Item.technique1", 1),
    rule("Item.technique2", 2),
    rule("Item.technique3", 3)
  ];

  it("grants what the School Rank has reached and is not recorded", () => {
    expect(pendingGrants(school, [], 1).map(r => r.uuid)).toEqual([
      "Item.kenjutsu",
      "Item.technique1"
    ]);
    const granted = [record("Item.kenjutsu"), record("Item.technique1")];
    expect(pendingGrants(school, granted, 2).map(r => r.uuid)).toEqual(["Item.technique2"]);
  });

  it("does not grant again what the owner removed", () => {
    expect(pendingGrants([rule("Item.a")], [record("Item.a", { itemId: null })], 5)).toEqual([]);
  });

  it("waits for an open choice", () => {
    expect(pendingGrants([rule("{choice:extra}")], [], 5)).toEqual([]);
  });
});

describe("grantSkill", () => {
  it("makes a Skill a School Skill with its free rank and Emphasis (p.102)", () => {
    expect(grantSkill(skill(), rule("u", 0, { emphasis: "Void Recovery" }))).toEqual({
      update: {
        rank: 1,
        freeRanks: 1,
        school: true,
        trainedEmphases: ["Void Recovery"],
        freeEmphasis: 1
      },
      record: { freeRanks: 1, emphasis: "Void Recovery", freeEmphasis: 1 }
    });
  });

  it("keeps a higher rank, and does not repeat an Emphasis already trained", () => {
    const { update, record: rec } = grantSkill(
      skill({ rank: 3, trainedEmphases: ["Katana"] }),
      rule("u", 0, { emphasis: "Katana" })
    );
    expect(update).toMatchObject({ rank: 3, freeRanks: 1, trainedEmphases: ["Katana"] });
    expect(rec).toEqual({ freeRanks: 1, emphasis: "", freeEmphasis: 1 });
  });
});

describe("ungrantSkill (STAGE-11 decision 7)", () => {
  it("deletes a granted Skill nothing was bought on", () => {
    expect(ungrantSkill(skill({ rank: 1, freeRanks: 1 }), record("u"))).toEqual({ delete: true });
  });

  it("keeps a Skill with bought ranks, without the free rank", () => {
    expect(ungrantSkill(skill({ rank: 3, freeRanks: 1 }), record("u"))).toEqual({
      update: { freeRanks: 0, school: false, trainedEmphases: [], freeEmphasis: 0 }
    });
  });

  it("keeps a Skill with a bought Emphasis, and takes back the granted one", () => {
    const granted = skill({
      rank: 1,
      freeRanks: 1,
      trainedEmphases: ["Void Recovery", "Breath"],
      freeEmphasis: 1
    });
    expect(
      ungrantSkill(granted, record("u", { emphasis: "Void Recovery", freeEmphasis: 1 }))
    ).toEqual({
      update: { freeRanks: 0, school: false, trainedEmphases: ["Breath"], freeEmphasis: 0 }
    });
  });

  it("never deletes a Skill the character had before the grant", () => {
    expect(
      ungrantSkill(skill({ rank: 1, freeRanks: 1 }), record("u", { created: false }))
    ).toMatchObject({ update: { freeRanks: 0 } });
  });
});
