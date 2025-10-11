# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-10-11

### Added

**Mounted Combat System**
- New mounted combat service (`module/services/mounted-combat.js`)
- Mounted/higher ground attack bonuses: +1k0 to attack rolls
- Full Attack stance restriction when mounted (requires Horsemanship 3+)
- Visual feedback in stance dropdown for restricted options
- Automatic bonus application for both PC and NPC attack rolls

### Enhanced

**Combat System**
- Attack bonus consolidation: Combined stance and mounted bonuses via `getAllAttackBonuses()`
- NPC attack rolls now include stance and mounted combat bonuses
- Full Defense roll chat cards now display actual dice roll with 3D dice integration
- Improved roll HTML rendering in chat for better visual feedback

**Icon System Migration**
- Migrated all system icons from PNG to WebP format for better performance
- Updated 25 PNG icons to modern WebP equivalents
- Reduced file sizes by ~60% while maintaining visual quality
- Updated icon migration mapping in `module/setup/migrations.js`:
  * Stance icons: `attackstance.png` → `attack-stance.webp`, etc.
  * Item type icons: `bow.png` → `bow.webp`, `sword.png` → `weapon.webp`, etc.
  * Actor icons: `helm.png` → `pc.webp`, `ninja.png` → `npc.webp`
  * Status icons: `grapple.png` → `grappled.webp`, `mounted.png` → `mounted.webp`

**Migration System**
- Token image migration: Automatically updates actor prototype token images during icon migration
- Bow weapon icon fix: Special migration logic to correct bow weapons with incorrect sword icons
- Enhanced FilePicker compatibility for Foundry v13+
- Improved error handling and logging for migration failures

### Fixed
- Bow weapons now correctly display bow icon instead of generic weapon/sword icons
- Actor token images now properly migrate alongside portrait images
- Full Defense roll chat card formatting improved with proper HTML structure

### Technical

**Code Quality**
- Refactored attack bonus calculation into centralized `getAllAttackBonuses()` function
- Removed duplicate stance bonus logic from PC sheet weapon rolls
- Improved separation of concerns between stance and mounted combat systems
- Enhanced localization with mounted combat UI strings

**Localization**
- Added `l5r4.ui.mechanics.mounted.fullAttackRestriction` key
- Added `l5r4.ui.mechanics.mounted.attackBonus` key

---

## [2.0.0] - 2025-10-10

### 🚀 MAJOR ARCHITECTURAL REFACTORING

Version 2.0.0 represents a complete restructuring of the L5R4 system codebase into a modern, maintainable, and scalable architecture. While this is a major version bump due to the extensive internal changes, **all user data and functionality remain fully backward compatible**.

### Breaking Changes

**BREAKING CHANGE: Internal API Structure**
- Monolithic modules split into 60+ focused files
- File paths and import statements completely reorganized
- Third-party modules depending on internal APIs may need updates

**License Change**
- Previous: GPL v2
- New: MIT License (more permissive for community contributions)

### Refactoring Overview

#### Module Organization
**Before**: 4 monolithic files (3,016 lines)
- `module/config.js` (416 lines)
- `module/services/dice.js` (1,343 lines)
- `module/services/stance.js` (773 lines)
- `module/utils.js` (484 lines)

**After**: 60+ focused modules organized by domain
- `module/config/` - 5 configuration modules
- `module/documents/actor/` - 8 actor calculation modules
- `module/documents/item/` - 11 item lifecycle modules
- `module/services/dice/` - 18 dice service modules
- `module/services/stance/` - 8 stance automation modules
- `module/services/xp/` - 3 XP management modules
- `module/sheets/handlers/` - 11 sheet event handlers
- `module/setup/settings/` - 4 settings modules
- `module/utils/` - 7 utility modules

#### Architecture Improvements

**Configuration System**
- Split monolithic config into domain-specific modules
- Added constants.js for system-wide constants (SYS_ID, paths)
- Added game-data.js for L5R4 game data definitions
- Added icons.js for icon path resolution
- Added localization.js for i18n helpers
- Added templates.js for template path management

