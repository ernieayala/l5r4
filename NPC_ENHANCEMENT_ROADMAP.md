# L5R4 NPC Enhancement Roadmap

## Overview
Transform the basic NPC system into comprehensive L5R4 creature support matching published stat blocks.

**Timeline**: 6-8 weeks | **Effort**: 130-176 hours | **Impact**: Critical for proper L5R4 encounters

## Current Gaps
- ❌ **Manual wound thresholds** (15: -3, 30: -10, 45: Dead)
- ❌ **Fear system** (Fear X, Terrifying X)
- ❌ **Damage resistance** (Spirit, Invulnerability, exceptions)
- ❌ **Creature types** (Animal, Spirit, Oni, Undead)
- ❌ **Natural weapons** (claws, bite with custom rules)
- ❌ **Multiple attacks** (2 claws + bite per turn)
- ❌ **Special abilities** (Regeneration, Poison, Taint)

---

## Phase 1: Core L5R4 Mechanics (2-3 weeks)

### 1.1 Manual Wound System (8-12h)
**Problem**: Current system only supports Earth-based formulas. Cannot enter stat block thresholds directly.

**Solution**: Manual-first wound system with optional Earth formula
```json
"woundMode": "manual",     // Default: "manual", optional: "formula"
"useEarthFormula": false,  // Toggle for Earth-based calculation
"woundLevels": {
  "healthy": {"value": 15, "penalty": 0, "active": true},
  "nicked": {"value": 20, "penalty": -3, "active": true},
  "grazed": {"value": 25, "penalty": -5, "active": false},
  "hurt": {"value": 30, "penalty": -10, "active": false},
  "injured": {"value": 35, "penalty": -15, "active": false},
  "crippled": {"value": 40, "penalty": -20, "active": false},
  "down": {"value": 43, "penalty": -40, "active": false},
  "out": {"value": 45, "penalty": -99, "active": true}
}
```

