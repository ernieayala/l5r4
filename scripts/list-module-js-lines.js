/* eslint-env node */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const moduleRoot = path.resolve(__dirname, "../module");
const files = [];

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

    // Check for block comment start/end
    if (trimmed.startsWith("/*") || trimmed.startsWith("/**")) {
      inBlockComment = true;
    }

    // Skip if we're in a block comment or line is a comment/empty
    if (inBlockComment || trimmed.startsWith("//") || trimmed === "") {
      // Check if block comment ends on this line
      if (trimmed.endsWith("*/")) {
        inBlockComment = false;
      }
      continue;
    }

    codeLines++;
  }

  console.log(`${rel}\t${codeLines}`);
}
