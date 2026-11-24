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

import {
  revealChatPopupsAtOnce,
  withDiceSoundMuted,
  withPostedMessagesDeleted
} from "./helpers.js";
import { registerActorTests } from "./documents/actor.js";
import { registerActorWoundsTests } from "./documents/actor-wounds.js";
import { registerActorXpTests } from "./documents/actor-xp.js";
import { registerItemTests } from "./documents/item.js";
import { registerSkillRollFormulaTests } from "./services/skill-roll-formulas.js";
import { registerSkillRollTests } from "./services/skill-rolls.js";
import { registerSkillTraitSwitchingTests } from "./services/skill-trait-switching.js";
import { registerWeaponRollTests } from "./services/weapon-rolls.js";
import { registerAttackRollEmphasisTests } from "./services/attack-roll-emphasis.js";
import { registerAttackRollVoidTests } from "./services/attack-roll-void.js";
import { registerInitiativeTests } from "./services/initiative.js";
import { registerSpellCastRollTests } from "./services/spell-rolls.js";
import { registerSpellRollVoidTests } from "./services/spell-roll-void.js";
import { registerRingRollTests } from "./services/ring-rolls.js";
import { registerTraitRollTests } from "./services/trait-rolls.js";
import { registerNpcRollTests } from "./services/npc-rolls.js";
import { registerFearTests } from "./services/fear.js";
import { registerStanceTests } from "./services/stance.js";
import { registerRestTests } from "./services/rest.js";
import { registerFamilyBonusTests } from "./services/family-bonus-service.js";
import { registerXpServiceTests } from "./services/xp-service.js";
import { registerEmphasisXpTrackingTests } from "./services/emphasis-xp-tracking.js";
import { registerVoidPointsTests } from "./services/void-points.js";
import { registerSpellSlotsTests } from "./services/spell-slots.js";
import { registerPcSheetTests } from "./sheets/pc-sheet.js";
import { registerNpcSheetTests } from "./sheets/npc-sheet.js";
import { registerItemSheetTests } from "./sheets/item-sheet.js";
import { registerWoundConfigTests } from "./sheets/wound-config.js";
import { registerXpManagerTests } from "./apps/xp-manager.js";
import { registerEmphasisManagerTests } from "./sheets/emphasis-manager.js";
import { registerNpcAttackConfigTests } from "./apps/npc-attack-config.js";
import { registerWealthManagerTests } from "./apps/wealth-manager.js";
import { registerConditionManagerTests } from "./apps/condition-manager.js";
import { registerCombatWorkflowTests } from "./workflows/combat-workflow.js";
import { registerMeleeDamageStrengthTests } from "./workflows/melee-damage-strength.js";
import { registerAdvancementWorkflowTests } from "./workflows/advancement-workflow.js";
import { registerSpellCastingWorkflowTests } from "./workflows/spell-casting-workflow.js";
import { registerTraitFamilyBonusTests } from "./workflows/trait-family-bonus.js";
import { registerArmorTnCalculationTests } from "./workflows/armor-tn-calculation.js";
import { registerDiceRollingWorkflowTests } from "./workflows/dice-rolling-workflow.js";
import { registerStanceSwitchingWorkflowTests } from "./workflows/stance-switching-workflow.js";
import { registerInitiativeWorkflowTests } from "./workflows/initiative-workflow.js";
import { registerItemManagementWorkflowTests } from "./workflows/item-management-workflow.js";
import { registerStatusEffectsWorkflowTests } from "./workflows/status-effects-workflow.js";
import { registerStatusEffectsAllRollsTests } from "./workflows/status-effects-all-rolls.js";
import { registerFearWorkflowTests } from "./workflows/fear-workflow.js";
import { registerRestRecoveryWorkflowTests } from "./workflows/rest-recovery-workflow.js";
import { registerNpcWorkflowTests } from "./workflows/npc-workflows.js";
import { registerChatSystemWorkflowTests } from "./workflows/chat-system-workflow.js";
import { registerEmphasisWorkflowTests } from "./workflows/emphasis-workflow.js";
import { registerEmphasisRerollMechanicsTests } from "./workflows/emphasis-reroll-mechanics.js";
import { registerSkillVoidPointTests } from "./workflows/skill-void-point.js";
import { registerSkillStanceCombinationTests } from "./workflows/skill-stance-combinations.js";
import { registerActorCreationRaceConditionTests } from "./workflows/actor-creation-race-conditions.js";
import { registerInitiativeRaceConditionTests } from "./workflows/initiative-race-conditions.js";
import { registerDamageRaceConditionTests } from "./workflows/damage-race-conditions.js";
import { registerXpRaceConditionTests } from "./workflows/xp-race-conditions.js";
import { registerSkillAdvancementRaceConditionTests } from "./workflows/skill-advancement-race-conditions.js";
import { registerItemCreationRaceConditionTests } from "./workflows/item-creation-race-conditions.js";
import { registerAttackEdgeCaseTests } from "./workflows/attack-edge-cases.js";
import { registerSpellSlotsEdgeCaseTests } from "./workflows/spell-slots-edge-cases.js";
import { registerStanceEdgeCaseTests } from "./workflows/stance-edge-cases.js";
import { registerConditionsEdgeCaseTests } from "./workflows/conditions-edge-cases.js";
import { registerXpTrackingEdgeCaseTests } from "./workflows/xp-tracking-edge-cases.js";
import { registerSkillAdvancementEdgeCaseTests } from "./workflows/skill-advancement-edge-cases.js";
import { registerMigrationEdgeCaseTests } from "./workflows/migration-edge-cases.js";
import { registerWoundConfigEdgeCaseTests } from "./workflows/wound-config-edge-cases.js";
import { registerChatCardContentValidationTests } from "./services/chat-card-content-validation.js";
import { registerWoundPenaltyAllRollsTests } from "./workflows/wound-penalty-all-rolls.js";
import { registerMultipleModifierCombinationTests } from "./services/multiple-modifier-combinations.js";
import { registerCombatModifiersTests } from "./documents/combat-modifiers.js";
import { registerStanceEffectPreservationTests } from "./services/stance-effect-preservation.js";
import { registerSmokeTests } from "./smoke.js";
import { registerDeprecationsTests } from "./deprecations.js";
import { registerDataModelsTests } from "./data-models.js";
import { registerActiveEffectsTests } from "./active-effects.js";
import { registerSheetsAndAppsTests } from "./sheets-and-apps.js";
import { registerRulesTests } from "./rules.js";
import { registerRollPipelineTests } from "./roll-pipeline.js";
import { registerCombatTests } from "./combat.js";
import { registerAuthoringTests } from "./authoring.js";
import { registerEffectsTests } from "./effects.js";
import { registerAnimationsTests } from "./animations.js";
import { registerWorldUpgradeTests } from "./world-upgrade.js";
import { registerRegressionsTests } from "./regressions.js";
import { registerTableToolsTests } from "./table-tools.js";
import { registerHookWiringTests } from "./hooks/register-all.js";
import { registerPacksTests } from "./packs.js";
import { registerDesignGalleryTests } from "./design-gallery.js";
import { registerChangeOriginTests } from "./workflows/change-origin.js";
import { registerDialogsTests } from "./dialogs.js";

