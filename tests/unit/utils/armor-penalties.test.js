/**
 * Unit Tests: armor-penalties.js
 *
 * Tests L5R4 armor penalty calculations for different armor types and conditions.
 * Validates TN penalties based on armor type, skill, trait, and mounted status.
 *
 * Test Priority: Tier 1 (Critical - Core combat mechanics)
 */

import { describe, it, expect } from "vitest";
import {
  ARMOR_TYPES,
  getArmorTnPenalty,
  getArmorPenaltyDescription
} from "../../../module/utils/armor-penalties.js";

describe("ARMOR_TYPES", () => {
  it("should define all armor type constants", () => {
    expect(ARMOR_TYPES.ASHIGARU).toBe("ashigaru");
    expect(ARMOR_TYPES.LIGHT).toBe("light");
    expect(ARMOR_TYPES.HEAVY).toBe("heavy");
    expect(ARMOR_TYPES.RIDING).toBe("riding");
  });

  it("should be frozen", () => {
    expect(() => {
      ARMOR_TYPES.NEW_TYPE = "new";
    }).toThrow();
  });
});

describe("getArmorTnPenalty", () => {
  describe("Ashigaru armor", () => {
    it("should return 0 penalty for ashigaru armor", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "ashigaru"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "agi");
      expect(penalty).toBe(0);
    });

    it("should return 0 for any skill with ashigaru armor", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "ashigaru"
            }
          }
        ]
      };

      expect(getArmorTnPenalty(actor, "athletics", "str")).toBe(0);
      expect(getArmorTnPenalty(actor, "stealth", "agi")).toBe(0);
      expect(getArmorTnPenalty(actor, "kenjutsu", "agi")).toBe(0);
    });
  });

  describe("Light armor", () => {
    it("should return 5 penalty for athletics skill", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5);
    });

    it("should return 5 penalty for stealth skill", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "stealth", "agi");
      expect(penalty).toBe(5);
    });

    it("should return 0 penalty for kenjutsu skill", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(0);
    });

    it("should return 0 penalty for investigation skill", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "investigation", "per");
      expect(penalty).toBe(0);
    });

    it("should be case insensitive for skill names", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      expect(getArmorTnPenalty(actor, "ATHLETICS", "str")).toBe(5);
      expect(getArmorTnPenalty(actor, "Athletics", "str")).toBe(5);
    });
  });

  describe("Heavy armor", () => {
    it("should return 5 penalty for agility trait", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(5);
    });

    it("should return 5 penalty for reflexes trait", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kyujutsu", "ref");
      expect(penalty).toBe(5);
    });

    it("should return 0 penalty for strength trait", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "jiujutsu", "str");
      expect(penalty).toBe(0);
    });

    it("should return 0 penalty for perception trait", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "investigation", "per");
      expect(penalty).toBe(0);
    });

    it("should penalize athletics even if trait is not agi/ref", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      // Heavy armor penalizes traits, not skills
      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(0); // No penalty for STR trait
    });

    // game-rules/73_armor.md, p.198
    it("should leave a plain Agility or Reflexes Trait roll alone: the penalty is on Skill Rolls", () => {
      const actor = { items: [{ type: "armor", system: { equipped: true, armorType: "heavy" } }] };
      expect(getArmorTnPenalty(actor, null, "agi")).toBe(0);
      expect(getArmorTnPenalty(actor, null, "ref")).toBe(0);
    });
  });

  describe("Riding armor", () => {
    it("should return 5 penalty for agi when not mounted", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(5);
    });

    it("should return 5 penalty for ref when not mounted", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kyujutsu", "ref");
      expect(penalty).toBe(5);
    });

    it("should return 0 penalty when mounted", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ],
        effects: [
          {
            disabled: false,
            statuses: {
              values: () => ({
                next: () => ({ value: "mounted" })
              })
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(0);
    });

    it("should return 0 penalty for str when not mounted", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "jiujutsu", "str");
      expect(penalty).toBe(0);
    });
  });

  describe("Equipped status", () => {
    it("should ignore unequipped armor", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: false,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(0);
    });

    it("should only count equipped armor", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          },
          {
            type: "armor",
            system: {
              equipped: false,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5); // Only light armor penalty
    });
  });

  describe("Multiple armor pieces", () => {
    it("should use highest penalty from multiple armor", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "ashigaru" // 0 penalty
            }
          },
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light" // 5 penalty for athletics
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5); // Highest penalty
    });

    it("should not stack penalties", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light" // 5 penalty for athletics
            }
          },
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light" // 5 penalty for athletics
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5); // Max penalty, not 10
    });
  });

  describe("Edge cases", () => {
    it("should return 0 for null actor", () => {
      const penalty = getArmorTnPenalty(null, "athletics", "agi");
      expect(penalty).toBe(0);
    });

    it("should return 0 for undefined actor", () => {
      const penalty = getArmorTnPenalty(undefined, "athletics", "agi");
      expect(penalty).toBe(0);
    });

    it("should return 0 for actor without items", () => {
      const actor = {};
      const penalty = getArmorTnPenalty(actor, "athletics", "agi");
      expect(penalty).toBe(0);
    });

    it("should return 0 for empty items array", () => {
      const actor = {
        items: []
      };
      const penalty = getArmorTnPenalty(actor, "athletics", "agi");
      expect(penalty).toBe(0);
    });

    it("should handle null skillName", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, null, "str");
      expect(penalty).toBe(0); // No skill to match
    });

    it("should handle null traitName", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", null);
      expect(penalty).toBe(0); // No trait to match
    });

    it("should handle unknown armor type", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "unknown"
            }
          }
        ]
      };

      // Unknown types default to light armor behavior
      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5);
    });

    it("should handle missing armorType", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true
            }
          }
        ]
      };

      // Defaults to light armor behavior
      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5);
    });

    it("should handle item without system", () => {
      const actor = {
        items: [
          {
            type: "armor"
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "agi");
      expect(penalty).toBe(0); // Not equipped
    });

    it("should ignore non-armor items", () => {
      const actor = {
        items: [
          {
            type: "weapon",
            system: {
              equipped: true
            }
          },
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5); // Only counts armor
    });

    it("should handle null items in array", () => {
      const actor = {
        items: [
          null,
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "athletics", "str");
      expect(penalty).toBe(5);
    });
  });

  describe("Mounted status detection", () => {
    it("should detect mounted from effects.statuses", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ],
        effects: [
          {
            disabled: false,
            statuses: {
              values: () => ({
                next: () => ({ value: "mounted" })
              })
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(0); // Mounted = no penalty
    });

    it("should detect mounted from flags.core.statusId", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ],
        effects: [
          {
            disabled: false,
            flags: {
              core: {
                statusId: "mounted"
              }
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(0); // Mounted = no penalty
    });

    it("should detect mounted from actor.statuses", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ],
        statuses: {
          has: id => id === "mounted"
        }
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(0); // Mounted = no penalty
    });

    it("should ignore disabled effects", () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "riding"
            }
          }
        ],
        effects: [
          {
            disabled: true,
            statuses: {
              values: () => ({
                next: () => ({ value: "mounted" })
              })
            }
          }
        ]
      };

      const penalty = getArmorTnPenalty(actor, "kenjutsu", "agi");
      expect(penalty).toBe(5); // Not mounted (effect disabled)
    });
  });
});

