/**
 * @module tools/packs-verify
 * @description `npm run packs:verify` (roadmap/STAGE-15): checks every pack source against the transcribed rulebook
 * in game-rules/, so it runs only on a machine that has it (game-rules/ is gitignored licensed material).
 *
 * - Each entry's name appears on the page it cites (the part before any parenthesis; each part of "Lore: History").
 * - Weapon DR, bow Strength, armor Armor TN bonus and Reduction, a Skill's Trait, and a spell's Ring and Mastery
 *   Level, and an Advantage's or Disadvantage's subtype and cost match the book's entry.
 * - A family's and a School's Trait bonus, a School's granted Skills and Emphases, a shugenja School's Affinity and
 *   Deficiency, a Technique's rank, and a kata's or kiho's Ring, Mastery Level, and kiho Type match the book.
 * - No run of six or more words in any string of an entry matches the book's text.
 *
 * Prints one line per mismatch and exits 1 when there is any. Paths given as arguments are draft sources, checked
 * with the committed ones.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const RULES = "game-rules";
const SOURCES = "src/packs";
const RUN = 6;

/** Lower-case words, apostrophes kept, everything else a break. */
const words = text =>
  String(text)
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .match(/[a-z0-9']+/g) ?? [];

const files = readdirSync(RULES)
  .filter(name => name.endsWith(".md"))
  .sort()
  .map(name => readFileSync(path.join(RULES, name), "utf8"));

/** Printed page to its text, from the page markers. */
const pages = new Map();
for (const text of files) {
  const parts = text.split(/<!-- p\.(\d+) -->/);
  for (let i = 1; i < parts.length; i += 2) {
    const page = Number(parts[i]);
    pages.set(page, (pages.get(page) ?? "") + parts[i + 1]);
  }
}

/** Every run of RUN words in the book. */
const bookRuns = new Set();
for (const text of files) {
  const list = words(text.replace(/<!--.*?-->/g, " "));
  for (let i = 0; i + RUN <= list.length; i++) {
    bookRuns.add(list.slice(i, i + RUN).join(" "));
  }
}

/**
 * The heading that names `name` and the text under it, up to the next heading. A heading that is the name (or its
 * plural) wins over one that holds it among other words ("Aiguchi & Tanto"), so "Yari" is not read from "Nage-yari".
 * The search starts at the marker of the page the entry cites, so a short name such as "Bo" finds its own entry and
 * not a word in an earlier heading.
 * @returns {{heading: string, text: string}|null}
 */
function block(name, page) {
  const wanted = words(name).join(" ");
  const marker = `<!-- p.${page} -->`;
  const tests = [
    heading => heading === wanted || heading === `${wanted}s`,
    heading => ` ${heading} `.includes(` ${wanted} `)
  ];
  for (const test of tests) {
    for (const text of files.filter(file => file.includes(marker))) {
      const lines = text.slice(text.indexOf(marker)).split("\n");
      const start = lines.findIndex(
        line => /^#+ /.test(line) && test(words(line.replace(/^#+ /, "")).join(" "))
      );
      if (start >= 0) {
        const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line));
        return {
          heading: lines[start],
          text: lines.slice(start + 1, end < 0 ? undefined : end).join("\n")
        };
      }
    }
  }
  return null;
}

/** Every string in a value, nested ones included. */
function strings(value) {
  if (typeof value === "string") {
    return [value];
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(strings);
  }
  return [];
}

/** The base name of an entry: the part before any parenthesis. */
const baseName = name => name.replace(/\s*\(.*\)\s*$/, "");

/** The Advantage and Disadvantage subtypes a heading prints (p.146). */
const SUBTYPES = new Set(["physical", "mental", "social", "material", "spiritual"]);

/** A Trait or the Void Ring as the book names it in a Skill heading, to its key. */
const TRAIT_WORDS = {
  agility: "agi",
  awareness: "awa",
  intelligence: "int",
  perception: "per",
  reflexes: "ref",
  stamina: "sta",
  strength: "str",
  willpower: "wil",
  void: "void"
};

/** A kiho Type as the book prints it (p.261), to the value `system.type` stores (module/config/localization.js). */
const KIHO_TYPE_WORDS = {
  internal: "internal",
  kharmic: "karmic",
  martial: "martial",
  mystical: "mystic"
};

/** Rank words a Technique heading may print, as "RANK THREE:". */
const RANK_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/** The Trait a printed "+1 Strength" names, as its key; a Void bonus is "void". */
const bonusTrait = text => TRAIT_WORDS[words(text.match(/\+1\s+([A-Za-z]+)/)?.[1] ?? "")[0]];

