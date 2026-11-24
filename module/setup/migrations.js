/**
 * @module setup/migrations
 * @description The world data migration (#181). Each Actor, Item, and Scene records the migration schema it is at
 * (MIGRATION_FLAG; getMigrationSchema reads it, or the version an older document was migrated or saved with). Each
 * step names the schema it brings a document to and runs on a document below it, so it runs once per document,
 * however many releases follow. A document is marked only after all its steps succeed: one that fails is logged and
 * tried again the next time a GM loads the world. An actor's items and effects run first, at their own schema or the
 * actor's when that is lower; an unlinked token's delta items and effects run at their scene's.
 *
 * The active GM's client runs it on every world load (runMigration), over the world, the scenes' unlinked tokens,
 * and the unlocked Actor and Item compendiums; documents already current cost a read. A locked compendium is never
 * written: a document created or imported into the world records the schema its data had, and the active GM brings
 * it up to date (onPreCreateMigrationSchema, onCreateMigrateDocument). The steps are in migrations/steps.js; they
 * update with `render: false`, read `_source`, and keep a field that already holds a value.
 */
import { SYS_ID, MIGRATION_FLAG, MIGRATION_SCHEMA } from "../config/constants.js";
import { pluralKeyOf } from "../utils/localization.js";
import { getMigrationSchema } from "./migrations/utils/helpers.js";
import { getTokenDeltaDocuments } from "./migrations/actors/unlinked-tokens.js";
import { ACTOR_STEPS, EFFECT_STEPS, ITEM_STEPS } from "./migrations/steps.js";

/**
 * One migration run: whether every step runs again whatever a document's schema, and the documents it brought up to
 * date or could not.
 * @typedef {{force: boolean, migrated: number, failed: number}} MigrationRun
 */

/**
 * Bring every document the GM can write up to MIGRATION_SCHEMA: world items, world actors with their items and
 * effects, the scenes' unlinked tokens, and the unlocked Actor and Item compendiums. A summary notification follows
 * when it changed or failed anything.
 * @param {object} [options]
 * @param {boolean} [options.force] - Run every step again on every document, whatever schema it records
 * @returns {Promise<MigrationRun>}
 */
export async function migrateWorld({ force = false } = {}) {
  const run = { force, migrated: 0, failed: 0 };
  for (const item of game.items) {
    await migrateDocument(item, ITEM_STEPS, { run, schema: getRunSchema(item._source, run) });
  }
  for (const actor of game.actors) {
    await migrateActor(actor, run);
  }
  for (const scene of game.scenes) {
    await migrateScene(scene, run);
  }
  for (const pack of game.packs) {
    await migratePack(pack, run);
  }
  warnMigrationResult(run);
  return run;
}

/**
 * Run the steps above `schema` on one document, then mark it current. A step that throws is logged and leaves the
 * document unmarked, so the next run tries it again.
 * @param {Document} doc
 * @param {ReadonlyArray<import("./migrations/steps.js").MigrationStep>} steps
 * @param {{run: MigrationRun, schema: number}} context - The run to count it in, and the schema the document is at
 * @returns {Promise<boolean>} Whether the document is current
 */
export async function migrateDocument(doc, steps, { run, schema }) {
  if (schema >= MIGRATION_SCHEMA) {
    return true;
  }
  try {
    for (const step of steps.filter(s => s.schema > schema)) {
      await step.migrate(doc);
    }
    await doc.setFlag(SYS_ID, MIGRATION_FLAG, MIGRATION_SCHEMA);
    run.migrated++;
    return true;
  } catch (err) {
    run.failed++;
    console.warn(`${SYS_ID} | Migration failed, to be tried again on the next world load`, {
      uuid: doc.uuid,
      err
    });
    return false;
  }
}

/**
 * Migrate an actor: its items and effects first, then the actor once they are all current.
 * @param {Actor} actor
 * @param {MigrationRun} run
 * @returns {Promise<void>}
 */
export async function migrateActor(actor, run) {
  const schema = getRunSchema(actor._source, run);
  const children = { items: actor.items.contents, effects: actor.effects.contents };
  if (await migrateChildren(children, { run, schema })) {
    await migrateDocument(actor, ACTOR_STEPS, { run, schema });
  }
}

/**
 * Before an Actor, Item, or Scene is created (#181): record the schema its data had. The server stamps the running
 * version on a document it creates, so the creation data is the last place an imported document's own version shows.
 * @param {Document} doc
 * @returns {void}
 */
export function onPreCreateMigrationSchema(doc) {
  doc.updateSource({ [`flags.${SYS_ID}.${MIGRATION_FLAG}`]: getMigrationSchema(doc._source) });
}

