import type { InventoryItem } from "@/src/mockDb/types";

// Minimum quantities for a small moving company (2–3 moves/day)
const THRESHOLDS: Record<string, number> = {
  dollies: 2,
  blankets: 20,
  straps: 12,
};

export function checkInventory(inventory: InventoryItem[]): {
  enough: boolean;
  message: string;
} {
  const byName = Object.fromEntries(
    inventory.map((i) => [i.name.toLowerCase(), i.quantity])
  );

  const low: string[] = [];

  for (const [name, min] of Object.entries(THRESHOLDS)) {
    const qty = byName[name] ?? 0;
    if (qty < min) {
      low.push(`${name}: ${qty}/${min}`);
    }
  }

  if (low.length === 0) {
    return {
      enough: true,
      message: "Inventory levels look good. You have enough dollies, blankets, and straps for upcoming moves.",
    };
  }

  return {
    enough: false,
    message: `Low stock — reorder soon: ${low.join("; ")}`,
  };
}
