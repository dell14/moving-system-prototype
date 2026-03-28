import type {
  InventoryCheckResult,
  InventoryRepository,
  PersistableInventoryItem,
} from "../shared/types";

type InventoryItemProps = {
  recordId?: string;
  itemId: number;
  itemType: string;
  quantity: number;
  itemCost: number;
  unit?: string;
};

export class InventoryItem {
  public recordId?: string;
  public itemId: number;
  public itemType: string;
  public quantity: number;
  public itemCost: number;
  public unit?: string;

  constructor(props: InventoryItemProps) {
    this.recordId = props.recordId;
    this.itemId = props.itemId;
    this.itemType = props.itemType;
    this.quantity = props.quantity;
    this.itemCost = props.itemCost;
    this.unit = props.unit;
  }

  addItem(amount = 1): boolean {
    const normalized = Math.max(0, Math.trunc(amount));
    if (normalized <= 0) return false;
    this.quantity += normalized;
    return true;
  }

  removeItem(amount = 1): boolean {
    const normalized = Math.max(0, Math.trunc(amount));
    if (normalized <= 0) return false;
    this.quantity = Math.max(0, this.quantity - normalized);
    return true;
  }

  saveChanges(repository?: InventoryRepository) {
    if (!repository) return undefined;
    return repository.save(this.toPersistence());
  }

  checkInventory(options?: { minimumQuantity?: number }): InventoryCheckResult {
    const minimumQuantity = Math.max(0, options?.minimumQuantity ?? 0);
    const status =
      this.quantity <= 0
        ? "out"
        : this.quantity < minimumQuantity
          ? "low"
          : "ok";

    let message = `${this.itemType} is fully stocked.`;
    if (status === "out") {
      message = `${this.itemType} is out of stock.`;
    } else if (status === "low") {
      message = `${this.itemType} is running low (${this.quantity}/${minimumQuantity}).`;
    }

    return {
      itemId: this.itemId,
      itemType: this.itemType,
      quantity: this.quantity,
      minimumQuantity,
      status,
      message,
    };
  }

  toPersistence(): PersistableInventoryItem {
    return {
      recordId: this.recordId,
      itemId: this.itemId,
      itemType: this.itemType,
      quantity: this.quantity,
      itemCost: this.itemCost,
      unit: this.unit,
    };
  }
}
