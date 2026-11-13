import { booleanField, numberField, stringField } from "../fields.js";
import ItemData from "./ItemData.js";

/** Data model for the `technique` Item subtype: School Rank, and a shugenja's Affinity and Deficiency. */
export default class TechniqueData extends ItemData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      rank: numberField(1),
      shugenja: booleanField(false),
      affinity: stringField(),
      deficiency: stringField()
    };
  }
}
