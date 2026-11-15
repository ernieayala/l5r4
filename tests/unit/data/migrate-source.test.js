import { describe, expect, it } from "vitest";
import {
  migrateArmorSource,
  migrateCommonActorSource,
  migrateKeywordsSource,
  migrateNpcSource,
  migratePcSource,
  migrateSkillSource,
  migrateWeaponSource
} from "../../../module/data/migrate-source.js";

describe("migrateCommonActorSource", () => {
  it("should turn Traits stored as {rank} into numbers", () => {
    const source = { traits: { sta: { rank: 3 }, wil: 2, ref: { rank: 4 } } };
    migrateCommonActorSource(source);
    expect(source.traits).toEqual({ sta: 3, wil: 2, ref: 4 });
  });

  it("should leave a delta without traits alone", () => {
    const source = { suffered: 5 };
    migrateCommonActorSource(source);
    expect(source).toEqual({ suffered: 5 });
  });
});

describe("migratePcSource", () => {
  it("should rename the pre-3.0 snake_case keys", () => {
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

  // The marker 3.2.1 stored
  it("should drop the Void-on-Armor-TN marker, which is an effect now", () => {
    const source = { armorTn: { mod: 1, useVoid: true, voidRound: 3 } };
    migratePcSource(source);
    expect(source).toEqual({ armorTn: { mod: 1 } });
  });

  it("should keep an existing camelCase value over the legacy one, and drop the legacy key", () => {
    const source = { initiative: { rollMod: 5, roll_mod: 1 } };
    migratePcSource(source);
    expect(source).toEqual({ initiative: { rollMod: 5 } });
  });

  it("should handle a delta holding only one legacy key", () => {
    const source = { shadow_taint: { points: 4 } };
    migratePcSource(source);
    expect(source).toEqual({ shadowTaint: { points: 4 } });
  });
});

describe("migrateNpcSource", () => {
  it("should rename armor.armor_tn", () => {
    const source = { armor: { armor_tn: 25, reduction: 2 } };
    migrateNpcSource(source);
    expect(source.armor).toEqual({ armorTn: 25, reduction: 2 });
  });

  it("should build manualWoundLevels from wound_lvl: integer values, positive penalties, active levels", () => {
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

  it("should build manualWoundLevels from a stored woundLevels when none exist", () => {
    const source = { woundLevels: { healthy: { value: 12, penalty: 0 } } };
    migrateNpcSource(source);
    expect(source.manualWoundLevels.healthy).toEqual({ value: 12, penalty: 0, active: true });
  });

  it("should keep existing manualWoundLevels when woundLevels is also stored", () => {
    const manual = { healthy: { value: 15, penalty: 0, active: true } };
    const source = {
      manualWoundLevels: manual,
      woundLevels: { healthy: { value: 99, penalty: 0 } }
    };
    migrateNpcSource(source);
    expect(source.manualWoundLevels).toBe(manual);
  });

  it("should leave a delta without wound data alone", () => {
    const source = { fear: { rank: 2 } };
    migrateNpcSource(source);
    expect(source).toEqual({ fear: { rank: 2 } });
  });
});

describe("migrateKeywordsSource", () => {
  it("should join a keywords array into the text the sheet edits", () => {
    const source = { keywords: ["Samurai", "Large"] };
    migrateKeywordsSource(source);
    expect(source.keywords).toBe("Samurai, Large");
  });

  // The default 3.2.1 stored
  it("should turn the stored default [] into an empty string", () => {
    const source = { keywords: [] };
    migrateKeywordsSource(source);
    expect(source.keywords).toBe("");
  });

  it("should leave keywords already stored as text alone", () => {
    const source = { keywords: "Peasant" };
    migrateKeywordsSource(source);
    expect(source.keywords).toBe("Peasant");
  });
});

describe("migrateSkillSource", () => {
  it("should rename the pre-3.0 snake_case keys", () => {
    const source = {
      mastery_3: "a",
      mastery_5: "b",
      mastery_7: "c",
      roll_bonus: 2,
      keep_bonus: 3,
      total_bonus: 4
    };
    migrateSkillSource(source);
    expect(source).toEqual({
      mastery3: "a",
      mastery5: "b",
      mastery7: "c",
      rollBonus: 2,
      keepBonus: 3,
      totalBonus: 4
    });
  });

  // game-rules/49_improving_your_character.md, p.104
  // #75
  it("should drop the Insight bonus, which Insight never counted", () => {
    const legacy = { insight_bonus: 1, rank: 2 };
    migrateSkillSource(legacy);
    expect(legacy).toEqual({ rank: 2 });
    const current = { insightBonus: 3, rank: 2 };
    migrateSkillSource(current);
    expect(current).toEqual({ rank: 2 });
  });

  it("should fill an empty-string target from the legacy key", () => {
    const source = { mastery3: "", mastery_3: "legacy" };
    migrateSkillSource(source);
    expect(source).toEqual({ mastery3: "legacy" });
  });
});

describe("migrateArmorSource", () => {
  it("should rename equiped and specialRues", () => {
    const source = { equiped: true, specialRues: "text" };
    migrateArmorSource(source);
    expect(source).toEqual({ equipped: true, specialRules: "text" });
  });
});

describe("migrateWeaponSource", () => {
  // As 3.2.1 rolled it
  it("should read an unset or zero Explodes On as 10", () => {
    for (const explodesOn of [0, null, "", "x"]) {
      const source = { explodesOn };
      migrateWeaponSource(source);
      expect(source.explodesOn).toBe(10);
    }
  });

  // game-rules/26_special_dice_rules.md, p.77
  it("should keep Explodes On between 2 and 10, so a roll always ends", () => {
    const values = [1, 9, 9.4, 15].map(explodesOn => {
      const source = { explodesOn };
      migrateWeaponSource(source);
      return source.explodesOn;
    });
    expect(values).toEqual([2, 9, 9, 10]);
  });

  it("should leave a source without the field alone", () => {
    const source = { damageRoll: 3 };
    migrateWeaponSource(source);
    expect(source).toEqual({ damageRoll: 3 });
  });
});
