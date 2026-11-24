import { describe, expect, it } from "vitest";
import { pluralKeyOf } from "../../../module/utils/localization.js";

const keyOf = category => `l5r4.system.migration.migrated.${category}`;

/** A game.i18n for one language whose files define the one and other leaves. */
const i18nFor = lang => ({
  pluralRules: new Intl.PluralRules(lang),
  has: key => [keyOf("one"), keyOf("other")].includes(key)
});

// docs/design-system/content/localization.md, Plurals
describe("pluralKeyOf", () => {
  it("should pick one for 1 and other for 2 in English", () => {
    expect(pluralKeyOf(i18nFor("en"), 1, keyOf)).toBe(keyOf("one"));
    expect(pluralKeyOf(i18nFor("en"), 2, keyOf)).toBe(keyOf("other"));
  });

  it("should read other for a category no lang file defines, such as Russian many", () => {
    expect(pluralKeyOf(i18nFor("ru"), 1, keyOf)).toBe(keyOf("one"));
    expect(pluralKeyOf(i18nFor("ru"), 5, keyOf)).toBe(keyOf("other"));
  });
});
