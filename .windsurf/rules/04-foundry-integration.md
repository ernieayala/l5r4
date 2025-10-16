---
trigger: always_on
---

## Purpose
How to integrate with FoundryVTT v13 framework correctly.

---

## Framework Version

### Target
**FoundryVTT Version 13**

### API Documentation
https://foundryvtt.com/api/

### Check API Before Assuming
When unsure about Foundry methods or patterns, reference the official API documentation.

---

## Document Classes

### Extending Actor

**Base Class:** `Actor`

**Purpose:** Data model and computation for actors

**Key Methods:**
- `prepareDerivedData()` - Calculate derived stats
- `prepareBaseData()` - Initialize base data
- `getRollData()` - Data available to rolls

**Registration:**
Must register custom actor class with `CONFIG.Actor.documentClass`

**Responsibilities:**
- Compute all derived values
- Store game state
- Expose data for sheets
- NO UI logic
- NO DOM access

### Extending Item

**Base Class:** `Item`

**Purpose:** Data model and computation for items

**Registration:**
Must register custom item class with `CONFIG.Item.documentClass`

**Responsibilities:**
- Compute item-specific values
- Validate item data
- Expose properties for sheets

---

## Sheet Classes (V13 Pattern)

### ActorSheetV2

**CRITICAL:** Use `ActorSheetV2` for Foundry v13, not legacy `ActorSheet`.

**Base Class:** `foundry.applications.sheets.ActorSheetV2`

**Configuration:**
- Define `DEFAULT_OPTIONS` with classes, position, actions
- Define `PARTS` for template partials
- Each part has its own template path

**Key Methods:**
- `_prepareContext()` - Shape data for templates, return context object
- `_onRender()` - Post-render setup, attach event listeners
- Action handlers defined in `DEFAULT_OPTIONS.actions`

**Registration:**
Use `Actors.registerSheet()` with system ID, sheet class, types, and makeDefault flag

### ItemSheetV2

**CRITICAL:** Use `ItemSheetV2` for Foundry v13, not legacy `ItemSheet`.

**Base Class:** `foundry.applications.sheets.ItemSheetV2`

**Configuration:**
- Same pattern as ActorSheetV2
- Define DEFAULT_OPTIONS and PARTS
- Implement _prepareContext() and _onRender()

**Registration:**
Use `Items.registerSheet()` with system ID, sheet class, and types

---

## Event Delegation

### CRITICAL RULE: Data Attributes Only

**JavaScript must NEVER query by class names or IDs.**

**Use:** `data-*` attributes exclusively

**Why:**
- Classes are for CSS styling
- IDs are for DOM structure
- Data attributes are for JavaScript behavior

### Pattern

**In Template (Handlebars):**
Use `data-action` attribute for action identification
Use `data-*` attributes for passing data (item IDs, skill keys, trait keys, etc.)

**In Sheet:**
Attach single delegated listener to sheet root element
Use `closest("[data-action]")` to find action target
Extract action from `dataset.action`
Switch on action and route to appropriate handler

### Extracting Data from Attributes

Access via `target.dataset` property
Attribute names convert to camelCase: `data-item-id` becomes `dataset.itemId`

### Never Do This

❌ `document.querySelector(".roll-button")`
❌ `document.getElementById("item-123")`
❌ `this.element.find(".actor-name")`
❌ `event.target.classList.contains("active")`

### Always Do This

✅ `event.target.closest("[data-action]")`
✅ `target.dataset.action`
✅ Query using data attribute selectors

---

## Template System

### Handlebars

**Foundry uses Handlebars for templates.**

**Template Location:** `templates/`

**File Extension:** `.hbs`

### Rendering Templates

Use `renderTemplate()` function with template path and context object
Context should contain actor, system data, items, and any computed values needed

### Common Helpers

**Foundry provides built-in helpers:**
- Conditionals
- Iteration
- Localization lookup
- Number formatting

**Custom Helpers:**
Register in init hook using `Handlebars.registerHelper()`

### Partials

Register reusable template sections with `Handlebars.registerPartial()`
Load template using `getTemplate()` first
Use in templates with partial syntax

---

## Data Flow

### Standard Flow
```
User Interaction
    ↓
Event Handler (Sheet)
    ↓
Service/Document Method
    ↓
Document Update
    ↓
Automatic Re-render
```

### Example Flow

1. User clicks button with data-action
2. Sheet catches click via delegation
3. Sheet calls appropriate service or document method
4. Service/method updates document data
5. Document update triggers automatic re-render

### Document Updates Trigger Renders

When document data changes via `actor.update()`, sheet automatically re-renders
No need to manually call `render()`

### Sheet State (Non-Document Data)

For UI-only state (tabs, collapsed sections):
- Store in sheet instance variables
- Does NOT trigger re-render
- Managed in `_prepareContext()` or `_onRender()`

---

## Settings Registration

### Game Settings

**Register in `init` hook**

**Parameters:**
- System ID
- Setting key
- Name (localized key)
- Hint (localized key)
- Scope: "world" or "client"
- Config: true/false (show in settings menu)
- Type: Boolean, Number, String, or custom
- Default value
- onChange handler (optional)

### Scopes

- `"world"` - Shared across all users, GM controls
- `"client"` - Per-user setting

### Reading Settings

Use `game.settings.get()` with system ID and setting key

**Defensive reading:**
Always provide fallback value using nullish coalescing

### Settings Types