**Actor Document System**
- Extracted calculations into specialized modules:
  * `fear-system.js` - NPC fear mechanics
  * `shared-traits-rings.js` - Ring calculation logic
  * `stance-effects.js` - Stance bonus application
  * `wound-system.js` - Wound threshold calculation
  * `xp-system.js` - XP tracking and costs
- Added actor constants for wound thresholds
- Added creation bonuses module for family/school bonuses

**Item Document System**
- Organized into functional subdirectories:
  * `constants/` - Item types and XP costs
  * `integration/` - Chat cards and sheet data
  * `lifecycle/` - Creation, updates, XP tracking
  * `preparation/` - Base data, derived data, formulas
- Improved skill formula handling
- Added bow damage calculation module

**Dice Service Decomposition**
- Deleted 1,343-line monolithic file
- Created 18 focused modules:
  * `core/` - Formula builder, roll parser, TN calculator, Ten Dice Rule
  * `dialogs/` - Separate dialog for each roll type (5 modules)
  * `effects/` - Bonus applicator for Active Effects
  * `resources/` - Spell slots, void points, target resolution
  * `rolls/` - Roll execution by type (5 modules)

**Stance System Modularization**
- Deleted 773-line monolithic file
- Created 8 focused modules:
  * `core/` - Automation, effect templates, helpers
  * `hooks/` - Effect lifecycle, roll integration
  * `rolls/` - Attack bonuses, full defense rolls
  * `initialize.js` - System initialization

**Sheet System Transformation**
- Extracted sheet logic into 11 specialized handlers:
  * `app-launcher-handler.js` - Application windows
  * `bio-item-handler.js` - Biography & items
  * `drag-drop-handler.js` - Drag/drop operations
  * `item-crud-handler.js` - Item CRUD operations
  * `item-effects-handler.js` - Active Effects UI
  * `pc-adjustment-handler.js` - PC stat adjustments
  * `pc-context-builder.js` - Context menu construction
  * `pc-trait-handler.js` - Trait manipulation
  * `roll-handler.js` - Roll triggering
  * `sort-handler.js` - Item sorting
  * `void-points-handler.js` - Void point management
- Added UI components: context-menu-builder, image-editor
- Added keyboard-behavior mixin
- Reduced pc-sheet.js from 811 lines to focused orchestration
- Reduced base-actor-sheet.js from 688 lines to core functionality

**Utilities Reorganization**
- Split 484-line monolithic utils.js into 7 focused modules:
  * `advancement.js` - Character advancement logic
  * `dom.js` - DOM manipulation helpers
  * `localization.js` - i18n utilities
  * `mechanics.js` - Game mechanics calculations
  * `sorting.js` - Sorting algorithms
  * `type-coercion.js` - Type conversion utilities
  * `xp-calculations.js` - XP cost formulas

**Setup & Configuration**
- Modularized settings into client/world/migration modules
- Added register-handlebars.js for Handlebars helper registration
- Improved preload-templates.js organization
- Enhanced migrations.js structure

**Main Entry Point**
- Simplified l5r4.js from 433 lines of inline logic to clean orchestration
- Removed inline stance enforcement (moved to modules)
- Removed inline Handlebars helpers (moved to modules)
- Added Quench test integration
- Improved initialization flow and error handling

### Added Features

**User-Facing Features**
- **Combat Stance Controls**: Dropdown stance selector on character sheets (PC and NPC)
  - Located below Initiative section for easy access during combat
  - Five stance options: Attack, Full Attack, Defense, Full Defense, Center
  - Uses existing stance system with Active Effects
  - Zero new CSS required - reuses existing grid pattern from Initiative section
  - Automatic mutual exclusion via existing stance lifecycle hooks
  - Stances persist through combat rounds and affect roll calculations

**Service Modules**
- `family-bonus-service.js` - Character creation family bonuses
- `initiative.js` - Initiative computation service
- XP service modules (calculator, formatter, versioning)

**Development Infrastructure**
- `DEVELOPER.md` - Comprehensive contribution guidelines
- `game-rules/` - 38 markdown files with L5R4 rule references
- `tests/` - Integration test suite with Quench framework
- `ARCHITECTURE.md` - System architecture documentation (555 lines)

**Template Enhancements**
- Attack raises tracking in weapon chat cards
- Stance bonus display in roll modifiers dialog
- Improved data flow for weapon attack sequences

