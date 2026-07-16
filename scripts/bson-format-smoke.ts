import assert from "node:assert/strict"
import { getBsonDisplay } from "../src/renderer/src/bson-format"

const cases: Array<[unknown, string]> = [
  [{ $oid: "507f1f77bcf86cd799439011" }, "ObjectId('507f1f77bcf86cd799439011')"],
  [{ $date: { $numberLong: "1609459200000" } }, "ISODate('2021-01-01T00:00:00.000Z')"],
  [{ $numberInt: "42" }, "42"],
  [{ $numberLong: "9007199254740993" }, "Long('9007199254740993')"],
  [{ $numberDouble: "Infinity" }, "Double('Infinity')"],
  [{ $numberDecimal: "12.34" }, "Decimal128('12.34')"],
  [{ $binary: { base64: "aGk=", subType: "00" } }, "Binary('aGk=', '00')"],
  [{ $timestamp: { t: 1, i: 2 } }, "Timestamp({ t: 1, i: 2 })"],
  [{ $regularExpression: { pattern: "a/b", options: "i" } }, "/a\\/b/i"],
  [{ $minKey: 1 }, "MinKey()"],
  [{ $maxKey: 1 }, "MaxKey()"],
  [{ $code: "x", $scope: { a: { $numberInt: "1" } } }, "Code('x', {\"a\":{\"$numberInt\":\"1\"}})"],
  [{ $ref: "things", $id: { $oid: "507f1f77bcf86cd799439011" }, $db: "app" }, "DBRef('things', ObjectId('507f1f77bcf86cd799439011'), 'app')"],
]

for (const [input, expected] of cases) assert.equal(getBsonDisplay(input)?.text, expected)
assert.equal(getBsonDisplay({ $oid: "value", other: true }), null)

console.log(`BSON display formatting verified for ${cases.length} canonical types.`)
