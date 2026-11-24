/**
 * Migration edge cases (#181): the schema a document records, each step running once, a failed document tried again,
 * Force migration, and documents from an older version converted when they are created or imported.
 */

import {
  SYS_ID,
  LEGACY_MIGRATION_FLAG,
  MIGRATION_FLAG,
  MIGRATION_SCHEMA
} from "../../../module/config/constants.js";
import { migrateActor, migrateDocument, migrateWorld } from "../../../module/setup/migrations.js";
import { ITEM_STEPS } from "../../../module/setup/migrations/steps.js";
import { getMigrationSchema } from "../../../module/setup/migrations/utils/helpers.js";
import { createTestNPC, createTestPC } from "../../fixtures/actor-fixtures.js";
import { waitFor } from "../helpers.js";

/** A 3.2.1 document's saved stats, as an export, a module pack, or an Adventure carries them. */
const OLD_STATS = Object.freeze({ systemId: SYS_ID, systemVersion: "3.2.1" });

/** A 3.2.1 item whose Free Raises the item-rules step moves into a rule. */
const oldLuckyCharm = name => ({
  name,
  type: "commonItem",
  system: { freeRaises: 2 },
  _stats: { ...OLD_STATS }
});

/** A fresh run, as migrateWorld starts one. */
const newRun = (force = false) => ({ force, migrated: 0, failed: 0 });

/**
 * Run `body` with runMigration off, so the create hook leaves the documents it makes for the test to migrate.
 * @param {function(): Promise<*>} body
 * @returns {Promise<*>}
 */
const withoutAutoMigration = async body => {
  const saved = game.settings.get(SYS_ID, "runMigration");
  await game.settings.set(SYS_ID, "runMigration", false);
  try {
    return await body();
  } finally {
    await game.settings.set(SYS_ID, "runMigration", saved);
  }
};

/** Whether an item's Free Raises were moved into a FreeRaise rule. */
const isLuckyCharmMigrated = item =>
  item._source.system.freeRaises === 0 &&
  item._source.system.rules.some(rule => rule.key === "FreeRaise" && rule.value === 2);

/**
 * Register migration edge case tests
 * @param {Object} quench - Quench test framework
 */
