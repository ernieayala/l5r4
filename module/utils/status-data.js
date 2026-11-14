/**
 * @module status-data
 * @description The data a status gives the effect carrying it (module/config/status-effects.js): its rules, its
 * exclusive group, and its level. An effect made with only a status id (an older world's effect, a macro, another
 * module) gets them from here, so the status means the same wherever the effect came from.
 */

import { SYS_ID } from "../config/constants.js";
import { STATUS_EFFECTS } from "../config/status-effects.js";
import { toInt } from "./type-coercion.js";

/**
 * The update that brings an effect's source up to its statuses' data: rules when it has none, the group, a level
 * (a 3.2.1 Fear effect kept its Rank in `flags.<id>.fearRank`), and the event that ends it (Fear ends with the
 * encounter). A timed duration is left out: it counts from a start, which an older effect does not have. Fields
 * already set stay as they are, so applying it again changes nothing.
 *
 * @param {object} source  ActiveEffect source data
 * @returns {object|null}  Update data, with `_id` when the source has one; null when nothing changes
 */
export function statusEffectUpdate(source) {
  const statuses = (source.statuses ?? [])
    .map(id => STATUS_EFFECTS.find(s => s.id === id))
    .filter(Boolean);
  if (statuses.length === 0) {
    return null;
  }
  const system = source.system ?? {};
  const update = {};
  const rules = statuses.flatMap(status => structuredClone(status.system?.rules ?? []));
  if (!system.rules?.length && rules.length) {
    update["system.rules"] = rules;
  }
  const group = statuses.find(status => status.system?.group)?.system.group;
  if (!system.group && group) {
    update["system.group"] = group;
  }
  const fearRank = toInt(source.flags?.[SYS_ID]?.fearRank);
  const level = fearRank || statuses.find(status => status.system?.level)?.system.level;
  if ((system.level ?? null) === null && level) {
    update["system.level"] = level;
  }
  const expiry = statuses.find(s => s.duration?.expiry && s.duration.value === undefined)?.duration
    .expiry;
  if (!source.duration?.expiry && expiry) {
    update["duration.expiry"] = expiry;
  }
  if (Object.keys(update).length === 0) {
    return null;
  }
  return source._id ? { _id: source._id, ...update } : update;
}
