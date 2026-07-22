import assert from "node:assert/strict"
import { Double, Int32, Long, ObjectId } from "mongodb"
import { analyzeDocuments } from "../src/main/schema-analysis"

const result = analyzeDocuments([
  {
    _id: new ObjectId("507f1f77bcf86cd799439011"),
    name: "Ada",
    profile: { active: true },
    tags: ["database", 42],
    count: new Int32(42),
    score: new Double(9.5),
    large: Long.fromString("9007199254740993"),
  },
  {
    _id: new ObjectId("507f1f77bcf86cd799439012"),
    name: null,
    profile: { active: false },
    createdAt: new Date("2021-01-01T00:00:00.000Z"),
  },
], 7)

const fields = new Map(result.fields.map((field) => [field.path, field]))
assert.equal(result.sampleCount, 2)
assert.equal(result.truncated, false)
assert.equal(result.durationMs, 7)
assert.deepEqual(fields.get("_id"), { path: "_id", presentCount: 2, types: [{ name: "ObjectId", count: 2 }] })
assert.deepEqual(fields.get("name"), {
  path: "name",
  presentCount: 2,
  types: [{ name: "Null", count: 1 }, { name: "String", count: 1 }],
})
assert.deepEqual(fields.get("profile.active"), { path: "profile.active", presentCount: 2, types: [{ name: "Boolean", count: 2 }] })
assert.deepEqual(fields.get("tags[]"), {
  path: "tags[]",
  presentCount: 1,
  types: [{ name: "Number", count: 1 }, { name: "String", count: 1 }],
})
assert.deepEqual(fields.get("createdAt"), { path: "createdAt", presentCount: 1, types: [{ name: "Date", count: 1 }] })
assert.deepEqual(fields.get("count"), { path: "count", presentCount: 1, types: [{ name: "Int32", count: 1 }] })
assert.deepEqual(fields.get("score"), { path: "score", presentCount: 1, types: [{ name: "Double", count: 1 }] })
assert.deepEqual(fields.get("large"), { path: "large", presentCount: 1, types: [{ name: "Long", count: 1 }] })

const boundedArray = analyzeDocuments([{ values: [...Array.from({ length: 100 }, () => "sample"), 42] }])
assert.deepEqual(boundedArray.fields.find((field) => field.path === "values[]")?.types, [{ name: "String", count: 1 }])

const wideDocument = analyzeDocuments([Object.fromEntries(Array.from({ length: 1_001 }, (_, index) => [`field${index}`, index]))])
assert.equal(wideDocument.truncated, true)
assert.equal(wideDocument.sampleCount, 0)
assert.equal(wideDocument.fields.length, 0)

console.log("Schema analysis verified for nested fields, arrays, optional fields, and BSON types.")
