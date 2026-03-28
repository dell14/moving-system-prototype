import { InventoryItem } from "@/src/classes";
import type { InventoryItem as DbInventoryItem } from "@/src/mockDb/types";
import { parseNumericId } from "@/src/classes/shared/utils";

export function toDomainInventoryItem(record: DbInventoryItem): InventoryItem {
  return new InventoryItem({
    recordId: record.id,
    itemId: record.itemId || parseNumericId(record.id),
    itemType: record.itemType || record.name,
    quantity: record.quantity,
    itemCost: record.itemCost || 0,
    unit: record.unit,
  });
}

export function toDbInventoryItem(
  model: InventoryItem,
  template: DbInventoryItem,
): DbInventoryItem {
  return {
    ...template,
    id: model.recordId ?? template.id,
    itemId: model.itemId || template.itemId || parseNumericId(template.id),
    itemType: model.itemType,
    quantity: model.quantity,
    itemCost: model.itemCost,
    name: model.itemType,
    unit: model.unit,
  };
}
