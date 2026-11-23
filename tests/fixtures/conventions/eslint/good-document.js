/**
 * @module documents/example
 * @description A conforming document for the convention checks' ESLint fixtures.
 */

/**
 * An Item whose overrides call core's preparation through super.
 */
export default class L5R4Example extends foundry.documents.Item {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
  }
}
