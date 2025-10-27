/**
 * @fileoverview L5R4 Quench Integration Tests Registration
 *
 * Comprehensive integration test suite for the L5R4 Enhanced system using Quench.
 * Tests documents, services, sheets, and complete workflows in Foundry environment.
 *
 * **Test Organization:**
 * - Smoke tests: Basic system functionality
 * - Document tests: Actor/Item lifecycle and derived data
 * - Roll tests: Skill checks, weapon attacks, spell casting
 * - Service tests: Initiative, fear, rest, stance systems
 * - Sheet tests: Rendering and interactions
 * - Workflow tests: Complete combat sequences
 *
 * **Cleanup Strategy:**
 * All tests use proper cleanup in after/afterEach hooks to prevent document leaks.
 * Documents are deleted in reverse creation order.
 *
 * @see https://github.com/Ethaks/FVTT-Quench
 */

import { SYS_ID } from "../../module/config/constants.js";
import { buildFormula } from "../../module/services/dice/core/formula-builder.js";
import { createTestPC, createTestNPC } from "../fixtures/actor-fixtures.js";
import { createSkillData, createWeaponData, createArmorData } from "../fixtures/item-fixtures.js";
import { registerSkillRollTests as registerSkillRollServiceTests } from "./services/skill-rolls.test.js";
import { registerWeaponRollTests } from "./services/weapon-rolls.test.js";
import { registerInitiativeTests } from "./services/initiative.test.js";
import { registerSpellCastRollTests } from "./services/spell-rolls.test.js";
import { registerRingRollTests } from "./services/ring-rolls.test.js";
import { registerTraitRollTests } from "./services/trait-rolls.test.js";
import { registerNpcRollTests } from "./services/npc-rolls.test.js";
import { registerFearTests } from "./services/fear.test.js";
import { registerStanceTests } from "./services/stance.test.js";
import { registerRestTests } from "./services/rest.test.js";
import { registerFamilyBonusTests } from "./services/family-bonus-service.test.js";
import { registerXpServiceTests } from "./services/xp-service.test.js";
import { registerEmphasisXpTrackingTests } from "./services/emphasis-xp-tracking.test.js";
import { registerPCSheetTests } from "./sheets/pc-sheet.test.js";
import { registerNPCSheetTests } from "./sheets/npc-sheet.test.js";
import { registerItemSheetTests } from "./sheets/item-sheet.test.js";
import { registerWoundConfigTests } from "./sheets/wound-config.test.js";
import { registerXpManagerTests } from "./sheets/xp-manager.test.js";
import { registerEmphasisManagerTests } from "./sheets/emphasis-manager.test.js";
import { registerNPCAttackEditorTests } from "./apps/npc-attack-editor.test.js";
import { registerCombatWorkflowTests } from "./workflows/combat-workflow.test.js";
import { registerAdvancementWorkflowTests } from "./workflows/advancement-workflow.test.js";
import { registerSpellCastingWorkflowTests } from "./workflows/spell-casting-workflow.test.js";
import { registerTraitFamilyBonusTests } from "./workflows/trait-family-bonus.test.js";
import { registerArmorTNCalculationTests } from "./workflows/armor-tn-calculation.test.js";
import { registerDiceRollingWorkflowTests } from "./workflows/dice-rolling-workflow.test.js";
import { registerStanceSwitchingWorkflowTests } from "./workflows/stance-switching-workflow.test.js";
import { registerInitiativeWorkflowTests } from "./workflows/initiative-workflow.test.js";
import { registerItemManagementWorkflowTests } from "./workflows/item-management-workflow.test.js";
import { registerStatusEffectsWorkflowTests } from "./workflows/status-effects-workflow.test.js";
import { registerFearWorkflowTests } from "./workflows/fear-workflow.test.js";
import { registerRestRecoveryWorkflowTests } from "./workflows/rest-recovery-workflow.test.js";
import { registerNPCWorkflowTests } from "./workflows/npc-workflows.test.js";
import { registerChatSystemWorkflowTests } from "./workflows/chat-system-workflow.test.js";
import { registerEmphasisWorkflowTests } from "./workflows/emphasis-workflow.test.js";

