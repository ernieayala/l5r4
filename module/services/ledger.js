/**
 * @module services/ledger
 * @description Changes to Honor, Glory, Status, and Shadowlands Taint, sized by the actor's Ledger rules
 * (module/utils/ledger.js) and logged with their reason in `flags.l5r4-enhanced.ledger` (roadmap/STAGE-11 decision 5).
 * Shift-clicking a track on the sheet stays a raw correction outside the ledger.
 */

import { SYS_ID } from "../config/constants.js";
import { LEDGER_TRACKS } from "../config/rule-keys.js";
import { DIALOG_TEMPLATES } from "../config/templates.js";
import { RANK_TRACK_RANGE } from "../config/game-mechanics.js";
import { applyRankPointsDelta } from "../utils/advancement.js";
import { ledgerChange } from "../utils/ledger.js";
import { T } from "../utils/localization.js";
import { toInt } from "../utils/type-coercion.js";

/** Entries the ledger dialog lists, newest first. */
const SHOWN_ENTRIES = 20;

/** The system field each track is stored in. */
const TRACK_FIELDS = Object.freeze({
  honor: "honor",
  glory: "glory",
  status: "status",
  taint: "shadowTaint"
});

/**
 * @typedef {object} LedgerEntry
 * @property {string} id
 * @property {string} track
 * @property {number} asked   Points asked for
 * @property {number} points  Points applied after the Ledger rules
 * @property {string} reason
 * @property {number} ts
 * @property {string} user    The user who made the change
 */

/**
 * The tracks an actor has: a PC all four, an NPC its Taint.
 * @param {Actor} actor
 * @returns {string[]}
 */
export function ledgerTracks(actor) {
  return LEDGER_TRACKS.filter(track => actor.system[TRACK_FIELDS[track]] !== undefined);
}

/**
 * The actor's ledger entries, oldest first.
 * @param {Actor} actor
 * @returns {LedgerEntry[]}
 */
export function ledgerEntries(actor) {
  return actor.getFlag(SYS_ID, "ledger") ?? [];
}

/**
 * Gain or lose points on a track: the Ledger rules size the change, the stored rank and points move (ten points to a
 * rank, p.90, within the track's range: RANK_TRACK_RANGE), and the change is logged.
 *
 * @param {Actor} actor
 * @param {string} track   honor, glory, status, or taint
 * @param {number} points  Positive gains, negative loses
 * @param {string} reason
 * @returns {Promise<LedgerEntry>}
 */
export async function recordTrackChange(actor, track, points, reason) {
  const field = TRACK_FIELDS[track];
  const sized = ledgerChange({
    track,
    points,
    rules: actor.ledgerRules,
    rollData: actor.getRollData()
  });
  for (const { source, message } of sized.errors) {
    console.warn(`${SYS_ID} | Ledger rule on "${source}" (${actor.name}) skipped: ${message}`);
  }
  const stored = actor._source.system[field];
  const next = applyRankPointsDelta(stored, sized.points / 10, ...RANK_TRACK_RANGE[field]);
  const entry = {
    id: foundry.utils.randomID(),
    track,
    asked: points,
    points: sized.points,
    reason,
    ts: Date.now(),
    user: game.user.id
  };
  await actor.update({
    [`system.${field}.rank`]: next.rank,
    [`system.${field}.points`]: next.points,
    [`flags.${SYS_ID}.ledger`]: [...ledgerEntries(actor), entry]
  });
  return entry;
}

/**
 * The ledger dialog: record a gain or loss on one of the actor's tracks, with its reason, and see the latest
 * changes. The Ledger rules size what is recorded.
 * @param {Actor} actor
 * @returns {Promise<LedgerEntry|null>} The recorded change, or null when nothing was recorded
 */
export async function openLedgerDialog(actor) {
  const label = track => T(`l5r4.ui.ledger.tracks.${track}`);
  const content = await foundry.applications.handlebars.renderTemplate(DIALOG_TEMPLATES.ledger, {
    tracks: Object.fromEntries(ledgerTracks(actor).map(track => [track, label(track)])),
    entries: ledgerEntries(actor)
      .slice(-SHOWN_ENTRIES)
      .reverse()
      .map(entry => ({
        ...entry,
        track: label(entry.track),
        changed: entry.asked !== entry.points
      }))
  });
  const choice = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${T("l5r4.ui.ledger.title")}: ${actor.name}` },
    position: { width: 440 },
    content,
    ok: {
      label: T("l5r4.ui.ledger.record"),
      callback: (_event, button) => {
        const form = button.form.elements;
        return {
          track: form.track.value,
          points: toInt(form.points.value),
          reason: form.reason.value
        };
      }
    },
    rejectClose: false
  });
  // The form is user input: the track must be one the actor has, and nothing is recorded for 0 points
  if (!choice || !ledgerTracks(actor).includes(choice.track) || !choice.points) {
    return null;
  }
  return recordTrackChange(actor, choice.track, choice.points, choice.reason.trim());
}