export function registerMigrationEdgeCaseTests(quench) {
  quench.registerBatch(
    `${SYS_ID}.workflows.migration-edge-cases`,
    context => {
      const { describe, it, assert, afterEach } = context;
      const created = [];
      const track = doc => {
        created.push(doc);
        return doc;
      };

      afterEach(async () => {
        for (const doc of created.splice(0)) {
          await doc.delete();
        }
      });

      describe("The schema a document is at", () => {
        const legacy = version => ({ flags: { [SYS_ID]: { [LEGACY_MIGRATION_FLAG]: version } } });

        it("should compare legacy versions as versions, not as text", () => {
          assert.equal(getMigrationSchema(legacy("3.9.0")), 0);
          assert.equal(getMigrationSchema(legacy("3.10.0")), 0, "3.10.0 is before 4.0.0");
          assert.equal(getMigrationSchema(legacy("4.0.0")), 1);
          // As text, "10.0.0" sorts before "4.0.0"
          assert.equal(getMigrationSchema(legacy("10.0.0")), MIGRATION_SCHEMA);
        });

        it("should read the recorded schema first, then the saved version", () => {
          const recorded = {
            flags: { [SYS_ID]: { [MIGRATION_FLAG]: 0 } },
            _stats: { systemVersion: "9.0.0" }
          };
          assert.equal(getMigrationSchema(recorded), 0);
          assert.equal(getMigrationSchema({ _stats: { ...OLD_STATS } }), 0, "saved by 3.2.1");
          assert.equal(
            getMigrationSchema({
              _stats: { exportSource: { ...OLD_STATS }, systemVersion: "4.0.0" }
            }),
            0,
            "exported from 3.2.1"
          );
          assert.equal(
            getMigrationSchema({ _stats: { systemId: "dnd5e", systemVersion: "5.0.0" } }),
            0,
            "another system's"
          );
          assert.equal(getMigrationSchema({}), MIGRATION_SCHEMA, "no version: made now");
        });
      });

      describe("Each step runs once", () => {
        it("should keep a 2k2 Initiative a GM enters after the NPC was migrated", async () => {
          const npc = track(
            await createTestNPC({
              name: "Migration: NPC Initiative",
              system: { initiative: { roll: 2, keep: 2 } }
            })
          );
          // As a 3.2.1 NPC records it
          await npc.setFlag(SYS_ID, MIGRATION_FLAG, 0);
          await migrateActor(npc, newRun());
          assert.deepInclude(
            npc._source.system.initiative,
            { roll: 0, keep: 0 },
            "the old default"
          );
          assert.equal(npc.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA);

          await npc.update({ "system.initiative.roll": 2, "system.initiative.keep": 2 });
          await migrateActor(npc, newRun());
          assert.deepInclude(
            npc._source.system.initiative,
            { roll: 2, keep: 2 },
            "the GM's choice"
          );
        });

        it("should run every step again when forced", async () => {
          const npc = track(
            await createTestNPC({
              name: "Migration: forced",
              system: { initiative: { roll: 2, keep: 2 } }
            })
          );
          assert.equal(npc.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA, "made now");
          await migrateActor(npc, newRun());
          assert.deepInclude(
            npc._source.system.initiative,
            { roll: 2, keep: 2 },
            "current: left alone"
          );
          await migrateActor(npc, newRun(true));
          assert.deepInclude(npc._source.system.initiative, { roll: 0, keep: 0 }, "forced");
        });
      });

      describe("A failed document", () => {
        it("should stay unmarked when a step throws, and be finished by the next run", async () => {
          const pc = track(await createTestPC({ name: "Migration: failure" }));
          const [item] = await withoutAutoMigration(() =>
            pc.createEmbeddedDocuments("Item", [oldLuckyCharm("Failing charm")])
          );
          const failing = [{ schema: 1, migrate: () => Promise.reject(new Error("quench")) }];
          const run = newRun();
          const warn = console.warn;
          console.warn = () => {};
          try {
            assert.isFalse(await migrateDocument(item, failing, { run, schema: 0 }));
          } finally {
            console.warn = warn;
          }
          assert.equal(run.failed, 1);
          assert.equal(item.getFlag(SYS_ID, MIGRATION_FLAG), 0, "still to do");

          assert.isTrue(await migrateDocument(item, ITEM_STEPS, { run, schema: 0 }));
          assert.isTrue(isLuckyCharmMigrated(item));
          assert.equal(item.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA);
        });

        it("should hold an actor back until its items are migrated", async () => {
          const pc = track(await createTestPC({ name: "Migration: waiting actor" }));
          await pc.setFlag(SYS_ID, MIGRATION_FLAG, 0);
          const [item] = await withoutAutoMigration(() =>
            pc.createEmbeddedDocuments("Item", [oldLuckyCharm("Stuck charm")])
          );
          item.update = () => Promise.reject(new Error("quench"));
          const warn = console.warn;
          console.warn = () => {};
          try {
            await migrateActor(pc, newRun());
          } finally {
            console.warn = warn;
            delete item.update;
          }
          assert.equal(pc.getFlag(SYS_ID, MIGRATION_FLAG), 0, "the actor waits");

          await migrateActor(pc, newRun());
          assert.isTrue(isLuckyCharmMigrated(item));
          assert.equal(pc.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA);
        });
      });

      describe("Documents created or imported from an older version", () => {
        it("should record the schema its data had, and convert it on the GM's client", async () => {
          const old = track(await Item.implementation.create(oldLuckyCharm("Imported charm")));
          assert.isTrue(await waitFor(() => isLuckyCharmMigrated(old)), "converted");
          assert.equal(old.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA);

          const fresh = track(
            await Item.implementation.create({
              name: "New charm",
              type: "commonItem",
              system: { freeRaises: 2 }
            })
          );
          assert.equal(fresh.getFlag(SYS_ID, MIGRATION_FLAG), MIGRATION_SCHEMA, "made now");
          assert.equal(fresh._source.system.freeRaises, 2, "a current item is left alone");
        });

        it("should convert an old item dropped onto a current actor", async () => {
          const pc = track(await createTestPC({ name: "Migration: drop target" }));
          const [item] = await pc.createEmbeddedDocuments("Item", [oldLuckyCharm("Dropped charm")]);
          assert.isTrue(await waitFor(() => isLuckyCharmMigrated(item)));
        });

        it("should convert an imported actor and the items it brings", async () => {
          const npc = track(
            await Actor.implementation.create({
              name: "Migration: imported NPC",
              type: "npc",
              system: { initiative: { roll: 2, keep: 2 } },
              items: [oldLuckyCharm("Carried charm")],
              _stats: { ...OLD_STATS }
            })
          );
          assert.isTrue(
            await waitFor(() => npc.getFlag(SYS_ID, MIGRATION_FLAG) === MIGRATION_SCHEMA),
            "converted"
          );
          assert.deepInclude(npc._source.system.initiative, { roll: 0, keep: 0 });
          assert.isTrue(isLuckyCharmMigrated(npc.items.contents[0]));
        });

        it("should leave an import alone while runMigration is off, and convert it on the next world load", async () => {
          const old = track(
            await withoutAutoMigration(async () => {
              const item = await Item.implementation.create(oldLuckyCharm("Waiting charm"));
              await new Promise(resolve => setTimeout(resolve, 300));
              return item;
            })
          );
          assert.equal(old.getFlag(SYS_ID, MIGRATION_FLAG), 0, "recorded, not converted");
          assert.equal(old._source.system.freeRaises, 2);
          const run = await migrateWorld();
          assert.isTrue(isLuckyCharmMigrated(old));
          assert.equal(run.failed, 0);
        });
      });

      describe("The forceMigration setting", () => {
        it("should be a world setting that defaults to off", () => {
          const setting = game.settings.settings.get(`${SYS_ID}.forceMigration`);
          assert.equal(setting.type, Boolean);
          assert.equal(setting.scope, "world");
          assert.isFalse(setting.default);
        });
      });
    },
    { displayName: "L5R4: Migration edge cases" }
  );
}