/**
 * Register Quench integration tests for the L5R4 system.
 * @param {Object} quench - The Quench test framework API
 * @returns {Promise<void>}
 */
export async function registerQuenchTests(quench) {
  // Register all test batches
  registerSmokeTests(quench);
  registerActorDocumentTests(quench);
  registerActorWoundTests(quench);
  registerActorXpTests(quench);
  registerItemDocumentTests(quench);
  registerSkillRollTests(quench);

  // Register service tests (Phase 1: Critical Rolls)
  registerSkillRollServiceTests(quench);
  registerWeaponRollTests(quench);
  registerInitiativeTests(quench);

  // Register service tests (Phase 2: Extended Rolls)
  registerSpellCastRollTests(quench);
  registerRingRollTests(quench);
  registerTraitRollTests(quench);
  registerNpcRollTests(quench);

  // Register service tests (Phase 3: Combat Systems)
  registerFearTests(quench);
  registerStanceTests(quench);

  // Register service tests (Phase 4: Support Systems)
  registerRestTests(quench);
  registerFamilyBonusTests(quench);
  registerXpServiceTests(quench);
  registerEmphasisXpTrackingTests(quench);

  // Register sheet tests (Phase 5: User Interface)
  registerPCSheetTests(quench);
  registerNPCSheetTests(quench);
  registerItemSheetTests(quench);
  registerWoundConfigTests(quench);
  registerXpManagerTests(quench);
  registerEmphasisManagerTests(quench);
  registerNPCAttackEditorTests(quench);

  // Register workflow tests (Phase 6: Complete Workflows)
  registerCombatWorkflowTests(quench);
  registerAdvancementWorkflowTests(quench);
  registerSpellCastingWorkflowTests(quench);
  registerTraitFamilyBonusTests(quench);
  registerArmorTNCalculationTests(quench);
  registerDiceRollingWorkflowTests(quench);
  registerStanceSwitchingWorkflowTests(quench);
  registerInitiativeWorkflowTests(quench);
  registerItemManagementWorkflowTests(quench);
  registerStatusEffectsWorkflowTests(quench);
  registerFearWorkflowTests(quench);
  registerRestRecoveryWorkflowTests(quench);
  registerNPCWorkflowTests(quench);
  registerChatSystemWorkflowTests(quench);
  registerEmphasisWorkflowTests(quench);
}

/**
 * Smoke Tests - Verify basic system functionality
 * @param {Object} quench - Quench API
 */
function registerSmokeTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.smoke`,
    context => {
      const { describe, it, assert } = context;

      describe("System Configuration", () => {
        it("should have CONFIG.l5r4 namespace", () => {
          assert.exists(CONFIG.l5r4, "CONFIG.l5r4 namespace exists");
        });

        it("should have game data configured", () => {
          assert.exists(CONFIG.l5r4.rings, "Rings configured");
          assert.exists(CONFIG.l5r4.traits, "Traits configured");
          assert.exists(CONFIG.l5r4.statusEffects, "Status effects configured");
        });

        it("should have Actor document class registered", () => {
          assert.exists(CONFIG.Actor.documentClass, "Actor document class exists");
          assert.equal(CONFIG.Actor.documentClass.name, "L5R4Actor", "L5R4Actor registered");
        });

        it("should have Item document class registered", () => {
          assert.exists(CONFIG.Item.documentClass, "Item document class exists");
          assert.equal(CONFIG.Item.documentClass.name, "L5R4Item", "L5R4Item registered");
        });
      });

      describe("Basic Document Creation", () => {
        let actor;
        let item;

        afterEach(async () => {
          if (item) {
            await item.delete();
            item = null;
          }
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should create PC actor", async () => {
          actor = await createTestPC({ name: "Test PC" });

          assert.exists(actor, "Actor created");
          assert.equal(actor.type, "pc", "Actor is PC type");
          assert.equal(actor.name, "Test PC", "Actor has correct name");
        });

        it("should create NPC actor", async () => {
          actor = await createTestNPC({ name: "Test NPC" });

          assert.exists(actor, "Actor created");
          assert.equal(actor.type, "npc", "Actor is NPC type");
        });

        it("should create skill item", async () => {
          item = await Item.create(createSkillData("Test Skill"));

          assert.exists(item, "Item created");
          assert.equal(item.type, "skill", "Item is skill type");
          assert.equal(item.name, "Test Skill", "Item has correct name");
        });
      });
    },
    { displayName: "L5R4: Smoke Tests" }
  );
}

/**
 * Actor Document Tests - Lifecycle and derived data
 * @param {Object} quench - Quench API
 */
function registerActorDocumentTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.actor`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Actor Creation", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should create PC with default values", async () => {
          actor = await createTestPC({ name: "Default PC" });

          assert.exists(actor.system, "System data exists");
          assert.exists(actor.system.rings, "Rings exist");
          assert.exists(actor.system.traits, "Traits exist");
          assert.equal(actor.system.rings.earth, 2, "Earth Ring defaults to 2");
        });

        it("should create PC with custom rings", async () => {
          actor = await createTestPC({
            name: "Custom PC",
            system: {
              // Rings are DERIVED from traits: earth = min(sta, wil)
              traits: {
                sta: 4,
                wil: 5, // Earth = min(4, 5) = 4
                ref: 3,
                awa: 4, // Air = min(3, 4) = 3
                agi: 5,
                int: 6, // Fire = min(5, 6) = 5
                str: 3,
                per: 4 // Water = min(3, 4) = 3
              },
              rings: { void: { rank: 2 } }
            }
          });

          assert.equal(actor.system.rings.earth, 4, "Earth Ring calculated correctly from traits");
          assert.equal(actor.system.rings.fire, 5, "Fire Ring calculated correctly from traits");
        });

        it("should initialize XP flags for PC", async () => {
          actor = await createTestPC({ name: "XP Test PC" });

          const flags = actor.flags[SYS_ID];
          assert.exists(flags, "System flags exist");
          assert.isArray(flags.xpManual, "xpManual is array");
          assert.isArray(flags.xpSpent, "xpSpent is array");
          assert.equal(flags.xpBase, 40, "xpBase defaults to 40");
        });
      });

      describe("Actor prepareDerivedData", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Derived Data Test",
            system: {
              rings: { earth: 3, air: 2, fire: 2, water: 2, void: { rank: 2 } },
              traits: {
                sta: 3,
                wil: 3,
                ref: 3,
                awa: 2,
                agi: 2,
                int: 2,
                str: 2,
                per: 2
              }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should calculate initiative values", () => {
          assert.exists(actor.system.initiative, "Initiative object exists");
          assert.isNumber(actor.system.initiative.roll, "Initiative roll is number");
          assert.isNumber(actor.system.initiative.keep, "Initiative keep is number");
        });

        it("should calculate Armor TN", () => {
          assert.exists(actor.system.armorTn, "Armor TN object exists");
          assert.isNumber(actor.system.armorTn.current, "Armor TN current is number");

          // Armor TN = (Reflexes × 5) + 5 + armor bonus
          // With Reflexes 3: (3 × 5) + 5 = 20
          const expectedBaseTN = 3 * 5 + 5;
          assert.equal(
            actor.system.armorTn.base,
            expectedBaseTN,
            "Base Armor TN calculated correctly"
          );
        });

        it("should calculate wound levels from Earth Ring", () => {
          assert.exists(actor.system.woundLevels, "Wound levels exist");
          assert.exists(actor.system.woundLevels.healthy, "Healthy level exists");
          assert.exists(actor.system.woundLevels.out, "Out level exists");

          // Healthy = Earth × 5 = 3 × 5 = 15
          assert.equal(
            actor.system.woundLevels.healthy.value,
            15,
            "Healthy wounds calculated correctly"
          );
        });

        it("should calculate insight points", () => {
          assert.exists(actor.system.insight, "Insight object exists");
          assert.isNumber(actor.system.insight.points, "Insight points is number");

          // Insight = (Rings × 10) + Skills
          // Rings: 3 + 2 + 2 + 2 + 2 = 11, Skills: 0
          // 11 × 10 = 110
          assert.equal(actor.system.insight.points, 110, "Insight points calculated correctly");
        });
      });

      describe("Actor Updates", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Update Test",
            system: {
              // Rings are DERIVED from traits
              traits: { sta: 3, wil: 3 } // Earth = min(3, 3) = 3
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should recalculate derived data on update", async () => {
          const oldHealthy = actor.system.woundLevels.healthy.value;

          // Update traits to change derived earth ring (earth = min(sta, wil))
          await actor.update({ "system.traits.sta": 5, "system.traits.wil": 5 });

          const newHealthy = actor.system.woundLevels.healthy.value;
          assert.notEqual(newHealthy, oldHealthy, "Wound levels recalculated");
          assert.equal(newHealthy, 25, "New healthy level correct (5 × 5)");
        });

        it("should track wound damage", async () => {
          await actor.update({ "system.suffered": 10 });

          assert.equal(actor.system.suffered, 10, "Suffered wounds recorded");
        });
      });
    },
    { displayName: "L5R4: Actor Document Tests" }
  );
}

