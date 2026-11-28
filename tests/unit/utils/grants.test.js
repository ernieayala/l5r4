import { describe, expect, it } from "vitest";
import {
  buildGrantedSkill,
  getMissingSchoolSkills,
  getPendingGrants,
  buildUngrantedSkill
} from "../../../module/utils/grants.js";

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
  availableEmphases: [],
  trainedEmphases: [],
  freeEmphasis: 0,
  ...extra
});

describe("getPendingGrants", () => {
  // A School's Skills at once, its Techniques by School Rank
  // game-rules/48_character_creation_expanded.md, p.102
  // game-rules/49_improving_your_character.md, p.104
  // roadmap/STAGE-11 decision 2
  const school = [
    rule("Item.kenjutsu"),
    rule("Item.technique1", 1),
    rule("Item.technique2", 2),
    rule("Item.technique3", 3)
  ];

  it("should grant what the School Rank has reached and is not recorded", () => {
    expect(getPendingGrants(school, [], 1).map(r => r.uuid)).toEqual([
      "Item.kenjutsu",
      "Item.technique1"
    ]);
    const granted = [record("Item.kenjutsu"), record("Item.technique1")];
    expect(getPendingGrants(school, granted, 2).map(r => r.uuid)).toEqual(["Item.technique2"]);
  });

  it("should not grant again what the owner removed", () => {
    expect(getPendingGrants([rule("Item.a")], [record("Item.a", { itemId: null })], 5)).toEqual([]);
  });

  it("should wait for an open choice", () => {
    expect(getPendingGrants([rule("{choice:extra}")], [], 5)).toEqual([]);
  });
});

// game-rules/64_advantages.md, p.151
describe("getMissingSchoolSkills", () => {
  it("should list the School Skills the character has below rank 1, by name in any case", () => {
    const ranks = new Map([
      ["kenjutsu", 2],
      ["iaijutsu", 0]
    ]);
    expect(getMissingSchoolSkills(["Kenjutsu", "Iaijutsu", "Battle"], ranks)).toEqual([
      "Iaijutsu",
      "Battle"
    ]);
    expect(getMissingSchoolSkills(["KENJUTSU"], ranks)).toEqual([]);
  });
});

describe("buildGrantedSkill", () => {
  // game-rules/48_character_creation_expanded.md, p.102
  it("should make a Skill a School Skill with its free rank and Emphasis", () => {
    expect(buildGrantedSkill(skill(), rule("u", 0, { emphasis: "Void Recovery" }))).toEqual({
      update: {
        rank: 1,
        freeRanks: 1,
        school: true,
        availableEmphases: ["Void Recovery"],
        trainedEmphases: ["Void Recovery"],
        freeEmphasis: 1
      },
      record: {
        freeRanks: 1,
        emphasis: "Void Recovery",
        freeEmphasis: 1,
        rank: 1,
        grantEmphasis: "Void Recovery"
      }
    });
  });

  // #160: a grant gives a Skill at a rank; a second grant of it adds nothing (Ernie's ruling)
  // game-rules/48_character_creation_expanded.md, p.103
  it("should give a Skill granted twice no more free ranks or Emphases than it holds", () => {
    const once = buildGrantedSkill(skill(), rule("a", 0, { emphasis: "Void Recovery" })).update;
    const { update, record: rec } = buildGrantedSkill(
      once,
      rule("b", 0, { emphasis: "Void Recovery" })
    );
    expect(update).toMatchObject({ rank: 1, freeRanks: 1, freeEmphasis: 1 });
    expect(rec).toEqual({
      freeRanks: 0,
      emphasis: "",
      freeEmphasis: 0,
      rank: 1,
      grantEmphasis: "Void Recovery"
    });
  });

  it("should keep a higher rank, and not repeat an Emphasis already trained", () => {
    const { update, record: rec } = buildGrantedSkill(
      skill({ rank: 3, availableEmphases: ["Katana"], trainedEmphases: ["Katana"] }),
      rule("u", 0, { emphasis: "Katana" })
    );
    expect(update).toMatchObject({
      rank: 3,
      freeRanks: 1,
      availableEmphases: ["Katana"],
      trainedEmphases: ["Katana"]
    });
    expect(rec).toEqual({
      freeRanks: 1,
      emphasis: "",
      freeEmphasis: 1,
      rank: 1,
      grantEmphasis: "Katana"
    });
  });

  // #187: Lore: Theology granted to a Skill that does not list it
  it("should make a granted Emphasis available as well as trained", () => {
    const { update } = buildGrantedSkill(
      skill({ availableEmphases: ["Shugenja"] }),
      rule("u", 0, { emphasis: "Theology" })
    );
    expect(update.availableEmphases).toEqual(["Shugenja", "Theology"]);
    expect(update.trainedEmphases).toEqual(["Theology"]);
  });
});

// roadmap/STAGE-11 decision 7
describe("buildUngrantedSkill", () => {
  it("should delete a granted Skill nothing was bought on", () => {
    expect(buildUngrantedSkill(skill({ rank: 1, freeRanks: 1 }), record("u"))).toEqual({
      delete: true
    });
  });

  it("should keep a Skill with bought ranks, without the free rank", () => {
    expect(buildUngrantedSkill(skill({ rank: 3, freeRanks: 1 }), record("u"))).toEqual({
      update: { freeRanks: 0, school: false, trainedEmphases: [], freeEmphasis: 0 }
    });
  });

  it("should keep a Skill with a bought Emphasis, and take back the granted one", () => {
    const granted = skill({
      rank: 1,
      freeRanks: 1,
      trainedEmphases: ["Void Recovery", "Breath"],
      freeEmphasis: 1
    });
    expect(
      buildUngrantedSkill(granted, record("u", { emphasis: "Void Recovery", freeEmphasis: 1 }))
    ).toEqual({
      update: { freeRanks: 0, school: false, trainedEmphases: ["Breath"], freeEmphasis: 0 }
    });
  });

  it("should never delete a Skill the character had before the grant", () => {
    expect(
      buildUngrantedSkill(skill({ rank: 1, freeRanks: 1 }), record("u", { created: false }))
    ).toMatchObject({ update: { freeRanks: 0 } });
  });

  // #160: removing one of two givers keeps what the other grants
  it("should keep the Skill, its free rank, and its Emphasis another giver still grants", () => {
    const granted = skill({
      rank: 1,
      freeRanks: 1,
      trainedEmphases: ["Void Recovery"],
      freeEmphasis: 1
    });
    const first = record("a", { emphasis: "Void Recovery", freeEmphasis: 1, rank: 1 });
    const second = record("b", {
      created: false,
      freeRanks: 0,
      rank: 1,
      grantEmphasis: "Void Recovery"
    });
    expect(buildUngrantedSkill(granted, first, [second])).toEqual({
      update: {
        freeRanks: 1,
        school: true,
        trainedEmphases: ["Void Recovery"],
        freeEmphasis: 1
      }
    });
    expect(buildUngrantedSkill(granted, second, [first])).toEqual({
      update: {
        freeRanks: 1,
        school: true,
        trainedEmphases: ["Void Recovery"],
        freeEmphasis: 1
      }
    });
  });
});
