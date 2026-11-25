import { describe, expect, it } from "vitest";
import { getKihoLimits } from "../../../module/utils/kiho.js";

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
