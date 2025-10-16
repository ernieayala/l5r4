# GitHub Workflows Guide

This directory contains automated workflows for the L5R4 Enhanced system.

## Workflows

### 1. PR Validation (`pr-validation.yml`)
**Triggers:** Automatically on every pull request and push to main branches

**What it does:**
- ✅ Checks code formatting (Prettier)
- ✅ Lints CSS/SCSS files
- ✅ Builds CSS from SCSS
- ✅ Checks for circular dependencies
- ✅ Validates all JSON files (system.json, template.json, language files)
- ✅ Verifies required files exist

**Benefits:**
- Catches formatting issues before merge
- Ensures build will succeed
- Prevents broken JSON from being committed
- Maintains code quality standards

### 2. Create Release (`create-release.yml`)
**Triggers:** Manual (via GitHub Actions UI)

**What it does:**
- ✅ Validates version format
- ✅ Checks if version already exists
- ✅ Runs all validations (format, lint, build, circular deps)
- ✅ Updates version in `package.json` and `system.json`
- ✅ Extracts changelog from `CHANGELOG.MD`
- ✅ Commits version changes
- ✅ Creates and pushes git tag
- ✅ Builds system ZIP
- ✅ Creates GitHub release with assets

**How to use:**

1. Go to **Actions** tab in GitHub
2. Click **Create Release** workflow
3. Click **Run workflow**
4. Fill in the form:
   - **Version:** Enter version number (e.g., `2.2.0` or `2.2.0-beta.1`)
   - **Release type:** Choose `release` or `prerelease`
   - **Changelog:** (Optional) Add custom notes or leave empty to auto-extract
5. Click **Run workflow**

**Version format:**
- Production: `2.2.0`, `2.3.1`
- Pre-release: `2.2.0-beta.1`, `2.2.0-rc.1`, `2.2.0-alpha.1`

**Benefits:**
- No local git commands needed
- Automated version bumping
- Automatic changelog extraction
- Single-button release process
- Ensures all validations pass before release

### 3. Release L5R4 System (`release.yml`)
**Triggers:** Automatically when a release is published

**What it does:**
- ✅ Builds CSS
- ✅ Updates version in system.json
- ✅ Creates system ZIP
- ✅ Uploads assets to release

**Note:** This workflow is now primarily used as a fallback. Use **Create Release** workflow for new releases.

---

## Recommended Workflow

### For Regular Releases

1. Update `CHANGELOG.MD` with new version section
2. Commit and push changes to main branch
3. Use **Create Release** workflow in GitHub Actions
4. Assets are automatically built and attached

### For Pre-Releases

1. Update `CHANGELOG.MD` with beta/rc notes
2. Commit and push changes
3. Use **Create Release** workflow with:
   - Version like `2.2.0-beta.1`
   - Release type: `prerelease`
4. Test the pre-release build
5. When ready, create final release with `2.2.0`

### For Pull Requests

1. Create PR as normal
2. **PR Validation** runs automatically
3. Fix any issues flagged by the workflow
4. Merge when all checks pass

---

## Migration from Old Process

**Old process:**
```bash
node scripts/prepare-release.js 2.2.0
git add .
git commit -m "Prepare release v2.2.0"
git tag v2.2.0
git push origin v2.2.0
# Create release manually in GitHub
```

**New process:**
1. Go to GitHub Actions → Create Release → Run workflow
2. Done! ✨

The `prepare-release.js` script is still available for local testing if needed.
