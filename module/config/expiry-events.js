/**
 * @module config/expiry-events
 * @description Active Effect expiry beyond core's. Core 14.370 already announces turnStart, turnEnd, roundStart,
 * roundEnd (the Reactions stage), combatStart, and combatEnd (the end of a skirmish) from Combat
 * [src: client/documents/combat.mjs:1014-1107], and world-time advances [src: client/helpers/time.mjs:214], which
 * end effects timed in minutes, hours, or days (STAGE-09 decision 2).
 * game-rules/31_combat_round.md, p.82
 */

/**
 * Expiry events the system announces through `ActiveEffect.registry.refresh`, by id: label key.
 * `encounterEnd` ends Fear: when the combat it began in ends, or when the GM ends the encounter
 * (STAGE-09 decision 4).
 * game-rules/42_fear.md, p.90
 * @type {Readonly<Record<string, string>>}
 */
export const EXPIRY_EVENTS = Object.freeze({
  encounterEnd: "l5r4.ui.effects.expiry.encounterEnd"
});

/**
 * What core does with an expired effect: delete it (STAGE-09 decision 1).
 * @type {"delete"}
 */
export const EXPIRY_ACTION = "delete";
