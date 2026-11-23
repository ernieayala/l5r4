export class ExampleApplication {
  get title() {
    const baseTitle = T("l5r4.apps.example.title");
    return `${baseTitle}: ${this.actor.name}`;
  }
}

export function openExample(actor) {
  return foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("l5r4.ui.example.title") + " " + actor.name }
  });
}