### Technical Improvements

**Code Quality**
- Single Responsibility Principle enforced across all modules
- Clear separation of concerns with domain-driven organization
- Improved testability with isolated functions
- Enhanced maintainability with focused module boundaries
- Better code splitting for performance

**Documentation**
- Comprehensive JSDoc across all modules
- Module-level documentation explaining purpose and responsibilities
- Clear API contracts for inter-module communication
- Architecture documentation for developers

**Performance**
- Better code splitting reduces initial load
- Isolated modules enable tree-shaking
- Clearer import paths improve bundling efficiency

### Migration Impact

**For Users**: ✅ Seamless upgrade
- No action required
- All data fully compatible
- No breaking changes to functionality
- Existing characters, items, and worlds work without modification

**For Developers**: ⚠️ Requires attention
- All file paths changed
- Import statements need updating
- Internal APIs reorganized
- Module structure completely different
- Review DEVELOPER.md for new architecture

**For Data**: ✅ Fully backward compatible
- No data migrations required
- All flags and settings preserved
- Existing Active Effects continue working
- No compendium updates needed

### Files Changed

**Statistics**
- 113 files changed
- +18,192 insertions
- -9,400 deletions
- Net: +8,792 lines (includes new documentation and tests)

**Deleted Files**
- `COPYING` (GPL v2 license)
- `module/config.js`
- `module/services/dice.js`
- `module/services/stance.js`
- `module/utils.js`
- `_for_research/` (development artifacts)

**Added Directories**
- `module/config/` (5 modules)
- `module/documents/actor/` (8 modules)
- `module/documents/item/` (11 modules)
- `module/services/dice/` (18 modules)
- `module/services/stance/` (8 modules)
- `module/services/xp/` (3 modules)
- `module/sheets/handlers/` (11 modules)
- `module/sheets/ui/` (2 modules)
- `module/sheets/mixins/` (1 module)
- `module/setup/settings/` (4 modules)
- `module/utils/` (7 modules)
- `game-rules/` (38 markdown files)
- `tests/` (integration test suite)

### Fixed
- Fixed stance effect template lookup for Full Attack stance (function name mismatch)

### Acknowledgments

This refactoring maintains all functionality while providing a solid foundation for future development. Special thanks to the community for feedback and support during this major architectural improvement.

---

## [1.1.0] - 2025-10-01

### Added
- **Fear System**: Comprehensive Fear mechanics implementation for NPCs
  - Fear rating support on NPC sheets
  - Automatic Fear checks when NPCs are encountered
  - Fear effects applied to characters based on check results
  - Configurable Fear thresholds and durations

### Fixed
- **Skill Roll Display**: Fixed formula display to properly show Active Effects bonuses in chat cards
  - Roll and keep bonuses from effects now correctly displayed in roll breakdown

### Technical
- Code documentation cleanup across multiple modules
- Enhanced JSDoc comments for better maintainability

---

## [1.0.2] - 2025-09-30

### Added
- **XP Manager Recalculation**: Added calculator icon button to XP Manager Purchases section for manual recalculation of XP purchases from current character state
- User feedback notifications for XP recalculation success/failure

### Technical
- Leverages existing `_retroactivelyUpdateXP()` method for recalculation logic
- Forces version flag reset to trigger full XP purchase rebuild
- Recalculates all XP expenditures: traits, void, skills, advantages, disadvantages, kata, kiho
- Updates `flags.l5r4.xpSpent` array on actor document
- Includes proper error handling and console logging

---

## [1.0.1] - 2025-09-29

### NEW FEATURES

#### Migration System
- Automated data structure updates and schema migrations (`setup/migrations.js`)
- Version tracking with automatic migration execution on system updates
- Schema field name normalization for consistency
- Icon path management with backward compatibility
- Bow-to-weapon type migration for data model unification

#### XP Manager Application
- Dedicated experience point management interface (`apps/xp-manager.js`)
- Comprehensive XP breakdown by category (traits, void, skills, advantages, disadvantages, kata, kiho)
- Automatic cost calculation with L5R4 progression formulas
- Manual XP adjustment system with audit trail
- Retroactive XP calculation from current character state
- Complete XP purchase history with timestamps and descriptions
- Built on ApplicationV2 architecture for modern Foundry v13+ compatibility

