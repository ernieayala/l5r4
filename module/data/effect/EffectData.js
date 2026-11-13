/**
 * Data model for core's `base` ActiveEffect type: core's `changes` plus `rules`.
 *
 * `rules` holds the effect's mechanics as data for the rule engine (roadmap Stage 7, AUTOMATION.md §1); nothing
 * reads it before then. `base` is a core type, so it gets this model through `CONFIG.ActiveEffect.dataModels` only
 * and is never declared in system.json `documentTypes` (common/packages/sub-types.mjs:45-47).
 */
export default class EffectData extends foundry.data.ActiveEffectTypeDataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, ObjectField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      rules: new ArrayField(new ObjectField())
    };
  }
}
