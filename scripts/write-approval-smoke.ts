import assert from "node:assert/strict"
import { MongoOperationTimeoutError, MongoServerError, MongoWriteConcernError } from "mongodb"
import type { WriteApprovalRequest } from "../src/shared/types"
import { WriteApprovalBroker, type WriteApprovalInput, writeApprovalPreview } from "../src/main/write-approval-broker"
import { MongoService } from "../src/main/mongo-service"
import { writeApprovalTimeoutMs, writeMcpTimeoutMs, writeOperationTimeoutMs } from "../src/main/write-timeouts"

assert.ok(writeMcpTimeoutMs > writeApprovalTimeoutMs + writeOperationTimeoutMs)

const input: WriteApprovalInput = {
  connectionId: "connection-1",
  source: "agent",
  title: "Approve agent update",
  description: "Update one document.",
  destructive: false,
}

const approvedBroker = new WriteApprovalBroker()
let approvedRequest: WriteApprovalRequest | undefined
const approved = approvedBroker.request(input, (request) => { approvedRequest = request })
assert.ok(approvedRequest)
  assert.equal(approvedBroker.resolve({ id: approvedRequest.id, approved: true }), true)
  await approved
  assert.equal(approvedBroker.resolve({ id: approvedRequest.id, approved: true }), false)

const deniedBroker = new WriteApprovalBroker()
let deniedRequest: WriteApprovalRequest | undefined
const denied = deniedBroker.request(input, (request) => { deniedRequest = request })
assert.ok(deniedRequest)
deniedBroker.resolve({ id: deniedRequest.id, approved: false })
await assert.rejects(denied, /cancelled by the user/)

const concurrentBroker = new WriteApprovalBroker()
const pending = concurrentBroker.request(input, () => undefined)
assert.throws(() => concurrentBroker.request(input, () => undefined), /already waiting for approval/)
concurrentBroker.cancel()
await assert.rejects(pending, /approval was cancelled/)

const scopedBroker = new WriteApprovalBroker()
let scopedRequest: WriteApprovalRequest | undefined
const scopedPending = scopedBroker.request({ ...input, scope: "request-a" }, (request) => { scopedRequest = request })
assert.equal(scopedBroker.cancel("agent", "request-b"), undefined)
assert.ok(scopedRequest)
assert.equal(scopedBroker.cancel("agent", "request-a"), scopedRequest.id)
await assert.rejects(scopedPending, /approval was cancelled/)

const longPreview = `${"a".repeat(5_000)}UPDATE${"z".repeat(5_000)}`
const preview = writeApprovalPreview(longPreview)
assert.match(preview, /^a+/)
assert.match(preview, /characters omitted; full payload will execute/)
assert.match(preview, /z+$/)

let expiredId = ""
let expiringRequest: WriteApprovalRequest | undefined
const expiringBroker = new WriteApprovalBroker(5, (id) => { expiredId = id })
await assert.rejects(expiringBroker.request(input, (request) => { expiringRequest = request }), /approval expired/)
assert.ok(expiringRequest)
assert.equal(expiredId, expiringRequest.id)

const throwingExpiryBroker = new WriteApprovalBroker(5, () => { throw new Error("renderer unavailable") })
await assert.rejects(throwingExpiryBroker.request(input, () => undefined), /approval expired/)

let receivedWriteOptions: unknown
const mongoService = new MongoService({} as never, { request: async () => undefined } as never)
const fakeClient = {
  db: () => ({
    collection: () => ({
      insertOne: async (_document: unknown, options: unknown) => {
        receivedWriteOptions = options
        throw new MongoOperationTimeoutError("operation timed out")
      },
    }),
  }),
}
const active = Reflect.get(mongoService, "active") as Map<string, unknown>
active.set("connection-1", {
  client: fakeClient,
  connection: { id: "connection-1", connectionAccessMode: "read-write", agentAccessMode: "read-write" },
})
await assert.rejects(
  mongoService.agentInsertOne("connection-1", "db", "items", { value: 1 }, "scope"),
  /outcome may be unknown; verify the target data before retrying.*operation timed out/,
)
assert.deepEqual(receivedWriteOptions, { timeoutMS: 30_000 })

const deterministicMongoService = new MongoService({} as never, { request: async () => undefined } as never)
const duplicateKey = new MongoServerError({ message: "duplicate key", code: 11_000 })
const deterministicActive = Reflect.get(deterministicMongoService, "active") as Map<string, unknown>
deterministicActive.set("connection-1", {
  client: { db: () => ({ collection: () => ({ insertOne: async () => { throw duplicateKey } }) }) },
  connection: { id: "connection-1", connectionAccessMode: "read-write", agentAccessMode: "read-write" },
})
await assert.rejects(
  deterministicMongoService.agentInsertOne("connection-1", "db", "items", { value: 1 }, "scope"),
  (error) => error === duplicateKey,
)

const writeConcernError = new MongoWriteConcernError({
  ok: 1,
  writeConcernError: { code: 64, errmsg: "waiting for replication timed out" },
})
const runApprovedWrite = Reflect.get(mongoService, "runApprovedWrite") as (operation: () => Promise<unknown>) => Promise<unknown>
await assert.rejects(
  runApprovedWrite.call(mongoService, async () => { throw writeConcernError }),
  /outcome may be unknown; verify the target data before retrying.*waiting for replication timed out/,
)

const shellMongoService = new MongoService({} as never, { request: async () => undefined } as never)
let shellInterrupted = false
let shellTerminated = false
const shellSession = {
  runtime: {
    evaluate: () => new Promise<never>(() => undefined),
    interrupt: () => {
      shellInterrupted = true
      return new Promise<boolean>(() => undefined)
    },
    terminate: async () => { shellTerminated = true },
  },
}
const shells = Reflect.get(shellMongoService, "shells") as Map<string, unknown>
shells.set("connection-1", shellSession)
const runShellCommand = Reflect.get(shellMongoService, "runShellCommand") as (connectionId: string, session: unknown, code: string, timeoutMs: number) => Promise<unknown>
await assert.rejects(runShellCommand.call(shellMongoService, "connection-1", shellSession, "while (true) {}", 5), /shell command exceeded 30 seconds/)
assert.equal(shellInterrupted, true)
assert.equal(shellTerminated, true)
assert.equal(shells.has("connection-1"), false)

console.log("Write approval resume, denial, expiry, preview, cancellation, and concurrency behavior verified.")
