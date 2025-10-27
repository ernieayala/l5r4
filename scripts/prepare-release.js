#!/usr/bin/env node

/**
 * Release preparation automation script for L5R4 Foundry VTT system.
 *
 * Orchestrates the pre-release workflow including manifest versioning,
 * asset validation, stylesheet compilation.
 * Ensures consistent release preparation across all versions.
 *
 * Usage: node scripts/prepare-release.js <version>
 * Example: node scripts/prepare-release.js 1.2.3
 *
 * The script performs these steps:
 * 1. Validates semantic version format
 * 2. Verifies project structure completeness
 * 3. Builds CSS from SCSS sources
 * 4. Validates language file JSON syntax
 * 5. Updates version in package.json and system.json
 * 6. Updates @version tags in all JavaScript files
 *
 * Exits with code 1 if any validation or build step fails.
 *
 * @module scripts/prepare-release
 * @requires fs
 * @requires path
 * @requires child_process
 */
/* eslint-env node */
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, "package.json");
const SYSTEM_JSON_PATH = path.join(PROJECT_ROOT, "system.json");

/**
 * Validates semantic versioning format per semver.org specification.
 * Accepts standard versions (1.2.3) and prerelease/build metadata.
 *
 * @param {string} version - Version string to validate (e.g., "1.2.3", "2.0.0-beta.1")
 * @returns {boolean} True if version conforms to semantic versioning rules
 */
function isValidVersion(version) {
  // Semver regex: major.minor.patch with optional prerelease and build metadata
  const semverRegex =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Updates version field in a JSON manifest file atomically.
 * Reads JSON, updates version property, writes back with formatting.
 * Terminates process with exit code 1 if file operations fail.
 *
 * @param {string} filePath - Absolute path to JSON manifest (package.json or system.json)
 * @param {string} version - Semantic version string to write
 * @returns {void}
 * @throws {Error} JSON parse errors or file I/O errors terminate the process
 */
function updateVersionInFile(filePath, version) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    content.version = version;
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
    console.log(`✅ Updated version to ${version} in ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Recursively updates @version JSDoc tags across all project JavaScript files.
 * Scans the project tree, finds .js files, and replaces numeric version tags
 * using regex pattern matching. Skips node_modules and .git directories.
 * Only updates tags with pure numeric versions (X.Y.Z format).
 *
 * @param {string} version - Semantic version to propagate into @version tags
 * @returns {void}
 */
function updateJSDocVersionTags(version) {
  console.log("\n📝 Updating JSDoc @version tags...");

  const jsFiles = [];

  /**
   * Recursively collects JavaScript file paths while excluding dependencies.
   * Skips node_modules and .git directories to avoid modifying external code.
   *
   * @param {string} dir - Directory path to scan recursively
   * @returns {void}
   */
  function findJSFiles(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && item.name !== "node_modules" && item.name !== ".git") {
        findJSFiles(fullPath);
      } else if (item.isFile() && item.name.endsWith(".js")) {
        jsFiles.push(fullPath);
      }
    }
  }

  findJSFiles(PROJECT_ROOT);

  let updatedCount = 0;
  // Matches @version tags with numeric versions: "* @version 1.2.3" -> captures version
  const versionRegex = /^(\s*\*\s*@version\s+)[\d.]+(.*)$/gm;

  for (const filePath of jsFiles) {
    try {
      let content = fs.readFileSync(filePath, "utf8");
      const originalContent = content;

      content = content.replace(versionRegex, `$1${version}$2`);

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, "utf8");
        updatedCount++;
        console.log(`  ✅ Updated: ${path.relative(PROJECT_ROOT, filePath)}`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not update ${filePath}:`, error.message);
    }
  }

  console.log(`✅ Updated @version in ${updatedCount} file(s)`);
}

/**
 * Validates presence of all required files and directories for release.
 * Checks for compiled assets (dist/), manifests, documentation, and source directories.
 *
 * @returns {boolean} True if all required files and directories exist
 */
