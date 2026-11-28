import { describe, expect, it } from "vitest";
import { DEFAULT_ICONS } from "../../../../../module/config/item-types.js";
import { getUpdatedIconPath } from "../../../../../module/setup/migrations/icons/icon-lookup.js";

// #180: the icon pass changes only images it knows, so art a user chose survives every upgrade
describe("getUpdatedIconPath", () => {
  const item = (type, img, system = {}) => ({ type, img, system });

  it("should leave an item's own art alone", async () => {
    for (const img of [
      "worlds/my-world/katana.webp",
      "icons/weapons/swords/sword-katana.webp",
      "modules/some-art/blade.png"
    ]) {
      expect(await getUpdatedIconPath(item("weapon", img), "Item")).toBeNull();
    }
  });

  it("should give an item with no image or a placeholder its type's default icon", async () => {
    for (const img of ["", null, "icons/svg/item-bag.svg", "icons/svg/mystery-man.svg"]) {
      expect(await getUpdatedIconPath(item("weapon", img), "Item")).toBe(DEFAULT_ICONS.weapon);
    }
  });

  it("should move a bow off another type's default icon, and leave its own art", async () => {
    const bow = img => item("weapon", img, { isBow: true });
    expect(await getUpdatedIconPath(bow(DEFAULT_ICONS.weapon), "Item")).toBe(DEFAULT_ICONS.bow);
    expect(await getUpdatedIconPath(bow("worlds/my-world/yumi.webp"), "Item")).toBeNull();
    expect(await getUpdatedIconPath(bow(DEFAULT_ICONS.bow), "Item")).toBeNull();
  });

  it("should change nothing on a second run", async () => {
    const first = await getUpdatedIconPath(item("armor", "icons/svg/item-bag.svg"), "Item");
    expect(await getUpdatedIconPath(item("armor", first), "Item")).toBeNull();
  });
});
