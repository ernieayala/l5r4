import { describe, expect, it } from "vitest";
import { applyChoices, choiceSelections, hasOpenChoice } from "../../../module/utils/choices.js";

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

describe("hasOpenChoice", () => {
  it("finds a placeholder", () => {
    expect(hasOpenChoice("Item.{choice:skill}")).toBe(true);
    expect(hasOpenChoice("Item.abc")).toBe(false);
  });
});
