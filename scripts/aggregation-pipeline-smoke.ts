import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { parseAggregationPipeline } from "../src/main/aggregation-pipeline"

const pipeline = parseAggregationPipeline(`[
  { "$match": { "_id": { "$oid": "507f1f77bcf86cd799439011" } } },
  { "$group": { "_id": "$status", "count": { "$sum": 1 } } }
]`)
assert.equal(pipeline.length, 2)
assert.ok(pipeline[0]?.$match)
assert.ok((pipeline[0].$match as { _id?: unknown })._id instanceof ObjectId)

assert.throws(() => parseAggregationPipeline("{}"), /JSON array/)
assert.throws(() => parseAggregationPipeline('[{ "$match": {}, "$limit": 1 }]'), /exactly one operator/)
assert.throws(() => parseAggregationPipeline('[{ "$out": "archive" }]'), /cannot use \$out or \$merge/)
assert.throws(() => parseAggregationPipeline('[{ "$facet": { "write": [{ "$merge": "archive" }] } }]'), /cannot use \$out or \$merge/)

console.log("Aggregation pipeline parsing verified for Extended JSON, shape limits, and blocked write stages.")
