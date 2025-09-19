/**
 * @fileoverview XP Manager Application for L5R4 system
 * 
 * Modern ApplicationV2-based XP management interface that replaces the old Dialog-based modal.
 * Maintains the same visual structure and CSS classes while providing better architecture.
 */

import { SYS_ID } from "../config.js";

/**
 * XP Manager Application using ApplicationV2 architecture
 * Provides experience point management with breakdown, manual adjustments, and purchase history
 */
export default class XpManagerApplication extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  
  static DEFAULT_OPTIONS = {
    id: "xp-manager-{id}",
    classes: ["l5r4", "xp-modal-dialog"],
    tag: "form",
    window: {
      title: "l5r4.character.experience.xpLog",
      icon: "fas fa-star",
      resizable: true
    },
    position: {
      width: 600,
      height: 700
    },
    actions: {
      "xp-add-confirm": XpManagerApplication.prototype._onAddXp,
      "xp-delete-manual": XpManagerApplication.prototype._onDeleteEntry
    }
  };

  static PARTS = {
    form: {
      template: "systems/l5r4/templates/apps/xp-manager.hbs"
    }
  };

  /**
   * @param {Actor} actor - The actor whose XP to manage
   * @param {object} options - Application options
   */
  constructor(actor, options = {}) {
    // Set unique ID based on actor before calling super
    options.id = `xp-manager-${actor.id}`;
    super(options);
    this.actor = actor;
  }

  /**
   * Prepare context data for the template
   * @returns {Promise<object>} Template context data
   */
  async _prepareContext() {
    // Retroactively update XP data to fix legacy format issues
    await this._retroactivelyUpdateXP();
    
    // Prepare XP data
    const sys = this.actor.system ?? {};
    const xp = sys?._xp ?? {};
    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? ns.xpManual : [];
    const spent = Array.isArray(ns.xpSpent) ? ns.xpSpent : [];

    // Format entries for display
    const formatEntries = (arr) =>
      arr
        .slice()
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .map(e => {
          let formattedNote = e.note || "";
          let type = "";
          
          // Use stored type and format note based on type, with fallback parsing for legacy entries
          if (e.type === "trait" && e.traitLabel && e.toValue !== undefined) {
            type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
            formattedNote = `${e.traitLabel} ${e.toValue}`;
          } else if (e.type === "void" && e.toValue !== undefined) {
            type = game.i18n.localize("l5r4.character.experience.breakdown.void");
            formattedNote = `${game.i18n.localize("l5r4.mechanics.rings.void")} ${e.toValue}`;
          } else if (e.type === "skill" && e.skillName && e.toValue !== undefined) {
            type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
            formattedNote = `${e.skillName} ${e.toValue}`;
          } else if (e.type === "advantage") {
            type = game.i18n.localize("l5r4.character.experience.breakdown.advantages");
            formattedNote = e.itemName || e.note || "Advantage";
          } else if (e.type === "disadvantage") {
            type = game.i18n.localize("l5r4.character.experience.breakdown.advantages");
            formattedNote = e.itemName || e.note || "Disadvantage";
          } else {
            // Parse legacy entries based on localization keys in notes
            if (formattedNote.includes("l5r4.character.experience.log.traitChange")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.traits");
              formattedNote = "Trait Increase";
            } else if (formattedNote.includes("l5r4.character.experience.log.voidChange")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.void");
              formattedNote = "Void Increase";
            } else if (formattedNote.includes("l5r4.character.experience.log.skillCreate")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
              formattedNote = "Skill Created";
            } else if (formattedNote.includes("l5r4.character.experience.log.skillChange")) {
              type = game.i18n.localize("l5r4.character.experience.breakdown.skills");
              formattedNote = "Skill Increased";
            } else if (e.type) {
              type = e.type;
            } else {
              type = game.i18n.localize("l5r4.character.experience.breakdown.manualAdjustments");
            }
          }
          
          return {
            id: e.id,
            deltaFormatted: (Number.isFinite(+e.delta) ? (e.delta >= 0 ? "+" : "") : "") + (e.delta ?? 0),
            note: formattedNote,
            type: type,
            delta: e.delta
          };
        });

    const manualEntries = formatEntries(manual);
    const spentEntries = formatEntries(spent);
    const manualTotal = manual.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);
    const spentTotal = spent.reduce((s, e) => s + (Number.isFinite(+e.delta) ? +e.delta : 0), 0);

    return {
      xp: {
        spent: xp.spent ?? 0,
        total: xp.total ?? 40,
        available: xp.available ?? (xp.total ?? 40) - (xp.spent ?? 0),
        breakdown: {
          base: xp?.breakdown?.base ?? 40,
          disadvantagesGranted: xp?.breakdown?.disadvantagesGranted ?? 0,
          manual: xp?.breakdown?.manual ?? 0,
          traits: xp?.breakdown?.traits ?? 0,
          void: xp?.breakdown?.void ?? 0,
          skills: xp?.breakdown?.skills ?? 0,
          advantages: xp?.breakdown?.advantages ?? 0
        }
      },
      manualEntries,
      spentEntries,
      manualTotal,
      spentTotal
    };
  }

  /**
   * Handle adding XP
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  async _onAddXp(event, target) {
    event.preventDefault();
    
    const form = this.element;
    const amount = Number(form.querySelector('#xp-amount')?.value) || 0;
    const note = form.querySelector('#xp-note')?.value?.trim() || "";
    
    if (amount === 0) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    manual.push({
      id: foundry.utils.randomID(),
      delta: amount,
      note,
      ts: Date.now()
    });

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", manual);
      
      // Clear the form
      form.querySelector('#xp-amount').value = "1";
      form.querySelector('#xp-note').value = "";
      
      // Re-render to show changes
      this.render();
    } catch (err) {
      console.warn("L5R4", "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Handle deleting a manual XP entry
   * @param {Event} event - The click event
   * @param {HTMLElement} target - The clicked element
   */
  async _onDeleteEntry(event, target) {
    event.preventDefault();
    
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const ns = this.actor.flags?.[SYS_ID] ?? {};
    const manual = Array.isArray(ns.xpManual) ? foundry.utils.duplicate(ns.xpManual) : [];
    const filtered = manual.filter(e => e.id !== entryId);

    try {
      await this.actor.setFlag(SYS_ID, "xpManual", filtered);
      // Re-render to show changes
      this.render();
    } catch (err) {
      console.warn("L5R4", "actor.setFlag failed in XpManagerApplication", { err });
    }
  }

  /**
   * Retroactively update XP entries to fix legacy data format issues.
   * Rebuilds XP tracking data with proper types and formatted notes.
   */
  async _retroactivelyUpdateXP() {
    try {
      const sys = this.actor.system ?? {};
      const flags = this.actor.flags?.[SYS_ID] ?? {};
      const spent = [];

      // Rebuild trait purchases
      const TRAITS = ["sta","wil","str","per","ref","awa","agi","int"];
      const traitDiscounts = flags?.traitDiscounts ?? {};
      const freeTraitBase = flags?.xpFreeTraitBase ?? {};

      for (const traitKey of TRAITS) {
        const effCur = parseInt(sys?.traits?.[traitKey]) || 2;
        const freeBase = parseInt(freeTraitBase?.[traitKey] ?? 0);
        const freeEff = freeBase > 0 ? 0 : parseInt(this.actor._creationFreeBonus?.(traitKey)) || 0;
        const disc = parseInt(traitDiscounts?.[traitKey] ?? 0);
        
        const baseline = 2 + freeBase;
        const baseCur = Math.max(baseline, effCur - freeEff);
        
        // Create entries for each rank increase
        for (let r = baseline + 1; r <= baseCur; r++) {
          const cost = this.actor._xpStepCostForTrait?.(r, freeEff, disc) || (4 * r);
          const traitLabel = game.i18n.localize(`l5r4.mechanics.traits.${traitKey}`) || traitKey.toUpperCase();
          
          spent.push({
            id: foundry.utils.randomID(),
            delta: cost,
            note: `${traitLabel} ${r}`,
            type: "trait",
            traitLabel: traitLabel,
            fromValue: r - 1,
            toValue: r,
            ts: Date.now() - (baseCur - r) * 1000 // Fake timestamps in reverse order
          });
        }
      }

      // Rebuild void purchases
      const voidCur = parseInt(sys?.rings?.void?.rank ?? sys?.rings?.void?.value ?? sys?.rings?.void ?? 0);
      const voidBaseline = 2 + parseInt(freeTraitBase?.void ?? 0);
      
      if (voidCur > voidBaseline) {
        for (let r = voidBaseline + 1; r <= voidCur; r++) {
          const cost = 6 * r + parseInt(traitDiscounts?.void ?? 0);
          
          spent.push({
            id: foundry.utils.randomID(),
            delta: Math.max(0, cost),
            note: `${game.i18n.localize("l5r4.mechanics.rings.void")} ${r}`,
            type: "void",
            fromValue: r - 1,
            toValue: r,
            ts: Date.now() - (voidCur - r) * 1000
          });
        }
      }

      // Rebuild skill purchases
      for (const item of this.actor.items) {
        if (item.type !== "skill") continue;
        
        const rank = parseInt(item.system?.rank) || 0;
        const baseline = item.system?.school ? 1 : 0;
        
        if (rank > baseline) {
          // Create individual entries for each rank increase above baseline
          for (let r = baseline + 1; r <= rank; r++) {
            spent.push({
              id: foundry.utils.randomID(),
              delta: r,
              note: `${item.name} ${r}`,
              type: "skill",
              skillName: item.name,
              fromValue: r - 1,
              toValue: r,
              ts: Date.now() - (100 - r) * 1000
            });
          }
        }

        // Add emphasis costs
        const emph = String(item.system?.emphasis ?? "").trim();
        if (emph) {
          const emphases = emph.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          emphases.forEach((emphasis, index) => {
            spent.push({
              id: foundry.utils.randomID(),
              delta: 2,
              note: `${item.name} (${emphasis})`,
              type: "skill",
              skillName: item.name,
              fromValue: 0,
              toValue: 1,
              ts: Date.now() - (50 - index) * 1000
            });
          });
        }
      }

      // Rebuild advantage purchases
      for (const item of this.actor.items) {
        if (item.type !== "advantage") continue;
        
        const cost = parseInt(item.system?.cost) || 0;
        if (cost > 0) {
          spent.push({
            id: foundry.utils.randomID(),
            delta: cost,
            note: item.name,
            type: "advantage",
            itemName: item.name,
            ts: Date.now() - Math.random() * 10000
          });
        }
      }

      // Sort by timestamp
      spent.sort((a, b) => (a.ts || 0) - (b.ts || 0));

      // Update the actor's XP spent tracking
      await this.actor.setFlag(SYS_ID, "xpSpent", spent);
      
    } catch (err) {
      console.warn("L5R4", "Failed to rebuild XP purchase history", err);
    }
  }
}
