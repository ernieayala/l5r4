# Changelog

All changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

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
