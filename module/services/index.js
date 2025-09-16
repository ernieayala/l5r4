/**
 * L5R4 — Services Barrel
 * -----------------------------------------------------------------------------
 * Purpose: provide a stable import path for services.
 * During pre-move phase, proxy to existing module locations.
 * After moving files into module/services/, update these re-exports to local.
 *
 * Notes:
 * - No side effects; exports only.
 * - Consumers should localize UI strings via game.i18n in their own modules.
 *
 * Foundry v13 API: https://foundryvtt.com/api/
 */

export * as dice from "./dice.js";
export * as chat from "./chat.js";
