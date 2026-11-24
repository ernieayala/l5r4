/**
 * Ask a question through core's DialogV2, which leaves out the system's dialog class.
 * @returns {Promise<boolean|null>} The answer
 */
export function askExample() {
  return foundry.applications.api.DialogV2.confirm({ window: { title: "l5r4.ui.example.title" } });
}
