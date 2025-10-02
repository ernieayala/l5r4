# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Modular and testable code

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

## [0.9.5] - 2023-08-15

### Added
- Ancestor as advantage type option
- "All" rings selection option for base spells
- Maho toggle to mark spells as Maho with appropriate warnings
- Tattoos in the spell/techniques category

---

## [0.9.4] - 2023-07-20

### Added
- Translation for Brazilian Portuguese (pt-BR)
- L5R4e specific status effects and stances for tracking
  - Note: System doesn't automatically apply modifiers, but helps with tracking

---

## [0.9.3] - 2023-06-10

### Changed
- Updated system compatibility to Foundry VTT v12

---

## [0.9.2] - 2023-05-15

### Fixed
- PC wound levels weren't being calculated correctly for display on character sheet
- Little Truths version of the 10 Dice Rule setting now functions correctly
  - Full rule text: "Sometimes you will have an odd number of rolled dice above ten, which would normally mean a die is lost when you convert rolled dice to kept dice. Instead, such a 'spare' rolled die becomes a +2 to the total of the roll. For example, 13k5 would convert to 10k6+2."
  - This is a global settings option and is off by default
- Ten Dice Rule now correctly applied to damage rolls
- Chat card for skill rolls now displays which trait is being used for the roll
- Armor TN Modifier field no longer breaks armor display when left empty (treated as 0)

