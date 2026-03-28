import type { InventoryItem as DbInventoryItem, MockDb } from "@/src/mockDb/types";
import type {
  InventoryRepository,
  PersistableInventoryItem,
} from "@/src/classes/shared/types";
import {
  normalizeInventoryName,
  normalizeInventoryUnit,
  parseNumericId,
} from "@/src/classes/shared/utils";

export function createInventoryRepository(
  db: MockDb,
  idFactory?: (prefix: string) => string,
): InventoryRepository {
  return {
    save(item: PersistableInventoryItem) {
      const recordId =
        item.recordId ??
        idFactory?.("inv") ??
        `inv_${Date.now().toString(16)}`;

      const record: DbInventoryItem = {
        id: recordId,
        itemId: item.itemId || parseNumericId(recordId),
        itemType: item.itemType,
        quantity: item.quantity,
        itemCost: item.itemCost,
        name: item.itemType,
        unit: item.unit,
      };

      const existingIndex = db.inventory.findIndex(
        (inventoryItem) => inventoryItem.id === recordId,
      );
      if (existingIndex >= 0) {
        db.inventory = db.inventory.map((inventoryItem) =>
          inventoryItem.id === recordId ? record : inventoryItem,
        );
      } else {
        db.inventory = [record, ...db.inventory];
      }

      return record;
    },

    remove(id: string) {
      db.inventory = db.inventory.filter((item) => item.id !== id);
    },

    list() {
      return db.inventory;
    },

    findById(id: string) {
      return db.inventory.find((item) => item.id === id);
    },

    findByNameAndUnit(name: string, unit?: string) {
      return db.inventory.find(
        (item) =>
          normalizeInventoryName(item.itemType || item.name) ===
            normalizeInventoryName(name) &&
          normalizeInventoryUnit(item.unit) === normalizeInventoryUnit(unit),
      );
    },
  };
}
