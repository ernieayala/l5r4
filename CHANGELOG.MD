# Changelog

All changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [4.0.0] - Unreleased

### Changed

CSS custom properties renamed. The Ring colors now hold whole colors instead of RGB triplets: read them as
`var(--l5r4-color-ring-water)`, not `rgb(var(--water-ring-color))`.

- `--water-ring-color` -> `--l5r4-color-ring-water`
- `--earth-ring-color` -> `--l5r4-color-ring-earth`
- `--fire-ring-color` -> `--l5r4-color-ring-fire`
- `--void-ring-color` -> `--l5r4-color-ring-void`
- `--l5r4-ring-rank-backdrop-color` -> `--l5r4-color-ring-rank-backdrop`
- `--l5r4-ring-rank-backdrop-image` -> `--l5r4-image-ring-rank-backdrop`
- `--controls` -> `--l5r4-size-column-controls`
- `--air-ring-color` -> `--l5r4-color-ring-air`, also darker: `#64798d` in place of `#889eb3`, so ring text on
  it meets its contrast minimum

CSS classes renamed. Posted chat cards keep their stored classes (`chat-card`, `item`, `title`, and the rest), so
their styles are unchanged.

- `main-sheet` -> `l5r4-sheet-body`
- `stats` -> `l5r4-sheet-main`
- `sidebar` (actor sheet column) -> `l5r4-sheet-sidebar`
- `actor-img` -> `l5r4-portrait`
- `actor-header` -> `l5r4-actor-header`
- `pc-info` -> `l5r4-pc-info`
- `limited-sheet` -> `l5r4-limited`
- `name` (Limited view heading) -> `l5r4-limited-name`
- `section-title` -> `l5r4-section-title`
- `section-container` -> `l5r4-section-body`
- `-bio-section` -> `l5r4-section -bio`
- `title` (section heading) -> `l5r4-section-heading`
- `title` (PC and NPC header label) -> `l5r4-form-field-label`
- `armor` -> `l5r4-section l5r4-armor`
- `combat` -> `l5r4-section l5r4-combat`
- `fear` -> `l5r4-section l5r4-fear`
- `wounds` (Wounds section root) -> `l5r4-section`
- `item-list` -> `l5r4-item-row-list`
- `-header` (sort header list) -> `l5r4-sort-header`
- `item` (header rows, NPC attack rows, XP manager rows) -> `l5r4-item-row`
- `item` (item card root on a sheet) -> `item l5r4-item-row` (`item` stays for posted cards)
- `item` (item sheet tab) -> `l5r4-tabs-tab`
- `item-sort-by` -> `l5r4-sort-header-button`
- `expanded-text` -> `l5r4-item-row-details`
- `emphasis-display` -> `l5r4-item-row-emphases`
- `spell-ring` -> `l5r4-item-row-cell`
- `spell-mastery` -> `l5r4-item-row-cell`
- `spell-cast` -> `l5r4-item-row-cell`
- `spell-range` -> `(removed)`
- `item-activate` -> `l5r4-inline-control-activate`
- `effect-controls` -> `l5r4-inline-control`
- `expandable` -> `l5r4-expand-control`
- `input-placeholder` -> `l5r4-form-field-value`
- `grid` -> `l5r4-grid`
- `wound-grid` -> `l5r4-wound-track`
- `fear-test` -> `l5r4-fear-test`
- `button-mask-container` -> `l5r4-button -roll`
- `trait-roll` -> `l5r4-button -roll`
- `mas` (roll button) -> `l5r4-button-under`
- `mas` (rank track) -> `l5r4-rank-control-under`
- `trait-rank` -> `l5r4-rank-control -trait`
- `trait-increase` -> `l5r4-rank-control-arrow -up`
- `trait-decrease` -> `l5r4-rank-control-arrow -down`
- `rank-name-container` -> `l5r4-rank-control -track`
- `rank-name` -> `l5r4-rank-control-value`
- `ranks` -> `l5r4-ranks`
- `ledger-open` -> `l5r4-ranks-ledger`
- `ring-name` -> `l5r4-ring-name`
- `ring-name-<ring>` -> `l5r4-ring-name -<ring>`
- `<ring>-ring` -> `l5r4-ring -<ring>`
- `<ring>-ring-img` -> `l5r4-ring-image`
- `ring-rank` -> `l5r4-ring-rank`
- `ring-rank-<ring>` -> `l5r4-ring-rank -<ring>`
- `trait` -> `l5r4-trait`
- `trait-stamina` -> `l5r4-trait -earth -stamina`
- `trait-willpower` -> `l5r4-trait -earth -willpower`
- `trait-strength` -> `l5r4-trait -water -strength`
- `trait-perception` -> `l5r4-trait -water -perception`
- `trait-reflex` -> `l5r4-trait -air -reflexes`
- `trait-awarness` -> `l5r4-trait -air -awareness`
- `trait-agility` -> `l5r4-trait -fire -agility`
- `trait-intelligence` -> `l5r4-trait -fire -intelligence`
- `void-points` -> `l5r4-void-points`
- `void-points-dots` -> `l5r4-void-points-dots`
- `-filled` (Void Point dot) -> `is-filled`
- `void-points-name` -> `l5r4-void-points-label`
- `void-dot` -> `l5r4-void-point`
- `traits-rings` -> `l5r4-traits-rings`
- `ring-roll` -> `l5r4-ring-roll`
- `effect-create`, `effect-edit`, `effect-toggle`, `effect-delete` -> `(removed)`; the controls carry `data-effect-create`, `data-effect-edit`, `data-effect-toggle`, `data-effect-delete`
- `title` (NPC attack row name) -> `(removed)`; the name keeps `l5r4-item-row-name`
- PC and NPC sheet windows add `l5r4-actor-sheet`, the item sheet window `l5r4-item-sheet`
- `spells` (spell slot group) -> `l5r4-spell-slots`
- `slots` -> `l5r4-spell-slot`
- `wealth` (item section fields) -> `l5r4-wealth`
- `l5r4-browser-tabs` -> `l5r4-tabs -filter`
- `l5r4-browser-tab` -> `l5r4-tabs-tab`
- `l5r4-browser-controls` -> `l5r4-compendium-browser-controls`
- `l5r4-browser-filters` -> `l5r4-compendium-browser-filters`
- `l5r4-browser-filter` -> `l5r4-compendium-browser-filter`
- `l5r4-browser-search` -> `l5r4-compendium-browser-search`
- `l5r4-browser-clear` -> `l5r4-compendium-browser-clear`
- `l5r4-browser-results-part` -> `l5r4-compendium-browser-results-part`
- `l5r4-browser-count` -> `l5r4-compendium-browser-count`
- `l5r4-browser-results` -> `l5r4-compendium-browser-results`
- `l5r4-browser-row` -> `l5r4-compendium-browser-row`
- `l5r4-browser-icon` -> `l5r4-compendium-browser-icon`
- `l5r4-browser-text` -> `l5r4-compendium-browser-text`
- `l5r4-browser-name` -> `l5r4-compendium-browser-name`
- `l5r4-browser-details` -> `l5r4-compendium-browser-details`
- `l5r4-browser-source` -> `l5r4-compendium-browser-source`
- `l5r4-browser-button` -> `l5r4-compendium-browser-button`
- `l5r4-browser-empty` -> `l5r4-compendium-browser-empty`
- `sheet-header` (item sheet) -> `l5r4-item-header`
- `profile` -> `l5r4-item-header-image`
- `header-fields` -> `l5r4-item-header-fields`
- `document-name` (item sheet) -> `l5r4-item-header-name`
- `prose-title` -> `l5r4-item-description-heading`
- `effects-list` -> `l5r4-effect-list`
- `effect` -> `l5r4-effect-list-row`
- `effect-name` -> `l5r4-effect-list-name`
- `l5r4-link` -> `l5r4-inline-link`
- `l5r4-link-request` -> `l5r4-inline-link-request`
- `l5r4-link-broken` -> `l5r4-inline-link -broken`
- `l5r4-link-reason` -> `l5r4-inline-link-reason`
- `check-pool` -> `l5r4-check-dialog-pool`
- `check-modifiers` -> `l5r4-check-dialog-group`
- `check-substitutes` -> `l5r4-check-dialog-group`
- `check-extras` -> `l5r4-check-dialog-group`
- `maho-dialog` -> `l5r4-check-dialog-group`
- `check-modifier` -> `l5r4-check-dialog-modifier`
- `check-modifier-label` -> `l5r4-check-dialog-modifier-label`
- `check-modifier-value` -> `l5r4-check-dialog-modifier-value`
- `warning-text` -> `l5r4-check-dialog-warning`
- `l5r4-ledger` -> `l5r4-ledger-dialog`
- `ledger-entries` -> `l5r4-ledger-dialog-entries`
- `ledger-track` -> `l5r4-ledger-dialog-track`
- `ledger-points` -> `l5r4-ledger-dialog-points`
- `ledger-reason` -> `l5r4-ledger-dialog-reason`
- `rules-toolbar` -> `l5r4-rules-editor-toolbar`
- `rules-mode` -> `l5r4-rules-editor-mode`
- `rules-json` -> `l5r4-rules-editor-json`
- `rules-add` -> `l5r4-rules-editor-add`
- `rule-card` -> `l5r4-rules-editor-card`
- `rule-delete` -> `l5r4-rules-editor-delete`
- `rule-error` -> `l5r4-rules-editor-error`
- `rule-field` -> `l5r4-rules-editor-field`
- `xp-modal-dialog` (window) -> `l5r4-xp-manager`
- `xp-breakdown-list` -> `l5r4-xp-manager-breakdown`
- `wound-config-app` (window) -> `l5r4-wound-config`
- `armor-config-app` (window) -> `l5r4-armor-config`
- `combat-config-app` (window) -> `l5r4-combat-config`
- `condition-manager` (window) -> `l5r4-condition-manager`
- `condition-manager-container` -> `l5r4-condition-manager-body`
- `emphasis-manager` (window) -> `l5r4-emphasis-manager`
- `emphasis-manager-container` -> `l5r4-emphasis-manager-body`
- `emphasis-list-container` -> `l5r4-emphasis-manager-list`
- `custom-emphasis` -> `l5r4-emphasis-manager-item -custom`
- `npc-attack-config` (window) -> `l5r4-npc-attack-config`
- `wealth-manager` (window) -> `l5r4-wealth-manager`
- `wealth-display` -> `l5r4-wealth-manager-display`
- `wealth-item` -> `l5r4-wealth-manager-item`
- `wealth-value` -> `l5r4-wealth-manager-value`
- `controls` (row control cluster) -> `l5r4-inline-control -reveal`
- `button` (roll button face) -> `l5r4-button-face`; the face is a `<button>`
- `title` (XP manager and NPC attack row names) -> `l5r4-item-row-name`
- `clickable` (XP manager cap) -> `l5r4-xp-manager-cap`
- `check-maneuvers` -> `l5r4-check-dialog-maneuvers`
- Section roots, template roots, and item tab panels gained `l5r4-` block classes (`l5r4-section`,
  `l5r4-item-details`, `l5r4-item-modifiers`, `l5r4-<window>-body`); their old classes stay

