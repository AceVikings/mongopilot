import type { CollectionTargetInput, VisualizationSpec } from "../../shared/types"

interface VisualizationStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SavedVisualization {
  prompt: string
  spec: VisualizationSpec
}

interface PersistedVisualization extends SavedVisualization {
  version: 1
}

const chartTypes = new Set(["bar", "line", "area", "pie", "scatter", "table"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isVisualizationSpec(value: unknown): value is VisualizationSpec {
  if (!isRecord(value)) return false
  if (typeof value.title !== "string" || typeof value.description !== "string" || typeof value.categoryField !== "string") return false
  if (typeof value.chartType !== "string" || !chartTypes.has(value.chartType) || !Array.isArray(value.pipeline) || !Array.isArray(value.series)) return false
  return value.pipeline.every(isRecord) && value.series.every((series) => isRecord(series) && typeof series.field === "string" && typeof series.label === "string")
}

export function visualizationStorageKey(target: CollectionTargetInput): string {
  return `mongo-pilot:visualization:1:${encodeURIComponent(target.connectionId)}:${encodeURIComponent(target.database)}:${encodeURIComponent(target.collection)}`
}

export function readSavedVisualization(storage: VisualizationStorage, target: CollectionTargetInput): SavedVisualization | null {
  const key = visualizationStorageKey(target)
  const value = storage.getItem(key)
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.prompt !== "string" || !isVisualizationSpec(parsed.spec)) {
      throw new Error("Invalid saved visualization.")
    }
    return { prompt: parsed.prompt, spec: parsed.spec }
  } catch {
    storage.removeItem(key)
    return null
  }
}

export function saveVisualization(storage: VisualizationStorage, target: CollectionTargetInput, visualization: SavedVisualization): void {
  const persisted: PersistedVisualization = { version: 1, ...visualization }
  storage.setItem(visualizationStorageKey(target), JSON.stringify(persisted))
}