/**
 * Register Quench integration tests for the L5R4 system.
 * @param {Object} quench - The Quench test framework API
 * @returns {Promise<void>}
 */
export async function registerQuenchTests(quench) {
  revealChatPopupsAtOnce();
  const api = withPostedMessagesDeleted(withDiceSoundMuted(quench));
  registerSmokeTests(api);
  registerDeprecationsTests(api);
  registerDataModelsTests(api);
  registerActiveEffectsTests(api);
  registerSheetsAndAppsTests(api);
  registerRulesTests(api);
  registerRollPipelineTests(api);
  registerCombatTests(api);
  registerAuthoringTests(api);
  registerEffectsTests(api);
  registerAnimationsTests(api);
  registerWorldUpgradeTests(api);
  registerRegressionsTests(api);
  registerTableToolsTests(api);
  registerHookWiringTests(api);
  registerPacksTests(api);
  registerDesignGalleryTests(api);
  registerChangeOriginTests(api);
  registerDialogsTests(api);
  registerActorTests(api);
  registerActorWoundsTests(api);
  registerActorXpTests(api);
  registerItemTests(api);
  registerSkillRollFormulaTests(api);
  registerCombatModifiersTests(api);

  // Register service tests (Phase 1: Critical Rolls)
  registerSkillRollTests(api);
  registerSkillTraitSwitchingTests(api);
  registerWeaponRollTests(api);
  registerAttackRollEmphasisTests(api);
  registerAttackRollVoidTests(api);
  registerInitiativeTests(api);
  registerChatCardContentValidationTests(api);

  // Register service tests (Phase 2: Extended Rolls)
  registerSpellCastRollTests(api);
  registerSpellRollVoidTests(api);
  registerRingRollTests(api);
  registerTraitRollTests(api);
  registerNpcRollTests(api);

  // Register service tests (Phase 3: Combat Systems)
  registerFearTests(api);
  registerStanceTests(api);

  // Register service tests (Phase 4: Support Systems)
  registerRestTests(api);
  registerFamilyBonusTests(api);
  registerXpServiceTests(api);
  registerEmphasisXpTrackingTests(api);

  // Register Phase 4: Resource Management Tests
  registerVoidPointsTests(api);
  registerSpellSlotsTests(api);

  // Register sheet tests (Phase 5: User Interface)
  registerPcSheetTests(api);
  registerNpcSheetTests(api);
  registerItemSheetTests(api);
  registerWoundConfigTests(api);
  registerXpManagerTests(api);
  registerEmphasisManagerTests(api);
  registerNpcAttackConfigTests(api);
  registerWealthManagerTests(api);
  registerConditionManagerTests(api);

  // Register workflow tests (Phase 6: Complete Workflows)
  registerCombatWorkflowTests(api);
  registerMeleeDamageStrengthTests(api);
  registerAdvancementWorkflowTests(api);
  registerSpellCastingWorkflowTests(api);
  registerTraitFamilyBonusTests(api);
  registerArmorTnCalculationTests(api);
  registerDiceRollingWorkflowTests(api);
  registerStanceSwitchingWorkflowTests(api);
  registerInitiativeWorkflowTests(api);
  registerItemManagementWorkflowTests(api);
  registerStatusEffectsWorkflowTests(api);
  registerStatusEffectsAllRollsTests(api);
  registerFearWorkflowTests(api);
  registerRestRecoveryWorkflowTests(api);
  registerNpcWorkflowTests(api);
  registerChatSystemWorkflowTests(api);
  registerEmphasisWorkflowTests(api);
  registerEmphasisRerollMechanicsTests(api);
  registerSkillVoidPointTests(api);
  registerSkillStanceCombinationTests(api);

  // Register race condition tests (Phase 7: Critical Bug Prevention)
  registerActorCreationRaceConditionTests(api);
  registerInitiativeRaceConditionTests(api);
  registerDamageRaceConditionTests(api);
  registerXpRaceConditionTests(api);
  registerSkillAdvancementRaceConditionTests(api);
  registerItemCreationRaceConditionTests(api);

  // Register edge case tests (Phase 8: Edge Case Coverage)
  registerAttackEdgeCaseTests(api);
  registerSpellSlotsEdgeCaseTests(api);
  registerStanceEdgeCaseTests(api);
  registerConditionsEdgeCaseTests(api);

  // Register Phase 3: Character Advancement edge case tests
  registerXpTrackingEdgeCaseTests(api);
  registerSkillAdvancementEdgeCaseTests(api);

  // Register Phase 7: Migration & Config edge case tests
  registerMigrationEdgeCaseTests(api);
  registerWoundConfigEdgeCaseTests(api);

  // Register Phase 2 Priority #5: Wound Penalty + All Roll Types
  registerWoundPenaltyAllRollsTests(api);

  // Register Phase 2 Priority #6: Multiple Modifier Combinations
  registerMultipleModifierCombinationTests(api);

  // Register Stance Effect Preservation Tests (Bug Fix Verification)
  registerStanceEffectPreservationTests(api);
}