Clickable controls are `<button type="button">` in place of `<a>`, `<span>`, and `<div>`; core's focus ring shows on
them, and on a sheet the viewer cannot edit core disables them. Icon-only controls carry `data-tooltip` and
`aria-label` in place of `title`.

Data attributes and prepared values renamed (none is stored in world data):

- `data-system-ring` (Ring roll) -> `data-ring-key`
- A Skill's prepared `system.rollDice`, `system.rollKeep`, and `system.keepDice` -> `system.roll`, `system.keep`
- A spell's prepared `system.castTN` -> `system.castTn`
- `L5R4Combat.resolveInitiativeBonuses` -> `L5R4Combat.askInitiativeBonuses`; `L5R4Combat.events` ->
  `L5R4Combat.EVENTS`
- `CONFIG.l5r4.npcNumberWoundLvls` -> `CONFIG.l5r4.npcNumberWoundLevels`

`game.system.api.rollItem` and `rollTrait`, which hotbar macros call, are unchanged.

### Removed

- CSS rules no template used: `-gap-xl`, `clear-btn`, `void-points-amount`, `item-list -advantages`,
  `expanded-text -npc`, `editor-container`, `price-section`, `price-field`, `sheet-content > h4`
- Classes no style or script read: `info-group`, `sized`, `effects` (item effects tab wrapper), `message` (design
  gallery), `rules` (Active Effect Rules tab)

