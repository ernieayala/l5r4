import { SYS_ID } from "../../module/config/constants.js";
import { cleanTest, MULTI_CLOSE_TIMEOUT_MS, waitFor } from "./helpers.js";

/** The gallery window's id (module/apps/design-gallery.js). */
const GALLERY_ID = `${SYS_ID}-design-gallery`;

/** A registered partial: a `_name.hbs` in a `_partials/` folder. The gallery's own partial frames samples. */
const PARTIAL = new RegExp(
  `^systems/${SYS_ID}/templates/(?!apps/design-gallery/).+/_partials/_[^/]+\\.hbs$`
);

/** Longer than the debounce of core's search filter (200 ms), so the settings window is done with its filter. */
const SEARCH_FILTER_SETTLE_MS = 500;

/** Elements that take keyboard focus. */
const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

/** Elements a pointer presses. */
const CONTROL = 'button, a, [role="button"], [data-action]';

/** The computed properties a focus style changes. */
const FOCUS_PROPERTIES = [
  "outlineStyle",
  "outlineWidth",
  "outlineColor",
  "boxShadow",
  "borderColor",
  "backgroundColor",
  "color",
  "textDecorationLine"
];

/**
 * Where an element sits, for a failure message: its tag, name or action, and the template that drew it.
 * @param {HTMLElement} element
 * @returns {string}
 */
function describe(element) {
  const action = element.dataset.action ? `[data-action="${element.dataset.action}"]` : "";
  const name = element.getAttribute("name") ? `[name="${element.getAttribute("name")}"]` : "";
  const partial = element.closest("[data-gallery-partial]")?.dataset.galleryPartial ?? "gallery";
  return `${element.tagName.toLowerCase()}${action}${name} in ${partial.replace(/^.*\/templates\//, "")}`;
}

/**
 * Whether an element is drawn at all: laid out, visible, and not fully transparent through its ancestors.
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isShown(element) {
  if (!element.getClientRects().length || getComputedStyle(element).visibility === "hidden") {
    return false;
  }
  for (let node = element; node; node = node.parentElement) {
    if (Number(getComputedStyle(node).opacity) === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Batch `l5r4-enhanced.design-gallery` (roadmap/STAGE-17 Deliverable 2): the gallery opens from the system's
 * settings menu for a GM; every registered partial and every scss/components/ file has a gallery entry; and, in
 * core's light and dark themes, every icon-only control has an accessible name and every focusable element shows a
 * focus style. The gallery renders fixture data and creates no document.
 * @param {object} quench  The Quench API object.
 */
