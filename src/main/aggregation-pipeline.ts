import type { Document } from "mongodb"
import { parseExtendedJson } from "./bson-serialization"

const maxPipelineBytes = 64 * 1_024
const maxPipelineStages = 100

function isDocument(value: unknown): value is Document {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function containsWriteStage(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsWriteStage)
  if (!isDocument(value)) return false
  return Object.entries(value).some(([key, child]) => key === "$out" || key === "$merge" || containsWriteStage(child))
}

export function parseAggregationPipeline(text: string): Document[] {
  if (Buffer.byteLength(text, "utf8") > maxPipelineBytes) throw new Error("Aggregation pipeline must be smaller than 64 KB.")
  const parsed = text.trim() ? parseExtendedJson(text) : []
  if (!Array.isArray(parsed)) throw new Error("Aggregation pipeline must be a JSON array.")
  if (parsed.length > maxPipelineStages) throw new Error(`Aggregation pipeline cannot exceed ${maxPipelineStages} stages.`)
  if (!parsed.every((stage) => isDocument(stage) && Object.keys(stage).length === 1)) {
    throw new Error("Each aggregation stage must be an object with exactly one operator.")
  }
  if (containsWriteStage(parsed)) throw new Error("Aggregation pipelines cannot use $out or $merge in Mongo Pilot.")
  return parsed
}