describe("getArmorPenaltyDescription", () => {
  describe("Penalty descriptions", () => {
    it("should return description for light armor athletics penalty", () => {
      const actor = {
        items: [
          {
            type: "armor",
            name: "Light Armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "athletics", "str");
      expect(description).toBe("Light Armor: +5 TN");
    });

    it("should return description for heavy armor agility penalty", () => {
      const actor = {
        items: [
          {
            type: "armor",
            name: "Heavy Armor",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "kenjutsu", "agi");
      expect(description).toBe("Heavy Armor: +5 TN");
    });

    it("should return null for no penalty", () => {
      const actor = {
        items: [
          {
            type: "armor",
            name: "Ashigaru Armor",
            system: {
              equipped: true,
              armorType: "ashigaru"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "athletics", "str");
      expect(description).toBeNull();
    });

    it("should return null for unequipped armor", () => {
      const actor = {
        items: [
          {
            type: "armor",
            name: "Heavy Armor",
            system: {
              equipped: false,
              armorType: "heavy"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "kenjutsu", "agi");
      expect(description).toBeNull();
    });

    it("should use armor name in description", () => {
      const actor = {
        items: [
          {
            type: "armor",
            name: "Do",
            system: {
              equipped: true,
              armorType: "heavy"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "kenjutsu", "agi");
      expect(description).toBe("Do: +5 TN");
    });

    it('should default to "Armor" if no name', () => {
      const actor = {
        items: [
          {
            type: "armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "athletics", "str");
      expect(description).toBe("Armor: +5 TN");
    });
  });

  describe("Edge cases", () => {
    it("should return null for null actor", () => {
      const description = getArmorPenaltyDescription(null, "athletics", "str");
      expect(description).toBeNull();
    });

    it("should return null for actor without items", () => {
      const actor = {};
      const description = getArmorPenaltyDescription(actor, "athletics", "str");
      expect(description).toBeNull();
    });

    it("should return null for empty items array", () => {
      const actor = {
        items: []
      };
      const description = getArmorPenaltyDescription(actor, "athletics", "str");
      expect(description).toBeNull();
    });

    it("should return first penalizing armor in multiple armor case", () => {
      const actor = {
        items: [
          {
            type: "armor",
            name: "First Armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          },
          {
            type: "armor",
            name: "Second Armor",
            system: {
              equipped: true,
              armorType: "light"
            }
          }
        ]
      };

      const description = getArmorPenaltyDescription(actor, "athletics", "str");
      expect(description).toBe("First Armor: +5 TN");
    });
  });
});
