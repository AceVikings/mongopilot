import { BSON } from "mongodb"

export function parseExtendedJson(text: string): unknown {
  return BSON.EJSON.parse(text)
}

export function stringifyCanonicalExtendedJson(value: unknown): string {
  return BSON.EJSON.stringify(value, { relaxed: false })
}

export function serializeBson(value: unknown): unknown {
  return JSON.parse(stringifyCanonicalExtendedJson(value)) as unknown
}

export function serializeBsonArray(values: readonly unknown[]): unknown[] {
  const serialized = serializeBson(values)
  if (!Array.isArray(serialized)) throw new Error("BSON array serialization returned an invalid result.")
  return serialized
}