function validateProjectStructure() {
  const requiredFiles = [
    "dist/l5r4-enhanced.js",
    "dist/l5r4-enhanced.css",
    "system.json",
    "template.json",
    "README.md",
    "CHANGELOG.MD",
    "LICENSE"
  ];

  const requiredDirs = ["lang", "module", "templates", "assets"];

  console.log("\n📁 Validating project structure...");

  let valid = true;

  for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing required file: ${file}`);
      valid = false;
    } else {
      console.log(`✅ Found: ${file}`);
    }
  }

  for (const dir of requiredDirs) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (!fs.existsSync(dirPath)) {
      console.error(`❌ Missing required directory: ${dir}`);
      valid = false;
    } else {
      console.log(`✅ Found: ${dir}/`);
    }
  }

  return valid;
}

/**
 * Compiles SCSS sources to CSS using npm build script.
 * Executes "npm run build:css" and inherits stdio for output visibility.
 * Terminates process with exit code 1 if compilation fails.
 *
 * @returns {void}
 * @throws {Error} Build failures terminate the process
 */
function buildCSS() {
  console.log("\n🎨 Building CSS from SCSS...");
  try {
    execSync("npm run build:css", { cwd: PROJECT_ROOT, stdio: "inherit" });
    console.log("✅ CSS build completed successfully");
  } catch (error) {
    console.error("❌ CSS build failed:", error.message);
    process.exit(1);
  }
}

/**
 * Validates all language files declared in system.json manifest.
 * Verifies each language file exists and contains valid JSON syntax.
 * Foundry VTT requires language files to be valid JSON for i18n support.
 *
 * @returns {boolean} True if all language files exist and parse successfully
 */
function validateLanguageFiles() {
  console.log("\n🌍 Validating language files...");

  const systemJson = JSON.parse(fs.readFileSync(SYSTEM_JSON_PATH, "utf8"));

  for (const lang of systemJson.languages) {
    const langFile = path.join(PROJECT_ROOT, lang.path);
    if (!fs.existsSync(langFile)) {
      console.error(`❌ Missing language file: ${lang.path} for ${lang.name}`);
      return false;
    }

    try {
      JSON.parse(fs.readFileSync(langFile, "utf8"));
      console.log(`✅ Valid JSON: ${lang.path} (${lang.name})`);
    } catch (error) {
      console.error(`❌ Invalid JSON in ${lang.path}:`, error.message);
      return false;
    }
  }

  return true;
}

/**
 * CLI entry point orchestrating the complete release preparation workflow.
 * Validates arguments, executes preparation steps in sequence. Provides next-step instructions upon successful completion.
 *
 * @returns {void}
 * @throws {Error} Validation or build failures terminate process with exit code 1
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("❌ Please provide a version number");
    console.log("Usage: node scripts/prepare-release.js [version]");
    console.log("Example: node scripts/prepare-release.js 1.0.1");
    process.exit(1);
  }

  const version = args[0];

  if (!isValidVersion(version)) {
    console.error("❌ Invalid version format. Please use semantic versioning (e.g., 1.0.1)");
    process.exit(1);
  }

  console.log(`🚀 Preparing L5R4 System release v${version}`);
  console.log("=".repeat(50));

  if (!validateProjectStructure()) {
    console.error("\n❌ Project structure validation failed");
    process.exit(1);
  }

  buildCSS();

  if (!validateLanguageFiles()) {
    console.error("\n❌ Language file validation failed");
    process.exit(1);
  }

  console.log("\n📝 Updating version numbers...");
  updateVersionInFile(PACKAGE_JSON_PATH, version);
  updateVersionInFile(SYSTEM_JSON_PATH, version);
  updateJSDocVersionTags(version);

  console.log("\n🎉 Release preparation completed successfully!");
  console.log(`\nNext steps:`);
  console.log(`1. Commit changes: git add . && git commit -m "Prepare release v${version}"`);
  console.log(`2. Create and push tag: git tag v${version} && git push origin v${version}`);
  console.log(`3. Create GitHub release with tag v${version}`);
}

if (require.main === module) {
  main();
}

/**
 * Exported functions for testing and programmatic usage.
 * All functions can be imported individually for unit testing or CI/CD integration.
 */
module.exports = {
  isValidVersion,
  updateVersionInFile,
  updateJSDocVersionTags,
  validateProjectStructure,
  buildCSS,
  validateLanguageFiles
};
