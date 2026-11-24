/**
 * @module services/dialog
 * @description Every dialog the system opens goes through here, so each carries the `l5r4-dialog` class. Core's
 * `.window-content` hides its overflow, so a dialog taller than the window would clip its fields;
 * `scss/layout/_dialog-layout.scss` scrolls the fields inside the window and keeps the footer buttons in view (#134).
 * Core's helpers are looked up when called, so a test that replaces `DialogV2.confirm` still sees the call.
 * docs/design-system/patterns/dialogs.md
 */

/** The class core's dialog frame carries for every system dialog. */
export const DIALOG_CLASS = "l5r4-dialog";

/**
 * Show a dialog with one submit button and wait: core's `DialogV2.prompt`.
 * @param {object} config - DialogV2 configuration, with `ok` for the button
 * @returns {Promise<*>} The button callback's result, or null when closed with `rejectClose: false`
 */
export function askPrompt(config) {
  return foundry.applications.api.DialogV2.prompt(buildDialogConfig(config));
}

/**
 * Show a yes-or-no dialog and wait: core's `DialogV2.confirm`.
 * @param {object} config - DialogV2 configuration, with `yes` and `no` for the buttons
 * @returns {Promise<boolean|null>}
 */
export function askConfirm(config) {
  return foundry.applications.api.DialogV2.confirm(buildDialogConfig(config));
}

/**
 * Show a dialog with its own buttons and wait: core's `DialogV2.wait`.
 * @param {object} config - DialogV2 configuration, with `buttons`
 * @returns {Promise<*>} The pressed button's result, or null when closed with `rejectClose: false`
 */
export function askButtons(config) {
  return foundry.applications.api.DialogV2.wait(buildDialogConfig(config));
}

/**
 * Open a dialog without waiting for an answer.
 * @param {object} config - DialogV2 configuration
 * @returns {Promise<foundry.applications.api.DialogV2>} The rendered dialog
 */
export function openDialog(config) {
  return new foundry.applications.api.DialogV2(buildDialogConfig(config)).render({
    force: true
  });
}

/**
 * A dialog configuration with the system's class added to any it already lists.
 * @param {object} config - DialogV2 configuration
 * @returns {object}
 */
function buildDialogConfig(config) {
  return { ...config, classes: [...(config.classes ?? []), DIALOG_CLASS] };
}