#### Stance Automation Service
- Automated combat stance management (`services/stance.js`)
- Active Effects integration for stance bonuses and penalties
- Mutual exclusion enforcement (only one stance active at a time)
- **Attack Stance**: Visual indicator only
- **Full Attack Stance**: +2k1 to attack rolls, -10 to Armor TN
- **Defense Stance**: Air Ring + Defense Skill to Armor TN
- **Full Defense Stance**: Defense/Reflexes roll, half (rounded up) to Armor TN
- **Center Stance**: Visual indicator only
- Automatic stance effect application during actor data preparation
- Status effect system integration for visual indicators

#### Active Effects Integration
- Complete Active Effects system for dynamic trait and skill modifications
- Transferable effects from Family, School, Advantage, and Disadvantage items
- Trait bonuses applied automatically during data preparation
- Skill-specific roll/keep/total bonuses
- Ring-based bonuses for spell casting
- Combat bonuses (initiative, armor TN, damage)
- Wound penalty modifiers

#### Services Architecture
- Modular service-oriented architecture (`services/` directory)
- **Dice Service** (`services/dice.js`): Roll mechanics, Ten Dice Rule, modifier dialogs
- **Chat Service** (`services/chat.js`): Unified item creation dialog system
- **Stance Service** (`services/stance.js`): Combat stance automation and effects
- Clear separation of concerns for maintainability

#### Setup System
- Organized system initialization (`setup/` directory)
- **Preload Templates** (`setup/preload-templates.js`): Template caching for performance
- **Register Settings** (`setup/register-settings.js`): Centralized settings registration
- **Migrations** (`setup/migrations.js`): Data migration system

#### Base Actor Sheet
- Shared functionality between PC and NPC sheets (`sheets/base-actor-sheet.js`)
- Common event handlers and data preparation
- Consistent UI patterns across actor types
- Drag-drop functionality for items
- Sorting preferences with persistence

#### Icon Path Resolver
- Flexible icon management system with alias support
- Future-proof asset organization without breaking references
- Centralized icon path resolution (`config.js`)
- Backward compatibility for existing icon references

#### Family Bonuses System
- Automated character creation bonuses via Active Effects
- Trait modifications from Family items
- Proper XP cost calculation accounting for family bonuses
- Free trait rank tracking for accurate advancement costs

#### ApplicationV2/DialogV2 Integration
- Modern Foundry v13+ APIs throughout the system
- **XP Manager**: ApplicationV2 with HandlebarsApplicationMixin
- **Wound Config**: ApplicationV2 with real-time updates
- **Roll Dialogs**: DialogV2 for all roll option prompts
- Form handling with action delegation
- Improved performance and maintainability

### ENHANCED FEATURES

#### Spell Slots
- **Before**: Basic checkbox system with manual tracking
- **After**: Integrated with dice service for automatic deduction
- Elemental spell slots (Air, Earth, Fire, Water, Void)
- Validation prevents casting when slots depleted
- Chat message integration shows slot usage
- Better UI with clear slot indicators

#### XP Tracking
- **Before**: Simple XP field with manual calculation
- **After**: Complex cost calculation with automatic progression
- Triangular costs for skills (1+2+3+...+rank)
- Progressive costs for traits (4×new_rank)
- Fixed costs for void (6×new_rank)
- School skill free rank handling
- Emphasis cost tracking (2 XP each)
- Advantage/disadvantage cost integration
- Kata/kiho cost tracking
- Complete audit trail with timestamps

#### Combat Stances
- **Before**: Static status effect definitions
- **After**: Active automation with mutual exclusion
- Automatic bonus application during rolls
- Armor TN modifications during data preparation
- Defense/Reflexes roll for Full Defense stance
- Chat integration for stance change notifications
- Status effect system integration

#### Dice System
- **Before**: 21k+ line monolithic file
- **After**: 1.3k line modular service
- Refactored into focused functions
- Improved Ten Dice Rule implementation
- Better modifier dialog system
- Enhanced chat card rendering
- Cleaner error handling
- Performance optimizations

