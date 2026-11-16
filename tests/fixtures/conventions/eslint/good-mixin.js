/**
 * @module mixins/example-mixin
 * @description A sample mixin, named as naming.md's Mixin file row gives.
 */

/**
 * Give a class a sample method.
 * @param {Function} Base - The class to extend
 * @returns {Function} The extended class
 */
export function ExampleMixin(Base) {
  return class extends Base {
    /**
     * Read a sample value.
     * @returns {number} The value
     */
    getSample() {
      return 1;
    }
  };
}