- `Boolean` - Checkbox
- `Number` - Number input
- `String` - Text input
- Custom types possible

---

## Roll System

### Creating Rolls

**Use Foundry's Roll class**

Supports formula strings with dice notation
Can include data references with @ symbol
Data object provides values for formula

### Roll Formulas

- Simple dice notation
- Data references using @ symbol
- Complex multi-die formulas
- L5R4 uses XkY format (roll X dice, keep Y highest)

### Evaluating Rolls

**CRITICAL:** Always await `roll.evaluate()` before using roll data

After evaluation, access:
- Total value
- Individual terms
- Dice results

### Roll to Chat

Use `roll.toMessage()` with speaker and flavor options
Speaker obtained via `ChatMessage.getSpeaker()`

---

## Chat Messages

### Creating Messages

Use `ChatMessage.create()` with configuration object

**Required:**
- Speaker (from ChatMessage.getSpeaker())
- Content (string or HTML)
- Type (from CONST.CHAT_MESSAGE_TYPES)

### Message Types

- `OTHER` - General message
- `ROLL` - Dice roll
- `IC` - In-character
- `OOC` - Out-of-character

### With Templates

Render template first using `renderTemplate()`
Pass rendered HTML as content to ChatMessage.create()

---

## Hooks

### Common Hooks

**Init (once):**
Register settings, classes, helpers
Runs before game is ready

**Ready (once):**
Game is fully loaded
All documents available

**Document Updates:**
React to actor/item/etc changes
Receives document, change object, options, userId

**Pre-updates (for validation):**
Validate or modify changes before they apply
Return false to cancel update

### Hook Usage Guidelines

- Use sparingly
- Keep hook handlers lightweight
- Delegate heavy work to services
- Document what hooks you're using

---

## Framework-Provided vs Custom

### Foundry Provides

- Document classes (Actor, Item, ChatMessage, etc.)
- Sheet classes (ActorSheetV2, ItemSheetV2)
- Roll system
- Chat system
- Settings system
- Handlebars templates
- Hooks system
- Canvas and rendering
- Compendiums
- User management

### You Build

- Custom document classes (extend base)
- Custom sheet classes (extend base)
- Game-specific services (dice, combat)
- Utility functions
- UI templates
- Styles (SCSS)
- Game rule implementations
- Custom helpers and partials

### Don't Reinvent

Before building custom logic, check if Foundry provides it:
- Document CRUD operations
- Permission checking
- Token management
- Canvas interactions
- Compendium access

---

## Common Foundry APIs

### Game Object

Access via `game` global:
- `game.actors` - Actor collection
- `game.items` - Item collection
- `game.user` - Current user
- `game.users` - All users
- `game.settings` - Settings API
- `game.i18n.localize()` - Localization

### Document Collections

All collections accessible via `game` object:
- Actors
- Items
- Scenes
- Chat messages

### Token/Actor Relationship

- Token has reference to actor
- Actor can get active tokens
- Canvas provides controlled tokens

---

## Localization (i18n)

### Language Files

**Location:** `lang/en.json`

**Format:** JSON object with dot-notation keys

**Convention:** Prefix all keys with system name

### Using in Code

Use `game.i18n.localize()` with key string

### Using in Templates

Use `localize` helper with key string

### Best Practice

Never hardcode user-facing strings. Always use i18n keys.

---

## Data Model (template.json)

### Purpose

Defines actor/item data schema for Foundry.

### Location

`template.json` in system root

### Structure

Define Actor and Item types
Each type has its data structure
Nested objects for complex data
Default values provided

### Accessing Data

All defined data accessible via `actor.system` or `item.system`
Follow dot notation matching template.json structure

---

## Application Rendering

### V2 Sheet Lifecycle

1. **Construction** - Sheet instance created
2. **Context Preparation** - `_prepareContext()` called
3. **Template Rendering** - Foundry handles automatically
4. **Post-Render** - `_onRender()` called

### When Re-renders Occur

- Document data changes
- Manual `render()` call
- Window resize (if configured)

### Preventing Excessive Re-renders

- Don't call `render()` after every small change
- Batch updates when possible
- Use `actor.update()` which handles render automatically

---

## Best Practices

### Do

✅ Use ActorSheetV2/ItemSheetV2 for v13
✅ Event delegation on sheet root
✅ Data attributes for JavaScript behavior
✅ Read from document in sheets, never compute
✅ Reference Foundry API documentation
✅ Use framework-provided features
✅ Localize all user-facing strings

### Don't

❌ Use legacy ActorSheet/ItemSheet classes
❌ Query by class names or IDs
❌ Compute in sheets (belongs in documents)
❌ Reinvent what Foundry provides
❌ Hardcode English strings
❌ Manually manage renders (Foundry does it)
❌ Access private Foundry internals

---

## Debugging Tips

### Console Access

Access game objects via browser console:
- Inspect document collections
- Test API methods
- Display notifications to user
- Log data structures

### Common Issues

**Sheet not rendering:**
- Check registration call
- Verify template path correctness
- Check browser console for errors

**Data not updating:**
- Ensure using update method not direct assignment
- Check prepareDerivedData is called
- Verify data path matches template.json

**Events not firing:**
- Confirm data-action attribute exists
- Check event listener is attached
- Verify closest selector finds target

---

## Remember

Foundry v13 provides a robust framework. Use ActorSheetV2/ItemSheetV2, follow data attribute patterns, and reference the API documentation when unsure. Don't fight the framework - work with it.