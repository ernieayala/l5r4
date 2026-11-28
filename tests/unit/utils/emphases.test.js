import { describe, expect, it } from "vitest";
import {
  buildEmphasisList,
  getChangedEmphases,
  getSkillEmphases
} from "../../../module/utils/emphases.js";

// #188: the GM's client checks a player's change against the list as it stands
describe("getChangedEmphases", () => {
  const list = ["Gossip", "Lore: Shadowlands"];

  it("should add a valid new name, trimmed, and refuse a taken or invalid one", () => {
    expect(getChangedEmphases(list, { kind: "add", name: " Défense " })).toEqual([
      ...list,
      "Défense"
    ]);
    expect(getChangedEmphases(list, { kind: "add", name: "Gossip" })).toBeNull();
    expect(getChangedEmphases(list, { kind: "add", name: "Bad@Name" })).toBeNull();
  });

  it("should rename or delete a listed name in place, and refuse one the list no longer holds", () => {
    expect(getChangedEmphases(list, { kind: "rename", name: "Gossip", newName: "Rumor" })).toEqual([
      "Rumor",
      "Lore: Shadowlands"
    ]);
    expect(getChangedEmphases(list, { kind: "delete", name: "Gossip" })).toEqual([
      "Lore: Shadowlands"
    ]);
    expect(getChangedEmphases(list, { kind: "delete", name: "Gone" })).toBeNull();
    expect(
      getChangedEmphases(list, { kind: "rename", name: "Gossip", newName: "Lore: Shadowlands" })
    ).toBeNull();
  });

  it("should refuse a change of no known kind", () => {
    expect(getChangedEmphases(list, { kind: "sort", name: "Gossip" })).toBeNull();
  });
});

// #187: a form offers every Emphasis the Skill holds, so saving it drops none
// game-rules/58_skills_overview.md, p.133
describe("getSkillEmphases", () => {
  it("should list the available Emphases, then each trained one not among them, once", () => {
    const system = {
      availableEmphases: ["Disease", "Antidotes", ""],
      trainedEmphases: ["Antidotes", "Fortunes"]
    };
    expect(getSkillEmphases(system)).toEqual(["Disease", "Antidotes", "Fortunes"]);
  });
});

describe("buildEmphasisList", () => {
  it("should keep the Skill's own Emphases outside the official and custom lists", () => {
    const list = buildEmphasisList({
      official: ["Disease", "Herbalism"],
      custom: ["Poisons"],
      skill: { availableEmphases: ["Antidotes", "Disease"], trainedEmphases: ["Non-Humans"] }
    });
    expect(list).toEqual([
      { name: "Antidotes", available: true, custom: false },
      { name: "Disease", available: true, custom: false },
      { name: "Herbalism", available: false, custom: false },
      { name: "Non-Humans", available: false, custom: false },
      { name: "Poisons", available: false, custom: true }
    ]);
  });
});
