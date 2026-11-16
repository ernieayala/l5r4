/**
 * @module apps/design-gallery
 * @description The living design gallery (roadmap/STAGE-17 Deliverable 2, decision 7): a GM-only window, opened from
 * the system's settings menu, that shows the design system's foundations as the stylesheet has them in the current
 * theme, every component page rendered by the system's own templates from fixture data
 * (module/config/design-gallery/, one file per section), and one sample of each pattern. A token the stylesheet does not declare yet
 * shows as not defined, so the gallery shows today's state.
 */

import { SYS_ID } from "../config/constants.js";
import { STANCES } from "../config/localization.js";
import { GALLERY_COLORS, GALLERY_SURFACE } from "../config/design-gallery/colors.js";
import { GALLERY_COMPONENTS } from "../config/design-gallery/components.js";
import { GALLERY_CONTEXTS, GALLERY_ROLLS } from "../config/design-gallery/contexts.js";
import {
  GALLERY_FRAMES,
  GALLERY_ICONS,
  GALLERY_SPACE,
  GALLERY_TYPE
} from "../config/design-gallery/foundations.js";
import { GALLERY_PATTERNS } from "../config/design-gallery/patterns.js";
import { F, T } from "../utils/localization.js";
import { prepareItemSheetOptions } from "../documents/item/integration/sheet-data.js";

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { renderTemplate } = foundry.applications.handlebars;

/** Where the gallery's own templates live. */
const TEMPLATES = `systems/${SYS_ID}/templates/apps/design-gallery`;

/** Each color token's entry, by token, for the over and against lookups. */
const colorEntries = new Map(
  GALLERY_COLORS.flatMap(group => group.tokens).map(entry => [entry.token, entry])
);

/**
 * The design gallery window, one per client.
 */
