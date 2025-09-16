/**
 * L5R4 Actor document - Foundry VTT v13
 *
 * Responsibilities
 * - Set sensible token defaults on create.
 * - Compute derived fields in prepareDerivedData() for sheets and rolls:
 *   - Rings (PC): air, earth, fire, water from traits; void rank is user data.
 *   - Initiative (PC): roll = IR + Ref + rollMod, keep = Ref + keepMod
 *   - Armor TN (PC): base = 5*Ref + 5, then + mod and armor bonus (stacking optional).
 *   - Wounds (PC): thresholds per Earth ring and multiplier; current level, penalty, heal rate.
 *   - Insight (PC): points and optional auto rank.
 *   - NPC: wounds value and current wound level(s).
 *
 * API refs:
 * - Actor: https://foundryvtt.com/api/classes/documents.Actor.html
 * - TokenDocument.prototypeToken: https://foundryvtt.com/api/classes/documents.Actor.html#prototypeToken
 *
 * Reading map (for new contributors)
 * 1) _preCreate        → Token defaults and initial actor img.
 * 2) prepareDerivedData→ Branches to PCs (stats & XP) or NPCs.
 * 3) _preparePc        → Traits→Rings, Initiative, Armor TN, Wounds, Insight.
 * 4) _preparePcExperience → XP totals/spend by RAW.
 * 5) _prepareNpc       → Lightweight wounds/levels.
 * 6) _calculateInsightRank → Insight points → Rank thresholds.
 *
 * Glossary (traits shorthand)
 *  sta Stamina, wil Willpower, str Strength, per Perception,
 *  ref Reflexes, awa Awareness, agi Agility, int Intelligence
 */

import { SYS_ID, iconPath } from "../config.js";
import { toInt } from "../utils.js";

/**
 * Minimal shape of the actor.system we read/write here.
 * This is intentionally partial—only the keys touched in this file.
 * See the system's JSON schema/sheets for full details.
 * @typedef {object} L5R4ActorSystem
 * @property {object} traits - e.g. { sta,wil,str,per,ref,awa,agi,int }
 * @property {{air:number,earth:number,fire:number,water:number,void?:{rank?:number,value?:number,max?:number}}} rings
 * @property {{roll?:number,keep?:number,rollMod?:number,keepMod?:number}} initiative
 * @property {{base?:number,bonus?:number,reduction?:number,current?:number,mod?:number}} armorTn
 * @property {{max?:number,value?:number,healRate?:number,mod?:number}} wounds
 * @property {Record<"healthy"|"nicked"|"grazed"|"hurt"|"injure...", {value:number, penalty:number, current:boolean}>} woundLevels
 * @property {number} suffered
 * @property {{points?:number,rank?:number}} insight
 * @property {number} woundsPenaltyMod
 * @property {number} woundsMultiplier
 * @property {number} woundsMod
 */

