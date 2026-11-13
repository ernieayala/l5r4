/**
 * @module documents/combat
 * @description The system's Combat: before an Initiative roll, each combatant's player may spend a Void Point for
 * +10 (Core Rulebook p.78), which applies to that roll only.
 */

export default class L5R4Combat extends foundry.documents.Combat {
  /**
   * Resolves per-roll Initiative bonuses before the roll, by combatant id. Documents do not import services, so
   * the entry module sets this at init to the initiative service's Void Point prompt.
   * @type {(combatants: foundry.documents.Combatant[]) => Promise<Map<string, number>>}
   */
  static resolveInitiativeBonuses = async () => new Map();

  /**
   * Rolls Initiative, giving each combatant with a bonus a formula of its own. Core rolls every id with one formula
   * (client/documents/combat.mjs:388-441), so those combatants roll in calls of their own.
   * @override
   */
  async rollInitiative(ids, options = {}) {
    ids = typeof ids === "string" ? [ids] : ids;
    const combatants = ids.map(id => this.combatants.get(id)).filter(c => c?.isOwner);
    const bonuses = await this.constructor.resolveInitiativeBonuses(combatants);
    const plain = ids.filter(id => !bonuses.has(id));
    if (plain.length) {
      await super.rollInitiative(plain, options);
    }
    for (const [id, bonus] of bonuses) {
      const formula = this.combatants.get(id)._getInitiativeFormula(bonus);
      await super.rollInitiative([id], { ...options, formula });
    }
    return this;
  }
}