export default class DesignGalleryApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `${SYS_ID}-design-gallery`,
    classes: ["l5r4", "l5r4-design-gallery"],
    window: {
      title: "l5r4.apps.designGallery.title",
      icon: "fa-solid fa-palette",
      resizable: true
    },
    position: { width: 960, height: 820 },
    actions: {
      "toggle-theme": DesignGalleryApplication.#onToggleTheme,
      "open-sample-dialog": DesignGalleryApplication.#onOpenSampleDialog,
      // Core's dice row names this action; the chat log runs it there, the gallery here
      expandRoll: DesignGalleryApplication.#onExpandRoll
    }
  };

  static PARTS = {
    foundations: { template: `${TEMPLATES}/foundations.hbs` },
    components: { template: `${TEMPLATES}/components.hbs` },
    patterns: { template: `${TEMPLATES}/patterns.hbs` }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return Object.assign(context, {
      colors: GALLERY_COLORS,
      type: GALLERY_TYPE,
      space: GALLERY_SPACE,
      frames: GALLERY_FRAMES,
      icons: GALLERY_ICONS,
      components: await Promise.all(GALLERY_COMPONENTS.map(entry => this.#renderComponent(entry))),
      patterns: await Promise.all(
        GALLERY_PATTERNS.map(async pattern => ({
          ...pattern,
          samples: await Promise.all(pattern.samples.map(sample => this.#renderSample(sample)))
        }))
      )
    });
  }

  /**
   * GMs only: the settings menu is restricted, and the window refuses anyone else who opens it another way.
   * @override
   */
  _canRender(options) {
    if (!game.user.isGM) {
      throw new Error(T("l5r4.apps.designGallery.gmOnly"));
    }
    return super._canRender(options);
  }

  /**
   * Start in the interface's theme, set on the window itself so the toggle can switch it.
   * @override
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.element.classList.add("themed", `theme-${themeOf(document.body)}`);
  }

  /**
   * Fill in each token's value and contrast ratio for the theme the window shows.
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#renderTokenValues();
  }

  /**
   * Switch the window between core's light and dark themes, then measure the tokens again.
   * @this {DesignGalleryApplication}
   */
  static #onToggleTheme() {
    const next = themeOf(this.element) === "dark" ? "light" : "dark";
    this.element.classList.remove("theme-light", "theme-dark");
    this.element.classList.add("themed", `theme-${next}`);
    this.#renderTokenValues();
  }

  /**
   * Open the pattern's sample dialog in core's own dialog frame. Its button only closes it.
   * @this {DesignGalleryApplication}
   */
  static async #onOpenSampleDialog() {
    const { dialog } = GALLERY_PATTERNS.find(pattern => pattern.dialog);
    await new DialogV2({
      window: { title: T("l5r4.apps.designGallery.patterns.dialog") },
      position: { width: 420 },
      content: await renderTemplate(
        dialog.partial,
        this.#contextOf({ context: "plain", with: dialog.with })
      ),
      buttons: [{ action: "ok", label: "l5r4.ui.common.roll", default: true }]
    }).render({ force: true });
  }

  /**
   * Show or hide a dice row's dice, as the chat log does.
   * @this {DesignGalleryApplication}
   * @param {PointerEvent} _event
   * @param {HTMLElement} element - The dice row
   */
  static #onExpandRoll(_event, element) {
    element.classList.toggle("expanded");
  }

  /**
   * A component entry with its samples rendered.
   * @param {object} entry - A GALLERY_COMPONENTS entry
   * @returns {Promise<object>}
   */
  async #renderComponent(entry) {
    return {
      ...entry,
      title: T(`l5r4.apps.designGallery.components.${camelOf(entry.page)}`),
      samples: await Promise.all(entry.samples.map(sample => this.#renderSample(sample)))
    };
  }

  /**
   * One sample: its partial rendered from its context, with its frame and label.
   * @param {object} sample
   * @returns {Promise<{label: string, partial: string, scope: string, html: string}>}
   */
  async #renderSample(sample) {
    const context = this.#contextOf(sample);
    if (sample.roll) {
      context.roll = await Roll.fromData(GALLERY_ROLLS[sample.roll]).render();
    }
    if (sample.extras) {
      context.extras = await renderTemplate(
        sample.extras.partial,
        this.#contextOf({ context: "plain", with: sample.extras.with })
      );
    }
    return {
      label: sample.label,
      partial: sample.partial,
      scope: sample.scope,
      html: await renderTemplate(sample.partial, context)
    };
  }

  /**
   * A sample's context: its base context with its own values merged over, phrases localized, and the option lists
   * the sheets add.
   * @param {{context: string, with?: object}} sample
   * @returns {object}
   */
  #contextOf(sample) {
    const merged = foundry.utils.mergeObject(
      foundry.utils.deepClone(GALLERY_CONTEXTS[sample.context]),
      foundry.utils.deepClone(sample.with ?? {}),
      { inplace: false }
    );
    const context = prepareItemSheetOptions(formatPhrases(merged));
    context.config.stances = STANCES;
    context.SYS_ID = SYS_ID;
    return context;
  }

  /** Write each token's value and ratio, and paint its chip, for the window's theme. */
  #renderTokenValues() {
    const theme = themeOf(this.element);
    const probe = document.createElement("canvas").getContext("2d");
    const styles = getComputedStyle(this.element);
    this.element.querySelector("[data-gallery-theme]").textContent = T(
      `l5r4.apps.designGallery.theme.${theme}`
    );
    for (const row of this.element.querySelectorAll("[data-token]")) {
      const token = row.dataset.token;
      const raw = rawOf(token, styles, theme);
      row.querySelector("[data-token-value]").textContent =
        raw || T("l5r4.apps.designGallery.foundations.notDefined");
      const ratioCell = row.querySelector("[data-token-ratio]");
      const chip = row.querySelector("[data-token-chip]");
      if (!ratioCell) {
        continue;
      }
      const entry = colorEntries.get(token);
      const color = colorOf(token, { styles, theme, probe });
      chip?.setAttribute("fill", color ? `rgb(${color.slice(0, 3).join(" ")})` : "none");
      const against = entry.against ?? GALLERY_SURFACE.token;
      const other = colorOf(against, { styles, theme, probe });
      if (entry.image || !color || !other) {
        ratioCell.textContent = T("l5r4.apps.designGallery.foundations.noRatio");
        continue;
      }
      const value = getContrastRatio(color, other).toFixed(2);
      ratioCell.textContent = entry.minimum
        ? F(
            Number(value) >= entry.minimum
              ? "l5r4.apps.designGallery.foundations.meets"
              : "l5r4.apps.designGallery.foundations.below",
            { ratio: value, against, minimum: entry.minimum }
          )
        : F("l5r4.apps.designGallery.foundations.ratio", { ratio: value, against });
    }
  }
}