### Fixed

- NPC sheet Skills sort by their Roll and Emphasis heads, which did nothing before
- NPC sheet attack rows show the attack's damage type in the Type column, which was always empty

---

## [3.2.1] - 2025-11-03

### Removed

- Roll dialog settings (trait, skill, spell, weapon)
- Automatic insight rank calculation setting
- NPC void points display setting
- Default NPC wound mode setting

### Changed

- Armor stacking setting moved to Combat Config dialog
- NPC void points auto-show when Void Ring >= 1
- NPC trait controls use direct increase/decrease buttons
- TraitHandler integrated for NPC trait adjustment

### Added

- `TraitHandler.increase()` - direct trait increment
- `TraitHandler.decrease()` - direct trait decrement
- Shift+Click rank mode toggle tooltip
- Combat configuration labels in localization
- Armor stacking labels in localization

### Fixed

- `calculateXpDataVersion()` handles null/undefined actors
- `calculateXpDataVersion()` handles missing items property
- Test assertions updated for removed settings

---

## [3.2.0] - 2025-10-30

### Added

**Visual Animation System**
- New animation system for stances, conditions, and attacks using Sequencer + JB2A
- Stance animations: Full Attack, Full Defense, Center with visual effects
- Condition animations: Blinded, Dazed, Fatigued, Prone, Stunned, Grappled
- Attack projectile animations: arrows and kunai for bow/weapon attacks
- Animation manager for lifecycle control (play, remove, cleanup)
- Asset library with JB2A asset mapping and module detection
- Hook integration for ActiveEffect and Actor lifecycle events
- Graceful degradation when Sequencer/JB2A modules not installed
- Automatic animation cleanup on effect removal or actor deletion
- Target-based attack animations triggered from chat messages