/** The TraitAdjust rule of an entry, as "str +1". */
const traitAdjust = system => {
  const rule = (system.rules ?? []).find(r => r.key === "TraitAdjust");
  return rule ? `${rule.trait} +${rule.value}` : "none";
};

/**
 * Every heading that holds `name` among its words, from the cited page's marker on, with the text under it. A
 * School prints its name twice, over its story and over its numbers, so a check picks the block it needs.
 * @returns {Array<{heading: string, text: string}>}
 */
function blocksNamed(name, page) {
  const wanted = ` ${words(name).join(" ")} `;
  const marker = `<!-- p.${page} -->`;
  const found = [];
  for (const text of files.filter(file => file.includes(marker))) {
    const lines = text.slice(text.indexOf(marker)).split("\n");
    lines.forEach((line, start) => {
      if (/^#+ /.test(line) && ` ${words(line.replace(/^#+ /, "")).join(" ")} `.includes(wanted)) {
        // An Advanced School prints its Requirements under a heading of their own, which stays in its block
        const end = lines.findIndex(
          (next, i) => i > start && /^#+ /.test(next) && !/^#+ REQUIREMENTS/i.test(next)
        );
        found.push({
          heading: line,
          text: lines.slice(start + 1, end < 0 ? undefined : end).join("\n")
        });
      }
    });
  }
  return found;
}

// A draft source given on the command line is checked with the committed ones, before it is merged into one
/**
 * A creature's text: from the heading naming it to the next heading that is not one of its Ring and Trait lines
 * ("AIR: 1 EARTH: 2 ...", "REFLEXES 3 - AGILITY 3 ..."), searching from its cited page's marker or the one before.
 * @returns {string|null}
 */
function creatureText(name, page) {
  const wanted = ` ${words(name).join(" ")} `;
  const statLine = line => /^#+ (AIR:|[-A-Z]+ \d|- )/.test(line);
  for (const marker of [`<!-- p.${page} -->`, `<!-- p.${page - 1} -->`]) {
    for (const text of files.filter(file => file.includes(marker))) {
      const lines = text.slice(text.indexOf(marker)).split("\n");
      const start = lines.findIndex(
        line =>
          /^#+ /.test(line) && ` ${words(line.replace(/^#+ /, "")).join(" ")} `.includes(wanted)
      );
      if (start >= 0) {
        const end = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && !statLine(line));
        return lines.slice(start, end < 0 ? undefined : end).join("\n");
      }
    }
  }
  return null;
}

const sources = [
  ...readdirSync(SOURCES)
    .filter(name => name.endsWith(".json"))
    .sort()
    .map(file => path.join(SOURCES, file)),
  ...process.argv.slice(2)
].map(file => JSON.parse(readFileSync(file, "utf8")));
/** A reference's entry, "@entry[techniques/Name]", from the sources. */
const referenced = text => {
  const [, pack, name] = String(text).match(/@entry\[([a-z]+)\/([^\]]+)\]/) ?? [];
  return sources
    .filter(s => s.name === pack)
    .flatMap(s => s.entries)
    .find(e => e.name === name);
};

