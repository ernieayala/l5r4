# Changelog

All changes to this project are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

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