**Armor Configuration Dialog**
- ApplicationV2-based armor configuration interface
- Edit armor TN bonus and reduction values
- Armor stacking rules configuration (highest only or all stack)
- Integrated with character sheet armor management
- Form validation and proper data persistence

**Condition Manager Dialog**
- Centralized status effect management interface
- Toggle all conditions and stances from single dialog
- Visual status indicators for active effects
- Quick access to all L5R4 status effects
- Integrated with character sheet for easy condition tracking

**Combat Configuration Dialog**
- Initiative modifier configuration
- Movement rate adjustments
- Combat-related settings in dedicated interface
- Streamlined combat setup workflow

**Wealth Manager**
- New modal wealth management application with calculator-style UI
- Add/remove money by denomination (koku, bu, zeni) with validation
- Currency conversion: 10 zeni ↔ 1 bu, 5 bu ↔ 1 koku
- Prevents negative wealth values with Math.max clamping
- No auto-normalization (5 bu stays 5 bu, not converted to 1 koku)
- Calculator icon launcher on character sheet
- Comprehensive localization in all 6 languages (en, de, es, fr, pt-BR, ru)
- 24 integration tests covering edge cases and error conditions

**Race Condition Protection**
- Roll handlers now prevent double-click exploits using in-progress tracking
- Each roll type tracked independently (skill, attack, trait, ring, spell, weapon, NPC)
- Simultaneous different rolls allowed while preventing duplicate submissions
- Protection covers all roll types: skill, attack, trait, ring, spell, weapon, NPC attacks
- Async/await pattern ensures proper cleanup after roll completion

**Hook Registration System**
- Centralized hook registration in `register-all.js`
- Single point of reference for all active hooks
- Improved debugging and maintenance of hook interactions
- Clear documentation of hook categories and execution order

**Comprehensive Test Suite**
- 18 new integration test files for edge cases and race conditions
- 6 new unit test files for services and utilities
- Tests cover: actor creation, attacks, conditions, damage, emphasis reroll, initiative
- Tests cover: item creation, migrations, skill advancement, spell slots, stances, wounds, XP
- Race condition tests for critical workflows
- Edge case coverage for all major systems

**Validators Module**
- New `utils/validators.js` for input validation
- Centralized validation logic for data integrity
- Type checking and range validation utilities

### Enhanced

**Roll System**
- All roll handlers now async with proper error handling
- Race condition protection across all roll types
- Improved roll key generation for tracking
- Better cleanup with try/finally blocks
- Consistent async patterns throughout roll services

**Resource Management**
- Spell slot manager enhanced with better validation
- Void Point manager improved with edge case handling
- Resource depletion checks more robust
- Better error messages for resource failures

**XP System**
- XP calculations refactored for clarity
- XP formatter improved with better output
- XP versioning enhanced for migration tracking
- Emphasis XP tracking more reliable
- Better handling of custom emphases

**Migration System**
- Migration helpers improved with better error handling
- Icon path migration more robust
- Emphasis migration enhanced with deduplication
- Schema application more reliable
- Embedded items migration improved
- Bow-to-weapon migration enhanced

**Dialog System**
- Roll modifier dialog improved with better layout
- Spell cast dialog enhanced with clearer options
- Maho cast dialog improved for usability
- Better keyboard navigation in all dialogs

**Chat System**
- Chat damage buttons more reliable
- Combat Void spending hooks improved
- Better error handling in chat message creation
- Improved chat card formatting

**Combat System**
- Initiative modifiers now properly configurable
- Movement tracking enhanced with configuration options
- Combat modifiers integrated into derived data calculations

