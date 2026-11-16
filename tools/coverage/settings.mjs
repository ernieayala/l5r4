/**
 * @module tools/coverage/settings
 * @description The setting check (roadmap/STAGE-16, CI). Every setting the system registers is set by a Quench test
 * (`game.settings.set(<system>, "<key>", ...)`); the rest are listed, except those the manifest's
 * `untested.settings` accepts with a reason.
 */

import { sourcesIn } from "./citations.mjs";

/**
 * The keys of the settings a module registers.
 * @param {string} text
 * @returns {string[]}
 */
export function registeredSettings(text) {
  return [...text.matchAll(/settings\.register\(\s*[^,]+,\s*["'](\w+)["']/g)].map(([, key]) => key);
}

/**
 * Join the settings with the tests.
 * @param {object} data
 * @param {string[]} data.settings
 * @param {string} data.tests - The Quench batches' text
 * @param {Record<string, string>} data.accepted - Untested settings accepted, with the reason
 * @returns {{count: number, untested: string[], accepted: string[], stale: string[]}}
 */
export function auditSettings({ settings, tests, accepted }) {
  const set = key => new RegExp(String.raw`settings\.set\(\s*[^,]+,\s*["']${key}["']`).test(tests);
  return {
    count: settings.length,
    untested: settings.filter(key => !set(key) && !(key in accepted)),
    accepted: Object.entries(accepted).map(([key, reason]) => `${key}: ${reason}`),
    stale: Object.keys(accepted)
      .filter(key => !settings.includes(key) || set(key))
      .map(key => `untested.settings accepts ${key}, which is ${settings.includes(key) ? "tested" : "gone"}`)
  };
}

/**
 * Read the modules and Quench batches, and run the audit.
 * @param {string} repo
 * @param {object} manifest
 * @returns {ReturnType<typeof auditSettings>}
 */
export function settingsReport(repo, manifest) {
  return auditSettings({
    settings: [...new Set(sourcesIn(repo, "module").flatMap(({ text }) => registeredSettings(text)))],
    tests: sourcesIn(repo, "tests/quench")
      .map(({ text }) => text)
      .join("\n"),
    accepted: manifest.untested.settings
  });
}
