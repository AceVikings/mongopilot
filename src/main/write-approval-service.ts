import { BrowserWindow } from "electron"
import type { WriteApprovalResponse } from "../shared/types"
import { WriteApprovalBroker, type WriteApprovalInput } from "./write-approval-broker"
import { writeApprovalTimeoutMs } from "./write-timeouts"

export class WriteApprovalService {
  private readonly broker = new WriteApprovalBroker(writeApprovalTimeoutMs, (id) => this.notifyCancelled(id))
  private activeRequest?: { id: string; webContentsId: number }

  request(input: WriteApprovalInput): Promise<void> {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!window || window.isDestroyed()) throw new Error("Database writes require an open Mongo Pilot window for approval.")
    const cancel = () => this.broker.cancel()
    let requestId: string | undefined
    const approval = this.broker.request(input, (request) => {
      requestId = request.id
      this.activeRequest = { id: request.id, webContentsId: window.webContents.id }
      window.webContents.send("write-approval:requested", request)
    })
    window.once("closed", cancel)
    window.webContents.once("render-process-gone", cancel)
    window.webContents.once("did-start-navigation", cancel)
    return approval.finally(() => {
      if (this.activeRequest?.id === requestId) this.activeRequest = undefined
      window.removeListener("closed", cancel)
      if (!window.isDestroyed()) {
        window.webContents.removeListener("render-process-gone", cancel)
        window.webContents.removeListener("did-start-navigation", cancel)
      }
    })
  }

  resolve(response: WriteApprovalResponse, webContentsId: number): boolean {
    if (this.activeRequest?.id !== response.id || this.activeRequest.webContentsId !== webContentsId) return false
    return this.broker.resolve(response)
  }

  cancel(): void {
    const id = this.broker.cancel()
    if (id) this.notifyCancelled(id)
  }

  cancelAgentRequest(scope?: string): void {
    const id = this.broker.cancel("agent", scope)
    if (id) this.notifyCancelled(id)
  }

  private notifyCancelled(id: string): void {
    const target = this.activeRequest
    const window = target
      ? BrowserWindow.getAllWindows().find((candidate) => candidate.webContents.id === target.webContentsId)
      : undefined
    if (!window || window.isDestroyed() || window.webContents.isDestroyed()) return
    try {
      window.webContents.send("write-approval:cancelled", id)
    } catch {
      // The approval promise must settle even if the renderer disappears.
    }
  }
}
