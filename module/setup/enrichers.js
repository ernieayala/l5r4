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
 * Render one link found in text.
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
    reason: spec.ok ? "" : T(spec.error)
  });
  const holder = document.createElement("span");
  holder.innerHTML = html.trim();
  return holder.firstElementChild;
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
 * Run a link from a click or from Enter or Space.
 * @param {HTMLElement} link
 * @param {Function} action
 * @param {AbortSignal} signal
 */
function onActivate(link, action, signal) {
  link.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
    { signal }
  );
  link.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    },
    { signal }
  );
}

/**
 * Wire a rendered link. A GM's Check link gets a second button that posts a request card.
 * @param {HTMLElement} element - The `<enriched-content>` wrapper
 * @param {{signal: AbortSignal}} options
 */
function onRenderLink(element, { signal }) {
  const link = element.querySelector(".l5r4-inline-link[data-link-type]");
  if (!link) {
    return;
  }
  onActivate(
    link,
    () => {
      const spec = specOf(link);
      if (spec.ok) {
        onLinkClick(spec);
      }
    },
    signal
  );
  if (
    game.user.isGM &&
    link.dataset.linkType === "Check" &&
    !element.querySelector(".l5r4-inline-link-request")
  ) {
    const request = document.createElement("a");
    request.className = "l5r4-inline-link-request";
    request.setAttribute("role", "button");
    request.tabIndex = 0;
    request.dataset.tooltip = T("l5r4.ui.links.request");
    request.setAttribute("aria-label", T("l5r4.ui.links.request"));
    request.innerHTML = '<i class="fa-solid fa-comment-dots" inert></i>';
    link.after(request);
    onActivate(
      request,
      () => {
        const spec = specOf(link);
        if (spec.ok) {
          postCheckRequest(spec);
        }
      },
      signal
    );
  }
}
