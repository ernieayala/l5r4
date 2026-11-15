/** A fixture batch: it clicks one action by selector and sets one setting. */
export async function fixtureBatch(element) {
  element.querySelector('[data-action="named"]').click();
  element.querySelector('[data-action="quoted-name"]').click();
  await game.settings.set("fixture", "tested", true);
}
