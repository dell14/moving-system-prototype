import type { InventoryItem } from "@/src/mockDb/types";
import { toDomainInventoryItem } from "@/src/mappers";

// Minimum quantities for a small moving company (2-3 moves/day)
const THRESHOLDS: Record<string, number> = {
  dollies: 2,
  blankets: 20,
  straps: 12,
};

export function checkInventory(inventory: InventoryItem[]): {
  enough: boolean;
  message: string;
} {
  const low = inventory
    .map((item) => toDomainInventoryItem(item))
    .map((item) => {
      const threshold = THRESHOLDS[item.itemType.toLowerCase()] ?? 0;
      return item.checkInventory({ minimumQuantity: threshold });
    })
    .filter((result) => result.status !== "ok")
    .map((result) => `${result.itemType.toLowerCase()}: ${result.quantity}/${result.minimumQuantity}`);

  if (low.length === 0) {
    return {
      enough: true,
      message:
        "Inventory levels look good. You have enough dollies, blankets, and straps for upcoming moves.",
    };
  }

  return {
    enough: false,
    message: `Low stock - reorder soon: ${low.join("; ")}`,
  };
}
