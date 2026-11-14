import { buildPool, parseRollAndKeep, poolFormula } from "../../module/utils/check.js";
import { collectCheck } from "../../module/services/dice/check/collect.js";

/**
 * Answer the next check dialog: set its fields, then click Roll.
 * @param {Record<string, string|boolean>} values  Field name to value; booleans set checkboxes
 * @returns {Promise<string[]>} Resolves with the dialog's modifier labels once it is answered
 */
export function answerCheckDialog(values = {}) {
  return new Promise(resolve => {
    Hooks.once("renderDialogV2", app => {
      const form = app.element.querySelector("form") ?? app.element;
      const labels = [...app.element.querySelectorAll(".check-modifier-label")].map(e =>
        e.textContent.trim()
      );
      for (const [name, value] of Object.entries(values)) {
        const input = form.querySelector(`[name="${name}"]`);
        if (input.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
        }
      }
      app.element.querySelector('[data-action="ok"]').click();
      resolve(labels);
    });
  });
}

/**
 * Answer every roll dialog that opens with its defaults until the returned function is called: for batches whose
 * actions open the roll dialog as a side effect (taking the Full Defense Stance rolls Defense / Reflexes, p.84).
 * @returns {function(): void}  Stops answering
 */
export function autoAnswerRolls() {
  const id = Hooks.on("renderDialogV2", app => {
    app.element.querySelector('[data-action="ok"]')?.click();
  });
  return () => Hooks.off("renderDialogV2", id);
}

/**
 * For a batch whose actions roll as a side effect (taking the Full Defense Stance, p.84): answer each roll dialog
 * with its defaults while the batch runs, and delete the messages it posts afterwards.
 * @param {{before: Function, after: Function}} context  The batch's Quench context
 */
export function guardRolls({ before, after }) {
  let stop;
  let hook;
  const posted = [];
  before(() => {
    stop = autoAnswerRolls();
    hook = Hooks.on("createChatMessage", message => posted.push(message));
  });
  after(async function () {
    this.timeout(30_000);
    stop();
    Hooks.off("createChatMessage", hook);
    await settleChatNotifications();
    for (const message of posted) {
      if (game.messages.has(message.id)) {
        await message.delete();
      }
    }
  });
}

/**
 * Wait until a condition holds. Core runs combat turn events from `Combat#_onUpdate` without awaiting them
 * (client/documents/combat.mjs:658-673), so what they do (effect expiry, save cards) lands after `nextTurn()`
 * resolves.
 * @param {function(): boolean} condition
 * @param {number} [timeout=5000]  Milliseconds before giving up
 * @returns {Promise<boolean>} Whether the condition held in time
 */
export async function waitFor(condition, timeout = 5000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return condition();
}

/**
 * What an actor's rules, stances, and conditions give one check, read through the roll pipeline's own collection
 * (module/services/dice/check/collect.js): the dice and total of the modifiers the dialog starts ticked for that
 * attack range, and the TN changes.
 * @param {Actor} actor
 * @param {string} kind  skill, trait, ring, spell, attack, damage, ...
 * @param {object} [spec]
 * @param {"melee"|"ranged"} [spec.range="melee"]
 * @param {Actor|null} [spec.target]
 * @param {string} [spec.skill]
 * @param {string} [spec.trait]
 * @param {string} [spec.ring]
 * @returns {{roll: number, keep: number, total: number, tn: number}}
 */
export function checkEffects(actor, kind, { range = "melee", target = null, ...spec } = {}) {
  const ctx = collectCheck(actor, { kind, target, ...spec });
  const inRange = m => !m.range || m.range === range;
  const modifiers = ctx.modifiers.filter(m => m.enabled && inRange(m));
  const sum = key => modifiers.reduce((total, m) => total + m[key], 0);
  return {
    roll: sum("roll"),
    keep: sum("keep"),
    total: sum("total"),
    tn: ctx.tnModifiers.filter(inRange).reduce((total, m) => total + m.value, 0)
  };
}

/**
 * The Foundry formula the roll pipeline builds for a pool already under the Ten Dice Rule
 * (module/utils/check.js poolFormula), from rolled dice, kept dice, and a bonus.
 * @param {number} roll
 * @param {number} keep
 * @param {number} bonus
 * @param {{emphasis?: boolean, unskilled?: boolean, explode?: number}} [options]
 * @returns {string}
 */
export function buildFormula(
  roll,
  keep,
  bonus,
  { emphasis = false, unskilled = false, explode = 10 } = {}
) {
  return poolFormula({
    roll,
    keep,
    bonus,
    explode: unskilled ? null : explode,
    rerollOnes: emphasis
  });
}

/**
 * Inline Roll & Keep notation as the chat parser reads it: the parsed flags and the pool after the Ten Dice Rule.
 * @param {string} notation  Such as "e7k3+2"
 * @returns {{roll: number, keep: number, bonus: number, unskilled: boolean, rerollOnes: boolean,
 *   explode: number|null}}
 */
export function parseNotation(notation) {
  const parsed = parseRollAndKeep(notation);
  return { ...buildPool(parsed), unskilled: parsed.unskilled, rerollOnes: parsed.rerollOnes };
}

/** How long a test waits for a document update before failing. */
const UPDATE_TIMEOUT_MS = 5000;

