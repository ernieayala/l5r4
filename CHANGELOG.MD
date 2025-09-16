# Changelog

## Version 1.0.0

### Major System Refactor

- **Removed PC Tabs Feature**: Completely removed the alternative PC sheet layout with tabs functionality and all related code, settings, and translations

- **Code Structure Reorganization**: Restructured the module directory to improve separation of concerns:
  - `module/documents/` - Actor and Item document classes with pure rule logic
  - `module/sheets/` - UI rendering classes extending ActorSheetV2/ItemSheetV2
  - `module/services/` - Dice rolling, chat rendering, and game mechanics
  - `module/setup/` - Settings registration, template preloading, and migrations

- **Naming Convention Standardization**: 
  - File names now use kebab-case (e.g., `pc-sheet.js`, `base-actor-sheet.js`)
  - Class names remain PascalCase (e.g., `L5R4Actor`, `L5R4PcSheet`)
  - Constants use UPPER_SNAKE_CASE
  - Flags consistently use `flags[SYS_ID].camelCaseKey` pattern

- **Base Actor Sheet**: Created shared base class to reduce code duplication between PC and NPC sheets

- **Template Organization**: Consolidated and organized Handlebars templates with unified partial structure

- **Migration System**: Added robust migration utilities to safely update existing world data

- **Foundry v13 Compatibility**: Full migration to ActorSheetV2/ItemSheetV2 with proper lifecycle methods

- **Developer Experience**: Improved JSDoc documentation, consistent error handling, and defensive coding practices

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
