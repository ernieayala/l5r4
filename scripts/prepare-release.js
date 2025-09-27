#!/usr/bin/env node

/**
 * Release Preparation Script for L5R4 System
 * 
 * This script helps prepare releases by:
 * 1. Updating version numbers in package.json and system.json
 * 2. Validating file structure and dependencies
 * 3. Building CSS from SCSS
 * 4. Creating release checklist
 * 
 * Usage: node scripts/prepare-release.js [version]
 * Example: node scripts/prepare-release.js 1.0.1
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
const SYSTEM_JSON_PATH = path.join(PROJECT_ROOT, 'system.json');

/**
 * Validate semantic version format
 * @param {string} version - Version string to validate
 * @returns {boolean} True if valid semantic version
 */
function isValidVersion(version) {
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Update version in JSON file
 * @param {string} filePath - Path to JSON file
 * @param {string} version - New version number
 */
function updateVersionInFile(filePath, version) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    content.version = version;
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`✅ Updated version to ${version} in ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Validate project structure
 * @returns {boolean} True if all required files exist
 */
function validateProjectStructure() {
  const requiredFiles = [
    'l5r4.js',
    'l5r4.css',
    'system.json',
    'template.json',
    'README.md',
    'CHANGELOG.MD',
    'COPYING'
  ];

  const requiredDirs = [
    'lang',
    'module',
    'templates',
    'assets'
  ];

  console.log('\n📁 Validating project structure...');
  
  let valid = true;
  
  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing required file: ${file}`);
      valid = false;
    } else {
      console.log(`✅ Found: ${file}`);
    }
  }

  // Check required directories
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
 * Build CSS from SCSS
 */
function buildCSS() {
  console.log('\n🎨 Building CSS from SCSS...');
  try {
    execSync('npm run build:css', { cwd: PROJECT_ROOT, stdio: 'inherit' });
    console.log('✅ CSS build completed successfully');
  } catch (error) {
    console.error('❌ CSS build failed:', error.message);
    process.exit(1);
  }
}

/**
 * Validate language files
 */
function validateLanguageFiles() {
  console.log('\n🌍 Validating language files...');
  
  const langDir = path.join(PROJECT_ROOT, 'lang');
  const systemJson = JSON.parse(fs.readFileSync(SYSTEM_JSON_PATH, 'utf8'));
  
  // Check that all languages in system.json have corresponding files
  for (const lang of systemJson.languages) {
    const langFile = path.join(PROJECT_ROOT, lang.path);
    if (!fs.existsSync(langFile)) {
      console.error(`❌ Missing language file: ${lang.path} for ${lang.name}`);
      return false;
    }
    
    try {
      JSON.parse(fs.readFileSync(langFile, 'utf8'));
      console.log(`✅ Valid JSON: ${lang.path} (${lang.name})`);
    } catch (error) {
      console.error(`❌ Invalid JSON in ${lang.path}:`, error.message);
      return false;
    }
  }
  
  return true;
}

/**
 * Generate release checklist
 * @param {string} version - Release version
 */
function generateReleaseChecklist(version) {
  const checklist = `
# Release Checklist for L5R4 v${version}

## Pre-Release Validation
- [ ] All tests pass
- [ ] CSS builds without errors
- [ ] All language files are valid JSON
- [ ] system.json validates against Foundry schema
- [ ] README.md is up to date
- [ ] CHANGELOG.MD includes v${version} entry

## Version Management
- [ ] package.json version updated to ${version}
- [ ] system.json version updated to ${version}
- [ ] Git working directory is clean
- [ ] All changes committed

## Testing
- [ ] Test installation via manifest URL
- [ ] Test system in clean Foundry world
- [ ] Verify character sheet functionality
- [ ] Test dice rolling mechanics
- [ ] Verify XP Manager functionality
- [ ] Test migration from previous version

## Release Process
- [ ] Create git tag: \`git tag v${version}\`
- [ ] Push tag: \`git push origin v${version}\`
- [ ] Create GitHub release with tag v${version}
- [ ] Upload system.json and l5r4.zip to release
- [ ] Update release notes with CHANGELOG content
- [ ] Test installation from release assets

## Post-Release
- [ ] Verify manifest URL works
- [ ] Test installation in clean Foundry instance
- [ ] Monitor for bug reports
- [ ] Update any external documentation

## Notes
- Release URL: https://github.com/ernieayala/l5r4/releases/tag/v${version}
- Manifest URL: https://github.com/ernieayala/l5r4/releases/download/v${version}/system.json
- Download URL: https://github.com/ernieayala/l5r4/releases/download/v${version}/l5r4.zip
`;

  const checklistPath = path.join(PROJECT_ROOT, `RELEASE_CHECKLIST_v${version}.md`);
  fs.writeFileSync(checklistPath, checklist.trim() + '\n');
  console.log(`\n📋 Release checklist created: RELEASE_CHECKLIST_v${version}.md`);
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Please provide a version number');
    console.log('Usage: node scripts/prepare-release.js [version]');
    console.log('Example: node scripts/prepare-release.js 1.0.1');
    process.exit(1);
  }

  const version = args[0];
  
  if (!isValidVersion(version)) {
    console.error('❌ Invalid version format. Please use semantic versioning (e.g., 1.0.1)');
    process.exit(1);
  }

  console.log(`🚀 Preparing L5R4 System release v${version}`);
  console.log('=' .repeat(50));

  // Validate project structure
  if (!validateProjectStructure()) {
    console.error('\n❌ Project structure validation failed');
    process.exit(1);
  }

  // Build CSS
  buildCSS();

  // Validate language files
  if (!validateLanguageFiles()) {
    console.error('\n❌ Language file validation failed');
    process.exit(1);
  }

  // Update version numbers
  console.log('\n📝 Updating version numbers...');
  updateVersionInFile(PACKAGE_JSON_PATH, version);
  updateVersionInFile(SYSTEM_JSON_PATH, version);

  // Generate release checklist
  generateReleaseChecklist(version);

  console.log('\n🎉 Release preparation completed successfully!');
  console.log(`\nNext steps:`);
  console.log(`1. Review RELEASE_CHECKLIST_v${version}.md`);
  console.log(`2. Commit changes: git add . && git commit -m "Prepare release v${version}"`);
  console.log(`3. Create and push tag: git tag v${version} && git push origin v${version}`);
  console.log(`4. Create GitHub release with tag v${version}`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  isValidVersion,
  updateVersionInFile,
  validateProjectStructure,
  buildCSS,
  validateLanguageFiles,
  generateReleaseChecklist
};
