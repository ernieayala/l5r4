/**
 * Module Line Counter Script
 *
 * Development utility that counts non-comment, non-blank lines of code
 * in all JavaScript files within the module/ directory. Outputs a tab-separated
 * list of file paths and their corresponding line counts.
 *
 * Usage: node scripts/list-module-js-lines.js
 * Output: [relative-path]\t[line-count]
 *
 * Counting Rules:
 * - Excludes blank lines
 * - Excludes single-line comments (//)
 * - Excludes block comments
 * - Excludes JSDoc comments
 */

/* eslint-env node */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const moduleRoot = path.resolve(__dirname, "../module");
const files = [];

/**
 * Recursively walks directory tree and collects all .js file paths
 * @param {string} dir - Absolute path to directory to walk
 * @returns {void} Mutates the files array by pushing discovered .js files
 */
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && full.endsWith(".js")) {
      files.push(full);
    }
  }
}

walk(moduleRoot);
files.sort((a, b) => a.localeCompare(b, "en"));

for (const file of files) {
  const rel = path.relative(moduleRoot, file).replace(/\\/g, "/");
  const contents = fs.readFileSync(file, "utf8");
  const allLines = contents.split(/\r?\n/);

  let codeLines = 0;
  let inBlockComment = false;

  for (const line of allLines) {
    const trimmed = line.trim();

    // Track block comment boundaries to exclude comment content from count
    if (trimmed.startsWith("/*") || trimmed.startsWith("/**")) {
      inBlockComment = true;
    }

    if (inBlockComment || trimmed.startsWith("//") || trimmed === "") {
      if (trimmed.endsWith("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    codeLines++;
  }

  console.log(`${rel}\t${codeLines}`);
}
