/**
 * @module apps/token-contrast
 * @description The design gallery's token rows (module/apps/design-gallery.js): each token's value as the stylesheet
 * resolves it in the window's theme and, for a color token, its chip and its WCAG 2 contrast ratio against the color
 * it is read over (docs/design-system/foundations/color.md, Contrast). A translucent color is composited over the
 * token under it, down to the surface core paints.
 */
import { GALLERY_COLORS, GALLERY_SURFACE } from "../config/design-gallery/colors.js";
import { F, T } from "../utils/localization.js";

/** Each color token's entry, by token, for the over and against lookups. */
const colorEntries = new Map(
  GALLERY_COLORS.flatMap(group => group.tokens).map(entry => [entry.token, entry])
);

/**
 * Write one token row's value and, for a color token, paint its chip and write its contrast ratio.
 * @param {HTMLElement} row - A `[data-token]` row
 * @param {object} read
 * @param {CSSStyleDeclaration} read.styles
 * @param {"light"|"dark"} read.theme
 * @param {CanvasRenderingContext2D} read.probe
 */
export function renderTokenRow(row, { styles, theme, probe }) {
  const token = row.dataset.token;
  const raw = rawOf(token, styles, theme);
  row.querySelector("[data-token-value]").textContent =
    raw || T("l5r4.apps.designGallery.foundations.notDefined");
  const ratioCell = row.querySelector("[data-token-ratio]");
  const chip = row.querySelector("[data-token-chip]");
  if (!ratioCell) {
    return;
  }
  const entry = colorEntries.get(token);
  const color = colorOf(token, { styles, theme, probe });
  chip?.setAttribute("fill", color ? `rgb(${color.slice(0, 3).join(" ")})` : "none");
  const against = entry.against ?? GALLERY_SURFACE.token;
  const other = colorOf(against, { styles, theme, probe });
  ratioCell.textContent = formatContrast(entry, { color, other, against });
}

/**
 * A color token's contrast against the color it is read over, with its minimum met or missed when it has one.
 * @param {object} entry - The token's GALLERY_COLORS entry
 * @param {object} pair
 * @param {number[]|null} pair.color - The token's color
 * @param {number[]|null} pair.other - The color it is read against
 * @param {string} pair.against - That color's token
 * @returns {string}
 */
function formatContrast(entry, { color, other, against }) {
  if (entry.image || !color || !other) {
    return T("l5r4.apps.designGallery.foundations.noRatio");
  }
  const value = getContrastRatio(color, other).toFixed(2);
  return entry.minimum
    ? F(
        Number(value) >= entry.minimum
          ? "l5r4.apps.designGallery.foundations.meets"
          : "l5r4.apps.designGallery.foundations.below",
        { ratio: value, against, minimum: entry.minimum }
      )
    : F("l5r4.apps.designGallery.foundations.ratio", { ratio: value, against });
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