**Features**:
- **Manual by default**: Direct threshold/penalty entry
- **Dropdown selection**: Choose which wound levels to use (healthy, nicked, out OR full 8-level track)
- **Dual mode**: Earth formula toggle that supplements (doesn't replace) manual entries
- **Preservation**: Switching modes preserves existing manual values
- **Validation**: Ensures thresholds increase and penalties worsen

**Files**: `template.json`, `_wounds.hbs`, `actor.js`, `en.json`

### 1.2 Fear System (6-8h)
**Problem**: No Fear X implementation anywhere in system.

**Solution**: Auto-trigger fear tests
```json
"fear": {
  "rank": 3,           // Fear 3
  "type": "fear",      // "fear" | "terrifying"
  "tested": ["uuid1"]  // Prevent re-tests
}
```

**Features**: 
- Auto Willpower vs TN (5 × Fear Rank)
- Track tested characters
- First exposure triggers only

**Files**: `template.json`, `_stats-npc.hbs`, `dice.js`, `actor.js`, `en.json`

### 1.3 Damage Resistance (10-12h)
**Problem**: No Spirit/Invulnerability system for creatures.

**Solution**: Comprehensive resistance system
```json
"resistance": {
  "physical": true,        // Spirit resistance
  "invulnerable": false,   // Ignores all damage
  "exceptions": "jade, crystal, magical",
  "reduction": 5           // Flat reduction
}
```

**Features**:
- Spirit resistance (ignores mundane weapons)
- Invulnerability with exceptions
- Jade/crystal/magical weapon detection
- Visual sheet indicators

**Files**: `template.json`, `_stats-npc.hbs`, `dice.js`, `actor.js`, `npc-sheet.js`, `en.json`

---

## Phase 2: Creature Classification (2-3 weeks)

### 2.1 Creature Types & Keywords (6-8h)
**Problem**: No Animal/Spirit/Oni classification system.

**Solution**: Full creature taxonomy
```json
"creatureType": {
  "primary": "Spirit",     // Animal, Spirit, Oni, Undead, Human
  "keywords": ["Shadowlands", "Tainted"],
  "size": "large",         // tiny, small, medium, large, huge
  "intelligence": "high"   // animal, low, average, high, genius
}
```

**Files**: `template.json`, `_stats-npc.hbs`, `config.js`, `en.json`

### 2.2 Movement & Senses (4-6h)
**Problem**: No fly/burrow/climb speeds or enhanced senses.

**Solution**: Complete movement/sense system
```json
"movement": {"ground": 25, "fly": 50, "swim": 15},
"senses": {"darkvision": 60, "scent": true, "tremorsense": 30}
```

**Files**: `template.json`, `_stats-npc.hbs`, `en.json`

### 2.3 Taint Integration (8-10h)
**Problem**: No Shadowlands corruption mechanics.

**Solution**: Full taint system
```json
"taint": {
  "rank": 2,
  "points": 15,
  "effects": ["Unnatural Speed"],
  "resistance": false
}
```

**Files**: `template.json`, `_stats-npc.hbs`, `actor.js`, `dice.js`, `en.json`

---

## Phase 3: Advanced Features (2-3 weeks)

### 3.1 Natural Weapon System (12-16h)
**Problem**: Built-in attack1/attack2 slots don't match creature stat blocks.

**Solution**: Replace with dynamic natural weapons
```json
"naturalWeapons": [{
  "name": "Claw",
  "attack": {"roll": 6, "keep": 3},
  "damage": {"roll": 2, "keep": 2},
  "addStrength": true,
  "special": "Can make 2 per turn"
}]
```

**Files**: `template.json`, `_stats-npc.hbs`, `dice.js`, `actor.js`, `npc-sheet.js`, `en.json`

### 3.2 Multiple Attacks (6-8h)
**Problem**: No "Attacks: 3" or "2 on Full Attack" system.

**Solution**: Attack limitation system
```json
"combat": {
  "attacksPerTurn": 3,
  "fullAttackOnly": true,
  "sequence": "simultaneous"
}
```

**Files**: `template.json`, `_stats-npc.hbs`, `dice.js`

### 3.3 Special Abilities Framework (16-20h)
**Problem**: No Regeneration, Poison, Swarm rules automation.

**Solution**: Extensible ability system
```json
"specialAbilities": [{
  "name": "Regeneration",
  "type": "regeneration",
  "value": 5,
  "condition": "not fire or acid"
}]
```

**Files**: `template.json`, `_stats-npc.hbs`, `actor.js`, `dice.js`, `npc-sheet.js`, `en.json`, `config.js`, `chat.js`

### 3.4 Creature Template Library (20-24h)
**Problem**: Manual entry for every creature is slow.

**Solution**: Pre-built templates
- Animal templates (Bear, Wolf, Eagle)
- Spirit templates (Air Kami, Earth Kami)
- Oni templates (common types)
- Undead templates (Gaki, Goryo)

**Files**: New template system with 10+ files

---

## Implementation Priority

| Feature | Impact | Effort | Priority | Phase |
|---------|--------|--------|----------|-------|
| Manual Wounds | HIGH | Medium | **P0** | 1 |
| Fear System | HIGH | Low | **P0** | 1 |
| Damage Resistance | HIGH | Medium | **P1** | 1 |
| Creature Types | Medium | Low | **P1** | 2 |
| Movement/Senses | Medium | Low | **P2** | 2 |
| Taint System | Medium | Medium | **P2** | 2 |
| Natural Weapons | HIGH | High | **P3** | 3 |
| Multiple Attacks | Medium | Medium | **P3** | 3 |
| Special Abilities | Medium | High | **P4** | 3 |
| Template Library | High | Very High | **P5** | 3 |

## Success Criteria

### Phase 1 Complete When:
- ✅ Can enter manual wound thresholds with dropdown level selection
- ✅ Earth formula toggle works alongside manual entries (preserves values)
- ✅ Fear tests auto-trigger on first exposure
- ✅ Spirit resistance ignores mundane weapons
- ✅ Jade weapons bypass Spirit resistance

### Phase 2 Complete When:
- ✅ Can classify creatures (Animal, Spirit, Oni, etc.)
- ✅ Movement types tracked (fly 50, burrow 20)
- ✅ Enhanced senses noted (darkvision 60, scent)
- ✅ Taint effects applied automatically

### Phase 3 Complete When:
- ✅ Natural weapons replace attack1/attack2
- ✅ Multiple attacks work ("2 claws + bite")
- ✅ Regeneration heals automatically
- ✅ Template library creates creatures instantly

## Architecture Principles
1. **Backward Compatibility**: Existing NPCs continue working
2. **L5R4 Compliance**: Match published stat block format exactly
3. **GM Workflow**: Optimize for speed and ease of use
4. **Foundry Standards**: Modern ApplicationV2 patterns
5. **Progressive Enhancement**: Features build logically

## Risk Mitigation
- **Complexity**: Start with core mechanics, build incrementally
- **Breaking Changes**: Extensive migration testing required
- **Performance**: Profile with complex creatures (20+ abilities)
- **User Adoption**: Document each feature with examples
- **Maintenance**: Comprehensive test suite for regressions

---

**Next Steps**: Begin Phase 1 with manual wound system - highest impact, medium effort, no dependencies.
