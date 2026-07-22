import { randomUUID } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { mkdir } from "node:fs/promises"
import { safeStorage } from "electron"
import type { AgentAccessMode, ConnectionAccessMode, ConnectionEnvironment, SaveConnectionInput, SavedConnection, UpdateConnectionSettingsInput } from "../shared/types"

interface StoredConnection extends SavedConnection {
  encryptedUri: string
}

type PersistedConnection = Omit<StoredConnection, "agentAccessMode" | "connectionAccessMode" | "environment"> & {
  agentAccessMode?: AgentAccessMode
  connectionAccessMode?: ConnectionAccessMode
  environment?: ConnectionEnvironment
  accessMode?: AgentAccessMode | "write-only"
}

function isEnvironment(value: unknown): value is ConnectionEnvironment {
  return value === "unlabeled" || value === "local" || value === "development" || value === "staging" || value === "production"
}

function isConnectionAccessMode(value: unknown): value is ConnectionAccessMode {
  return value === "read-only" || value === "read-write"
}

export class ConnectionStore {
  private readonly uriCache = new Map<string, string>()
  private readonly uriVersions = new Map<string, number>()
  private recordsCache?: StoredConnection[]
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(private readonly filePath: string) {}

  async list(): Promise<SavedConnection[]> {
    await this.mutationQueue
    return (await this.read()).map(({ encryptedUri: _encryptedUri, ...connection }) => connection)
  }

  save(input: SaveConnectionInput): Promise<SavedConnection> {
    return this.enqueueMutation(() => this.saveNow(input))
  }

  private async saveNow(input: SaveConnectionInput): Promise<SavedConnection> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Secure credential storage is unavailable on this system.")
    }
    if (!isEnvironment(input.environment) || !isConnectionAccessMode(input.connectionAccessMode)) {
      throw new Error("Invalid connection environment or safety mode.")
    }

    const records = await this.read()
    const existing = input.id ? records.find((item) => item.id === input.id) : undefined
    const record: StoredConnection = {
      id: existing?.id ?? randomUUID(),
      name: input.name.trim(),
      host: this.hostFromUri(input.uri),
      environment: input.environment,
      connectionAccessMode: input.connectionAccessMode,
      agentAccessMode: input.agentAccessMode,
      favorite: input.favorite,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      lastConnectedAt: existing?.lastConnectedAt,
      encryptedUri: safeStorage.encryptString(input.uri).toString("base64"),
    }
    const next = existing
      ? records.map((item) => (item.id === existing.id ? record : item))
      : [...records, record]
    await this.write(next)
    this.uriVersions.set(record.id, (this.uriVersions.get(record.id) ?? 0) + 1)
    this.uriCache.set(record.id, input.uri)
    const { encryptedUri: _encryptedUri, ...saved } = record
    return saved
  }

  updateSettings(input: UpdateConnectionSettingsInput): Promise<SavedConnection> {
    return this.enqueueMutation(() => this.updateSettingsNow(input))
  }

  private async updateSettingsNow(input: UpdateConnectionSettingsInput): Promise<SavedConnection> {
    if ((input.environment !== undefined && !isEnvironment(input.environment)) || (input.connectionAccessMode !== undefined && !isConnectionAccessMode(input.connectionAccessMode))) {
      throw new Error("Invalid connection environment or safety mode.")
    }
    if (input.environment === undefined && input.connectionAccessMode === undefined) throw new Error("No connection settings were provided.")
    const records = await this.read()
    const target = records.find((item) => item.id === input.id)
    if (!target) throw new Error("Saved connection not found.")
    if (input.environment !== undefined) target.environment = input.environment
    if (input.connectionAccessMode !== undefined) target.connectionAccessMode = input.connectionAccessMode
    await this.write(records)
    const { encryptedUri: _encryptedUri, ...connection } = target
    return connection
  }

  remove(id: string): Promise<void> {
    return this.enqueueMutation(() => this.removeNow(id))
  }

  private async removeNow(id: string): Promise<void> {
    await this.write((await this.read()).filter((item) => item.id !== id))
    this.uriVersions.set(id, (this.uriVersions.get(id) ?? 0) + 1)
    this.uriCache.delete(id)
  }

  async getUri(id: string): Promise<string> {
    await this.mutationQueue
    const cached = this.uriCache.get(id)
    if (cached !== undefined) return cached
    const uriVersion = this.uriVersions.get(id) ?? 0
    const records = await this.read()
    const cachedAfterRead = this.uriCache.get(id)
    if (cachedAfterRead !== undefined) return cachedAfterRead
    if ((this.uriVersions.get(id) ?? 0) !== uriVersion) return this.getUri(id)
    const record = records.find((item) => item.id === id)
    if (!record) throw new Error("Saved connection not found.")
    if (!safeStorage.isEncryptionAvailable()) throw new Error("Secure credential storage is unavailable.")
    try {
      const uri = safeStorage.decryptString(Buffer.from(record.encryptedUri, "base64"))
      this.uriCache.set(id, uri)
      return uri
    } catch {
      throw new Error("Mongo Pilot could not decrypt this saved connection. Unlock your login keychain and try again, or remove and add the connection again.")
    }
  }

  markConnected(id: string): Promise<SavedConnection> {
    return this.enqueueMutation(() => this.markConnectedNow(id))
  }

  private async markConnectedNow(id: string): Promise<SavedConnection> {
    const records = await this.read()
    const target = records.find((item) => item.id === id)
    if (!target) throw new Error("Saved connection not found.")
    target.lastConnectedAt = new Date().toISOString()
    await this.write(records)
    const { encryptedUri: _encryptedUri, ...connection } = target
    return connection
  }

  private hostFromUri(uri: string): string {
    const withoutProtocol = uri.replace(/^mongodb(?:\+srv)?:\/\//, "")
    const authority = withoutProtocol.split("/")[0] ?? "MongoDB deployment"
    return authority.includes("@") ? (authority.split("@").at(-1) ?? authority) : authority
  }

  private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation)
    this.mutationQueue = result.then(() => undefined, () => undefined)
    return result
  }

  private async read(): Promise<StoredConnection[]> {
    if (this.recordsCache) return this.recordsCache.map((record) => ({ ...record }))
    try {
      const records = JSON.parse(await readFile(this.filePath, "utf8")) as PersistedConnection[]
      this.recordsCache = records.map((record) => {
        const legacyMode = record.accessMode === "write-only" ? "read-write" : record.accessMode
        const agentAccessMode = record.agentAccessMode ?? legacyMode ?? "read-only"
        const { accessMode: _legacyAccessMode, ...current } = record
        return {
          ...current,
          agentAccessMode,
          connectionAccessMode: isConnectionAccessMode(record.connectionAccessMode)
            ? record.connectionAccessMode
            : record.connectionAccessMode === undefined ? "read-write" : "read-only",
          environment: isEnvironment(record.environment) ? record.environment : "unlabeled",
        }
      })
      return this.recordsCache.map((record) => ({ ...record }))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        this.recordsCache = []
        return []
      }
      throw error
    }
  }

  private async write(records: StoredConnection[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(records, null, 2), { mode: 0o600 })
    this.recordsCache = records.map((record) => ({ ...record }))
  }
}