/**
 * Core shows a new message as a pop-up card: it adds the card hidden, waits for a spacer animation, then looks the
 * card up again to reveal it (client/applications/sidebar/tabs/chat.mjs:1288-1327). A message deleted before the
 * reveal takes its card with it, and the lookup rejects inside whatever test runs then. The animation waits for
 * frames, which Chrome throttles, so no fixed delay is enough. The system never deletes messages; tests that clean
 * up their messages do.
 */
const PENDING_CHAT_CARD = "#chat-notifications .chat-log :is(.message[hidden], .spacer)";

/** Time for a message created right before the call to start its pop-up. */
const CHAT_NOTIFICATION_START_MS = 500;

/** Longest wait for pending pop-ups before giving up. */
const CHAT_NOTIFICATION_TIMEOUT_MS = 15_000;

/**
 * Wait until every chat pop-up card that has started is revealed, so a message deleted now does not reject in a
 * later test, and a rejection from an earlier batch lands before this one starts.
 * @returns {Promise<void>}
 */
export async function settleChatNotifications() {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  await wait(CHAT_NOTIFICATION_START_MS);
  const deadline = Date.now() + CHAT_NOTIFICATION_TIMEOUT_MS;
  while (document.querySelector(PENDING_CHAT_CARD) && Date.now() < deadline) {
    await wait(100);
  }
}

/**
 * Timeout for a test that closes several windows. Foundry 14.370 animates every ApplicationV2 close (about
 * 1 s each), so two or more closes outrun Mocha's 2000 ms default.
 */
export const MULTI_CLOSE_TIMEOUT_MS = 10_000;

/**
 * Record console output at the given levels until `stop()` is called. The output still reaches the console.
 * @param {Array<"error"|"warn">} levels
 * @returns {{messages: string[], stop: () => void}}
 */
export function watchConsole(levels) {
  const messages = [];
  // Replacing console methods is the point here: the wrapper records output, then passes it through.
  // eslint-disable-next-line no-console
  const originals = Object.fromEntries(levels.map(level => [level, console[level]]));
  for (const level of levels) {
    // eslint-disable-next-line no-console
    console[level] = (...args) => {
      messages.push(`${level}: ${args.map(arg => arg?.stack ?? String(arg)).join(" ")}`);
      originals[level](...args);
    };
  }
  return { messages, stop: () => Object.assign(console, originals) };
}

/**
 * Wrap a test body so the test fails if it logs a console error or warning, posts an error notification, or
 * leaves a promise rejection or an error unhandled (an async click handler that throws reaches neither console
 * method). Info and warning notifications are the system telling the user why an action did nothing, so they are
 * not echoed to the console during the test; core echoes a notification only once it is displayed, which can be
 * after the test ends (client/applications/ui/notifications.mjs:278-281). The body runs with Mocha's test
 * context, so it can call `this.timeout()`.
 * @param {object} assert  Chai assert from the Quench context.
 * @returns {(body: () => Promise<void>) => () => Promise<void>}
 */
export function cleanTest(assert) {
  return body =>
    async function () {
      const watch = watchConsole(["error", "warn"]);
      const onRejection = event =>
        watch.messages.push(`unhandled rejection: ${event.reason?.stack ?? event.reason}`);
      const onError = event =>
        watch.messages.push(`uncaught: ${event.error?.stack ?? event.message}`);
      const notify = ui.notifications.notify;
      ui.notifications.notify = function (message, type, options = {}) {
        if (type === "error") {
          watch.messages.push(`error notification: ${message}`);
        }
        return notify.call(this, message, type, { ...options, console: false });
      };
      window.addEventListener("unhandledrejection", onRejection);
      window.addEventListener("error", onError);
      try {
        await body.call(this);
      } finally {
        watch.stop();
        ui.notifications.notify = notify;
        window.removeEventListener("unhandledrejection", onRejection);
        window.removeEventListener("error", onError);
      }
      assert.deepEqual(watch.messages, [], "console errors or warnings during the test");
    };
}

/**
 * Resolve once `document` has been updated, or reject after UPDATE_TIMEOUT_MS. Call it before triggering the
 * update, so the hook is listening when it fires.
 * @param {foundry.abstract.Document} document
 * @returns {Promise<void>}
 */
export function nextUpdate(document) {
  const hook = `update${document.documentName}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      Hooks.off(hook, id);
      reject(new Error(`No ${hook} for ${document.name} within ${UPDATE_TIMEOUT_MS} ms`));
    }, UPDATE_TIMEOUT_MS);
    const id = Hooks.on(hook, updated => {
      if (updated !== document) {
        return;
      }
      clearTimeout(timer);
      Hooks.off(hook, id);
      resolve();
    });
  });
}

/**
 * Change a form control on a rendered sheet the way a user does, then wait for the save and the re-render.
 * Renders run one at a time, so awaiting a new render waits for the one the update queued.
 * @param {foundry.applications.api.DocumentSheetV2} sheet
 * @param {string} selector  CSS selector of the input.
 * @param {string} value
 */
export async function changeThroughSheet(sheet, selector, value) {
  await sheet.render();
  const input = sheet.element.querySelector(selector);
  const saved = nextUpdate(sheet.document);
  input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await saved;
  await sheet.render();
}
