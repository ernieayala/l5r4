import { describe, expect, it } from "vitest";
import {
  openChoices,
  getUnmetPrerequisites,
  buildRulesWithSelections,
  getFixedGrantUuids,
  getUngrantedOptions
} from "../../../module/utils/purchase.js";

describe("getUnmetPrerequisites", () => {
  const kenjutsu3 = {
    key: "Prerequisite",
    label: "Kenjutsu 3",
    requires: [{ gte: ["skill:kenjutsu", 3] }]
  };

  it("should list the requirements the buyer's options do not meet", () => {
    expect(getUnmetPrerequisites([kenjutsu3], new Set(["skill:kenjutsu:2"]))).toEqual([
      { label: "Kenjutsu 3", requires: kenjutsu3.requires }
    ]);
    expect(getUnmetPrerequisites([kenjutsu3], new Set(["skill:kenjutsu:3"]))).toEqual([]);
  });

  it("should check a prerequisite only when its own predicate holds", () => {
    const forNonCrane = { ...kenjutsu3, predicate: [{ not: "clan:crane" }] };
    expect(getUnmetPrerequisites([forNonCrane], new Set(["clan:crane"]))).toEqual([]);
    expect(getUnmetPrerequisites([forNonCrane], new Set())).toHaveLength(1);
  });

  it("should combine requirements with or, and skip rules without a requires list", () => {
    const either = {
      key: "Prerequisite",
      requires: [{ or: ["school:kakita bushi", "school:bayushi bushi"] }]
    };
    expect(getUnmetPrerequisites([either], new Set(["school:kakita bushi"]))).toEqual([]);
    expect(
      getUnmetPrerequisites([{ key: "Prerequisite", requires: "nope" }, null], new Set())
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

// game-rules/48_character_creation_expanded.md, p.102
describe("The getFixedGrantUuids and getUngrantedOptions helpers", () => {
  const battle = "Compendium.l5r4-enhanced.skills.Item.battle";
  const kenjutsu = "Compendium.l5r4-enhanced.skills.Item.kenjutsu";
  const akodo = [
    { key: "GrantItem", uuid: battle, emphasis: "Mass Combat" },
    { key: "GrantItem", uuid: kenjutsu },
    { key: "ChoiceSet", flag: "extra", list: "skills" },
    { key: "GrantItem", uuid: "{choice:extra}" },
    { key: "TraitAdjust", trait: "per", value: 1 }
  ];

  it("should list the uuids an item grants whatever is chosen", () => {
    expect(getFixedGrantUuids(akodo)).toEqual([battle, kenjutsu]);
    expect(getFixedGrantUuids([{ key: "GrantItem" }, null])).toEqual([]);
  });

  it("should leave out of the skills list each Skill the item grants, by name in any pack or the world", () => {
    const options = [
      { value: battle, label: "Battle (Skills)", name: "Battle" },
      { value: "Item.worldbattle", label: "Battle", name: "Battle" },
      {
        value: "Compendium.l5r4-enhanced.skills.Item.iaijutsu",
        label: "Iaijutsu",
        name: "Iaijutsu"
      }
    ];
    expect(getUngrantedOptions(options, { uuids: [battle], names: ["Battle"] })).toEqual([
      options[2]
    ]);
  });

  it("should leave out of an item's own options each uuid it grants", () => {
    // Forest Killers grants Kenjutsu and lists it among its Weapon Skill options
    // game-rules/81_ronin.md, p.234
    const options = [
      { value: kenjutsu, label: "Kenjutsu" },
      { value: "Compendium.l5r4-enhanced.skills.Item.spears", label: "Spears" }
    ];
    expect(getUngrantedOptions(options, { uuids: [kenjutsu], names: ["Kenjutsu"] })).toEqual([
      options[1]
    ]);
  });
});

describe("buildRulesWithSelections", () => {
  it("should store selections by rule index in a copy", () => {
    const rules = [{ key: "ChoiceSet", flag: "a" }, { key: "Note" }];
    const chosen = buildRulesWithSelections(rules, { 0: "kenjutsu" });
    expect(chosen[0].selection).toBe("kenjutsu");
    expect(rules[0].selection).toBeUndefined();
    expect(chosen[1]).toBe(rules[1]);
  });
});
