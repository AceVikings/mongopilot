import { contextBridge, ipcRenderer } from "electron"
import type { CopilotPromptInput, FindInput, MongoPilotApi, SaveConnectionInput } from "../shared/types"

const api: MongoPilotApi = {
  connections: {
    list: () => ipcRenderer.invoke("connections:list"),
    save: (input: SaveConnectionInput) => ipcRenderer.invoke("connections:save", input),
    remove: (id: string) => ipcRenderer.invoke("connections:remove", id),
    connect: (id: string) => ipcRenderer.invoke("connections:connect", id),
    disconnect: (id: string) => ipcRenderer.invoke("connections:disconnect", id),
  },
  database: {
    listCollections: (connectionId: string, database: string) =>
      ipcRenderer.invoke("database:listCollections", connectionId, database),
    find: (input: FindInput) => ipcRenderer.invoke("database:find", input),
  },
  copilot: {
    status: () => ipcRenderer.invoke("copilot:status"),
    start: () => ipcRenderer.invoke("copilot:start"),
    stop: () => ipcRenderer.invoke("copilot:stop"),
    prompt: (input: CopilotPromptInput) => ipcRenderer.invoke("copilot:prompt", input),
  },
}

contextBridge.exposeInMainWorld("mongoPilot", api)