export function registerDesignGalleryTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.design-gallery`,
    context => {
      const { describe: group, it, after, assert } = context;
      const clean = cleanTest(assert);

      /** The open gallery. */
      const gallery = () => foundry.applications.instances.get(GALLERY_ID);

      /** Open the gallery unless it is open. */
      const openGallery = async () => {
        if (!gallery()?.rendered) {
          await new (game.settings.menus.get(`${SYS_ID}.designGallery`).type)().render({
            force: true
          });
        }
        return gallery();
      };

      /** Switch the gallery to a theme with its own toggle. */
      const showTheme = async theme => {
        const app = await openGallery();
        if (!app.element.classList.contains(`theme-${theme}`)) {
          app.element.querySelector('[data-action="toggle-theme"]').click();
        }
        assert.isTrue(
          app.element.classList.contains(`theme-${theme}`),
          `the gallery shows the ${theme} theme`
        );
        return app;
      };

      after(async function () {
        this.timeout(MULTI_CLOSE_TIMEOUT_MS);
        await gallery()?.close({ animate: false });
        for (const app of foundry.applications.instances.values()) {
          if (app instanceof foundry.applications.api.DialogV2) {
            await app.close({ animate: false });
          }
        }
      });

      group("Opening", () => {
        it(
          "should open from the system's settings menu for a GM, and the menu is GM-only",
          clean(async function () {
            this.timeout(20_000);
            await gallery()?.close({ animate: false });
            const menu = game.settings.menus.get(`${SYS_ID}.designGallery`);
            assert.isTrue(menu.restricted, "the menu is restricted to GMs");
            const config = new foundry.applications.settings.SettingsConfig();
            await config.render({ force: true });
            try {
              config.element
                .querySelector(`[data-action="openSubmenu"][data-key="${SYS_ID}.designGallery"]`)
                .click();
              assert.isTrue(await waitFor(() => gallery()?.rendered, 15_000), "the gallery opens");
            } finally {
              // Core's settings window runs its search filter on a debounce after it renders
              // [src: client/applications/api/category-browser.mjs:65-69]; closing first leaves it a null element
              await new Promise(resolve => setTimeout(resolve, SEARCH_FILTER_SETTLE_MS));
              await config.close({ animate: false });
            }
          })
        );
      });

      group("Entries", () => {
        it(
          "should give every registered partial a gallery entry",
          clean(async function () {
            this.timeout(20_000);
            const app = await openGallery();
            const partials = Object.keys(Handlebars.partials).filter(key => PARTIAL.test(key));
            assert.isNotEmpty(partials, "the system registers partials");
            const missing = partials.filter(
              path => !app.element.querySelector(`[data-gallery-partial="${path}"]`)
            );
            assert.deepEqual(missing, [], "partials with no gallery sample");
          })
        );

        it(
          "should give every scss/components/ file a gallery entry",
          clean(async function () {
            this.timeout(20_000);
            const app = await openGallery();
            const { files } = await foundry.applications.apps.FilePicker.implementation.browse(
              "data",
              `systems/${SYS_ID}/scss/components`
            );
            assert.isNotEmpty(files, "the folder lists its files");
            const missing = files
              .map(file => file.replace(`systems/${SYS_ID}/`, ""))
              .filter(file => !app.element.querySelector(`[data-gallery-scss="${file}"]`));
            assert.deepEqual(missing, [], "stylesheets with no gallery entry");
          })
        );
      });

      for (const theme of ["light", "dark"]) {
        group(`In the ${theme} theme`, () => {
          it(
            "should give every icon-only control an accessible name",
            clean(async function () {
              this.timeout(20_000);
              const app = await showTheme(theme);
              const unnamed = [...app.element.querySelectorAll(CONTROL)]
                .filter(
                  control =>
                    !["INPUT", "SELECT", "TEXTAREA"].includes(control.tagName) &&
                    !control.textContent.trim() &&
                    control.querySelector("i, img, svg")
                )
                .filter(control => !control.getAttribute("aria-label")?.trim())
                .map(describe);
              assert.deepEqual(unnamed, [], "icon-only controls with no aria-label");
            })
          );

          it(
            "should show a focus style on every focusable element",
            clean(async function () {
              this.timeout(60_000);
              const app = await showTheme(theme);
              const unstyled = [];
              for (const element of app.element.querySelectorAll(FOCUSABLE)) {
                if (element.disabled || !element.getClientRects().length) {
                  continue;
                }
                const before = getComputedStyle(element);
                const rest = FOCUS_PROPERTIES.map(property => before[property]);
                element.focus({ focusVisible: true });
                // Core's controls ease into their focus look; read the end of each transition
                for (const animation of element.getAnimations()) {
                  if (animation instanceof CSSTransition) {
                    animation.finish();
                  }
                }
                const focused = getComputedStyle(element);
                const changed = FOCUS_PROPERTIES.some(
                  (property, i) => focused[property] !== rest[i]
                );
                if (document.activeElement !== element || !changed || !isShown(element)) {
                  unstyled.push(describe(element));
                }
                element.blur();
              }
              assert.deepEqual(unstyled, [], "focusable elements with no visible focus style");
            })
          );
        });
      }

      group("Gallery controls", () => {
        it(
          "should switch the theme and measure each token again",
          clean(async function () {
            this.timeout(20_000);
            const app = await openGallery();
            const value = () =>
              app.element.querySelector('[data-token="--color-light-1"] [data-token-value]')
                .textContent;
            const before = app.element.classList.contains("theme-dark") ? "dark" : "light";
            app.element.querySelector('[data-action="toggle-theme"]').click();
            const after = before === "dark" ? "light" : "dark";
            assert.isTrue(app.element.classList.contains(`theme-${after}`), "the theme switched");
            assert.isNotEmpty(value(), "the token's value is filled in");
            assert.equal(
              app.element.querySelector("[data-gallery-theme]").textContent,
              game.i18n.localize(`l5r4.apps.designGallery.theme.${after}`)
            );
          })
        );

        it(
          "should expand a dice row as the chat log does",
          clean(async function () {
            this.timeout(20_000);
            const app = await openGallery();
            const row = app.element.querySelector('[data-action="expandRoll"]');
            assert.isFalse(row.classList.contains("expanded"));
            row.click();
            assert.isTrue(row.classList.contains("expanded"), "the dice show");
            row.click();
            assert.isFalse(row.classList.contains("expanded"), "the dice hide again");
          })
        );

        it(
          "should open the sample dialog in core's dialog frame",
          clean(async function () {
            this.timeout(20_000);
            const app = await openGallery();
            const opened = new Promise(resolve => Hooks.once("renderDialogV2", resolve));
            app.element.querySelector('[data-action="open-sample-dialog"]').click();
            const dialog = await opened;
            try {
              assert.isNotNull(
                dialog.element.querySelector(".l5r4-check-dialog"),
                "the check dialog's content"
              );
            } finally {
              await dialog.close({ animate: false });
            }
          })
        );
      });
    },
    { displayName: "L5R4: Design gallery" }
  );
}