**Code Quality**
- Consistent async/await patterns throughout
- Better error handling with try/catch/finally
- Improved JSDoc documentation
- Cleaner code organization
- Reduced code duplication
- Resolved 18 ESLint unused variable warnings
- Fixed deprecated CONST.CHAT_MESSAGE_TYPES usage (replaced with CONST.CHAT_MESSAGE_STYLES)
- Improved code formatting with Prettier
- Better JSDoc documentation for animation system

### Fixed

**Roll System**
- TN calculation reflects declared raises only
- Free raises reduce required roll result, not TN
- Void point tracking now properly handles edge cases
- Unskilled roll mechanics fixed to prevent incorrect calculations

**Character Sheet**
- Fixed trait values stacking on sheet recalculation
- Trait bonuses now apply correctly without duplication

**Deprecation Warnings**
- Updated chat message type constants to use CONST.CHAT_MESSAGE_STYLES
- Resolved Foundry v13 API deprecation warnings

**Code Cleanup**
- Fixed race condition protection in roll handlers
- Improved async/await patterns in animation hooks
- Better error handling throughout animation system

**Emphasis Migration**
- Old emphases now properly marked as trained (selected) in new system
- Trained emphases are now correctly added to `trainedEmphases` array during migration
- Previously purchased emphases no longer appear as unpurchased after migration

**Icon Migration**
- Fixed embedded item icons not updating on actor sheets
- Icon migration now processes items owned by actors (embedded items)
- Items on character sheets will now properly update from old PNG to new WebP icons

**Race Conditions**
- Fixed double-click exploits in all roll handlers
- Fixed race conditions in actor creation workflows
- Fixed race conditions in item creation workflows
- Fixed race conditions in damage application
- Fixed race conditions in initiative rolls
- Fixed race conditions in skill advancement
- Fixed race conditions in XP tracking

**Resource Management**
- Fixed spell slot depletion edge cases
- Fixed Void Point spending edge cases
- Fixed resource restoration during rest
- Better validation prevents negative resources

**Roll System**
- NPC rolls use unified simple-roll system
- Formula builder edge cases handled
- Unskilled rolls properly handled
- Wound penalty application improved

**UI/UX**
- Removed transition animation on inline controls to prevent visual glitches
- Fixed item list styling issues
- Better visual feedback for roll progress

### Removed

**Code Cleanup**
- Cleaned up unused imports and dependencies
- Streamlined NPC roll system

### Technical

**Architecture**
- Centralized hook registration pattern
- Improved separation of concerns in roll handlers
- Better async/await patterns throughout
- Enhanced error handling strategies
- Race condition protection infrastructure
- New `services/animations/` module structure
- Modular animation system with clear separation of concerns
- Hook-based integration with Foundry lifecycle events
- Asset library abstraction for JB2A integration
- Animation manager service for centralized control

**Dependencies**
- Sequencer module integration (optional, graceful degradation)
- JB2A module integration (optional, graceful degradation)
- System functions without animation modules installed

**Testing**
- 18 new integration test files
- 6 new unit test files
- Comprehensive edge case coverage
- Race condition test suite
- Better test organization and fixtures

**Performance**
- Reduced code duplication in roll handlers
- More efficient roll tracking
- Better resource cleanup
- Optimized migration processes

---

## [3.1.1] - 2025-10-27

### Fixed

**Emphasis Migration**
- Improved emphasis string-to-array migration with intelligent matching
- Case-insensitive matching for official emphases (e.g., "katana" → "Katana")
- Singular/plural matching (e.g., "Dog" → "Dogs", "horse" → "Horses")
- Automatic custom emphasis creation for non-matching items
- Backward compatibility: old `emphasis` field preserved in template.json to prevent data loss
- Migration now merges old and new data safely (idempotent with deduplication)
- Preserves existing `trainedEmphases` during migration

### Enhanced

**Migration Safety**
- Migration can run multiple times safely without duplicating data
- Existing emphasis data is never lost during system updates
- Proper logging of created custom emphases during migration

---

## [3.1.0] - 2025-10-27

### Added

**NPC Attack Editor**
- ApplicationV2-based dialog for editing NPC attack and damage values
- Form fields for attack roll (XkY format) with `roll`, `keep`, `modifier` inputs
- Form fields for damage roll (XkY format) with `roll`, `keep`, `modifier` inputs
- Action type selection dropdown (Simple, Complex, Free, Reaction)
- Damage type text field for specifying damage nature
- Edit buttons integrated into NPC sheet for all three attack slots (attack1, attack2, attack3)
- Proper form submission handling with `_onSubmit` and `_onSave` actions
- HandlebarsApplicationMixin template rendering
- Localized labels using `game.i18n` for all form fields
- Window configuration with auto-height and non-resizable settings
- Direct actor update via `actor.update()` with proper system path targeting

