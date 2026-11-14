/**
 * @module services/dice/roll-keep-die
 * @description The d10 of Roll & Keep. Core Rulebook p.77 (`game-rules/26_special_dice_rules.md`): a die that comes up
 * 10 is rolled again and the result added to that die's total, again on another 10; then the highest dice are kept
 * (p.75). Core's `x` modifier adds each explosion as a separate result and only explodes dice still active, so
 * keeping first drops 10s unexploded and keeping after counts explosions as separate dice. The `xa` modifier added
 * here explodes each die into its own total, so `k` after it keeps the highest dice: "7d10xa10k3".
 */

/**
 * Core's Die with the Roll & Keep explosion. Registered as `CONFIG.Dice.terms.d` during init, so every d-term
 * understands `xa`; without it a term behaves as core's Die.
 */
export default class L5R4Die extends foundry.dice.terms.Die {
  /** @override */
  static MODIFIERS = { ...super.MODIFIERS, xa: "explodeAdd" };

  /**
   * Explode each active die into its own total: while the last result meets the target, roll again and add.
   *
   * 7d10xa10     A 10 rolls again and adds (p.77)
   * 7d10xa>=9    A 9 or 10 rolls again and adds (a weapon's "explodes on")
   *
   * @param {string} modifier  The matched modifier query
   * @returns {Promise<false|void>} False if the modifier was unmatched
   */
  async explodeAdd(modifier) {
    const match = modifier.match(/xa([<>=]+)?([0-9]+)?/i);
    if (!match) {
      return false;
    }
    const comparison = match[1] || "=";
    const target = Number.isNumeric(match[2]) ? parseInt(match[2]) : this.faces;
    // The explosion rolls a die, which core appends to the results; it belongs to the die that exploded instead
    const rollAgain = async () => {
      const extra = await this.roll();
      this.results.splice(this.results.indexOf(extra), 1);
      return extra.result;
    };
    let explosions = 0;
    for (const result of this.results.filter(r => r.active)) {
      let last = result.result;
      while (foundry.dice.terms.DiceTerm.compareResult(last, comparison, target)) {
        if (++explosions > 1000) {
          throw new Error("Maximum recursion depth for exploding dice roll exceeded");
        }
        last = await rollAgain();
        result.result += last;
        result.exploded = true;
      }
    }
  }
}
