import { describe, expect, it } from "vitest";
import { openChoices, unmetPrerequisites, withSelections } from "../../../module/utils/purchase.js";

describe("unmetPrerequisites", () => {
  const kenjutsu3 = {
    key: "Prerequisite",
    label: "Kenjutsu 3",
    requires: [{ gte: ["skill:kenjutsu", 3] }]
  };

  it("should list the requirements the buyer's options do not meet", () => {
    expect(unmetPrerequisites([kenjutsu3], new Set(["skill:kenjutsu:2"]))).toEqual([
      { label: "Kenjutsu 3", requires: kenjutsu3.requires }
    ]);
    expect(unmetPrerequisites([kenjutsu3], new Set(["skill:kenjutsu:3"]))).toEqual([]);
  });

  it("should check a prerequisite only when its own predicate holds", () => {
    const forNonCrane = { ...kenjutsu3, predicate: [{ not: "clan:crane" }] };
    expect(unmetPrerequisites([forNonCrane], new Set(["clan:crane"]))).toEqual([]);
    expect(unmetPrerequisites([forNonCrane], new Set())).toHaveLength(1);
  });

  it("should combine requirements with or, and skip rules without a requires list", () => {
    const either = {
      key: "Prerequisite",
      requires: [{ or: ["school:kakita bushi", "school:bayushi bushi"] }]
    };
    expect(unmetPrerequisites([either], new Set(["school:kakita bushi"]))).toEqual([]);
    expect(
      unmetPrerequisites([{ key: "Prerequisite", requires: "nope" }, null], new Set())
    ).toEqual([]);
  });
});

describe("openChoices", () => {
  it("should return ChoiceSets without a selection, with their index and checked options", () => {
    const rules = [
      { key: "Note", text: "x" },
      {
        key: "ChoiceSet",
        flag: "weapon",
        prompt: "Pick",
        options: [{ value: "kenjutsu", label: "Kenjutsu" }, { value: "" }, { value: "kyujutsu" }]
      },
      { key: "ChoiceSet", flag: "done", selection: "x" },
      { key: "ChoiceSet", flag: "skill", list: "skills", filter: ["bugei"] },
      { key: "ChoiceSet", flag: "bad", list: "nonsense" }
    ];
    expect(openChoices(rules)).toEqual([
      {
        index: 1,
        flag: "weapon",
        prompt: "Pick",
        options: [
          { value: "kenjutsu", label: "Kenjutsu" },
          { value: "kyujutsu", label: "kyujutsu" }
        ],
        list: null,
        filter: []
      },
      { index: 3, flag: "skill", prompt: "", options: [], list: "skills", filter: ["bugei"] },
      { index: 4, flag: "bad", prompt: "", options: [], list: null, filter: [] }
    ]);
  });
});

describe("withSelections", () => {
  it("should store selections by rule index in a copy", () => {
    const rules = [{ key: "ChoiceSet", flag: "a" }, { key: "Note" }];
    const chosen = withSelections(rules, { 0: "kenjutsu" });
    expect(chosen[0].selection).toBe("kenjutsu");
    expect(rules[0].selection).toBeUndefined();
    expect(chosen[1]).toBe(rules[1]);
  });
});
