export function labelOf(actor, ringKey) {
  const ring = T(`l5r4.ui.mechanics.rings.${ringKey}`);
  return `${T("l5r4.ui.mechanics.rolls.ringRoll")}: ${actor.name} ${ring}`;
}

export function suffixOf(label) {
  return label + " " + game.i18n.localize("l5r4.ui.mechanics.rolls.unskilled");
}
