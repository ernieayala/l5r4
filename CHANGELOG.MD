# Changelog

All changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [2.2.0] - 2025-10-16

### Added

**Fear System**

- Complete Fear mechanic implementation for supernatural horror encounters
- Fear Rank system (1-10) for NPCs representing terror intensity
- Automatic Fear TN calculation: 5 + (5 × Fear Rank)
- Willpower + Honor Rank resistance rolls with proper L5R4 mechanics
- Failed tests apply persistent -XkY penalties to all rolls via Active Effects
- Catastrophic failure detection (failure by 15+) for fleeing/cowering outcomes
- Click-to-test Fear button on NPC sheets
- Multi-target Fear testing (test all controlled tokens simultaneously)
- Fear status effect with custom icon and automatic tracking
- Comprehensive chat cards showing test results and effects
- Localized Fear UI text across all six supported languages
- Proper lock mechanism to prevent concurrent test execution

**Mounted Combat System**

- Full mounted combat mechanics per L5R4 core rules
- Mounted status tracking via Active Effects system
- +1k0 attack bonus for mounted attackers vs unmounted targets
- Automatic mounted status detection and application
- Horsemanship skill detection with multi-language support (English, French, German)
- Visual mounted status indicators on tokens
- Seamless integration with existing attack roll system
- Proper bonus application in both PC and NPC attack rolls
- Works with all weapon types and attack scenarios

**Long Rest & Healing**

- Natural healing system: (Stamina × 2) + Insight Rank wounds healed per night
- Complete resource restoration on long rest
  - All spell slots (Air, Earth, Fire, Water, Void) restore to maximum
  - Void Points restore to full (Void Ring value)
- Automatic Fatigued condition removal
- Comprehensive healing chat cards with before/after status
- One-click rest button on character sheets
- Wound state tracking and validation
- Visual feedback for full recovery
- Proper error handling with localized notifications

**User Interface**

- Rest button added to PC and NPC sheets for quick long rest application
- Fear test button on NPC sheets with proper hover states
- Mounted status toggle in combat effects section
- Visual indicators for all new status effects (Fear, Mounted, Fatigued)
- Improved chat card formatting for healing and Fear tests
- Icon system expanded with Fear and healing assets

### Enhanced

**Combat System**

- Attack roll bonuses now include mounted combat calculations
- NPC attack rolls properly integrate stance, mounted, and circumstance bonuses
- Target selection improved for mounted vs unmounted detection
- Consolidated attack bonus system for cleaner code architecture

**Actor Data Model**

- Added `fear` data structure to NPC actors (rank, tn, active state)
- Wound healing rate calculation integrated into character data
- Proper derived data preparation for Fear mechanics
- Improved type coercion throughout healing and Fear systems

**Services Architecture**

- New `fear.js` service module with comprehensive Fear mechanics
- New `mounted-combat.js` service for mounted status and bonuses
- New `rest.js` service handling long rest and natural healing
- Fear service includes single and multi-target test execution
- Proper separation of concerns with focused service responsibilities
- Click handler lock mechanisms to prevent race conditions

**Chat System**

- New healing chat template with rich formatting
- Fear test results with detailed outcome descriptions
- Improved chat card styling for new mechanics
- Proper speaker attribution for all new chat messages
- Error handling with graceful degradation for chat failures

**Calculations & Formulas**

- New `fear-system.js` calculation module for derived Fear data
- Heal rate formula: (Stamina × 2) + Insight Rank + modifiers
- Fear resistance TN formula: 5 + (5 × Fear Rank)
- Mounted attack bonus calculation with proper target awareness
- Catastrophic failure detection (margin ≤ -15)

**Documentation**

- Comprehensive JSDoc for all new service modules
- Inline code documentation for Fear mechanics
- Detailed game rule citations for mounted combat
- Architecture notes for service layer integration
- README updated with Fear, Mounted Combat, and Healing sections

**Localization**

- Complete Fear system text in all six languages (en, es, fr, pt-BR, de, ru)
- Healing notification text localized
- Mounted combat UI labels translated
- Fear status effect names internationalized
- Proper formatting strings for dynamic text

### Fixed

- Actor updates now use single transaction for rest operations (prevents partial updates)
- Proper void point restoration calculation using Void Ring rank
- Fear effect creation with correct status flag structure
- Spell slot restoration correctly references ring values
- Horsemanship skill detection works across localized skill names
- Error handling improved for edge cases in healing and Fear tests
- Chat message posting failures now show user-friendly notifications

### Technical Improvements

**Code Quality**

- Consistent error handling patterns across new services
- Proper null/undefined guards throughout new modules
- Type coercion with fallbacks for all numeric calculations
- Defensive programming for effect queries (statuses vs legacy flags)
- Lock mechanisms prevent concurrent execution issues
- Clean separation between calculation and side effect logic

**Architecture**

- New services follow established modular architecture
- Clear API boundaries with proper import restrictions
- Calculation modules remain pure (no side effects)
- Service modules handle Foundry API integration
- Proper async/await patterns throughout
- Template rendering with comprehensive error handling

**Performance**

- Single actor update transaction for rest (reduces Foundry API calls)
- Efficient Active Effect queries with early returns
- Localized string caching where appropriate
- Minimal template rendering overhead
- Debounced click handlers prevent duplicate processing

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
