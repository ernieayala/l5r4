/**
 * @module setup/enrichers
 * @description Registers the text links (roadmap/STAGE-14) as core text enrichers, so `@Check[...]`, `@Damage[...]`,
 * `@Condition[...]`, and `@Fear[...]` render as links in any journal, item description, or chat message. A link that
 * does not parse renders broken, with its reason. Core wraps each in `<enriched-content>` and calls `onRender` when
 * it joins the page [src: client/applications/elements/enriched-content.mjs:39-53].
 */
import { LINK_TEMPLATES } from "../config/templates.js";
import { T } from "../utils/localization.js";
import { LINK_PATTERN, parseLink } from "../utils/link-syntax.js";
import { formatLinkText, onLinkClick } from "../services/links.js";
import { postCheckRequest } from "../services/check-request.js";

/** The enricher's id, which core writes on the wrapper element. */
const ENRICHER_ID = "l5r4-link";

/** Font Awesome icon per link type. */
const ICONS = Object.freeze({
  Check: "fa-solid fa-dice-d10",
  Damage: "fa-solid fa-burst",
  Condition: "fa-solid fa-person-falling-burst",
  Fear: "fa-solid fa-ghost"
});

/** Register the text links with core's enricher list, once during init. */
export function registerEnrichers() {
  CONFIG.TextEditor.enrichers.push({
    id: ENRICHER_ID,
    pattern: LINK_PATTERN,
    enricher: renderLink,
    onRender: onRenderLink
  });
}

/**
 * Render one link found in text: its button, and for a GM's Check link the request control beside it, under one root
 * element, which core appends into its `<enriched-content>` wrapper [src: client/applications/ux/text-editor.mjs:264-273].
 * @param {RegExpMatchArray} match - [whole, type, params, label]
 * @returns {Promise<HTMLElement>}
 */
async function renderLink(match) {
  const [source, type, params, label = ""] = match;
  const spec = parseLink(type, params, label);
  const html = await foundry.applications.handlebars.renderTemplate(LINK_TEMPLATES.inlineLink, {
    ok: spec.ok,
    type,
    params,
    label: spec.label,
    icon: ICONS[type],
    text: spec.ok ? formatLinkText(spec) : "",
    source,
    reason: spec.ok ? "" : T(spec.error),
    // A GM's Check link carries a second control that posts a request card
    canRequest: spec.ok && type === "Check" && game.user.isGM
  });
  return foundry.utils.parseHTML(html);
}

/**
 * The link a rendered element carries, parsed again: the element's data attributes are page content.
 * @param {HTMLElement} link
 * @returns {import("../utils/link-syntax.js").LinkSpec}
 */
function specOf(link) {
  const { linkType, linkParams, linkLabel } = link.dataset;
  return parseLink(String(linkType), String(linkParams ?? ""), String(linkLabel ?? ""));
}

/**
 * Run a link's action when its button is pressed: a click, or Enter or Space, which a native button turns into one.
 * @param {HTMLElement} button
 * @param {Function} action
 * @param {AbortSignal} signal
 */
function onActivate(button, action, signal) {
  button.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    { signal }
  );
}

/**
 * Wire a rendered link, and a GM's request control beside a Check link.
 * @param {HTMLElement} element - The `<enriched-content>` wrapper
 * @param {{signal: AbortSignal}} options
 */
function onRenderLink(element, { signal }) {
  const link = element.querySelector("[data-link-type]");
  if (!link) {
    return;
  }
  onActivate(link, () => onLinkActivate(link, onLinkClick), signal);
  const request = element.querySelector("[data-link-request]");
  if (request) {
    onActivate(request, () => onLinkActivate(link, postCheckRequest), signal);
  }
}

/**
 * Run an action on the link's spec, parsed again from its element, when it parses.
 * @param {HTMLElement} link
 * @param {function(import("../utils/link-syntax.js").LinkSpec): unknown} action
 */
function onLinkActivate(link, action) {
  const spec = specOf(link);
  if (spec.ok) {
    action(spec);
  }
}