/**
 * Actor Wound System Tests - Integration testing
 * @param {Object} quench - Quench API
 */
function registerActorWoundTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.actor.wounds`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Wound Calculation Integration", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Wound Test PC",
            system: {
              traits: { sta: 3, wil: 3 }, // Earth = min(3, 3) = 3
              woundsMultiplier: 2
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should calculate wound levels on actor creation", () => {
          assert.exists(actor.system.woundLevels, "Wound levels exist");
          assert.exists(actor.system.woundLevels.healthy, "Healthy level exists");
          assert.exists(actor.system.woundLevels.out, "Out level exists");

          // Healthy = Earth × 5 = 3 × 5 = 15
          assert.equal(actor.system.woundLevels.healthy.value, 15, "Healthy threshold correct");
        });

        it("should recalculate wounds when Earth Ring changes", async () => {
          const oldHealthy = actor.system.woundLevels.healthy.value;

          // Change Earth traits: sta 3→5, wil 3→5, so Earth 3→5
          await actor.update({
            "system.traits.sta": 5,
            "system.traits.wil": 5
          });

          const newHealthy = actor.system.woundLevels.healthy.value;
          assert.notEqual(newHealthy, oldHealthy, "Healthy threshold recalculated");
          assert.equal(newHealthy, 25, "New healthy threshold correct (5 × 5)");
        });

        it("should track suffered wounds", async () => {
          await actor.update({ "system.suffered": 10 });

          assert.equal(actor.system.suffered, 10, "Suffered wounds tracked");
          assert.exists(actor.system.wounds, "Wounds object exists");
        });

        it("should determine current wound level from suffered damage", async () => {
          // Set suffered to be in "nicked" range (between healthy and grazed)
          await actor.update({ "system.suffered": 16 });

          assert.exists(actor.system.woundLevels.nicked, "Nicked level exists");
          // Current wound level should be marked
          const hasCurrentLevel = Object.values(actor.system.woundLevels).some(
            lvl => lvl.current === true
          );
          assert.isTrue(hasCurrentLevel, "A wound level is marked as current");
        });

        it("should calculate wounds.max from out threshold", () => {
          assert.exists(actor.system.wounds, "Wounds object exists");
          assert.isNumber(actor.system.wounds.max, "Wounds max is number");
          assert.isTrue(actor.system.wounds.max > 0, "Wounds max is positive");
        });

        it("should calculate wounds.value as max minus suffered", async () => {
          const maxWounds = actor.system.wounds.max;
          await actor.update({ "system.suffered": 5 });

          assert.equal(
            actor.system.wounds.value,
            maxWounds - 5,
            "Current wounds calculated correctly"
          );
        });
      });

      describe("NPC Wound Modes", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
            npc = null;
          }
        });

        it("should support formula mode for NPCs", async () => {
          npc = await createTestNPC({
            name: "Formula NPC",
            system: {
              traits: { sta: 4, wil: 4 }, // Set traits so Earth = 4
              woundMode: "formula",
              woundsMultiplier: 2
            }
          });

          assert.equal(npc.system.woundMode, "formula", "Formula mode set");
          assert.exists(npc.system.woundLevels.healthy, "Wound levels calculated");
          assert.equal(npc.system.rings.earth, 4, "Earth Ring is 4");
          assert.equal(npc.system.woundLevels.healthy.value, 20, "Healthy = 4 × 5");
        });

        it("should support manual mode for NPCs", async () => {
          npc = await createTestNPC({
            name: "Manual NPC",
            system: {
              woundMode: "manual",
              wounds: { max: 50 }
            }
          });

          assert.equal(npc.system.woundMode, "manual", "Manual mode set");
          assert.equal(npc.system.wounds.max, 50, "Manual max wounds set");
        });
      });

      describe("Wound Penalties", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Penalty Test",
            system: {
              traits: { sta: 3, wil: 3 }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have penalty values for wound levels", () => {
          const nicked = actor.system.woundLevels.nicked;
          assert.exists(nicked, "Nicked level exists");
          assert.exists(nicked.penalty, "Nicked has penalty");
          assert.isNumber(nicked.penaltyEff, "Effective penalty is number");
        });

        it("should apply wound penalty modifier", async () => {
          const basePenalty = actor.system.woundLevels.nicked.penaltyEff;

          await actor.update({ "system.woundsPenaltyMod": 5 });

          const newPenalty = actor.system.woundLevels.nicked.penaltyEff;
          assert.isTrue(newPenalty >= basePenalty, "Penalty increased by modifier");
        });
      });
    },
    { displayName: "L5R4: Actor Wound System Tests" }
  );
}

/**
 * Actor XP System Tests - Integration testing
 * @param {Object} quench - Quench API
 */
function registerActorXpTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.actor.xp`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("PC XP Initialization", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP Test PC" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should initialize XP flags for PC", () => {
          const flags = actor.flags[SYS_ID];

          assert.exists(flags, "System flags exist");
          assert.exists(flags.xpBase, "xpBase flag exists");
          assert.exists(flags.xpManual, "xpManual flag exists");
          assert.exists(flags.xpSpent, "xpSpent flag exists");

          assert.equal(flags.xpBase, 40, "Default xpBase is 40");
          assert.isArray(flags.xpManual, "xpManual is array");
          assert.isArray(flags.xpSpent, "xpSpent is array");
        });

        it("should calculate insight points from rings", () => {
          assert.exists(actor.system.insight, "Insight object exists");
          assert.isNumber(actor.system.insight.points, "Insight points is number");

          // Default rings: 2+2+2+2+2 = 10
          // Insight = (10 × 10) + skills = 100 + 0 = 100
          const expectedInsight = 100;
          assert.equal(
            actor.system.insight.points,
            expectedInsight,
            "Insight calculated correctly"
          );
        });

        it("should calculate insight rank from insight points", () => {
          assert.exists(actor.system.insight.rank, "Insight rank exists");
          assert.isNumber(actor.system.insight.rank, "Insight rank is number");

          // With 100 insight points, should be rank 1 (0-149)
          assert.equal(actor.system.insight.rank, 1, "Insight rank is 1");
        });
      });

      describe("Insight Rank Progression", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Rank Progression Test",
            system: {
              traits: {
                sta: 3,
                wil: 3, // Earth = 3
                ref: 3,
                awa: 3, // Air = 3
                agi: 3,
                int: 3, // Fire = 3
                str: 3,
                per: 3 // Water = 3
              },
              rings: { void: { rank: 3 } }
            }
          });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should reach rank 2 with sufficient insight", async () => {
          // Rings: 3+3+3+3+3 = 15, Insight = 150
          // Need to add skills to reach 150
          await actor.createEmbeddedDocuments("Item", [
            { name: "Skill1", type: "skill", system: { rank: 10 } },
            { name: "Skill2", type: "skill", system: { rank: 10 } },
            { name: "Skill3", type: "skill", system: { rank: 10 } },
            { name: "Skill4", type: "skill", system: { rank: 10 } },
            { name: "Skill5", type: "skill", system: { rank: 10 } }
          ]);

          // Force re-preparation
          actor.prepareData();

          const insight = actor.system.insight.points;
          assert.isAtLeast(insight, 150, "Insight at least 150");
          assert.isAtLeast(actor.system.insight.rank, 2, "Insight rank at least 2");
        });
      });

      describe("XP Tracking", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({ name: "XP Tracking Test" });
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should have XP breakdown in system._xp", () => {
          assert.exists(actor.system._xp, "XP breakdown exists");
          assert.exists(actor.system._xp.total, "Total XP exists");
          assert.exists(actor.system._xp.spent, "Spent XP exists");
          assert.exists(actor.system._xp.available, "Available XP exists");
        });

        it("should start with base XP available", () => {
          const total = actor.system._xp.total;
          const base = actor.flags[SYS_ID].xpBase;

          assert.isAtLeast(total, base, "Total XP includes base");
        });

        it("should calculate available XP", () => {
          const total = actor.system._xp.total;
          const spent = actor.system._xp.spent;
          const available = actor.system._xp.available;

          assert.equal(available, total - spent, "Available = Total - Spent");
        });
      });

      describe("NPC XP Handling", () => {
        let npc;

        afterEach(async () => {
          if (npc) {
            await npc.delete();
            npc = null;
          }
        });

        it("should not initialize XP flags for NPCs", async () => {
          npc = await createTestNPC({ name: "Test NPC" });

          const flags = npc.flags[SYS_ID];

          // NPCs should not have xpBase, xpManual, xpSpent
          assert.isUndefined(flags?.xpBase, "NPC has no xpBase");
          assert.isUndefined(flags?.xpManual, "NPC has no xpManual");
        });

        it("should not have _xp breakdown for NPCs", async () => {
          npc = await createTestNPC({ name: "Test NPC" });

          assert.isUndefined(npc.system._xp, "NPC has no XP breakdown");
        });
      });
    },
    { displayName: "L5R4: Actor XP System Tests" }
  );
}

