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
 * Keep a dialog's submit button disabled while what its form holds cannot be submitted, its tooltip saying why, so a
 * press never closes the dialog on input it would then throw away (#142; foundations/states.md, Disabled).
 * @param {HTMLFormElement} form - The rendered dialog's form
 * @param {function(HTMLFormElement): string} getRefusal - Why the form cannot be submitted now; empty when it can
 */
export function bindSubmitCheck(form, getRefusal) {
  const submit = form.querySelector("[data-action='ok']");
  const update = () => {
    const reason = getRefusal(form);
    submit.disabled = Boolean(reason);
    if (reason) {
      submit.dataset.tooltip = reason;
    } else {
      delete submit.dataset.tooltip;
    }
  };
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
}

/**
 * A dialog configuration with the system's class added to any it already lists.
 * @param {object} config - DialogV2 configuration
 * @returns {object}
 */
function buildDialogConfig(config) {
  return { ...config, classes: [...(config.classes ?? []), DIALOG_CLASS] };
}
