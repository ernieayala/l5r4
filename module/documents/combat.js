/**
 * @module documents/combat
 * @description The system's Combat:
 * - before an Initiative roll, each combatant's player may spend a Void Point for +10, which applies to that roll
 *   only; a GM's roll sends that choice to a connected player (#165);
 * - turn and round events reach the effect services: saves rolled in the Reactions stage, Full Defense declared
 *   again each Turn, Concentration upkeep;
 * - before each new Round, Center Stance gives its next-Round bonus and +10 Initiative for that Round;
 * - when the combat ends, Fear and other effects lasting the encounter end with it (STAGE-09 decision 4).
 *
 * Core announces turnStart, turnEnd, roundStart, and roundEnd to the Active Effect registry itself
 * [src: client/documents/combat.mjs:1011-1109], after these overrides run, and only on the active GM.
 *
 * game-rules/25_rings_and_traits.md, p.78
 * game-rules/31_combat_round.md, p.82
 * game-rules/41_conditional_effects.md, p.89
 * game-rules/36_stances.md, p.84
 * game-rules/67_universal_spells.md, p.166
 * game-rules/42_fear.md, p.90
 */

/**
 * The Combat document class the system sets as `CONFIG.Combat.documentClass`.
 */
export default class L5R4Combat extends foundry.documents.Combat {
  /**
   * Resolves per-roll Initiative bonuses before the roll, by combatant id. Documents do not import services, so
   * the entry module sets this at init to the initiative service's Void Point prompt.
   * @type {(combatants: foundry.documents.Combatant[]) => Promise<Map<string, number>>}
   */
  static askInitiativeBonuses = async () => new Map();

  /**
   * Posts a request card to their players for the combatants whose Initiative holds a player's choice, before the
   * roll, and returns their ids, which the roll leaves out. The entry module sets this at init to the initiative
   * request service (#165).
   * @type {(combatants: foundry.documents.Combatant[]) => Promise<Set<string>>}
   */
  static postInitiativeRequests = async () => new Set();

  /**
   * The effect services' handlers for combat events, set by the entry module at init (documents do not import
   * services).
   * @type {{
   *   turn: (event: string, combat: L5R4Combat, combatant: foundry.documents.Combatant) => Promise<void>,
   *   round: (event: string, combat: L5R4Combat) => Promise<void>,
   *   beforeNextRound: (combat: L5R4Combat) => Promise<void>
   * }}
   */
  static EVENTS = {
    turn: async () => {},
    round: async () => {},
    beforeNextRound: async () => {}
  };

  /**
   * Rolls Initiative, giving each combatant with a bonus a formula of its own. Core rolls every id with one formula
   * [src: client/documents/combat.mjs:388-441], so those combatants roll in calls of their own. A combatant whose
   * choice is a connected player's goes to that player instead, unless this roll answers their request card (#165).
   * @param {string|string[]} ids
   * @param {object} [options] - Core's options
   * @param {boolean} [options.answeringRequest=false] - Whether this roll answers a request card, so it is not sent on
   * @override
   */
  async rollInitiative(ids, { answeringRequest = false, ...options } = {}) {
    ids = typeof ids === "string" ? [ids] : ids;
    const owned = ids.map(id => this.combatants.get(id)).filter(c => c?.isOwner);
    const sent = answeringRequest
      ? new Set()
      : await this.constructor.postInitiativeRequests(owned);
    const combatants = owned.filter(c => !sent.has(c.id));
    const bonuses = await this.constructor.askInitiativeBonuses(combatants);
    const plain = ids.filter(id => !bonuses.has(id) && !sent.has(id));
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
      await this.constructor.EVENTS.beforeNextRound(this);
    }
    return super.nextRound();
  }

  /** @override */
  async _onStartTurn(combatant, context) {
    await super._onStartTurn(combatant, context);
    await this.constructor.EVENTS.turn("turnStart", this, combatant);
  }

  /** @override */
  async _onEndTurn(combatant, context) {
    await super._onEndTurn(combatant, context);
    await this.constructor.EVENTS.turn("turnEnd", this, combatant);
  }

  /** @override */
  async _onEndRound(context) {
    await super._onEndRound(context);
    await this.constructor.EVENTS.round("roundEnd", this);
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