### Enhanced

**NPC Sheet Integration**
- Attack editing workflow streamlined with dedicated dialog
- Consistent form patterns across NPC attack configuration
- Improved UX for managing multiple NPC attacks

---

## [3.0.0] - 2025-10-26

### Breaking Changes

**Test Infrastructure**
- Added comprehensive test suite requiring Quench module for integration tests
- Development workflow now includes mandatory testing before releases

### Added

**Raise & Free Raise System**
- Complete raise mechanics for all roll types (skill, trait, ring, spell, weapon, NPC)
- Declared raises increase TN by 5 each (maximum = Void Ring rank)
- Free Raises reduce TN by 5 each without Void Ring limit
- Raise input fields in all roll dialogs
- Free Raise calculation from items, advantages, techniques
- Unskilled rolls cannot declare raises
- Affinity grants 1 free raise for spell casting
- TN floor at 0 (cannot go negative)
- Visual display of raises and free raises in chat cards
- Game rules citations from Skills_and_Rolls.md

**Damage Application System**
- Apply Wounds button in damage roll chat cards
- Reduce with Void button for Void Point damage reduction (-10)
- Automatic armor reduction applied to incoming damage
- Multi-step damage calculation: Void Point → Armor → Final damage
- Visual notifications showing damage breakdown
- Armor reduction displayed in damage notifications
- One-click damage application to selected tokens

**Armor Reduction**
- Automatic damage reduction from equipped armor
- Reduction value calculated in prepareDerivedData
- Stacking rules support (highest only or all stack)
- Integration with damage application workflow
- Visual feedback showing armor effectiveness
- Works with Void Point reduction (Void first, then armor)

**Guard Maneuver Status Effects**
- Guarding status: -5 Armor TN penalty while protecting ally
- Guarded status: +10 Armor TN bonus while being protected
- Manual application by players when Guard action declared
- Proximity tracking per L5R4 tabletop rules (5 feet)
- Duration until guardian's next turn
- Integration with condition effects system

**Movement Tracking**
- Water Ring-based movement calculation
- Movement rates displayed in Combat section
- Condition penalties affect movement (Blinded -2 Water Ring)
- Automatic calculation from Water Ring value
- Visual display on character sheets

**Item Sheet Redesign**
- 4-tab modular system: Description, Details, Modifiers, Active Effects
- Eliminated 150+ lines of duplicate template code
- Conditional tab visibility based on item type
- Type-specific content in organized partials
- Improved maintainability with DRY architecture
- Better UX with categorized item properties
- Tab state management with ApplicationV2 PARTS pattern

**Emphasis System Overhaul**
- Multiple emphases per skill support
- `availableEmphases` array for skill options
- `trainedEmphases` array for purchased emphases
- Proper XP tracking for each emphasis (2 XP each)
- Emphasis Manager integration
- Migration from legacy single `emphasis` string field

**Spell Memorization**
- `memorized` boolean field on spell items
- Tracking for prepared/memorized spells
- Integration with spell management workflow

**Comprehensive Test Infrastructure**
- 440+ passing unit tests (Vitest)
- Integration test suite (Quench)
- Test fixtures for actors and items
- Smoke tests for all modules
- Unit tests for utilities and calculations
- Integration tests for services, sheets, workflows
- Test documentation in tests/README.md
- npm scripts: test, test:watch, test:ui, test:coverage
- Automated test execution in development workflow

**Void Point Combat Spending**
- Initiative Void Point spending hook
- Void Point expenditure tracking in combat
- Integration with combat tracker

**Healing Stamina Modifier**
- `healingStaminaMod` field for custom healing rate adjustments
- Allows modifying Stamina multiplier in heal rate calculation

### Enhanced

**Roll System**
- All roll types support raises and free raises
- TN calculator handles raise mechanics (+5 per raise)
- TN calculator handles free raise mechanics (-5 per free raise)
- Raise validation against Void Ring limit
- Unskilled roll detection prevents raise declaration
- Roll dialogs display raise inputs and free raise totals
- Chat messages show declared raises and free raises

**Damage System**
- Damage rolls create interactive chat cards
- Apply damage with single click
- Void Point reduction option in chat
- Armor reduction automatic and transparent
- Damage notifications show full breakdown
- Integration with token selection

**Condition Effects**
- Guard maneuver conditions (Guarding/Guarded)
- Armor TN modifiers from conditions
- Movement penalties from conditions (Blinded)
- Comprehensive condition tracking in prepareDerivedData

