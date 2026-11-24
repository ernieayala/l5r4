/**
 * @module services/gm-client
 * @description One client answers for the GM user. Core sends a GM query to every client of the GM user and takes
 * the first answer, and its turn events and the system's GM-only work run on each client where
 * `game.user.isActiveGM` holds, so a GM with two windows would apply a player's damage twice (#82). The GM's clients
 * announce themselves on the system socket and keep a heartbeat; the one that started first answers
 * (module/utils/gm-client.js). A client that closes says so, so another takes over at once; one that stops without
 * a word is dropped after it has gone quiet for longer than CLIENT_TTL_MS. A player's request goes to the GM through
 * requestGmQuery, which tells the player when no GM is connected or the GM side refuses.
 */

import { SYS_ID } from "../config/constants.js";
import { isAnsweringClient } from "../utils/gm-client.js";
import { F, T } from "../utils/localization.js";

/** The system's socket channel (`"socket": true` in system.json). */
const CHANNEL = `system.${SYS_ID}`;

/** How often a GM client says it is still here, in ms. */
const HEARTBEAT_MS = 10_000;

/** How long a GM client counts as present after it was last heard from, in ms: past two missed heartbeats. */
const CLIENT_TTL_MS = 25_000;

/** When this client started, in ms since the epoch. */
const startedAt = Date.now();

/** The other GM clients heard from, by socket id. */
const others = new Map();

/**
 * Whether this client does the GM user's work: a GM client that no other present GM client started before.
 * @returns {boolean}
 */
export function isAnsweringGmClient() {
  if (!game.user?.isGM) {
    return false;
  }
  const self = { id: game.socket.id, startedAt };
  return isAnsweringClient(self, [...others.values()], { now: Date.now(), ttl: CLIENT_TTL_MS });
}

/**
 * Register a GM query that only the answering GM client runs. Another client of the GM user neither runs it nor
 * answers, so core takes the answering client's result.
 * @param {string} name - The query name, in `CONFIG.queries`
 * @param {function(object, object): Promise<*>|*} handler - The query handler
 */
export function registerGmQuery(name, handler) {
  CONFIG.queries[name] = (data, context) =>
    isAnsweringGmClient() ? handler(data, context) : new Promise(() => {});
}

/**
 * Run a request on the GM's side and tell the requester when it does not run. A GM's own client runs `local` here; a
 * player's request goes to the active GM as a query. With no GM connected, or when the GM side refuses, the requester
 * is told why in their own language: the GM side throws an i18n key under `l5r4.ui.requests`, which this client
 * localizes; any other failure is shown with its message (#139).
 * @param {string} name - The query name, in `CONFIG.queries`
 * @param {object} data - The request
 * @param {function(object, User): Promise<*>} [local] - Runs the request when this user is a GM
 * @returns {Promise<*>} The GM side's answer, or undefined when it did not run
 */
export async function requestGmQuery(name, data, local) {
  try {
    if (game.user.isGM && local) {
      return await local(data, game.user);
    }
    const gm = game.users.activeGM;
    if (!gm) {
      ui.notifications?.warn(T("l5r4.ui.effects.noGM"));
      return undefined;
    }
    return await gm.query(name, data);
  } catch (err) {
    ui.notifications?.warn(formatRefusal(name, err));
    return undefined;
  }
}

/**
 * On `ready`, for a GM client: listen on the system socket, announce this client, keep a heartbeat, and say goodbye
 * when the window closes.
 */
export function registerGmClient() {
  if (!game.user.isGM) {
    return;
  }
  game.socket.on(CHANNEL, onGmClientMessage);
  emitGmClientMessage("hello");
  setInterval(() => emitGmClientMessage("here"), HEARTBEAT_MS);
  window.addEventListener("pagehide", () => emitGmClientMessage("bye"));
}

/**
 * A message on the system socket from another GM client. The payload comes from another client, so it is checked: a
 * message that is not from a GM client, or names this client, changes nothing. A newcomer's "hello" is answered, so
 * it learns of this client at once.
 * @param {{type: string, id: string, startedAt: number, userId: string}} message
 */
export function onGmClientMessage(message) {
  const { type, id, userId } = message ?? {};
  const started = Number(message?.startedAt);
  const known = ["hello", "here", "bye"].includes(type);
  if (!known || typeof id !== "string" || id === game.socket.id || !game.users.get(userId)?.isGM) {
    return;
  }
  if (type === "bye") {
    others.delete(id);
    return;
  }
  if (!Number.isFinite(started)) {
    return;
  }
  others.set(id, { id, startedAt: started, seen: Date.now() });
  if (type === "hello") {
    emitGmClientMessage("here");
  }
}

/**
 * Why the GM side did not run a request, in this user's language. A refusal the system makes is an i18n key; any
 * other failure is unexpected, so it is also logged, and its message is shown as it came.
 * @param {string} name - The query name
 * @param {Error} err - The rejection
 * @returns {string}
 */
function formatRefusal(name, err) {
  if (game.i18n.has(err.message)) {
    return T(err.message);
  }
  console.warn(`${SYS_ID} | ${name} failed`, err);
  return F("l5r4.ui.requests.failed", { reason: err.message });
}

/**
 * Tell the other GM clients about this one.
 * @param {"hello"|"here"|"bye"} type
 */
function emitGmClientMessage(type) {
  game.socket.emit(CHANNEL, { type, id: game.socket.id, startedAt, userId: game.user.id });
}
