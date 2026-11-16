import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DIALOG_TEMPLATES } from "../../../../module/config/templates.js";
import { askDisadvantageCap } from "../../../../module/services/xp/disadvantage-cap.js";

/**
 * A prompt that answers with the ok button's callback over a form holding `value`, or with `closed` when it is set.
 * @param {object} answer - What the user does
 * @param {string} [answer.value] - The field's value when the user presses OK
 * @param {boolean} [answer.closed] - Whether the user closes the dialog instead
 * @returns {import("vitest").Mock} The prompt
 */
function stubPrompt({ value, closed = false }) {
  return vi.fn(async config => {
    if (closed) {
      return null;
    }
    const button = { form: { elements: { disadvantageCap: { value } } } };
    return config.ok.callback(new Event("click"), button);
  });
}

describe("Disadvantage cap prompt", () => {
  let prompt;
  let renderTemplate;

  beforeEach(() => {
    renderTemplate = vi.fn(async () => "<div></div>");
    globalThis.game = { i18n: { localize: key => key } };
    globalThis.foundry = {
      applications: { api: { DialogV2: {} }, handlebars: { renderTemplate } }
    };
  });

  afterEach(() => {
    delete globalThis.game;
    delete globalThis.foundry;
  });

  /**
   * Install a prompt as core's `DialogV2.prompt`.
   * @param {object} answer - See stubPrompt
   */
  function answerWith(answer) {
    prompt = stubPrompt(answer);
    globalThis.foundry.applications.api.DialogV2.prompt = prompt;
  }

  it("should render its content from the dialog template with the current cap", async () => {
    answerWith({ value: "10" });
    await askDisadvantageCap(10);
    expect(renderTemplate).toHaveBeenCalledWith(DIALOG_TEMPLATES.disadvantageCap, {
      currentCap: 10
    });
    expect(prompt.mock.calls[0][0].content).toBe("<div></div>");
  });

  it("should ask with the cap title and the OK button, modal, resolving null on close", async () => {
    answerWith({ value: "10" });
    await askDisadvantageCap(10);
    const config = prompt.mock.calls[0][0];
    expect(config.window.title).toBe("l5r4.apps.xpManager.disadvantageCapTitle");
    expect(config.ok.label).toBe("l5r4.ui.common.ok");
    expect(config.modal).toBe(true);
    expect(config.rejectClose).toBe(false);
  });

  it("should return the entered whole number", async () => {
    answerWith({ value: " 3 " });
    expect(await askDisadvantageCap(10)).toBe(3);
  });

  it("should accept zero", async () => {
    answerWith({ value: "0" });
    expect(await askDisadvantageCap(10)).toBe(0);
  });

  it("should return null for a negative cap", async () => {
    answerWith({ value: "-2" });
    expect(await askDisadvantageCap(10)).toBeNull();
  });

  it("should return null when the field holds no number", async () => {
    answerWith({ value: "" });
    expect(await askDisadvantageCap(10)).toBeNull();
  });

  it("should return null when the dialog is closed", async () => {
    answerWith({ closed: true });
    expect(await askDisadvantageCap(10)).toBeNull();
  });
});
