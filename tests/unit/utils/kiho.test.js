import { describe, expect, it } from "vitest";
import {
  getKihoBuyer,
  getKihoCap,
  getKihoLimits,
  getKihoPrice,
  getSchoolKihoAccess,
  isKihoMasteryMet
} from "../../../module/utils/kiho.js";

// #159: who learns kiho, how they meet the Mastery Level, and what they pay (Ernie's ruling)
// game-rules/87_kiho.md, p.261, 266
describe("Kiho buyers", () => {
  const school = (extra = {}) => ({
    kiho: 0,
    shugenja: false,
    kihoAccess: "",
    schoolRank: 1,
    ...extra
  });

  it("should read a School's access from its field, else from its starting kiho or shugenja mark", () => {
    expect(getSchoolKihoAccess(school({ kiho: 3 }))).toBe("brotherhood");
    expect(getSchoolKihoAccess(school({ shugenja: true }))).toBe("shugenja");
    expect(getSchoolKihoAccess(school())).toBe("none");
    expect(getSchoolKihoAccess(school({ kihoAccess: "monk" }))).toBe("monk");
    expect(getSchoolKihoAccess(school({ kiho: 3, kihoAccess: "bogus" }))).toBe("brotherhood");
  });

  it("should take the most open access, with that School's rank and the total of its kind", () => {
    expect(getKihoBuyer([school({ shugenja: true, schoolRank: 2 }), school({ kiho: 3 })])).toEqual({
      access: "brotherhood",
      rank: 1,
      totalRank: 1
    });
    expect(
      getKihoBuyer([school({ shugenja: true, schoolRank: 2 }), school({ shugenja: true })])
    ).toEqual({ access: "shugenja", rank: 2, totalRank: 3 });
    expect(getKihoBuyer([school()])).toBeNull();
  });

  it("should meet the Mastery Level with Ring and Rank, the Ring for a shugenja, the Rank for a ninja", () => {
    // Touch the Void Dragon, Mastery Level 4
    const kiho = { mastery: 4, ring: 3 };
    expect(isKihoMasteryMet({ access: "brotherhood", rank: 1 }, kiho)).toBe(true);
    expect(isKihoMasteryMet({ access: "monk", rank: 1 }, kiho)).toBe(true);
    expect(isKihoMasteryMet({ access: "shugenja", rank: 2 }, kiho)).toBe(false);
    expect(isKihoMasteryMet({ access: "shugenja", rank: 2 }, { mastery: 3, ring: 3 })).toBe(true);
    expect(isKihoMasteryMet({ access: "ninja", rank: 3 }, kiho)).toBe(false);
    expect(isKihoMasteryMet({ access: "ninja", rank: 4 }, { mastery: 4, ring: 1 })).toBe(true);
  });

  it("should price a kiho at its Mastery Level, 1½× rounded up for another Monk School, 2× otherwise", () => {
    expect(
      [undefined, "brotherhood", "monk", "shugenja", "ninja"].map(a => getKihoPrice(3, a))
    ).toEqual([3, 3, 5, 6, 6]);
  });

  it("should cap a buyer outside the Brotherhood at the total School Rank", () => {
    expect(getKihoCap({ access: "brotherhood", totalRank: 3 })).toBeNull();
    expect(getKihoCap({ access: "shugenja", totalRank: 3 })).toBe(3);
  });
});

// game-rules/80_brotherhood_of_shinsei.md, p.231
describe("getKihoLimits", () => {
  const kiho = (school, other) => [
    ...Array.from({ length: school }, () => ({ schoolKiho: true })),
    ...Array.from({ length: other }, () => ({ schoolKiho: false }))
  ];

  it("should give a Monk School its starting kiho, two more a Rank, and a bonus kiho a Rank", () => {
    expect(getKihoLimits([{ kiho: 3, rank: 1 }], kiho(3, 1))).toEqual({
      school: 3,
      schoolAllowed: 3,
      bonus: 1,
      bonusAllowed: 1
    });
    expect(getKihoLimits([{ kiho: 3, rank: 3 }], kiho(7, 0))).toMatchObject({
      schoolAllowed: 7,
      bonusAllowed: 3
    });
  });

  it("should give the Temples of the Thousand Fortunes four starting kiho", () => {
    expect(getKihoLimits([{ kiho: 4, rank: 1 }], kiho(4, 0)).schoolAllowed).toBe(4);
  });

  it("should count only Monk Schools, and none for a character without one", () => {
    expect(getKihoLimits([{ kiho: 0, rank: 2 }], kiho(0, 1))).toBeNull();
    expect(
      getKihoLimits(
        [
          { kiho: 3, rank: 2 },
          { kiho: 0, rank: 1 }
        ],
        kiho(5, 2)
      )
    ).toMatchObject({ schoolAllowed: 5, bonusAllowed: 2 });
  });
});
