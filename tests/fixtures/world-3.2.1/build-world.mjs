/**
 * Build the 3.2.1 fixture world (roadmap/STAGE-12): a world as l5r4-enhanced 3.2.1 saved it on Foundry 13, for
 * checking that 4.0.0 migrates it. Documents come from documents.mjs, each `system` filled from 3.2.1's
 * template.json (read from git tag v3.2.1). The world's users are copied from an existing world so its GM can log in.
 *
 * Foundry must not be running on the target data folder. Run from the repo root:
 *
 *   node tests/fixtures/world-3.2.1/build-world.mjs <Foundry app folder> <worlds folder> <users world folder>
 *
 *   <Foundry app folder>   e.g. "C:/Program Files/Foundry Virtual Tabletop/resources/app" (for its classic-level)
 *   <worlds folder>        the Data/worlds folder to write l5r4-321-fixture into; an existing one is replaced
 *   <users world folder>   a world whose data/users database is copied
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  COMBAT,
  GM_FLAGS,
  GM_ID,
  MESSAGES,
  NPCS,
  PCS,
  SETTINGS,
  TOKENS,
  WORLD_ITEMS
} from "./documents.mjs";

const [appDir, worldsDir, usersWorld] = process.argv.slice(2);
if (!appDir || !worldsDir || !usersWorld) {
  console.error("Usage: build-world.mjs <Foundry app folder> <worlds folder> <users world folder>");
  process.exit(1);
}
const { ClassicLevel } = createRequire(path.join(appDir, "package.json"))("classic-level");

const WORLD_ID = "l5r4-321-fixture";
const SCENE_ID = "fxScScene0000001";
const CORE = "13.351";
const STATS = {
  coreVersion: CORE,
  systemId: "l5r4-enhanced",
  systemVersion: "3.2.1",
  createdTime: 1762000000000,
  modifiedTime: 1762000000000,
  lastModifiedBy: GM_ID,
  compendiumSource: null,
  duplicateSource: null
};

const template = JSON.parse(
  execFileSync("git", ["show", "v3.2.1:template.json"], { encoding: "utf8" })
);

/** A plain-object deep merge: `source` over `target`, arrays and non-objects replaced. */
function merge(target, source) {
  const out = structuredClone(target);
  for (const [key, value] of Object.entries(source ?? {})) {
    const isObject = value && typeof value === "object" && !Array.isArray(value);
    out[key] =
      isObject && out[key] && typeof out[key] === "object" ? merge(out[key], value) : value;
  }
  return out;
}

/** 3.2.1's default `system` for a subtype, its template.json `templates` resolved. */
function defaults(documentName, type) {
  const spec = template[documentName][type];
  let data = {};
  for (const name of spec.templates ?? []) {
    data = merge(data, template[documentName].templates[name]);
  }
  const { templates: _templates, ...own } = spec;
  return merge(data, own);
}

const withStats = doc => ({
  folder: null,
  sort: 0,
  ownership: { default: 0, [GM_ID]: 3 },
  _stats: STATS,
  ...doc
});
const effectDoc = effect => ({ ...effect, _stats: STATS });

/** An Item with its 3.2.1 defaults; its effects are written under it. */
function itemDoc(item) {
  return withStats({
    img: "icons/svg/item-bag.svg",
    ...item,
    system: merge(defaults("Item", item.type), item.system),
    effects: item.effects.map(e => e._id)
  });
}

/** Open a world database. */
async function open(name) {
  const dir = path.join(worldDir, "data", name);
  mkdirSync(dir, { recursive: true });
  const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json" });
  await db.open();
  return db;
}

const worldDir = path.join(worldsDir, WORLD_ID);
if (existsSync(worldDir)) {
  rmSync(worldDir, { recursive: true });
}
mkdirSync(path.join(worldDir, "data"), { recursive: true });

writeFileSync(
  path.join(worldDir, "world.json"),
  JSON.stringify(
    {
      title: "L5R4 3.2.1 Fixture",
      id: WORLD_ID,
      system: "l5r4-enhanced",
      coreVersion: CORE,
      systemVersion: "3.2.1",
      compatibility: { minimum: "13", verified: "13" },
      description: "Built by tests/fixtures/world-3.2.1/build-world.mjs",
      flags: {}
    },
    null,
    2
  )
);

// Users: copied, then the first GM takes the id the documents name as author and owner, with the flags 3.2.1 wrote.
// The copied world's GM can have any id, so the fixture gives it GM_ID.
cpSync(path.join(usersWorld, "data", "users"), path.join(worldDir, "data", "users"), {
  recursive: true
});
rmSync(path.join(worldDir, "data", "users", "LOCK"), { force: true });
{
  const db = await open("users");
  let gm = null;
  for await (const [key, user] of db.iterator()) {
    if (user.role === 4) {
      gm = { key, user };
      break;
    }
  }
  if (!gm) {
    console.error(`No GM user in ${usersWorld}`);
    process.exit(1);
  }
  await db.del(gm.key);
  await db.put(`!users!${GM_ID}`, {
    ...gm.user,
    _id: GM_ID,
    flags: merge(gm.user.flags ?? {}, GM_FLAGS)
  });
  await db.close();
}