export default class L5R4Actor extends Actor {
  /** @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    if (this.type === "pc") {
      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.ALWAYS,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        name: this.name,
        vision: true,
        actorLink: true
      });
      this.updateSource({ img: iconPath("helm.png") });
    } else {
      this.prototypeToken.updateSource({
        bar1: { attribute: "wounds" },
        bar2: { attribute: "suffered" },
        displayName: CONST.TOKEN_DISPLAY_MODES.OWNER,
        displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
      });
      this.updateSource({ img: iconPath("ninja.png") });
    }
  }

  /**
   * Compute XP deltas when traits/void/skills increase and append to flags[SYS_ID].xpSpent.
   * Runs on any update source (sheet, macro, import), keeping behavior consistent.
   * @see https://foundryvtt.com/api/classes/foundry.abstract.Document.html#_preUpdate
   */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    try {
      const ns = this.flags?.[SYS_ID] ?? {};
      const freeTraitBase  = ns.xpFreeTraitBase ?? {};
      const traitDiscounts = ns.traitDiscounts ?? {};
      const oldSys = this.system ?? {};

      let spent = Array.isArray(ns.xpSpent) ? foundry.utils.duplicate(ns.xpSpent) : [];
      const pushNote = (delta, note) => spent.push({ id: foundry.utils.randomID(), delta, note, ts: Date.now() });

      // Traits delta → XP
      if (changed?.system?.traits) {
        const toInt = n => Number.isFinite(+n) ? Number(n) : 0;
        const oldSys = /** @type {any} */ (this.system);
        const traitDiscounts = this.flags?.[SYS_ID]?.traitDiscounts ?? {};
        const freeTraitBase = this.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

        for (const [k, v] of Object.entries(changed.system.traits)) {
          const newBase = toInt(v);
          const oldBase = toInt(oldSys?.traits?.[k]);
          if (!Number.isFinite(newBase) || newBase <= oldBase) continue;

          const freeBase = toInt(freeTraitBase?.[k] ?? 0);
          const freeEff  = freeBase > 0 ? 0 : toInt(this._creationFreeBonus(k));
          const disc     = toInt(traitDiscounts?.[k] ?? 0);

          let deltaXP = 0;
          let stepFreeEff = freeEff;
          let consumedFreeBase = false;
          for (let r = oldBase + 1; r <= newBase; r++) {
            // If a Family/School creation bonus (+1) exists as an AE (stepFreeEff > 0)
            // and it is not yet baked into base (freeBase === 0), make the 2→3 step free
            // and convert it into a base freebie so future steps price correctly.
            if (!consumedFreeBase && freeBase === 0 && stepFreeEff > 0 && r === 3) {
              foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpFreeTraitBase.${k}`, (freeTraitBase?.[k] ?? 0) + 1);
              consumedFreeBase = true;
              stepFreeEff = 0;
              continue;
            }
            deltaXP += this._xpStepCostForTrait(r, stepFreeEff, disc);
          }

          if (deltaXP > 0) {
            /** JSDoc: push localized log entry for sheet XP log */
            const label = game.i18n?.localize?.(`l5r4.mechanics.traits.${k}`) || k.toUpperCase();
            pushNote(deltaXP, game.i18n.format("l5r4.character.experience.log.traitChange", { label, from: oldBase, to: newBase }));
          }
        }
      }

      // Void
      const newVoid = changed?.system?.rings?.void?.rank ?? changed?.system?.rings?.void?.value;
      if (newVoid !== undefined) {
        const oldVoid = toInt(oldSys?.rings?.void?.rank ?? oldSys?.rings?.void?.value ?? oldSys?.rings?.void);
        const next = toInt(newVoid);
        if (Number.isFinite(next) && next > oldVoid) {
          const baselineVoid = 2 + toInt(freeTraitBase?.void ?? 0);
          let deltaXP = 0;
          for (let r = Math.max(oldVoid, baselineVoid) + 1; r <= next; r++) {
            const step = 6 * r + toInt(traitDiscounts?.void ?? 0);
            deltaXP += Math.max(0, step);
          }
          if (deltaXP > 0) {
            pushNote(deltaXP, game.i18n.format("l5r4.character.experience.log.voidChange", { from: oldVoid, to: next }));
          }
        }
      }

      if (spent.length !== (ns.xpSpent?.length ?? 0)) {
        foundry.utils.setProperty(changed, `flags.${SYS_ID}.xpSpent`, spent);
      }
    } catch (err) {
      console.warn("L5R4", "Actor._preUpdate xp delta failed", { err });
    }
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    /** @type {L5R4ActorSystem} */
    const sys = this.system ?? {};

    if (this.type === "pc") {
      this._preparePc(sys);
      this._preparePcExperience(sys);
    } else if (this.type === "npc") {
      this._prepareNpc(sys);
    }
  }

  /**
   * Compute normalized effective traits (post-AE) and elemental rings from traits.
   * This is shared between PCs and NPCs to keep the same rules logic.
   * - TraitsEff are simply the current post-Active-Effects ranks (no Family math here;
   *   Family bonuses must be modeled as AEs on the Family Item).
   * - Rings are the minimum of their two traits; Void remains user-controlled.
   * @param {object} sys - actor.system
   * @see https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects
   */
  _prepareTraitsAndRings(sys) {
    const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];
    const TR = k => {
      const v = sys.traits?.[k];
      return toInt(v?.rank ?? v);
    };

    // Effective traits mirror: expose for sheets
    sys._derived = sys._derived || {};
    const traitsEff = {};
    for (const k of TRAIT_KEYS) {
      const base = sys.traits?.[k];
      traitsEff[k] = toInt(base?.rank ?? base);
    }
    sys._derived.traitsEff = traitsEff;

    // Rings from traits
    sys.rings = {
      ...sys.rings,
      air:   Math.min(TR("ref"), TR("awa")),
      earth: Math.min(TR("sta"), TR("wil")),
      fire:  Math.min(TR("agi"), TR("int")),
      water: Math.min(TR("str"), TR("per"))
    };
    sys.rings.void = sys.rings.void ?? {
      rank: toInt(sys.rings?.void?.rank ?? 0),
      value: toInt(sys.rings?.void?.value ?? 0),
      max: toInt(sys.rings?.void?.max ?? 0)
    };
  }

  /**
   * Derived data for PCs.
   * @param {object} sys - actor.system
   */
  _preparePc(sys) {
    /**
     * Ensure the header "School" label mirrors the embedded School item.
     * Render-only: do not persist here. This guarantees the header clears
     * immediately when the School item is deleted from the Bio section.
     * @see https://foundryvtt.com/api/classes/documents.Actor.html#prepareDerivedData
     */
    try {
      const schoolItem = (this.items?.contents ?? this.items).find(i => i.type === "school");
      sys.school = schoolItem?.name ?? "";
    } catch (err) {
      console.warn("L5R4", "Failed to derive school name in _preparePc", { err });
      sys.school = sys.school ?? "";
    }

    const TRAIT_KEYS = ["sta","wil","str","per","ref","awa","agi","int"];
    /**
     * Normalize a Family trait label/key into a system trait key ("ref", "awa", ...).
     * Accepts:
     *  - short keys ("ref")
     *  - English labels ("Reflexes")
     *  - i18n keys ("l5r4.traits.ref")
     *  - localized labels in other languages (via game.i18n.localize)
     *
     * @param {string} raw
     * @returns {string} One of "sta","wil","str","per","ref","awa","agi","int" or "" when unknown.
     */
    const normalizeTraitKey = (raw) => {
      const known = ["sta","wil","str","per","ref","awa","agi","int"];
      if (raw === null || raw === undefined) { return ""; }
      let k = String(raw).trim();

      // If given an i18n key like "l5r4.traits.ref"
      const m = /^l5r4\.mechanics\.traits\.(\w+)$/i.exec(k);
      if (m && known.includes(m[1].toLowerCase())) {
        return m[1].toLowerCase();
      }

      // Plain short key
      if (known.includes(k.toLowerCase())) {
        return k.toLowerCase();
      }

      // English labels -> keys
      const english = {
        stamina: "sta",
        willpower: "wil",
        strength: "str",
        perception: "per",
        reflexes: "ref",
        awareness: "awa",
        agility: "agi",
        intelligence: "int"
      };
      if (english[k.toLowerCase()]) {
        return english[k.toLowerCase()];
      }

      // Localized labels (any language): compare against localized names
      try {
        for (const key of known) {
          const label = game.i18n?.localize?.(`l5r4.mechanics.traits.${key}`) ?? "";
          if (label && label.toLowerCase() === k.toLowerCase()) {
            return key;
          }
        }
      } catch (_) { /* i18n not ready: ignore */ }

      return "";
    };

    /**
     * Effective traits = base + Family bonus (do not mutate base).
     * Prefer the live Family item (uuid) so edits to that item are reflected.
     * Fall back to the cached flag to support older actors.
     *
     * API refs:
     * - Document#getFlag: https://foundryvtt.com/api/classes/foundry.abstract.Document.html#getFlag
     * - fromUuidSync:     https://foundryvtt.com/api/functions/global.html#fromUuidSync
     */
    let fam = {};
    try {
      const uuid = /** @type {string|undefined} */ (this.getFlag(SYS_ID, "familyItemUuid"));
      if (uuid && globalThis.fromUuidSync) {
        const doc = /** @type {any} */ (fromUuidSync(uuid));
        const key = normalizeTraitKey(doc?.system?.trait);
        const amt = Number(doc?.system?.bonus ?? 1);
        if (key && sys.traits && (key in sys.traits) && Number.isFinite(amt) && amt !== 0) {
          fam = { [key]: amt };
        }
      }
    } catch { /* unresolved family reference: continue to flag-based fallback */ }
    if (!fam || Object.keys(fam).length === 0) {
      const fb = this.flags?.[SYS_ID]?.familyBonus;
      if (fb && typeof fb === "object" && Object.keys(fb).length) {
        // Sanitize old flags that may be keyed by full trait names
        const norm = {};
        for (const [k, v] of Object.entries(fb)) {
          const nk = normalizeTraitKey(k);
          if (nk) { norm[nk] = toInt(v); }
        }
        if (Object.keys(norm).length) {
          fam = norm;
        }
      }
    }
    if (!fam || Object.keys(fam).length === 0) {
      // Final fallback for older actors: use the first embedded Family item
      const it = this.items.find(i => i.type === "family");
      const key = normalizeTraitKey(it?.system?.trait);
      const amt = Number(it?.system?.bonus ?? 0);
      if (key && sys.traits && (key in sys.traits) && Number.isFinite(amt) && amt !== 0) {
        fam = { [key]: amt };
      }
    }

    // Expose effective traits = post-AE system values
    // (Family bonuses must be modeled as transferred Active Effects on the Family Item)
    sys._derived = sys._derived || {};
    const traitsEff = {};
    for (const k of TRAIT_KEYS) {
      const base = sys.traits?.[k];
      traitsEff[k] = toInt(base?.rank ?? base);
    }
    sys._derived.traitsEff = traitsEff;

    /**
     * Use post-AE trait ranks directly.
     * Foundry applies Active Effects before prepareDerivedData:
     * https://foundryvtt.com/api/classes/documents.Actor.html#applyActiveEffects
     */
    const TR = k => toInt(sys.traits?.[k]);

    // Shared traits & rings logic
    this._prepareTraitsAndRings(sys);

    // Initiative
    sys.initiative = sys.initiative || {};
    sys.initiative.roll = toInt(sys.insight?.rank) + TR("ref") + toInt(sys.initiative.rollMod);
    sys.initiative.keep = TR("ref") + toInt(sys.initiative.keepMod);

    // Armor TN
    sys.armorTn = sys.armorTn || {};
    const ref = TR("ref");
    const baseTN = 5 * ref + 5;
    const modTN  = toInt(sys.armorTn.mod);

    /*
     * Sum armor bonuses. Some tables stack all bonuses, others take only the
     * largest. Respect a world setting if present; default to stack all.
     * Setting is registered in l5r4.js → registerSystemSettings() as "allowArmorStacking".
     * See: https://foundryvtt.com/api/classes/client.settings.Settings.html#register
      */
    let allowStack = true;
    try {
      allowStack = game.settings.get(SYS_ID, "allowArmorStacking");
    } catch (_) {
      /* setting not registered: default true */
    }

    let bonusTN = 0;
    let reduction = 0;

    for (const it of this.items) {
      if (it.type !== "armor") continue;
      const a = it.system ?? {};
      if (!a?.equipped) continue;
      const b = toInt(a.bonus);
      const r = toInt(a.reduction);
      if (allowStack) {
        bonusTN += b;
        reduction += r;
      } else {
        bonusTN = Math.max(bonusTN, b);
        reduction = Math.max(reduction, r);
      }
    }

    sys.armorTn.base = baseTN;
    sys.armorTn.bonus = bonusTN;
    sys.armorTn.reduction = reduction;
    sys.armorTn.current = baseTN + modTN + bonusTN;

    // Wound thresholds
    const earth = sys.rings.earth;
    const mult  = toInt(sys.woundsMultiplier);
    const add   = toInt(sys.woundsMod);

    sys.woundLevels = sys.woundLevels || {};
    const order = ["healthy","nicked","grazed","hurt","injured","crippled","down","out"];
    let prev = 0;
    for (const key of order) {
      const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
      if (key === "healthy") {
        lvl.value = 5 * earth + add;
      } else {
        lvl.value = earth * mult + prev + add;
      }
      prev = lvl.value;
    }

    // Wounds state and penalty (with effective penalties)
    sys.wounds = sys.wounds || {};
    sys.wounds.max = sys.woundLevels.out.value;
    sys.wounds.value = toInt(sys.wounds.max) - toInt(sys.suffered);

    // Cap comparisons at the Out threshold so "current" never exceeds Out
    const outMax = toInt(sys.wound_lvl?.out?.value);
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    // Current wound level - first level whose threshold is >= suffered and larger than previous
    let current = sys.woundLevels.healthy;
    let lastVal = -1;
    for (const key of order) {
      const lvl = sys.woundLevels[key];
      const s = sCapped;
      const upper = toInt(lvl.value);
      // Current iff suffered is > previous threshold and <= this level
      const within = s <= upper && s > lastVal;
      lvl.current = within;
      if (within) {
        current = lvl;
      }
      lastVal = upper;
    }
    // Normalize actor-level penalty mod and compute per-rank effective penalties
    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
      const eff = toInt(lvl.penalty) + toInt(sys.woundsPenaltyMod);
      // Expose a read-only effective value for UI; never below 0.
      lvl.penaltyEff = Math.max(0, eff);
    }
    sys.currentWoundLevel = current;
    // Current wound penalty (effective) and NPC-compatible mirror
    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;

    // Heal rate
    sys.wounds.healRate = (TR("sta") * 2) + toInt(sys.insight?.rank) + toInt(sys.wounds?.mod);

    // Insight
    const ringsTotal =
      toInt(sys.rings.air) + toInt(sys.rings.earth) + toInt(sys.rings.fire) +
      toInt(sys.rings.water) + toInt(sys.rings?.void?.rank);

    // Skill points = sum of skill ranks
    let skillTotal = 0;
    for (const it of this.items) {
      if (it.type !== "skill") {
        continue;
      }
      skillTotal += toInt(it.system?.rank);
    }

    sys.insight = sys.insight || {};
    sys.insight.points = (ringsTotal * 10) + (skillTotal * 1);

    if (game.settings.get(SYS_ID, "calculateRank")) {
      sys.insight.rank = this._calculateInsightRank(sys.insight.points);
    }
  }

  /**
   * Compute PC experience totals and breakdown.
   * Populates `system._xp` for display (mutates `sys` during data prep; does not persist the document).
   *
   * API refs:
   * - Actor#prepareData (items are ready by this stage):
   *   https://foundryvtt.com/api/classes/documents.Actor.html#prepareData
   * @param {object} sys - actor.system
   */
  _preparePcExperience(sys) {
    const flags = this.flags?.[SYS_ID] ?? {};

    // Base total XP
    const xpBase = Number.isFinite(+flags.xpBase) ? Number(flags.xpBase) : 40;

    // Manual adjustments
    const xpManual = Array.isArray(flags.xpManual) ? flags.xpManual : [];
    const manualSum = xpManual.reduce((a, e) => a + toInt(e?.delta), 0);

    // Disadvantage granted XP, capped at +10
    let disadvGranted = 0;
    for (const it of this.items) {
      if (it.type !== "disadvantage") {
        continue;
      }
      disadvGranted += Math.max(0, -toInt(it.system?.cost));
    }
    const disadvCap = Math.min(10, disadvGranted);

    // Traits (not Void): cost per purchased step = 4 × new effective rank (see sheet logger for same logic)
    const TRAITS = /** @type {const} */ (["sta","wil","str","per","ref","awa","agi","int"]);
    const traitDiscounts = this.flags?.[SYS_ID]?.traitDiscounts ?? {};
    const freeTraitBase  = this.flags?.[SYS_ID]?.xpFreeTraitBase ?? {};

    let traitsXP = 0;
    for (const k of Object.keys(sys.traits ?? {})) {
      // Foundry sys.traits.* is post-AE (includes Family); remove freebies when summing.
      const effCur   = toInt(sys?.traits?.[k]);                           // effective (post-AE)
      const freeBase = toInt(freeTraitBase?.[k] ?? 0);                    // baked into base at creation
      const freeEff  = freeBase > 0 ? 0 : toInt(this._creationFreeBonus(k)); // AE freebies (Family/School) only
      const disc     = toInt(traitDiscounts?.[k] ?? 0);

      /** Work in *base* space so Family +1 is free by RAW. */
      const baseline = 2 + freeBase;
      const baseCur  = Math.max(baseline, effCur - freeEff);
      for (let r = baseline + 1; r <= baseCur; r++) {
        traitsXP += this._xpStepCostForTrait(r, freeEff, disc);
      }
    }

    // Void: cost per purchased step = 6 × new rank, after baseline
    const voidCur = toInt(sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0);
    const voidBaseline = 2 + toInt(freeTraitBase?.void ?? 0);
    let voidXP = 0;
    if (voidCur > voidBaseline) {
      for (let r = voidBaseline + 1; r <= voidCur; r++) {
        const step = 6 * r + toInt(traitDiscounts?.void ?? 0);
        voidXP += Math.max(0, step);
      }
    }

    // Skills: sum of next-rank costs above baseline; School skill gets first rank free
    let skillsXP = 0;
    for (const it of this.items) {
      if (it.type !== "skill") {
        continue;
      }
      const r = toInt(it.system?.rank);
      const baseline = it.system?.school ? 1 : 0;
      if (r > baseline) {
        skillsXP += (r * (r + 1)) / 2 - (baseline * (baseline + 1)) / 2;
      }
      // Emphases: 2 XP each, split on comma/semicolon
      const emph = String(it.system?.emphasis ?? "").trim();
      if (emph) {
        const count = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean).length;
        skillsXP += 2 * count;
      }
    }

    // Advantages: their cost counts as spent
    let advantagesXP = 0;
    for (const it of this.items) {
      if (it.type !== "advantage") {
        continue;
      }
      advantagesXP += toInt(it.system?.cost);
    }

    const total = xpBase + disadvCap + manualSum;
    const spent = traitsXP + voidXP + skillsXP + advantagesXP;
    const available = total - spent;

    sys._xp = {
      total,
      spent,
      available,
      breakdown: {
        base: xpBase,
        manual: manualSum,
        disadvantagesGranted: disadvCap,
        traits: traitsXP,
        void: voidXP,
        skills: skillsXP,
        advantages: advantagesXP
      }
    };
  }

  /**
   * Derived data for NPCs.
   * @param {object} sys - actor.system
   */
  _prepareNpc(sys) {
    // Keep NPC traits and rings identical to PCs
    this._prepareTraitsAndRings(sys);

    // Use the same wound calculation as PCs for consistency.
    const earth = sys.rings.earth;
    const mult = toInt(sys.woundsMultiplier, 2); // Default multiplier for NPCs if not set
    const add = toInt(sys.woundsMod, 0);

    sys.woundLevels = sys.woundLevels || {};
    const order = ["healthy", "nicked", "grazed", "hurt", "injured", "crippled", "down", "out"];
    let prev = 0;
    for (const key of order) {
        const lvl = sys.woundLevels[key] ?? (sys.woundLevels[key] = { value: 0, penalty: 0, current: false });
        if (key === "healthy") {
            lvl.value = 5 * earth + add;
        } else {
            lvl.value = earth * mult + prev + add;
        }
        prev = lvl.value;
    }

    // Wounds state and penalty
    sys.wounds = sys.wounds || {};
    sys.wounds.max = sys.woundLevels.out.value;
    sys.wounds.value = toInt(sys.wounds.max) - toInt(sys.suffered);

    const outMax = toInt(sys.woundLevels.out.value);
    const sCapped = Math.min(toInt(sys.suffered), outMax || toInt(sys.suffered));

    let current = sys.woundLevels.healthy;
    let lastVal = -1;
    for (const key of order) {
        const lvl = sys.woundLevels[key];
        const upper = toInt(lvl.value);
        const within = sCapped <= upper && sCapped > lastVal;
        lvl.current = within;
        if (within) {
            current = lvl;
        }
        lastVal = upper;
    }

    sys.woundsPenaltyMod = toInt(sys.woundsPenaltyMod);
    for (const [, lvl] of Object.entries(sys.woundLevels ?? {})) {
        const eff = toInt(lvl.penalty) + toInt(sys.woundsPenaltyMod);
        lvl.penaltyEff = Math.max(0, eff);
    }

    const curEffPenalty = Math.max(0, toInt(current.penalty) + toInt(sys.woundsPenaltyMod));
    sys.woundPenalty = curEffPenalty;
    sys.wounds.penalty = curEffPenalty;
  }

  /**
   * Insight rank from insight points.
   * Thresholds: 150, 175, 200, 225 then every +25.
   * @param {number} insight
   * @returns {number} rank
   */
  _calculateInsightRank(insight) {
    const t = [150, 175, 200, 225];
    let rank = 1;
    for (let i = 0; i < t.length; i++) {
      if (insight >= t[i]) {
        rank = i + 2;
      }
    }
    if (insight >= 225) {
      rank += Math.floor((insight - 225) / 25);
    }
    return rank;
  }

  /**
   * Sum Family/School creation freebies for a given trait key.
   * Prefers transferred AEs that ADD to system.traits.<key>; if none, falls back to legacy
   * doc.system.trait + doc.system.bonus. De-dupes the same doc if seen via flag+embedded.
   * @param {string} key
   * @returns {number}
   * @see https://foundryvtt.com/api/classes/documents.ActiveEffect.html
   * @see https://foundryvtt.com/api/functions/client.fromUuidSync.html
   */
  _creationFreeBonus(key) {
    try {
      let sum = 0;
      const seen = new Set();

      const addFromDoc = doc => {
        if (!doc) return;
        const did = doc.uuid ?? doc.id ?? null;
        if (did && seen.has(did)) return;
        if (did) seen.add(did);

        // Prefer transferred AEs that ADD to the trait
        let ae = 0;
        for (const eff of (doc.effects ?? [])) {
          if (eff?.transfer !== true) continue;
          for (const ch of (eff?.changes ?? [])) {
            if (ch?.key === `system.traits.${key}` && ch?.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
              const v = Number(ch?.value ?? 0);
              if (Number.isFinite(v)) ae += v;
            }
          }
        }
        if (ae !== 0) { sum += ae; return; }

        // Legacy fallback
        const tKey = String(doc?.system?.trait ?? "").toLowerCase();
        const amt  = Number(doc?.system?.bonus ?? NaN);
        if (tKey === key && Number.isFinite(amt)) sum += amt;
      };

      // Flagged docs
      for (const flagKey of ["familyItemUuid", "schoolItemUuid"]) {
        const uuid = this.getFlag(SYS_ID, flagKey);
        if (!uuid || !globalThis.fromUuidSync) continue;
        addFromDoc(fromUuidSync(uuid));
      }

      // Embedded docs (older actors)
      for (const it of this.items ?? []) {
        if (it.type === "family" || it.type === "school") addFromDoc(it);
      }

      return sum || 0;
    } catch {
      return 0;
    }
  }

  /**
   * XP cost for purchasing the step that reaches base rank r.
   * Prices by *effective* new rank: r + freeEff (NOT “free early steps”).
   * Example: Family +1 via AE → buying base 3 (eff 4) costs 4×4 = 16.
   * @param {number} r        New base rank you reach with this step (integer >= 3 usually)
   * @param {number} freeEff  Creation freebies from AEs/legacy; 0 if baked into base
   * @param {number} discount Per-step modifier (can be negative)
   * @returns {number}
   * @see https://foundryvtt.com/api/classes/documents.Actor.html#prepareData
   */
  _xpStepCostForTrait(r, freeEff, discount) {
    const d = Number.isFinite(+discount) ? Number(discount) : 0;
    return Math.max(0, 4 * (r + freeEff) + d);
  }
}
