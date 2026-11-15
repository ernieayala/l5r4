import { describe, expect, it } from "vitest";
import {
  answeredRules,
  applyChoices,
  choiceSelections,
  hasOpenChoice
} from "../../../module/utils/choices.js";

describe("choiceSelections", () => {
  it("reads each ChoiceSet's selection by flag, and leaves out open ones", () => {
    expect(
      choiceSelections([
        { key: "ChoiceSet", flag: "weapon", selection: "kenjutsu" },
        { key: "ChoiceSet", flag: "trait", selection: null },
        { key: "Note", flag: "nope", selection: "x" },
        null
      ])
    ).toEqual({ weapon: "kenjutsu" });
  });
});

describe("applyChoices", () => {
  it("fills placeholders in every string of the other rules", () => {
    const [choice, raise, grant] = applyChoices([
      { key: "ChoiceSet", flag: "weapon", selection: "kenjutsu" },
      { key: "FreeRaise", selector: "skill:{choice:weapon}", value: 1 },
      { key: "GrantItem", uuid: "{choice:weapon}", predicate: ["skill:{choice:weapon}:3"] }
    ]);
    expect(choice.selection).toBe("kenjutsu");
    expect(raise.selector).toBe("skill:kenjutsu");
    expect(grant).toMatchObject({ uuid: "kenjutsu", predicate: ["skill:kenjutsu:3"] });
  });

  it("leaves a placeholder without a selection, and rules without choices untouched", () => {
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

describe("answeredRules", () => {
  it("answers an open choice from its list or its options, and keeps a choice already made", () => {
    const [, trait, , ring, , raise] = answeredRules([
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

  it("leaves a skills choice open, its uuid being free text", () => {
    const [, grant] = answeredRules([
      { key: "ChoiceSet", flag: "extra", list: "skills" },
      { key: "GrantItem", uuid: "{choice:extra}" }
    ]);
    expect(grant.uuid).toBe("{choice:extra}");
  });
});

describe("hasOpenChoice", () => {
  it("finds a placeholder", () => {
    expect(hasOpenChoice("Item.{choice:skill}")).toBe(true);
    expect(hasOpenChoice("Item.abc")).toBe(false);
  });
});
