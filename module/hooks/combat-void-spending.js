/**
 * Combat Void Spending Handler
 *
 * Handles Void Point spending for armor TN duration tracking during combat.
 * Armor TN Void expires after 1 round (on combatant's next turn).
 *
 * @module hooks/combat-void-spending
 * @requires Foundry v13+
 */

/**
 * Registers combat hooks for Void Point spending
 */
export function registerCombatVoidSpending() {
  /**
   * Check if armor TN Void should expire on turn start
   */
  Hooks.on("combatTurn", async (combat, _updateData, _options) => {
    const combatant = combat.combatant;
    if (!combatant) {
      return;
    }

    const actor = combatant.actor;
    if (!actor) {
      return;
    }

    // Check if armor TN void is active
    const useVoid = actor.system?.armorTn?.useVoid;
    const voidRound = actor.system?.armorTn?.voidRound;

    if (useVoid && voidRound !== null) {
      // If it's been at least 1 round since activation, clear it
      if (combat.round > voidRound) {
        await actor.update({
          "system.armorTn.useVoid": false,
          "system.armorTn.voidRound": null
        });

        ui.notifications?.info(`${actor.name}'s Void Armor TN boost expired`);
      }
    }
  });
}
