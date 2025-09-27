# Release Checklist for L5R4 v1.0.1

## Pre-Release Validation
- [ ] All tests pass
- [ ] CSS builds without errors
- [ ] All language files are valid JSON
- [ ] system.json validates against Foundry schema
- [ ] README.md is up to date
- [ ] CHANGELOG.MD includes v1.0.1 entry

## Version Management
- [ ] package.json version updated to 1.0.1
- [ ] system.json version updated to 1.0.1
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
- [ ] Create git tag: `git tag v1.0.1`
- [ ] Push tag: `git push origin v1.0.1`
- [ ] Create GitHub release with tag v1.0.1
- [ ] Upload system.json and l5r4.zip to release
- [ ] Update release notes with CHANGELOG content
- [ ] Test installation from release assets

## Post-Release
- [ ] Verify manifest URL works
- [ ] Test installation in clean Foundry instance
- [ ] Monitor for bug reports
- [ ] Update any external documentation

## Notes
- Release URL: https://github.com/ernieayala/l5r4/releases/tag/v1.0.1
- Manifest URL: https://github.com/ernieayala/l5r4/releases/download/v1.0.1/system.json
- Download URL: https://github.com/ernieayala/l5r4/releases/download/v1.0.1/l5r4.zip
