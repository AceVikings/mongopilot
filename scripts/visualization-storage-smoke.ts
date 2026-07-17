import assert from "node:assert/strict"
import type { VisualizationSpec } from "../src/shared/types"
import { readSavedVisualization, saveVisualization, visualizationStorageKey } from "../src/renderer/src/visualization-storage"

class MemoryStorage {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

const target = { connectionId: "connection:1", database: "sales data", collection: "daily/orders" }
const spec: VisualizationSpec = {
  title: "Orders by day",
  description: "Daily order volume.",
  chartType: "line",
  pipeline: [{ $group: { _id: "$day", day: { $first: "$day" }, orders: { $sum: 1 } } }],
  categoryField: "day",
  series: [{ field: "orders", label: "Orders" }],
}
const storage = new MemoryStorage()

saveVisualization(storage, target, { prompt: "Show orders by day", spec })
assert.deepEqual(readSavedVisualization(storage, target), { prompt: "Show orders by day", spec })
assert.match(visualizationStorageKey(target), /sales%20data:daily%2Forders$/)

storage.setItem(visualizationStorageKey(target), "not json")
assert.equal(readSavedVisualization(storage, target), null)
assert.equal(storage.getItem(visualizationStorageKey(target)), null)

console.log("Visualization persistence verified for collection scoping, restoration, and corrupt-state cleanup.")
