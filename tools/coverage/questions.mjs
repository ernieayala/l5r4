/**
 * @module tools/coverage/questions
 * @description The open-questions sweep (roadmap/STAGE-16, Sweeps): each stage file's "Still open" items, listed in
 * the report with the stage they block. An open question waits on Ernie, so it is not a gap the check fails on.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The items under a stage file's "Still open" heading, numbered or bulleted, up to the next heading.
 * @param {string} markdown
 * @returns {string[]}  Empty when the section is missing or says "None."
 */
export function openQuestions(markdown) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(line => /^#{2,3} Still open\s*$/i.test(line));
  if (start < 0) {
    return [];
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^#{1,3} /.test(line));
  const questions = [];
  for (const line of rest.slice(0, end < 0 ? rest.length : end)) {
    const item = /^(?:\d+\.|[-*])\s+(.*)$/.exec(line);
    if (item) {
      questions.push(item[1].trim());
    } else if (questions.length && /^\s+\S/.test(line)) {
      questions[questions.length - 1] += ` ${line.trim()}`;
    }
  }
  return questions;
}

/**
 * Every roadmap stage file's open questions.
 * @param {string} repo
 * @returns {string[]}  "<stage file>: <question>"
 */
export function questionsReport(repo) {
  const dir = join(repo, "roadmap");
  return readdirSync(dir)
    .filter(name => /^STAGE-\d+.*\.md$/.test(name))
    .sort()
    .flatMap(name =>
      openQuestions(readFileSync(join(dir, name), "utf8")).map(q => `${name}: ${q}`)
    );
}