**Item Management**
- Modular item sheet templates
- Type-specific detail sections
- Organized modifier displays
- Cleaner Active Effects tab
- Reduced code duplication across item types

**XP System**
- Multiple emphasis tracking per skill
- Proper XP calculation for each trained emphasis
- Emphasis Manager displays all trained emphases
- XP recalculation includes emphasis costs

**Migration System**
- Free Raises field migration for all items
- Emphasis array migration from legacy string field
- Embedded items migration support
- Compendium migration support
- World-level migration execution

**Documentation**
- Comprehensive testing guide in CONTRIBUTING.md
- Testing philosophy and tier system
- AAA pattern examples
- Quench integration patterns
- Troubleshooting guide for tests
- Inline code documentation expanded

### Fixed

**Critical Bugs**
- Stance TN stacking bug (Issue #2): Removed queueMicrotask wrapper causing race condition
- Automatic trait changes during form submissions (Issue #1): Removed convertSubmitData corruption
- Emphasis XP tracking: Now uses trainedEmphases array instead of single string
- Ten Dice Rule test: Corrected test expectations

**Roll System**
- Raise validation against Void Ring maximum
- Free raise calculation from multiple sources
- TN floor enforcement (minimum 0)
- Unskilled roll raise prevention

**Item System**
- Equipped checkbox now functional on armor items
- Bow weapon icons display correctly
- Item sheet tab state persistence
- Template path references updated

**Effect System**
- Stance conflict removal synchronized
- Effect cleanup in test hooks
- Duplicate status ID declarations removed
- Guard status effect integration

**Migration System**
- Free Raises defaults backfilled for existing items
- Emphasis migration handles legacy data
- Embedded items properly migrated
- Migration execution order documented

### Technical

**Architecture**
- Modular item sheet template system
- Service-oriented raise management
- Centralized TN calculation
- Condition effects calculation module
- Test fixture infrastructure
- Mock data generators

**Code Quality**
- 73 unit tests for TN calculator
- 21 integration tests for roll types
- 561 total tests passing
- Comprehensive JSDoc coverage
- Game rules citations in code
- Linting and formatting enforced

**Performance**
- Reduced template duplication
- Optimized item sheet rendering
- Efficient raise calculation
- Streamlined damage application

---

## [2.2.1] - 2025-10-25

### Fixed

- Fixed 404 error for test file on fresh builds by converting static import to dynamic import
- Test files now only load when Quench module is active, preventing errors in production

---

## [2.2.0] - 2025-10-16

### Added

**Fear System**

- Fear mechanic for supernatural encounters
- Fear Rank 1-10 on NPC actors
- Automatic TN calculation: 5 + (5 × Fear Rank)
- Willpower + Honor Rank resistance rolls
- Failed tests apply -XkY penalty via Active Effects
- Catastrophic failure (fail by 15+) detection
- Fear test button on NPC sheets
- Multi-target testing (all controlled tokens)
- Fear status effect with custom icon
- Chat cards for test results
- Six-language localization
- Lock mechanism prevents concurrent execution

**Mounted Combat**

- Mounted status via Active Effects
- +1k0 attack bonus vs unmounted targets
- Horsemanship skill detection (multi-language)
- Visual status indicators on tokens
- Integration with attack roll system
- Works for PC and NPC attacks

**Long Rest & Healing**

- Natural healing: (Stamina × 2) + Insight Rank per night
- Resource restoration: spell slots, Void Points
- Fatigued condition removal
- Healing chat cards
- Rest button on character sheets

**UI Improvements**

- Rest button on PC/NPC sheets
- Fear test button on NPC sheets
- Mounted status toggle
- Status effect indicators
- New chat card templates

### Enhanced

**Combat**

- Attack bonuses include mounted calculations
- NPC attacks integrate stance, mounted, circumstance bonuses
- Target detection for mounted status

**Actor Data**

- `fear` structure on NPC actors
- Wound heal rate calculation
- Fear mechanics in derived data prep

**Services**

- `fear.js` - Fear mechanics
- `mounted-combat.js` - Mounted status and bonuses
- `rest.js` - Long rest and healing
- Lock mechanisms for click handlers

**Chat**

- Healing template
- Fear test results
- Speaker attribution
- Error handling

**Calculations**

- `fear-system.js` calculation module
- Heal rate: (Stamina × 2) + Insight Rank
- Fear TN: 5 + (5 × Fear Rank)
- Mounted bonus calculation
- Catastrophic failure (margin ≤ -15)

**Localization**

- Fear system (en, es, fr, pt-BR, de, ru)
- Healing notifications
- Mounted combat labels

### Fixed

- Single transaction for rest operations
- Void Point restoration uses Void Ring rank
- Fear effect status flag structure
- Spell slot restoration references ring values
- Horsemanship detection across languages
- Error handling for healing/Fear edge cases
- Chat message failure notifications

---

## [2.1.0] - 2025-10-15

### Fixed

- Header control duplication in actor sheets
- Removed deprecated edit mode toggle from PC sheet

### Enhanced

- Ternary operator formatting
- Build script: lint + format in single command
- JSDoc for sheet architecture
- Simplified package.json scripts

---

## [2.0.0] - 2025-10-10

### Breaking Changes

**Third-Party Developers**

- 4 monolithic files split into 60+ modules
- File paths and imports reorganized
- Internal APIs changed

**License**

- GPL v2 → MIT License

### Architectural Rewrite

**Before**: 4 files (3,016 lines)

- config.js, dice.js, stance.js, utils.js

**After**: 60+ focused modules

- 5 config
- 8 actor calculations
- 11 item lifecycle
- 18 dice services
- 8 stance automation
- 3 XP management
- 11 sheet handlers
- 7 utilities

### Added

**Mounted Combat**

- Mounted status via Active Effects
- +1k0 attack bonus vs unmounted targets
- Full Attack stance support (no restrictions)
- Visual feedback for stances
- Works for PC and NPC

**Combat Stances**

- Stance dropdown on character sheets
- Five stances: Attack, Full Attack, Defense, Full Defense, Center
- Automatic mutual exclusion
- Stance persistence through combat

**UI Improvements**

- Shift+Click to post items to chat
- Hover tooltips with keyboard hints
- Fade-in controls
- Improved hover animations

**Icon System**

- PNG → WebP migration (60% smaller)
- Automatic token image migration
- Fixed bow weapon icons

**Development**

- CONTRIBUTING.md (architecture, guidelines)
- game-rules/ (38 L5R4 reference files)
- Quench integration test suite
- Comprehensive JSDoc

### Enhanced

- Attack bonus consolidation
- NPC attacks include stance, mounted bonuses
- Full Defense shows actual dice rolls
- Chat card formatting
- Single Responsibility Principle
- Clear separation of concerns
- Code splitting for performance

### Fixed

- Bow weapon icons display correctly
- Token image migration
- Full Defense chat card formatting

### Migration

- **Users**: No action required
- **Developers**: Review CONTRIBUTING.md for new paths
- **Data**: Fully backward compatible

---

## [1.1.0] - 2025-10-01

### Fixed

- Skill roll formulas display Active Effects bonuses in chat

---

## [1.0.2] - 2025-09-30

### Added

- XP Manager recalculation button
- Recalculation success/failure feedback
- Recalculates XP expenditures from character state

---

## [1.0.1] - 2025-09-29

### Added

**Migration System**

- Automated data structure updates
- Version tracking
- Schema field normalization
- Icon path management

**XP Manager**

- XP management interface (ApplicationV2)
- XP breakdown by category
- Automatic L5R4 cost calculation
- Purchase history with timestamps
- Triangular skill costs
- Progressive trait costs
- Complete audit trail

**Stance Automation**

- Combat stance management
- Active Effects integration
- Mutual exclusion
- Five stances: Attack, Full Attack, Defense, Full Defense, Center
- Automatic bonus application
- Status effect integration

**Active Effects**

- Trait and skill modification
- Transferable effects from Family, School, Advantages, Disadvantages
- Automatic bonus application

**Services Architecture**

- Modular service design
- Dice, Chat, Stance services
- Separation of concerns
- Reduced dice service from 21k+ lines

**Base Actor Sheet**

- Shared PC/NPC functionality
- Consistent UI patterns
- Drag-drop support
- Persistent sorting preferences

**ApplicationV2/DialogV2**

- Foundry v13+ APIs
- XP Manager (ApplicationV2)
- Wound Config (ApplicationV2)
- Roll Dialogs (DialogV2)

**Spell Slots**

- Dice service integration
- Automatic deduction
- Depletion validation

**Localization**

- Six languages (en, es, fr, pt-BR, de, ru)
- Skill names localized

### Enhanced

**Dice System**

- Improved Ten Dice Rule
- Better modifier dialogs
- Enhanced chat cards

**File Organization**

- Flat → modular hierarchy
- documents/, sheets/, services/, apps/, setup/

**Architecture**

- Service-oriented design
- Clear separation of concerns
- Single responsibility principle

### Removed

- PC tabs (single-page scrolling)

---

_Legend of the Five Rings is a trademark of Fantasy Flight Games. This is an unofficial fan-made system._