const problems = [];
let checked = 0;
for (const source of sources) {
  for (const entry of source.entries) {
    checked++;
    const where = `${source.name}: ${entry.name} (p.${entry.page})`;
    // A sub-skill such as "Lore: History" is named in parts: the Macro-skill and the sub-skill in its list. An
    // Advantage taken in one of its printed options, as "Seven Fortunes' Blessing (Daikoku)", is one entry per option;
    // its option is named on its page, and its parent heading may sit on an earlier page
    const option = /^(advantage|disadvantage)$/.test(entry.type)
      ? entry.name.match(/\(([^)]*)\)$/)?.[1]
      : undefined;
    const page = ` ${words(pages.get(entry.page) ?? "").join(" ")} `;
    const parts = option ? [option] : baseName(entry.name).split(": ");
    if (!parts.every(part => page.includes(` ${words(part).join(" ")}`))) {
      problems.push(`${where}: name not found on its page`);
    }

    const system = entry.system ?? {};
    if (entry.type === "skill" && parts.length === 1) {
      const found = block(entry.name, entry.page);
      const printed = found?.heading.match(/\(([^)]*)\)/)?.[1] ?? "";
      const trait = TRAIT_WORDS[words(printed)[0]];
      if (trait !== system.trait) {
        problems.push(`${where}: Trait ${system.trait}, book "${printed}"`);
      }
    }
    // An Advantage, Disadvantage, or Ancestor heading prints its subtype in [brackets] and its cost after it, as in
    // "CRAFTY [MENTAL] (3 POINTS)" or "HIDA [14 POINTS]"; a ranked cost's lowest value, and 0 for a variable one
    if (entry.type === "advantage" || entry.type === "disadvantage") {
      const name = baseName(entry.name);
      const found = [0, 1, 2]
        .map(back => block(name, entry.page - back))
        .find(hit => hit && words(hit.heading).join(" ").startsWith(words(name).join(" ")));
      const heading = words(found?.heading ?? "");
      const ancestor = system.type === "ancestor";
      // "Varies" prints no subtype; an option's own price is in the text, not the heading
      const subtype = ancestor
        ? "ancestor"
        : (heading.find(word => SUBTYPES.has(word)) ?? system.type);
      const cost = heading.find(word => /^\d+$/.test(word));
      const printed = option ? system.cost : cost === undefined ? 0 : Number(cost);
      if (!found || (!ancestor && subtype !== system.type) || printed !== system.cost) {
        problems.push(
          `${where}: ${system.type} ${system.cost}, book ${found ? `${subtype} ${printed}` : "no heading"}`
        );
      }
    }
    // A spell, kata, or kiho prints "Ring/Mastery: Air 3"; a kiho also prints its Type
    if (["spell", "kata", "kiho"].includes(entry.type)) {
      const text = block(entry.name, entry.page)?.text ?? "";
      const printed = text.match(/Ring\/Mastery:\s*(\w+)\s+(\d+)/);
      const ring = printed?.[1].toLowerCase();
      if (!printed || ring !== system.ring || Number(printed[2]) !== system.mastery) {
        problems.push(
          `${where}: ${system.ring} ${system.mastery}, book ${printed ? `${ring} ${printed[2]}` : "none"}`
        );
      }
      if (entry.type === "kiho") {
        const type = KIHO_TYPE_WORDS[words(text.match(/Type:\s*(\w+)/)?.[1] ?? "")[0]];
        if (type !== system.type) {
          problems.push(`${where}: type ${system.type}, book ${type ?? "none"}`);
        }
      }
    }
    if (entry.type === "weapon") {
      const text = block(baseName(entry.name), entry.page)?.text ?? null;
      if (text === null) {
        problems.push(`${where}: no book heading names it`);
      } else if (system.isBow) {
        const str = text.match(/Strength:\s*(\d+)/)?.[1];
        if (Number(str) !== system.str) {
          problems.push(`${where}: Strength ${system.str}, book ${str}`);
        }
      } else {
        const line = text.match(/DR:([^\n]*)/)?.[1] ?? "";
        const pools = [...line.matchAll(/(\d+)k(\d+)/g)].map(([, r, k]) => `${r}k${k}`);
        const pool = `${system.damageRoll ?? 0}k${system.damageKeep ?? 0}`;
        const fixed = /\d+\s+Wound/.test(line) && pool === "0k0";
        if (!fixed && !pools.includes(pool)) {
          problems.push(`${where}: DR ${pool}, book "${line.trim()}"`);
        }
      }
    }
    if (entry.type === "armor") {
      const text = block(entry.name, entry.page)?.text ?? "";
      const bonus = Number(text.match(/Bonus to Armor TN:\s*\+(\d+)/)?.[1]);
      const reduction = Number(text.match(/Reduction:\s*(\d+)/)?.[1]);
      if (bonus !== system.bonus || reduction !== system.reduction) {
        problems.push(
          `${where}: ${system.bonus}/${system.reduction}, book ${bonus}/${reduction} (Armor TN bonus/Reduction)`
        );
      }
    }
    // A family prints its Trait bonus in its heading, as "THE HIDA FAMILY: +1 STRENGTH"
    if (entry.type === "family") {
      const heading = blocksNamed(baseName(entry.name), entry.page).find(b =>
        /\+1/.test(b.heading)
      );
      const printed = heading ? `${bonusTrait(heading.heading)} +1` : "no heading";
      if (printed !== traitAdjust(system)) {
        problems.push(`${where}: ${traitAdjust(system)}, book ${printed}`);
      }
    }
    // A School prints a Benefit, its Skills, and for a shugenja its Affinity and Deficiency in the block that lists
    // its numbers; an Advanced School prints Requirements in place of a Benefit
    if (entry.type === "school") {
      const numbers = blocksNamed(baseName(entry.name), entry.page).find(b =>
        /Benefit:|REQUIREMENTS|Requirements:/.test(b.heading + b.text)
      );
      if (!numbers) {
        problems.push(`${where}: no block of its numbers`);
      } else {
        const benefit = numbers.text.match(/Benefit:([^\n]*)/)?.[1];
        const printed = benefit ? `${bonusTrait(benefit)} +1` : "none";
        if (printed !== traitAdjust(system)) {
          problems.push(`${where}: ${traitAdjust(system)}, book ${printed}`);
        }
        const skillLine = ` ${words(numbers.text.match(/Skills:([^\n]*)/)?.[1] ?? "").join(" ")} `;
        for (const rule of (system.rules ?? []).filter(r => r.key === "GrantItem")) {
          const granted = referenced(rule.uuid);
          if (granted?.type !== "skill") {
            continue;
          }
          const named = [granted.name.split(": ").pop(), rule.emphasis].filter(Boolean);
          if (!named.every(part => skillLine.includes(` ${words(part).join(" ")} `))) {
            problems.push(`${where}: grants ${named.join(" ")}, not in its Skills line`);
          }
        }
        const pair = numbers.text.match(/Affinity\/Deficiency:\s*(\w+)\s*\/\s*(\w+)/);
        if (pair) {
          const technique = (system.rules ?? [])
            .filter(r => r.key === "GrantItem")
            .map(r => referenced(r.uuid))
            .find(t => t?.type === "technique");
          const ours = `${technique?.system.affinity}/${technique?.system.deficiency}`;
          const book = `${pair[1].toLowerCase()}/${pair[2].toLowerCase()}`;
          if (ours !== book) {
            problems.push(`${where}: Affinity/Deficiency ${ours}, book ${book}`);
          }
        }
      }
    }
    // A Technique heading prints its rank, as "RANK 2: ..." or "RANK TWO: ..."; a Path prints "Technique Rank: 2"
    if (entry.type === "technique") {
      const found = blocksNamed(baseName(entry.name), entry.page);
      const ranked = found.find(b => /^#+ RANK /i.test(b.heading));
      const pathRank = found.map(b => b.text.match(/Technique Rank:\s*(\d)/)?.[1]).find(Boolean);
      const word = ranked && words(ranked.heading)[1];
      const printed = ranked
        ? (RANK_WORDS[word] ?? Number(word))
        : pathRank
          ? Number(pathRank)
          : null;
      if (printed !== null && printed !== system.rank) {
        problems.push(`${where}: rank ${system.rank}, book ${printed}`);
      }
    }

    // A creature prints Initiative, Attack, Damage, Armor TN, Reduction, and Fear below its Ring and Trait lines
    if (entry.type === "npc") {
      const text = creatureText(baseName(entry.name), entry.page);
      if (!text) {
        problems.push(`${where}: no book heading names it`);
      } else {
        const pool = label => {
          const found = text.match(new RegExp(`${label}:[^\\n\\d]*(\\d+)k(\\d+)`));
          return found ? `${found[1]}k${found[2]}` : "none";
        };
        const number = label => Number(text.match(new RegExp(`${label}:\\s*(\\d+)`))?.[1] ?? 0);
        const ours = {
          initiative: `${system.initiative?.roll ?? 0}k${system.initiative?.keep ?? 0}`,
          attack: `${system.attack1?.roll ?? 0}k${system.attack1?.keep ?? 0}`,
          damage: `${system.damage1?.roll ?? 0}k${system.damage1?.keep ?? 0}`,
          armorTn: system.armor?.armorTn,
          fear: system.fear?.rank ?? 0
        };
        const book = {
          initiative: pool("Initiative"),
          attack: pool("Attack"),
          damage: pool("Damage"),
          armorTn: number("Armor TN"),
          fear: Number(text.match(/Fear (\d+)/)?.[1] ?? 0)
        };
        for (const key of Object.keys(book)) {
          if (ours[key] !== book[key]) {
            problems.push(`${where}: ${key} ${ours[key]}, book ${book[key]}`);
          }
        }
        // Reduction "24 (12 against jade...)" is the plain value, with the higher one a rule over it
        const reduction = number("Reduction");
        const extra = (entry.effects ?? [])
          .flatMap(e => e.rules ?? [])
          .filter(r => r.key === "Reduction")
          .reduce((sum, r) => sum + Number(r.value), 0);
        if ((system.armor?.reduction ?? 0) + extra !== reduction) {
          problems.push(
            `${where}: Reduction ${(system.armor?.reduction ?? 0) + extra}, book ${reduction}`
          );
        }
      }
    }

    // A reference holds another entry's printed name, which ships as names do
    for (const text of strings({
      system: entry.system,
      items: entry.items,
      effects: entry.effects
    })) {
      const list = words(text.replace(/@entry\[[^\]]*\]/g, " "));
      for (let i = 0; i + RUN <= list.length; i++) {
        const run = list.slice(i, i + RUN).join(" ");
        if (bookRuns.has(run)) {
          problems.push(`${where}: "${run}" is the book's wording`);
        }
      }
    }
  }
}

for (const line of problems) {
  console.log(line);
}
console.log(`${checked} entries checked, ${problems.length} mismatches`);
process.exitCode = problems.length ? 1 : 0;
