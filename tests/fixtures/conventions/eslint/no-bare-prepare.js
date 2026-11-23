export async function raiseStrength(actor, weapon) {
  await actor.update({ "system.traits.str": 3 });
  actor.prepareData();
  weapon.prepareDerivedData();
}

export class Example extends foundry.documents.Item {
  prepareBaseData() {
    super.prepareData();
  }
}
