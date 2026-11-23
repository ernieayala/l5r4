/**
 * @module data/chat/check-request-data
 * @description The data model of the `checkRequest` ChatMessage subtype.
 */

import { stringField } from "../fields.js";

/**
 * Data model for the `checkRequest` ChatMessage subtype: a roll the GM asks for from a Check link (roadmap/STAGE-14).
 * Each player rolls it with their own character from the card's button; the card stores the link's parts, never a
 * result.
 */
export default class CheckRequestData extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const { NumberField } = foundry.data.fields;
    return {
      // The link's `{label}`, or "" for the generated one
      label: stringField(),
      // The Skill as its item is named, or ""
      skill: stringField(),
      // A Trait key or "void", or ""
      trait: stringField(),
      // A Ring key, or ""
      ring: stringField(),
      tn: new NumberField({ required: true, nullable: true, integer: true, min: 1, initial: null })
    };
  }
}