/**
 * Localize every phrase (`{ i18n, data }`) in a fixture value, phrases inside a phrase's data first.
 * @param {*} value
 * @returns {*}
 */
function formatPhrases(value) {
  if (Array.isArray(value)) {
    return value.map(formatPhrases);
  }
  if (value && typeof value === "object") {
    if (typeof value.i18n === "string") {
      return F(value.i18n, formatPhrases(value.data ?? {}));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, formatPhrases(child)])
    );
  }
  return value;
}

/**
 * The theme an element shows: its own theme class, else the interface's on the body.
 * @param {HTMLElement} element
 * @returns {"light"|"dark"}
 */
function themeOf(element) {
  if (element.classList.contains("theme-dark")) {
    return "dark";
  }
  if (element.classList.contains("theme-light")) {
    return "light";
  }
  return element === document.body ? "light" : themeOf(document.body);
}

/**
 * `page-name` as `pageName`, the lang segment for a page.
 * @param {string} page
 * @returns {string}
 */
function camelOf(page) {
  return page.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

/**
 * A token's value as the stylesheet resolves it on the window, or the reference surface, which core paints.
 * @param {string} token
 * @param {CSSStyleDeclaration} styles
 * @param {"light"|"dark"} theme
 * @returns {string}  Empty when the token is not declared
 */
function rawOf(token, styles, theme) {
  return token === GALLERY_SURFACE.token
    ? GALLERY_SURFACE[theme]
    : styles.getPropertyValue(token).trim();
}

/**
 * A token's color as opaque RGB, translucent values composited over the token color.md puts under them
 * (foundations/color.md, Contrast), down to the surface.
 * @param {string} token
 * @param {object} read
 * @param {CSSStyleDeclaration} read.styles
 * @param {"light"|"dark"} read.theme
 * @param {CanvasRenderingContext2D} read.probe
 * @returns {number[]|null}  [r, g, b, a] with a = 1, or null when the token holds no color
 */
function colorOf(token, { styles, theme, probe }) {
  const color = parseColor(rawOf(token, styles, theme), probe);
  if (!color || color[3] >= 1 || token === GALLERY_SURFACE.token) {
    return color;
  }
  const under = colorOf(colorEntries.get(token)?.over ?? GALLERY_SURFACE.token, {
    styles,
    theme,
    probe
  });
  if (!under) {
    return null;
  }
  const alpha = color[3];
  return [...color.slice(0, 3).map((channel, i) => channel * alpha + under[i] * (1 - alpha)), 1];
}

/**
 * A CSS color as [r, g, b, a] in 0-255 and 0-1, read back through a canvas, which serializes any color it accepts.
 * @param {string} value
 * @param {CanvasRenderingContext2D} probe
 * @returns {number[]|null}  Null when the value is not a color
 */
function parseColor(value, probe) {
  if (!value) {
    return null;
  }
  const toCanvasColor = sentinel => {
    probe.fillStyle = sentinel;
    probe.fillStyle = value;
    return probe.fillStyle;
  };
  const normal = toCanvasColor("#000000");
  if (normal !== toCanvasColor("#ffffff")) {
    return null;
  }
  const hex = normal.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) {
    return [...hex.slice(1).map(part => parseInt(part, 16)), 1];
  }
  const rgba = normal.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
  if (rgba) {
    return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4] ?? 1)];
  }
  const srgb = normal.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
  if (srgb) {
    return [...srgb.slice(1, 4).map(part => Number(part) * 255), Number(srgb[4] ?? 1)];
  }
  return null;
}

/**
 * The WCAG 2 contrast ratio of two opaque colors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function getContrastRatio(a, b) {
  const [light, dark] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * WCAG 2 relative luminance of an opaque color.
 * @param {number[]} color
 * @returns {number}
 */
function luminanceOf(color) {
  const [r, g, b] = color.slice(0, 3).map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
