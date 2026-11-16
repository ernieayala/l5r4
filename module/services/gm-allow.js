/**
 * @module services/gm-allow
 * @description A roll the rules forbid, which the GM may still allow (CLAUDE.md **AUTOMATE MATH, KEEP CHOICES**):
 * a player is told why it cannot be made; a GM is asked whether to make it anyway.
 */

/**
 * Refuse a forbidden roll for a player, or ask the GM to allow it.
 * @param {object} spec
 * @param {string} spec.title - The dialog's title
 * @param {string} spec.reason - Why the rules forbid it, already localized
 * @param {string} spec.ask - The GM's question, already localized
 * @returns {Promise<boolean>} Whether the roll goes ahead
 */
export async function askGmAllow({ title, reason, ask }) {
  if (!game.user.isGM) {
    ui.notifications?.warn(reason);
    return false;
  }
  const escape = foundry.utils.escapeHTML;
  return foundry.applications.api.DialogV2.confirm({
    window: { title },
    content: `<p>${escape(reason)}</p><p>${escape(ask)}</p>`
  });
}
