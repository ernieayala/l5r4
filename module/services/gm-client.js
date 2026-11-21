/**
 * @module services/gm-client
 * @description One client answers for the GM user. Core sends a GM query to every client of the GM user and takes
 * the first answer, and its turn events and the system's GM-only work run on each client where
 * `game.user.isActiveGM` holds, so a GM with two windows would apply a player's damage twice (#82). The GM's clients
 * announce themselves on the system socket and keep a heartbeat; the one that started first answers
 * (module/utils/gm-client.js). A client that closes says so, so another takes over at once; one that stops without
 * a word is dropped after it has gone quiet for longer than CLIENT_TTL_MS.
 */

import { SYS_ID } from "../config/constants.js";
import { isAnsweringClient } from "../utils/gm-client.js";

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
 * Tell the other GM clients about this one.
 * @param {"hello"|"here"|"bye"} type
 */
function emitGmClientMessage(type) {
  game.socket.emit(CHANNEL, { type, id: game.socket.id, startedAt, userId: game.user.id });
}
