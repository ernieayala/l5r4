/**
 * Settings Registration Module
 * 
 * Re-exports the main settings registration function for convenient importing.
 * This barrel file provides a cleaner import path for system initialization.
 * 
 * @module setup/register-settings
 * @see {@link module:setup/settings/register-all} for the actual implementation
 */
export { registerSettings } from "./settings/register-all.js";
