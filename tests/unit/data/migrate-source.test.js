import { describe, expect, it } from "vitest";
import {
  migrateArmorSource,
  migrateCommonActorSource,
  migrateKeywordsSource,
  migrateNpcSource,
  migratePcSource,
  migrateSkillSource
} from "../../../module/data/migrate-source.js";

describe("migrateCommonActorSource", () => {
  it("turns Traits stored as {rank} into numbers", () => {
    const source = { traits: { sta: { rank: 3 }, wil: 2, ref: { rank: 4 } } };
    migrateCommonActorSource(source);
    expect(source.traits).toEqual({ sta: 3, wil: 2, ref: 4 });
  });

  it("leaves a delta without traits alone", () => {
    const source = { suffered: 5 };
    migrateCommonActorSource(source);
    expect(source).toEqual({ suffered: 5 });
  });
});

describe("migratePcSource", () => {
  it("renames the pre-3.0 snake_case keys", () => {
    const source = {
      armor_tn: { mod: 2 },
      shadow_taint: { rank: 1, points: 3 },
      initiative: { roll_mod: 1, keep_mod: 2, total_mod: 3 }
    };
    migratePcSource(source);
    expect(source).toEqual({
      armorTn: { mod: 2 },
      shadowTaint: { rank: 1, points: 3 },
      initiative: { rollMod: 1, keepMod: 2, totalMod: 3 }
    });
  });

  it("drops 3.2.1's Void-on-Armor-TN marker, which is an effect now", () => {
    const source = { armorTn: { mod: 1, useVoid: true, voidRound: 3 } };
    migratePcSource(source);
    expect(source).toEqual({ armorTn: { mod: 1 } });
  });

  it("keeps an existing camelCase value over the legacy one, and drops the legacy key", () => {
    const source = { initiative: { rollMod: 5, roll_mod: 1 } };
    migratePcSource(source);
    expect(source).toEqual({ initiative: { rollMod: 5 } });
  });

  it("handles a delta holding only one legacy key", () => {
    const source = { shadow_taint: { points: 4 } };
    migratePcSource(source);
    expect(source).toEqual({ shadowTaint: { points: 4 } });
  });
});

describe("migrateNpcSource", () => {
  it("renames armor.armor_tn", () => {
    const source = { armor: { armor_tn: 25, reduction: 2 } };
    migrateNpcSource(source);
    expect(source.armor).toEqual({ armorTn: 25, reduction: 2 });
  });

  it("builds manualWoundLevels from wound_lvl with integer values, positive penalties, and active levels", () => {
    const source = {
      wound_lvl: {
        healthy: { value: "10", penalty: "0" },
        nicked: { value: 14, penalty: -3 },
        out: { value: 30, penalty: 40 }
      }
    };
    migrateNpcSource(source);
    expect(source.wound_lvl).toBeUndefined();
    expect(source.manualWoundLevels.healthy).toEqual({ value: 10, penalty: 0, active: true });
    expect(source.manualWoundLevels.nicked).toEqual({ value: 14, penalty: 3, active: true });
    expect(source.manualWoundLevels.grazed).toEqual({ value: 0, penalty: 0, active: false });
    expect(source.manualWoundLevels.out).toEqual({ value: 30, penalty: 40, active: true });
  });

  it("builds manualWoundLevels from a stored woundLevels when none exist", () => {
    const source = { woundLevels: { healthy: { value: 12, penalty: 0 } } };
    migrateNpcSource(source);
    expect(source.manualWoundLevels.healthy).toEqual({ value: 12, penalty: 0, active: true });
  });

  it("keeps existing manualWoundLevels when woundLevels is also stored", () => {
    const manual = { healthy: { value: 15, penalty: 0, active: true } };
    const source = {
      manualWoundLevels: manual,
      woundLevels: { healthy: { value: 99, penalty: 0 } }
    };
    migrateNpcSource(source);
    expect(source.manualWoundLevels).toBe(manual);
  });

  it("leaves a delta without wound data alone", () => {
    const source = { fear: { rank: 2 } };
    migrateNpcSource(source);
    expect(source).toEqual({ fear: { rank: 2 } });
  });
});

describe("migrateKeywordsSource", () => {
  it("joins a keywords array into the text the sheet edits", () => {
    const source = { keywords: ["Samurai", "Large"] };
    migrateKeywordsSource(source);
    expect(source.keywords).toBe("Samurai, Large");
  });

  it("turns the 3.2.1 default [] into an empty string", () => {
    const source = { keywords: [] };
    migrateKeywordsSource(source);
    expect(source.keywords).toBe("");
  });

  it("leaves keywords already stored as text alone", () => {
    const source = { keywords: "Peasant" };
    migrateKeywordsSource(source);
    expect(source.keywords).toBe("Peasant");
  });
});

describe("migrateSkillSource", () => {
  it("renames the pre-3.0 snake_case keys", () => {
    const source = {
      mastery_3: "a",
      mastery_5: "b",
      mastery_7: "c",
      insight_bonus: 1,
      roll_bonus: 2,
      keep_bonus: 3,
      total_bonus: 4
    };
    migrateSkillSource(source);
    expect(source).toEqual({
      mastery3: "a",
      mastery5: "b",
      mastery7: "c",
      insightBonus: 1,
      rollBonus: 2,
      keepBonus: 3,
      totalBonus: 4
    });
  });

  it("fills an empty-string target from the legacy key", () => {
    const source = { mastery3: "", mastery_3: "legacy" };
    migrateSkillSource(source);
    expect(source).toEqual({ mastery3: "legacy" });
  });
});

describe("migrateArmorSource", () => {
  it("renames equiped and specialRues", () => {
    const source = { equiped: true, specialRues: "text" };
    migrateArmorSource(source);
    expect(source).toEqual({ equipped: true, specialRules: "text" });
  });
});