#### Actor System
- **Before**: Basic data preparation
- **After**: Comprehensive derived data and lifecycle management
- Automatic ring calculation from trait pairs
- Initiative computation with modifiers
- Armor TN calculation with stacking rules
- Wound system with Earth-based thresholds
- Insight calculation with optional auto-rank
- XP tracking with automatic cost calculation
- Family/School bonus integration
- Active Effects support

#### Sheet System
- **Before**: Basic ActorSheet implementation
- **After**: BaseActorSheet with v13+ APIs and advanced UI
- ApplicationV2 architecture
- Improved event handling with action delegation
- Better drag-drop functionality
- Sorting preferences with persistence
- Real-time data updates
- Enhanced accessibility

#### Template System
- **Before**: Mixed partials in flat structure
- **After**: Hierarchically organized templates
- Categorized by function (actor, cards, chat, apps, dialogs)
- Partial templates for reusability
- Consistent naming conventions
- Better maintainability

#### Localization
- **Before**: Basic UI text coverage
- **After**: Comprehensive coverage including skill names
- All UI elements localized
- Skill name translations
- Setting descriptions translated
- Error message localization
- Six languages supported (en, es, fr, pt-BR, de, ru)

#### Configuration
- **Before**: Basic objects with mutable state
- **After**: ES6 modules with immutability and future-proofing
- Frozen configuration objects
- Centralized constants (SYS_ID, paths, templates)
- Icon path resolver for asset organization
- Template path helpers
- Arrow modifier constants
- Ring and skill label mappings

#### Documentation
- **Before**: Minimal comments
- **After**: JSDoc throughout codebase
- Comprehensive function documentation
- Parameter type definitions
- Return value documentation
- Usage examples
- Integration point references
- Performance notes

### MAJOR REFACTORING

#### File Organization
- **Before**: Flat structure with mixed concerns
- **After**: Modular directory hierarchy
- `documents/` - Actor and Item document classes
- `sheets/` - Sheet classes for UI rendering
- `services/` - Business logic services (dice, chat, stance)
- `apps/` - Application windows (XP Manager, Wound Config)
- `setup/` - System initialization and configuration

#### Code Architecture
- **Before**: Monolithic files with mixed responsibilities
- **After**: Service-oriented design patterns
- Clear separation of concerns
- Single responsibility principle
- Dependency injection where appropriate
- Modular and maintainable code

#### Foundry Compatibility
- **Before**: Foundry v12 APIs
- **After**: Foundry v13+ APIs with modern patterns
- ApplicationV2 for all applications
- DialogV2 for all dialogs
- HandlebarsApplicationMixin for template rendering
- Modern event handling with action delegation
- Improved Active Effects integration

#### Template Structure
- **Before**: Mixed partials with unclear organization
- **After**: Categorized functional hierarchy
- `actor/` - Character sheet templates
- `actor/_partials/` - Reusable actor components
- `cards/` - Item chat card templates
- `cards/_partials/` - Reusable card components
- `chat/` - Chat message templates
- `apps/` - Application window templates
- `dialogs/` - Dialog templates

### REMOVED FEATURES

#### PC Tabs System
- **Reason**: Simplified complex conditional tab logic for better maintainability
- **Impact**: Single-page character sheet with scrolling sections
- **Benefit**: Reduced code complexity, improved performance, better mobile support

### Technical Improvements

#### Performance Optimization
- Template caching via preload system
- Formula optimization in dice service
- Efficient Active Effects processing
- Reduced unnecessary data preparation cycles
- Optimized event handlers with delegation
- Memory management improvements

#### Error Handling
- Comprehensive validation throughout
- Graceful degradation for missing data
- Detailed console logging for debugging
- User-friendly error notifications
- Recovery mechanisms for corrupted data

#### Cross-browser Compatibility
- Improved compatibility across different browsers
- Better handling of browser-specific quirks
- Consistent behavior across platforms
- Mobile-friendly interfaces

#### Code Quality
- Modern JavaScript patterns (ES6+)
- Extensive JSDoc documentation
- Consistent code style
- Reduced code duplication
- Improved maintainability

---

*Legend of the Five Rings is a trademark of Fantasy Flight Games. This is an unofficial fan-made system.*
