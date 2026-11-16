import { describe, expect, it } from "vitest";
import {
  getAnsweredRules,
  applyChoices,
  getChoiceSelections,
  hasOpenChoice
} from "../../../module/utils/choices.js";

describe("getChoiceSelections", () => {
  it("should read each ChoiceSet's selection by flag, and leave out open ones", () => {
    expect(
      getChoiceSelections([
        { key: "ChoiceSet", flag: "weapon", selection: "kenjutsu" },
        { key: "ChoiceSet", flag: "trait", selection: null },
        { key: "Note", flag: "nope", selection: "x" },
        null
      ])
    ).toEqual({ weapon: "kenjutsu" });
  });
});

describe("applyChoices", () => {
  it("should fill placeholders in every string of the other rules", () => {
    const [choice, raise, grant] = applyChoices([
      { key: "ChoiceSet", flag: "weapon", selection: "kenjutsu" },
      { key: "FreeRaise", selector: "skill:{choice:weapon}", value: 1 },
      { key: "GrantItem", uuid: "{choice:weapon}", predicate: ["skill:{choice:weapon}:3"] }
    ]);
    expect(choice.selection).toBe("kenjutsu");
    expect(raise.selector).toBe("skill:kenjutsu");
    expect(grant).toMatchObject({ uuid: "kenjutsu", predicate: ["skill:kenjutsu:3"] });
  });

  it("should leave a placeholder without a selection, and rules without choices untouched", () => {
    const rules = [{ key: "FreeRaise", selector: "skill:{choice:weapon}", value: 1 }];
    expect(applyChoices(rules)).toBe(rules);
    expect(
      applyChoices([
        { key: "ChoiceSet", flag: "other", selection: "a" },
        { key: "Note", selector: "{choice:weapon}", text: "t" }
      ])[1].selector
    ).toBe("{choice:weapon}");
  });
});

describe("getAnsweredRules", () => {
  it("should answer an open choice from its list or its options, and keep a choice already made", () => {
    const [, trait, , ring, , raise] = getAnsweredRules([
      { key: "ChoiceSet", flag: "trait", list: "traits", selection: null },
      { key: "TraitAdjust", trait: "{choice:trait}", value: -1 },
      { key: "ChoiceSet", flag: "ring", list: "rings" },
      { key: "RollOption", option: "blessing:{choice:ring}" },
      { key: "ChoiceSet", flag: "weapon", options: [{ value: "kenjutsu" }], selection: "kyujutsu" },
      { key: "FreeRaise", selector: "skill:{choice:weapon}", value: 1 }
    ]);
    expect(trait.trait).toBe("sta");
    expect(ring.option).toBe("blessing:air");
    expect(raise.selector).toBe("skill:kyujutsu");
  });

  it("should leave a skills choice open, its uuid being free text", () => {
    const [, grant] = getAnsweredRules([
      { key: "ChoiceSet", flag: "extra", list: "skills" },
      { key: "GrantItem", uuid: "{choice:extra}" }
    ]);
    expect(grant.uuid).toBe("{choice:extra}");
  });
});

describe("hasOpenChoice", () => {
  it("should find a placeholder", () => {
    expect(hasOpenChoice("Item.{choice:skill}")).toBe(true);
    expect(hasOpenChoice("Item.abc")).toBe(false);
  });
});
