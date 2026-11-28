/**
 * @module services/write-queue
 * @description One-at-a-time queues on this client: an operation runs once every earlier one on the same key has
 * finished, so each reads the documents fresh. The answering GM client runs every write to one actor through
 * queueActorWrite, so two requests for the same actor never read the same stored value and overwrite each other
 * (#170); a flow card's steps queue on the card the same way (#164), and a caster's spell slot spends on the caster's
 * client.
 */

/**
 * Each key's last queued operation, settled whether it succeeded or failed.
 * @type {Map<string, Promise<void>>}
 */
const chains = new Map();

/**
 * Run an operation after the earlier ones on its key. A failed operation does not stop the ones after it.
 * @template T
 * @param {string} key
 * @param {function(): Promise<T>} operation
 * @returns {Promise<T>} The operation's result
 */
export function queueWrite(key, operation) {
  const run = (chains.get(key) ?? Promise.resolve()).then(operation);
  const settled = run.then(
    () => {},
    () => {}
  );
  chains.set(key, settled);
  settled.then(() => {
    if (chains.get(key) === settled) {
      chains.delete(key);
    }
  });
  return run;
}

/**
 * Run a write to an actor after the earlier writes to it on this client. The write reads the actor's stored values
 * itself, inside the queue.
 * @template T
 * @param {Actor} actor
 * @param {function(): Promise<T>} write
 * @returns {Promise<T>} The write's result
 */
export function queueActorWrite(actor, write) {
  return queueWrite(`actor:${actor.uuid}`, write);
}
