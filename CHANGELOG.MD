# Changelog

## Version 1.0.0 - Complete System Overhaul

### NEW FEATURES
- **Migration System**: Automated data structure updates and schema migrations (setup/migrations.js)
- **XP Manager Application**: Dedicated experience point management interface with cost calculation and audit trail (apps/xp-manager.js)
- **Stance Automation Service**: Automated combat stance management with Active Effects integration (services/stance.js)
- **Active Effects Integration**: Complete Active Effects system for dynamic trait and skill modifications
- **Services Architecture**: Modular service-oriented architecture (services/ directory)
- **Setup System**: Organized system initialization (setup/ directory with preload-templates.js, register-settings.js)
- **Base Actor Sheet**: Shared functionality between PC and NPC sheets (sheets/base-actor-sheet.js)
- **Icon Path Resolver**: Flexible icon management system with alias support for future reorganization
- **Family Bonuses System**: Automated character creation bonuses and trait modifications
- **ApplicationV2/DialogV2**: Modern Foundry v13+ APIs throughout the system

### ENHANCED FEATURES (Existed but significantly improved)
- **Spell Slots**: Enhanced from basic system to improved integration with dice service and better UI
- **XP Tracking**: Evolved from simple field to complex cost calculation with automatic progression
- **Combat Stances**: Upgraded from static definitions to active automation with mutual exclusion
- **Dice System**: Completely refactored from 21k+ line monolith to 1.3k line modular service
- **Actor System**: Comprehensive derived data and lifecycle management
- **Sheet System**: Modernized from basic ActorSheet to BaseActorSheet with v13+ APIs and advanced UI
- **Template System**: Reorganized hierarchically organized templates
- **Localization**: Comprehensive coverage including skill names
- **Configuration**: Modernized from basic objects to ES6 modules with immutability and future-proofing
- **Documentation**: Enhanced from minimal comments to JSDoc throughout

### MAJOR REFACTORING
- **File Organization**: Transformed from flat structure to modular directory hierarchy
- **Code Architecture**: Shifted from monolithic to service-oriented design patterns
- **Foundry Compatibility**: Updated from v12 to v13+ APIs with modern patterns
- **Template Structure**: Reorganized from mixed partials to categorized functional hierarchy

### REMOVED FEATURES
- **PC Tabs System**: Simplified complex conditional tab logic for better maintainability

### Technical Improvements
- **Performance Optimization**: Template caching, formula optimization, and memory management
- **Error Handling**: Comprehensive validation and graceful degradation
- **Cross-browser Compatibility**: Improved compatibility across different browsers and Foundry versions
- **Code Quality**: Modern JavaScript patterns with extensive JSDoc documentation

## Version 0.9.5

- Added ancestor as advantage type
- Spells:
    - Added option to select "All" rings for the base spells
    - Added toggle to mark spell as Maho
- Added tattoos in the category spell/techniques

## Version 0.9.4

- Added translation for Brazilian Portuguese.
- Added L5R4e specific status effects and stances. As always the system doesn't automatically apply the modifiers but it should help tracking things

## Version 0.9.3

The system is now compatible with foundryvtt v12!

## Version 0.9.2

Community version! Thanks to [NekohimeMusou](https://gitlab.com/NekohimeMusou).
- PC wound levels weren't being calculated correctly for display on the character sheet
- The option in the settings to use the Little Truths version of the 10 Dice Rule didn't do anything; now it does.
The full text of the rule from LT:

    Sometimes you will have an odd number of rolled dice above ten, which would normally mean a die is lost when you convert rolled dice to kept dice. Instead, such a “spare” rolled die becomes a +2 to the total of the roll. For example, 13k5 would convert to 10k6+2.

This is a global settings option and is off by default.

- The Ten Dice Rule is now correctly applied to damage rolls.
- The chat card for skill rolls now displays which trait is being used for the roll.
- Leaving the Armor TN Modifier field empty used to break the armor display and show an Armor TN of NaN; now it's treated as a 0.
- From [NekohimeMusou](https://gitlab.com/NekohimeMusou): Players in my group find it useful to be able to equip more than one "armor" piece, to represent added modifiers such as class techniques or buffs. This is now possible via a global config setting, which is off by default.


## Version 0.9.1

- Insight rank is now calculated automatically based on total insight. This feature can be turned off in the settings.
- The wound multiplier for PCs can now be changed in the sheet. It affects all levels except "healthy"

## Version 0.9.0

- Moved advantages/disadvantages to a new tab in the alternative layout
- Separated advataged/disadvantages from spells/techniques in the standard layout
- Minor UI bugfixes in the dialogs for creating new items from the actor sheet
- Spell sheet:
    - Raises box changed from line input to text area

## Version 0.8.9

Major bugfixes for pc and npc rolls caused in version 0.8.8

## Version 0.8.8

- Added suport for skill modifiers
    - Users can now add modifiers to roll, keep and the total of a skill role on the skill sheet
    - The modifiers will automatically populate the popup window and can be edited there
    - If the roll is made without the popup window the modifiers will be automatically added

- PC sheet:
    - Skills are now sorted by name, rank, trait, type, school and emphases
    - You can change the way the are sorted by clicking on the field above the skills

## Version 0.8.7

- ~~Alternative sheet layout using tabs. This can be toggled client side in the system settings~~ (Removed in v1.0.0)
- Fix formatting of action types for npc attacks

## Version 0.8.6

- UI Improvements:
    - Item sheet:
        - Emphases box changed fron line input to text area
        - Mastery boxes changed fron line input to text area

- PC sheet:
    - Better separation to avoid School skill and Emphases running into each other

- NPC sheet:
    - Attacks sent to chat now include the details of the attack (and the action type gets localized properly)

## Version 0.8.5

- UI bugfixes
    - fixed errors in localization of rolls
    - properly display backgrounds in chat and menu windows
     

## Version 0.8.4

- You can now roll unskilled rolls with void (or any ring) by holding the control key and clicking on the ring

## Version 0.8.3

- Added void rank for npcs
- Removed insight rank from the limited sheet view (sneaky scorpions can be sneaky now)


## Version 0.8.2

### Added functionality

- Initiative also respects the "Ten dice rule"
- Weapons and bows can now "explode" on results other than 10 to reflect certain masteries and techniques

## Version 0.8.1

Minor bugfixes and merged contributions from [NekohimeMusou](https://gitlab.com/NekohimeMusou)

## Version 0.8.0

### Tested V11 compatibility

No major changes but finall had time to test v11 compatibility

### Integration of L5R dice roller

The module has now been integrated to the system. It captures chat message and converts to a Foundry VTT roll pattern and shows the result with the Legend of Five Rings text roll.

Thanks to [eupolemo](https://github.com/eupolemo) for making the module and for donating it to the system!

## Version 0.7.9

### Style Changes

- Applied the same styling from pcs and npcs to items and journal entries

### Minor Improvements

- Removed some hard coded links to images to allow users to display their own images in the character sheet
- added custom icons as default for different actor and item types

## Version 0.7.8

### Bug Fixes

- Fixed a typo in the spanish translation
- Fixed issue of spell slots not updating correctly when setting the game preferences in spanish
