/**
 * @module setup/migrations/steps
 * @description The world migration's steps (#181), each with the migration schema it brings a document to, in the
 * order they run for an item, an effect, and an actor. A new step takes the next schema number and raises
 * MIGRATION_SCHEMA (module/config/constants.js); a step already shipped keeps its number.
 */
import { migrateStoredSystem } from "./schema/persist.js";
import { migrateLegacyNpcWounds } from "./actors/npc-wounds.js";
import { migrateNpcInitiative } from "./actors/npc-initiative.js";
import { migrateNpcWoundCount } from "./actors/npc-wound-count.js";
import { migrateEffectFreeTraitBase } from "./actors/xp-free-trait-base.js";
import { migrateStatusEffectRules } from "./actors/status-effect-rules.js";
import { migrateBowToWeapon } from "./items/bow-to-weapon.js";
import { migrateSkillDefaults } from "./items/skill-defaults.js";
import { migrateEmphasisStringToArray } from "./items/emphasis.js";
import { migrateArmorType } from "./items/armor-types.js";
import { migrateFreeRaisesDefault } from "./items/free-raises.js";
import { migrateWeaponSize } from "./items/normalize.js";
import { migrateItemRules } from "./items/item-rules.js";
import { migrateLegacyCost } from "./items/legacy-cost.js";
import {
  migrateEffectSkillAttackRules,
  migrateItemSkillAttackRules
} from "./items/skill-attack-rules.js";
import { migrateActorIcon, migrateItemIcon } from "./icons/icon-paths.js";

/**
 * A migration step: the schema it brings a document to, and what it does to one document, given the run, whose notes
 * it may extend for the GM. It throws when it fails.
 * @typedef {{schema: number, migrate: function(Document, import("../migrations.js").MigrationRun): Promise<void>}}
 *   MigrationStep
 */

/**
 * The steps an item runs, in order. Free Raises are backfilled before the item rules move them into a rule; the
 * migrated `system` is written back last, once every step has read the legacy values (#182).
 * @type {ReadonlyArray<MigrationStep>}
 */
export const ITEM_STEPS = Object.freeze([
  { schema: 1, migrate: migrateBowToWeapon },
  { schema: 1, migrate: migrateSkillDefaults },
  { schema: 1, migrate: migrateEmphasisStringToArray },
  { schema: 1, migrate: migrateArmorType },
  { schema: 1, migrate: migrateFreeRaisesDefault },
  { schema: 1, migrate: migrateItemIcon },
  { schema: 1, migrate: migrateWeaponSize },
  { schema: 1, migrate: migrateItemRules },
  { schema: 3, migrate: migrateItemSkillAttackRules },
  { schema: 3, migrate: migrateLegacyCost },
  { schema: 3, migrate: migrateStoredSystem }
]);

/**
 * The steps an actor's or a token delta's effect runs.
 * @type {ReadonlyArray<MigrationStep>}
 */
export const EFFECT_STEPS = Object.freeze([
  { schema: 1, migrate: migrateStatusEffectRules },
  { schema: 3, migrate: migrateEffectSkillAttackRules }
]);

/**
 * The steps an actor runs, after its items and effects: the free Trait rank flags read the rules the item steps add.
 * The migrated `system` is written back last, which removes the legacy keys (#182).
 * @type {ReadonlyArray<MigrationStep>}
 */
export const ACTOR_STEPS = Object.freeze([
  { schema: 1, migrate: migrateLegacyNpcWounds },
  { schema: 1, migrate: migrateNpcInitiative },
  { schema: 1, migrate: migrateEffectFreeTraitBase },
  { schema: 1, migrate: migrateActorIcon },
  { schema: 2, migrate: migrateNpcWoundCount },
  { schema: 3, migrate: migrateStoredSystem }
]);
