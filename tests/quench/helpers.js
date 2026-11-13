/** How long a test waits for a document update before failing. */
const UPDATE_TIMEOUT_MS = 5000;

/**
 * How long core's chat pop-up card for a new message takes to render and animate in, with margin. A message deleted
 * before then leaves core looking up a card that is gone (client/applications/sidebar/tabs/chat.mjs:1318-1321), and
 * the promise rejects up to a second later, inside whatever test runs then. The system never deletes messages; tests
 * that clean up their messages do.
 */
const CHAT_NOTIFICATION_SETTLE_MS = 2000;

/**
 * Wait until chat pop-up cards from earlier messages have finished, so a message deleted now does not reject in a
 * later test, and a rejection from an earlier batch lands before this one starts.
 * @returns {Promise<void>}
 */
export function settleChatNotifications() {
  return new Promise(resolve => setTimeout(resolve, CHAT_NOTIFICATION_SETTLE_MS));
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
