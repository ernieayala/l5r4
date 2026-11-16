/**
 * @module data/effect/base-data
 * @description The data model of core's `base` ActiveEffect type.
 */

/**
 * Data model for core's `base` ActiveEffect type: core's `changes` plus the system's fields.
 *
 * - `rules`: the effect's mechanics as data for the rule engine (roadmap Stage 7, AUTOMATION.md §1).
 * - `level`: how strong the effect is, read by its rules as `@level`: a Fear Rank, days of Fatigue or Fasting.
 *   null for an effect without levels.
 * - `group`: effects sharing a group are exclusive on one actor; gaining one ends the others. Stances are the
 *   group "stance"; one Kata at a time is the group "kata".
 *
 * `base` is a core type, so it gets this model through `CONFIG.ActiveEffect.dataModels` only and is never declared
 * in system.json `documentTypes` [src: common/packages/sub-types.mjs:45-47].
 * game-rules/42_fear.md, p.90
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/36_stances.md, p.84
 * game-rules/86_kata.md, p.259
 */
export default class EffectData extends foundry.data.ActiveEffectTypeDataModel {
  /** @override */
  static defineSchema() {
    const { ArrayField, NumberField, ObjectField, StringField } = foundry.data.fields;
    return {
      ...super.defineSchema(),
      rules: new ArrayField(new ObjectField()),
      level: new NumberField({
        required: true,
        nullable: true,
        initial: null,
        integer: true,
        min: 0
      }),
      group: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}