// World items and their effects
{
  const db = await open("items");
  for (const item of WORLD_ITEMS) {
    await db.put(`!items!${item._id}`, itemDoc(item));
    for (const effect of item.effects) {
      await db.put(`!items.effects!${item._id}.${effect._id}`, effectDoc(effect));
    }
  }
  await db.close();
}

// Actors, their items and effects, and the effects on those items
{
  const db = await open("actors");
  for (const actor of [...PCS, ...NPCS]) {
    const { items, effects, prototypeToken = {}, ...rest } = actor;
    await db.put(
      `!actors!${actor._id}`,
      withStats({
        img: "icons/svg/mystery-man.svg",
        ...rest,
        system: merge(defaults("Actor", actor.type), actor.system),
        prototypeToken: { name: actor.name, actorLink: actor.type === "pc", ...prototypeToken },
        items: items.map(i => i._id),
        effects: effects.map(e => e._id)
      })
    );
    for (const item of items) {
      await db.put(`!actors.items!${actor._id}.${item._id}`, itemDoc(item));
      for (const effect of item.effects) {
        await db.put(
          `!actors.items.effects!${actor._id}.${item._id}.${effect._id}`,
          effectDoc(effect)
        );
      }
    }
    for (const effect of effects) {
      await db.put(`!actors.effects!${actor._id}.${effect._id}`, effectDoc(effect));
    }
  }
  await db.close();
}

// The scene, its tokens, and the unlinked token's actor delta
{
  const db = await open("scenes");
  await db.put(
    `!scenes!${SCENE_ID}`,
    withStats({
      _id: SCENE_ID,
      name: "Fixture Courtyard",
      active: true,
      navigation: true,
      width: 2000,
      height: 1200,
      padding: 0,
      background: { src: null },
      grid: { type: 1, size: 100, distance: 5, units: "ft" },
      tokens: TOKENS.map(t => t._id)
    })
  );
  for (const { delta, ...token } of TOKENS) {
    const actor = [...PCS, ...NPCS].find(a => a._id === token.actorId);
    await db.put(`!scenes.tokens!${SCENE_ID}.${token._id}`, {
      name: actor.name,
      width: 1,
      height: 1,
      texture: { src: "icons/svg/mystery-man.svg" },
      disposition: actor.type === "pc" ? 1 : -1,
      flags: {},
      ...token,
      delta: token._id
    });
    const deltaKey = `${SCENE_ID}.${token._id}.${token._id}`;
    await db.put(`!scenes.tokens.delta!${deltaKey}`, {
      _id: token._id,
      name: null,
      type: null,
      img: null,
      system: {},
      items: (delta?.items ?? []).map(i => i._id),
      effects: (delta?.effects ?? []).map(e => e._id),
      ownership: null,
      flags: {}
    });
    for (const item of delta?.items ?? []) {
      await db.put(`!scenes.tokens.delta.items!${deltaKey}.${item._id}`, itemDoc(item));
    }
    for (const effect of delta?.effects ?? []) {
      await db.put(`!scenes.tokens.delta.effects!${deltaKey}.${effect._id}`, effectDoc(effect));
    }
  }
  await db.close();
}

// Chat messages
{
  const db = await open("messages");
  let timestamp = 1762000000000;
  for (const message of MESSAGES) {
    await db.put(`!messages!${message._id}`, {
      type: "base",
      style: 5,
      author: GM_ID,
      timestamp: timestamp++,
      sound: null,
      whisper: [],
      blind: false,
      emote: false,
      _stats: STATS,
      ...message
    });
  }
  await db.close();
}

// The combat
{
  const db = await open("combats");
  const { combatants, ...combat } = COMBAT;
  await db.put(`!combats!${combat._id}`, {
    ...combat,
    combatants: combatants.map(c => c._id),
    flags: {},
    _stats: STATS
  });
  for (const combatant of combatants) {
    await db.put(`!combats.combatants!${combat._id}.${combatant._id}`, {
      hidden: false,
      defeated: false,
      flags: {},
      _stats: STATS,
      ...combatant
    });
  }
  await db.close();
}

// Settings, values JSON-encoded
{
  const db = await open("settings");
  let n = 0;
  for (const [key, value] of SETTINGS) {
    const _id = `fxSetting${String(n++).padStart(7, "0")}`;
    await db.put(`!settings!${_id}`, {
      _id,
      key,
      value: JSON.stringify(value),
      user: null,
      _stats: STATS
    });
  }
  await db.close();
}

process.stdout.write(`Wrote ${worldDir}\n`);
