import type { SchemaAnalysisResult, SchemaFieldInfo } from "../shared/types"

const maxSchemaDepth = 20
const maxSchemaNodes = 50_000
const maxSchemaNodesPerDocument = 1_000
const maxArrayItems = 100

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function valueType(value: unknown): string {
  if (value === null) return "Null"
  if (Array.isArray(value)) return "Array"
  if (value instanceof Date) return "Date"
  if (typeof value === "string") return "String"
  if (typeof value === "boolean") return "Boolean"
  if (typeof value === "number") return "Number"
  if (typeof value === "bigint") return "Long"
  if (typeof value === "undefined") return "Undefined"
  if (!isRecord(value)) return typeof value
  const bsonType = value._bsontype
  return typeof bsonType === "string" ? bsonType : "Object"
}

function collectDocumentTypes(document: Record<string, unknown>, budget: { remaining: number }): { complete: boolean; fields: Map<string, Set<string>> } {
  const fields = new Map<string, Set<string>>()
  let complete = true
  const recordType = (path: string, type: string) => {
    const types = fields.get(path) ?? new Set<string>()
    types.add(type)
    fields.set(path, types)
  }
  const visit = (value: unknown, path: string, depth: number) => {
    if (budget.remaining <= 0) {
      complete = false
      return
    }
    budget.remaining -= 1
    const type = valueType(value)
    recordType(path, type)
    if (depth >= maxSchemaDepth) return
    if (Array.isArray(value)) {
      const itemCount = Math.min(value.length, maxArrayItems)
      let visited = 0
      for (; visited < itemCount && budget.remaining > 0; visited += 1) visit(value[visited], `${path}[]`, depth + 1)
      if (visited < itemCount) complete = false
      return
    }
    if (type !== "Object" || !isRecord(value)) return
    for (const key in value) {
      if (budget.remaining <= 0) {
        complete = false
        break
      }
      if (Object.hasOwn(value, key)) visit(value[key], `${path}.${key}`, depth + 1)
    }
  }
  for (const key in document) {
    if (budget.remaining <= 0) {
      complete = false
      break
    }
    if (Object.hasOwn(document, key)) visit(document[key], key, 0)
  }
  return { complete, fields }
}

export function analyzeDocuments(documents: readonly Record<string, unknown>[], durationMs = 0): SchemaAnalysisResult {
  const aggregate = new Map<string, { presentCount: number; types: Map<string, number> }>()
  let remainingNodes = maxSchemaNodes
  let sampleCount = 0
  let truncated = false
  for (const document of documents) {
    if (remainingNodes <= 0) {
      truncated = true
      break
    }
    const budget = { remaining: Math.min(remainingNodes, maxSchemaNodesPerDocument) }
    const startingBudget = budget.remaining
    const collected = collectDocumentTypes(document, budget)
    remainingNodes -= startingBudget - budget.remaining
    if (!collected.complete) {
      truncated = true
      continue
    }
    sampleCount += 1
    for (const [path, types] of collected.fields) {
      const field = aggregate.get(path) ?? { presentCount: 0, types: new Map<string, number>() }
      field.presentCount += 1
      for (const type of types) field.types.set(type, (field.types.get(type) ?? 0) + 1)
      aggregate.set(path, field)
    }
  }
  const fields: SchemaFieldInfo[] = [...aggregate.entries()]
    .map(([path, field]) => ({
      path,
      presentCount: field.presentCount,
      types: [...field.types.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.path.localeCompare(right.path))
  return { fields, sampleCount, truncated, durationMs }
}