/**
 * Item Document Tests - Lifecycle and embedding
 * @param {Object} quench - Quench API
 */
function registerItemDocumentTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.documents.item`,
    context => {
      const { describe, it, assert, afterEach } = context;

      describe("Item Creation", () => {
        let item;

        afterEach(async () => {
          if (item) {
            await item.delete();
            item = null;
          }
        });

        it("should create skill item", async () => {
          item = await Item.create(createSkillData("Kenjutsu", 3, "agi"));

          assert.exists(item, "Item created");
          assert.equal(item.type, "skill", "Item type is skill");
          assert.equal(item.system.rank, 3, "Skill rank set correctly");
        });

        it("should create weapon item", async () => {
          item = await Item.create(createWeaponData("Katana", 3, 2));

          assert.exists(item, "Item created");
          assert.equal(item.type, "weapon", "Item type is weapon");
        });

        it("should create armor item", async () => {
          item = await Item.create(createArmorData("Light Armor", 3, 1));

          assert.exists(item, "Item created");
          assert.equal(item.system.bonus, 3, "Armor bonus set");
        });
      });

      describe("Items on Actor", () => {
        let actor;

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should add skill to actor", async () => {
          actor = await createTestPC({ name: "Test Actor" });

          await actor.createEmbeddedDocuments("Item", [
            {
              name: "Iaijutsu",
              type: "skill",
              system: { rank: 5 }
            }
          ]);

          assert.equal(actor.items.size, 1, "One item on actor");
          assert.equal(actor.items.contents[0].name, "Iaijutsu", "Correct skill added");
          assert.equal(actor.items.contents[0].system.rank, 5, "Skill rank preserved");
        });

        it("should add multiple items to actor", async () => {
          actor = await createTestPC({ name: "Multi-Item Actor" });

          await actor.createEmbeddedDocuments("Item", [
            { name: "Kenjutsu", type: "skill", system: { rank: 3 } },
            { name: "Katana", type: "weapon" },
            { name: "Light Armor", type: "armor" }
          ]);

          assert.equal(actor.items.size, 3, "Three items on actor");

          const skill = actor.items.find(i => i.type === "skill");
          const weapon = actor.items.find(i => i.type === "weapon");
          const armor = actor.items.find(i => i.type === "armor");

          assert.exists(skill, "Skill exists");
          assert.exists(weapon, "Weapon exists");
          assert.exists(armor, "Armor exists");
        });

        it("should remove item from actor", async () => {
          actor = await createTestPC({ name: "Removal Test" });

          const [createdItem] = await actor.createEmbeddedDocuments("Item", [
            { name: "Temporary Skill", type: "skill" }
          ]);

          assert.equal(actor.items.size, 1, "Item added");

          await createdItem.delete();

          assert.equal(actor.items.size, 0, "Item removed");
        });
      });
    },
    { displayName: "L5R4: Item Document Tests" }
  );
}

/**
 * Skill Roll Tests - Roll and Keep system
 * @param {Object} quench - Quench API
 */
function registerSkillRollTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.rolls.skill`,
    context => {
      const { describe, it, assert, beforeEach, afterEach } = context;

      describe("Basic Roll Creation", () => {
        it("should create valid Roll with Roll and Keep notation", async () => {
          // L5R4 uses buildFormula to convert XkY to Foundry notation
          const formula = buildFormula(5, 3, 0, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has total");
          assert.equal(formula, "5d10k3x10+0", "Formula converted correctly");
        });

        it("should create Roll with modifier", async () => {
          const formula = buildFormula(7, 4, 5, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has total");
          assert.isAtLeast(roll.total, 5, "Roll total includes modifier");
        });

        it("should handle unskilled rolls without explosions", async () => {
          const formula = buildFormula(3, 2, 0, { unskilled: true });
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.equal(formula, "3d10k2+0", "Unskilled formula has no explosions");
          assert.notInclude(formula, "x10", "No exploding dice for unskilled");
        });
      });

      describe("Actor with Skills", () => {
        let actor;

        beforeEach(async () => {
          actor = await createTestPC({
            name: "Skilled Samurai",
            system: {
              traits: { agi: 3, per: 4 }
            }
          });

          await actor.createEmbeddedDocuments("Item", [createSkillData("Kenjutsu", 5, "agi")]);
        });

        afterEach(async () => {
          if (actor) {
            await actor.delete();
            actor = null;
          }
        });

        it("should access skill from actor", () => {
          const skill = actor.items.find(i => i.name === "Kenjutsu");

          assert.exists(skill, "Skill exists on actor");
          assert.equal(skill.system.rank, 5, "Skill has correct rank");
          assert.equal(skill.system.trait, "agi", "Skill has correct trait");
        });

        it("should calculate dice pool from skill and trait", () => {
          const skill = actor.items.find(i => i.name === "Kenjutsu");
          const trait = actor.system.traits[skill.system.trait];

          const rolled = skill.system.rank + trait;
          const kept = trait;

          assert.equal(rolled, 8, "Rolled dice calculated (5 + 3)");
          assert.equal(kept, 3, "Kept dice calculated (trait value)");
        });

        it("should create skill check roll", async () => {
          const skill = actor.items.find(i => i.name === "Kenjutsu");
          const trait = actor.system.traits[skill.system.trait];

          const rolled = skill.system.rank + trait;
          const kept = trait;

          // Use buildFormula to convert XkY to Foundry notation
          const formula = buildFormula(rolled, kept, 0, {});
          const roll = new Roll(formula);
          await roll.evaluate();

          assert.exists(roll, "Roll created");
          assert.isNumber(roll.total, "Roll has result");
          assert.equal(formula, "8d10k3x10+0", "Formula built correctly for 8k3");
        });
      });
    },
    { displayName: "L5R4: Skill Roll Tests" }
  );
}