### Added
- Option to equip more than one "armor" piece via global config setting (off by default)
  - Useful for representing added modifiers such as class techniques or buffs
  - Contributed by [NekohimeMusou](https://gitlab.com/NekohimeMusou)

---

## [0.9.1] - 2023-04-01

### Added
- Automatic insight rank calculation based on total insight
  - Can be turned off in settings for manual control
- Wound multiplier for PCs can now be changed in the sheet
  - Affects all levels except "healthy"

---

## [0.9.0] - 2023-03-15

### Changed
- Moved advantages/disadvantages to a new tab in the alternative layout
- Separated advantages/disadvantages from spells/techniques in the standard layout

### Fixed
- Minor UI bugfixes in the dialogs for creating new items from the actor sheet
- Spell sheet: Raises box changed from line input to text area for better usability

---

## [0.8.9] - 2023-02-20

### Fixed
- Major bugfixes for PC and NPC rolls caused in version 0.8.8

---

## [0.8.8] - 2023-02-15

### Added
- Support for skill modifiers
  - Users can now add modifiers to roll, keep, and total of a skill roll on the skill sheet
  - Modifiers automatically populate the popup window and can be edited there
  - If roll is made without the popup window, modifiers are automatically added
- PC sheet: Skills are now sorted by name, rank, trait, type, school, and emphases
  - Can change sort order by clicking on the field above the skills

---

## [0.8.7] - 2023-01-25

### Added
- Alternative sheet layout using tabs (client-side toggle in system settings)
  - **Note**: This feature was removed in v1.0.0 for simplified maintenance

### Fixed
- Formatting of action types for NPC attacks

---

## [0.8.6] - 2023-01-10

### Changed
- **UI Improvements**:
  - Item sheet: Emphases box changed from line input to text area
  - Item sheet: Mastery boxes changed from line input to text area
  - PC sheet: Better separation to avoid School skill and Emphases running into each other
  - NPC sheet: Attacks sent to chat now include the details of the attack (action type gets localized properly)

---

## [0.8.5] - 2022-12-20

### Fixed
- Errors in localization of rolls
- Background display in chat and menu windows

---

## [0.8.4] - 2022-12-05

### Added
- Unskilled rolls with void (or any ring) by holding the control key and clicking on the ring

---

## [0.8.3] - 2022-11-20

### Added
- Void rank for NPCs

### Changed
- Removed insight rank from the limited sheet view (sneaky scorpions can be sneaky now)

---

## [0.8.2] - 2022-11-05

### Added
- Initiative now respects the "Ten dice rule"
- Weapons and bows can now "explode" on results other than 10 to reflect certain masteries and techniques

---

## [0.8.1] - 2022-10-20

### Fixed
- Minor bugfixes

### Changed
- Merged contributions from [NekohimeMusou](https://gitlab.com/NekohimeMusou)

---

## [0.8.0] - 2022-10-01

### Added
- **Foundry VTT v11 Compatibility**: Tested and confirmed compatibility with Foundry v11
- **Integrated L5R Dice Roller**: 
  - Module integrated into the system (no longer requires separate module)
  - Captures chat messages and converts to Foundry VTT roll pattern
  - Shows results with Legend of Five Rings text roll styling
  - Thanks to [eupolemo](https://github.com/eupolemo) for making the module and donating it to the system

---

## [0.7.9] - 2022-09-15

### Changed
- **Style Changes**: Applied the same styling from PCs and NPCs to items and journal entries

### Added
- Removed some hard-coded links to images to allow users to display their own images in the character sheet
- Added custom icons as default for different actor and item types

---

## [0.7.8] - 2022-09-01

### Fixed
- Fixed a typo in the Spanish translation
- Fixed issue of spell slots not updating correctly when setting the game preferences in Spanish

---

## Version History Summary

- **1.0.x**: Complete system overhaul for Foundry v13+ with ApplicationV2, comprehensive XP tracking, stance automation, and Active Effects integration
- **0.9.x**: Foundry v12 compatibility, Brazilian Portuguese translation, status effects, and wound calculation fixes
- **0.8.x**: Skill modifiers, alternative sheet layouts, unskilled rolls, integrated dice roller, and Foundry v11 compatibility
- **0.7.x**: Styling improvements, custom icons, and localization fixes

---

## Migration Notes

### Upgrading from 0.9.x to 1.0.x

**BREAKING CHANGES**: This is a major architectural update that requires Foundry VTT v13 or later.

#### What's Changed
- Complete rewrite using ApplicationV2/DialogV2 APIs (incompatible with Foundry v12 and below)
- Bow items migrated to weapon type with `isBow` flag (automatic migration)
- XP tracking system completely redesigned (automatic migration with retroactive calculation)
- Stance system now uses Active Effects (manual stance re-application may be needed)
- Sheet layouts simplified (alternative tab layout removed)

#### Migration Process
1. **Backup your world** before updating
2. Ensure you're running Foundry VTT v13 or later
3. Update the system via manifest URL or manual installation
4. Open your world - automatic migrations will run
5. Review character sheets for any data inconsistencies
6. Use XP Manager's "Recalculate Purchase XP" button if XP history needs refresh
7. Re-apply combat stances if needed (old status effects may need recreation)

#### What's Preserved
- All character data (traits, skills, items, etc.)
- XP totals and manual adjustments
- Wound configurations
- Actor and item relationships
- Compendium content

#### What Requires Attention
- Combat stances may need to be re-applied using the new status effect system
- Alternative sheet layout users will see single-page layout (tabs removed)
- Custom modules relying on old APIs may need updates

### Upgrading from 0.8.x to 0.9.x

- Minor data structure updates (automatic migration)
- No breaking changes for most users
- Foundry v12 compatibility added

### Upgrading from 0.7.x to 0.8.x

- Integrated dice roller replaces separate module
- No breaking changes for character data
- Foundry v11 compatibility added

---

## Support & Feedback

- **Bug Reports**: [GitHub Issues](https://github.com/ernieayala/l5r4/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/ernieayala/l5r4/discussions)
- **Documentation**: [README.md](https://github.com/ernieayala/l5r4/blob/main/README.md)

---

## Contributors

Special thanks to all contributors who have helped improve this system:

- **Ernie Ayala** - Current maintainer and v1.0+ development
- **Original L5R4 Team** - Foundational work for Foundry v12 and below
- **[NekohimeMusou](https://gitlab.com/NekohimeMusou)** - Wound calculation fixes, armor stacking feature, and various contributions
- **[eupolemo](https://github.com/eupolemo)** - L5R dice roller module donation
- **Community Translators** - Localization support for multiple languages

---

*Legend of the Five Rings is a trademark of Fantasy Flight Games. This is an unofficial fan-made system.*
