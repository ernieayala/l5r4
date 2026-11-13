/** How long a test waits for a document update before failing. */
const UPDATE_TIMEOUT_MS = 5000;

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
 * Wrap a test body so the test fails if it logs a console error. Warnings are not checked here: until
 * roadmap Stage 14 the system still calls deprecated APIs, which warn; the deprecations batch lists them.
 * @param {object} assert  Chai assert from the Quench context.
 * @returns {(body: () => Promise<void>) => () => Promise<void>}
 */
export function cleanTest(assert) {
  return body => async () => {
    const watch = watchConsole(["error"]);
    try {
      await body();
    } finally {
      watch.stop();
    }
    assert.deepEqual(watch.messages, [], "console errors during the test");
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
