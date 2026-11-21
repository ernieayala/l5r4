/** The fixture's settings: one a test sets, one none does. */
export function registerSettings() {
  game.settings.register("fixture", "tested", { type: Boolean, default: false });
  game.settings.register("fixture", "untested", { type: Boolean, default: false });
}
