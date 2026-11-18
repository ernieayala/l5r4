import { describe, expect, it } from "vitest";
import {
  APP_TEMPLATES,
  CHAT_TEMPLATES,
  DIALOG_TEMPLATES,
  LINK_TEMPLATES,
  PRELOAD_TEMPLATES
} from "../../../module/config/templates.js";

describe("PRELOAD_TEMPLATES", () => {
  // #79
  it("should hold every chat card, link, app, and dialog template, so none loads mid-game", () => {
    const rendered = [
      ...Object.values(CHAT_TEMPLATES),
      ...Object.values(LINK_TEMPLATES),
      ...Object.values(APP_TEMPLATES),
      ...Object.values(DIALOG_TEMPLATES)
    ];
    expect(rendered.filter(path => !PRELOAD_TEMPLATES.includes(path))).toEqual([]);
  });

  it("should name each template once", () => {
    expect(new Set(PRELOAD_TEMPLATES).size).toBe(PRELOAD_TEMPLATES.length);
  });
});
