/**
 * @module documents/combat
 * @description The system's Combat:
 * - before an Initiative roll, each combatant's player may spend a Void Point for +10 (Core Rulebook p.78), which
 *   applies to that roll only;
 * - turn and round events reach the effect services: saves rolled in the Reactions stage (p.82, p.89), Full Defense
 *   declared again each Turn (p.84), Concentration upkeep (p.166);
 * - before each new Round, Center Stance gives its next-Round bonus and +10 Initiative for that Round (p.84);
 * - when the combat ends, Fear and other effects lasting the encounter end with it (p.90; STAGE-09 decision 4).
 *
 * Core announces turnStart, turnEnd, roundStart, and roundEnd to the Active Effect registry itself
 * (client/documents/combat.mjs:1011-1109), after these overrides run, and only on the active GM.
 */

export default class L5R4Combat extends foundry.documents.Combat {
  /**
   * Resolves per-roll Initiative bonuses before the roll, by combatant id. Documents do not import services, so
   * the entry module sets this at init to the initiative service's Void Point prompt.
   * @type {(combatants: foundry.documents.Combatant[]) => Promise<Map<string, number>>}
   */
  static resolveInitiativeBonuses = async () => new Map();

  /**
   * The effect services' handlers for combat events, set by the entry module at init (documents do not import
   * services).
   * @type {{
   *   turn: (event: string, combat: L5R4Combat, combatant: foundry.documents.Combatant) => Promise<void>,
   *   round: (event: string, combat: L5R4Combat) => Promise<void>,
   *   beforeNextRound: (combat: L5R4Combat) => Promise<void>
   * }}
   */
  static events = {
    turn: async () => {},
    round: async () => {},
    beforeNextRound: async () => {}
  };

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

  /**
   * Settle Center Stance before the Round advances, so the new Round's turn order includes its Initiative bonus.
   * @override
   */
  async nextRound() {
    if (this.started) {
      await this.constructor.events.beforeNextRound(this);
    }
    return super.nextRound();
  }

  /** @override */
  async _onStartTurn(combatant, context) {
    await super._onStartTurn(combatant, context);
    await this.constructor.events.turn("turnStart", this, combatant);
  }

  /** @override */
  async _onEndTurn(combatant, context) {
    await super._onEndTurn(combatant, context);
    await this.constructor.events.turn("turnEnd", this, combatant);
  }

  /** @override */
  async _onEndRound(context) {
    await super._onEndRound(context);
    await this.constructor.events.round("roundEnd", this);
  }

  /**
   * End the encounter for this combat's actors: effects expiring on `encounterEnd` (Fear) end.
   * @override
   */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    const actors = new Set(this.combatants.map(c => c.actor).filter(Boolean));
    foundry.documents.ActiveEffect.registry.refresh("encounterEnd", { combat: this, actors });
  }
}
