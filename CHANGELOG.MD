# Changelog

All changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.1.0] - 2025-10-15

### Fixed

- Header control duplication in actor sheets (mixin chain now properly deduplicated)
- Removed deprecated custom edit mode toggle button from PC sheet

### Enhanced

- Code readability with improved ternary operator formatting
- Build script now includes linting and formatting in single command
- Updated JSDoc documentation for sheet architecture
- Simplified package.json scripts for cleaner workflow

---

## [2.0.0] - 2025-10-11

### Added

**Mounted Combat**

- Mounted/higher ground bonuses (+1k0 to attacks)
- Full Attack stance restriction when mounted (needs Horsemanship 3+)
- Visual feedback for restricted stances
- Works for both PCs and NPCs

**User Interface**

- Shift+Click required to post items to chat (prevents accidents)
- Hover tooltips with keyboard hints
- Fade-in controls for cleaner look
- Improved hover animations

**Icon System**

- Migrated all icons from PNG to WebP (60% smaller files)
- Automatic token image migration
- Fixed bow weapon icons

### Enhanced

- Attack bonus consolidation for better code
- NPC attacks now include stance and mounted bonuses
- Full Defense rolls show actual dice with 3D dice
- Better chat card formatting

### Fixed

- Bow weapons display correct icons
- Token images migrate properly
- Full Defense chat cards format correctly

---

## [2.0.0] - 2025-10-10

### 🚀 Major Architectural Rewrite

Complete restructuring into modern, maintainable architecture. **All user data remains fully compatible.**

### Breaking Changes

**For Third-Party Module Developers**

- 4 monolithic files split into 60+ focused modules
- File paths and imports completely reorganized
- Internal APIs changed

**License**

- Changed from GPL v2 to MIT License

### Refactoring

**Before**: 4 large files (3,016 lines total)

- config.js, dice.js, stance.js, utils.js

**After**: 60+ focused modules

- 5 config modules
- 8 actor calculation modules
- 11 item lifecycle modules
- 18 dice service modules
- 8 stance automation modules
- 3 XP management modules
- 11 sheet event handlers
- 7 utility modules

### Added

**User Features**

- Combat stance dropdown on character sheets
- Five stance options: Attack, Full Attack, Defense, Full Defense, Center
- Automatic mutual exclusion
- Stances persist through combat

**Development**

- DEVELOPER.md with contribution guidelines
- game-rules/ with 38 L5R4 rule reference files
- Integration test suite with Quench
- Comprehensive JSDoc documentation

### Improvements

- Single Responsibility Principle enforced
- Clear separation of concerns
- Better code splitting for performance
- Comprehensive documentation

### Migration Impact

**Users**: ✅ No action required - seamless upgrade  
**Developers**: ⚠️ File paths changed - review DEVELOPER.md  
**Data**: ✅ Fully backward compatible

---

## [1.1.0] - 2025-10-01

### Added

- Fear System for NPCs
  - Fear rating support
  - Automatic Fear checks
  - Fear effects on characters
  - Configurable thresholds and durations

### Fixed

- Skill roll formulas now properly display Active Effects bonuses in chat

---

## [1.0.2] - 2025-09-30

### Added

- XP Manager recalculation button (calculator icon)
- User feedback for recalculation success/failure
- Recalculates all XP expenditures from current character state

---

## [1.0.1] - 2025-09-29

### New Features

**Migration System**

- Automated data structure updates
- Version tracking
- Schema field normalization
- Icon path management

**XP Manager**

- Dedicated XP management interface
- Comprehensive XP breakdown by category
- Automatic L5R4 cost calculation
- Complete purchase history with timestamps
- ApplicationV2 architecture

**Stance Automation**

- Automated combat stance management
- Active Effects integration
- Mutual exclusion (one stance at a time)
- Five stances: Attack, Full Attack, Defense, Full Defense, Center
- Automatic bonus application

**Active Effects**

- Complete trait and skill modification system
- Transferable effects from Family, School, Advantages, Disadvantages
- Automatic bonus application

**Services Architecture**

- Modular service-oriented design
- Dice, Chat, and Stance services
- Clear separation of concerns

**Base Actor Sheet**

- Shared functionality between PC and NPC sheets
- Consistent UI patterns
- Drag-drop support
- Persistent sorting preferences

**ApplicationV2/DialogV2**

- Modern Foundry v13+ APIs throughout
- XP Manager with ApplicationV2
- Wound Config with ApplicationV2
- Roll Dialogs with DialogV2

### Enhanced

**Spell Slots**

- Integrated with dice service
- Automatic deduction
- Validation when slots depleted

**XP Tracking**

- Automatic cost calculation
- Triangular costs for skills
- Progressive costs for traits
- Complete audit trail

**Combat Stances**

- Active automation
- Automatic bonus application
- Status effect integration

**Dice System**

- Modular service (reduced from 21k+ lines)
- Improved Ten Dice Rule
- Better modifier dialogs
- Enhanced chat cards

**Localization**

- Six languages (en, es, fr, pt-BR, de, ru)
- Comprehensive coverage including skill names

### Major Refactoring

**File Organization**

- From flat structure to modular hierarchy
- Separated documents/, sheets/, services/, apps/, setup/

**Code Architecture**

- Service-oriented design
- Clear separation of concerns
- Single responsibility principle

**Foundry Compatibility**

- Foundry v13+ APIs
- ApplicationV2 and DialogV2 throughout
- Modern event handling

### Removed

**PC Tabs System**

- Simplified to single-page with scrolling
- Reduced complexity, improved performance

---

_Legend of the Five Rings is a trademark of Fantasy Flight Games. This is an unofficial fan-made system._
