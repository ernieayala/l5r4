/**
 * @module utils/window-id
 * @description The id of a window that belongs to one document. It is built from the document's UUID, not its id,
 * because the unlinked tokens of one base actor share the actor's id: each token's actor gets a window of its own
 * (#189). Pure.
 */

/**
 * The id of one document's window of a kind, safe as an element id.
 * @param {string} prefix - The kind of window, as its class names it ("wound-config")
 * @param {string} uuid - The document's UUID
 * @param {string} [part] - What else tells two windows of the document apart, such as an NPC's attack slot
 * @returns {string}
 */
export function getWindowId(prefix, uuid, part) {
  const id = `${prefix}-${uuid.replaceAll(".", "-")}`;
  return part ? `${id}-${part}` : id;
}
