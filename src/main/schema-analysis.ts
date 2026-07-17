import type { SchemaAnalysisResult, SchemaFieldInfo } from "../shared/types"

const maxSchemaDepth = 20

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

function collectDocumentTypes(document: Record<string, unknown>): Map<string, Set<string>> {
  const fields = new Map<string, Set<string>>()
  const recordType = (path: string, type: string) => {
    const types = fields.get(path) ?? new Set<string>()
    types.add(type)
    fields.set(path, types)
  }
  const visit = (value: unknown, path: string, depth: number) => {
    const type = valueType(value)
    recordType(path, type)
    if (depth >= maxSchemaDepth) return
    if (Array.isArray(value)) {
      for (const item of value) visit(item, `${path}[]`, depth + 1)
      return
    }
    if (type !== "Object" || !isRecord(value)) return
    for (const [key, child] of Object.entries(value)) visit(child, `${path}.${key}`, depth + 1)
  }
  for (const [key, value] of Object.entries(document)) visit(value, key, 0)
  return fields
}

export function analyzeDocuments(documents: readonly Record<string, unknown>[], durationMs = 0): SchemaAnalysisResult {
  const aggregate = new Map<string, { presentCount: number; types: Map<string, number> }>()
  for (const document of documents) {
    for (const [path, types] of collectDocumentTypes(document)) {
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
  return { fields, sampleCount: documents.length, durationMs }
}