/**
 * After an Actor, Item, or Scene is created, on the active GM's client while runMigration is on: bring it up to date
 * when its data came from an older version, and warn when a step failed. With no GM connected, the next GM's world
 * load does it.
 * @param {Document} doc
 * @returns {Promise<void>}
 */
export async function onCreateMigrateDocument(doc) {
  if (!game.users.activeGM?.isSelf || !game.settings.get(SYS_ID, "runMigration")) {
    return;
  }
  const run = { force: false, migrated: 0, failed: 0 };
  await migrateAnyDocument(doc, run);
  warnMigrationResult({ ...run, migrated: 0 });
}

/**
 * The schema a run treats a document as at: 0 when forced, else the schema it records.
 * @param {object} source
 * @param {MigrationRun} run
 * @param {string|null} [legacyVersion] - For a Scene, the version the world last migrated to
 * @returns {number}
 */
function getRunSchema(source, run, legacyVersion = null) {
  return run.force ? 0 : getMigrationSchema(source, legacyVersion);
}

/**
 * Migrate a parent's items and effects, each at its own recorded schema or the parent's, whichever is lower: an
 * actor imported from an older version brings its items along, and an item dropped onto a current actor keeps its own.
 * @param {{items: Item[], effects: ActiveEffect[]}} children
 * @param {{run: MigrationRun, schema: number}} context - The run, and the parent's schema
 * @returns {Promise<boolean>} Whether every child is current
 */
async function migrateChildren({ items, effects }, { run, schema }) {
  const getChildSchema = doc =>
    Math.min(doc._source.flags?.[SYS_ID]?.[MIGRATION_FLAG] ?? schema, schema);
  let current = true;
  for (const item of items) {
    current =
      (await migrateDocument(item, ITEM_STEPS, { run, schema: getChildSchema(item) })) && current;
  }
  for (const effect of effects) {
    current =
      (await migrateDocument(effect, EFFECT_STEPS, { run, schema: getChildSchema(effect) })) &&
      current;
  }
  return current;
}

/**
 * Migrate a scene's unlinked tokens' delta items and effects, then mark the scene. A scene saved before any scene was
 * marked is at the schema of the version the world last migrated to, since that run reached its tokens.
 * @param {Scene} scene
 * @param {MigrationRun} run
 * @returns {Promise<void>}
 */
async function migrateScene(scene, run) {
  const legacyVersion = game.settings.get(SYS_ID, "lastMigratedVersion");
  const schema = getRunSchema(scene._source, run, legacyVersion);
  let current = true;
  for (const token of scene.tokens) {
    const delta = getTokenDeltaDocuments(token);
    current = (!delta || (await migrateChildren(delta, { run, schema }))) && current;
  }
  if (current && schema < MIGRATION_SCHEMA) {
    await scene.setFlag(SYS_ID, MIGRATION_FLAG, MIGRATION_SCHEMA);
  }
}

/**
 * Migrate the documents of an unlocked Actor or Item compendium that are below MIGRATION_SCHEMA, found from the
 * pack's index; a locked or other pack is left alone. A pack that fails to load is logged and counted once.
 * @param {CompendiumCollection} pack
 * @param {MigrationRun} run
 * @returns {Promise<void>}
 */
async function migratePack(pack, run) {
  if (pack.locked || (pack.documentName !== "Actor" && pack.documentName !== "Item")) {
    return;
  }
  try {
    const index = await pack.getIndex({ fields: ["flags", "_stats"] });
    for (const entry of index.filter(e => getRunSchema(e, run) < MIGRATION_SCHEMA)) {
      await migrateAnyDocument(await pack.getDocument(entry._id), run);
    }
  } catch (err) {
    run.failed++;
    console.warn(`${SYS_ID} | Migration of a compendium failed`, { pack: pack.collection, err });
  }
}

/**
 * Migrate one Actor, Item, or Scene with the steps for its kind.
 * @param {Document} doc
 * @param {MigrationRun} run
 * @returns {Promise<void>}
 */
async function migrateAnyDocument(doc, run) {
  if (doc.documentName === "Actor") {
    await migrateActor(doc, run);
  } else if (doc.documentName === "Scene") {
    await migrateScene(doc, run);
  } else {
    await migrateDocument(doc, ITEM_STEPS, { run, schema: getRunSchema(doc._source, run) });
  }
}

/**
 * Tell the GM what a run brought up to date, as an info notice, and warn of what failed; nothing when it did
 * neither.
 * @param {MigrationRun} run
 * @returns {void}
 */
function warnMigrationResult({ migrated, failed }) {
  for (const [count, kind, level] of [
    [migrated, "migrated", "info"],
    [failed, "failed", "warn"]
  ]) {
    if (count > 0) {
      const key = pluralKeyOf(game.i18n, count, c => `l5r4.system.migration.${kind}.${c}`);
      ui.notifications[level](game.i18n.localize(key, { count }));
    }
  }
}
