import { ShieldWarning, Trash } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"
import type { WriteApprovalRequest } from "../../shared/types"

interface WriteApprovalDialogProps {
  request: WriteApprovalRequest
  resolving: boolean
  onResolve(approved: boolean): void
}

export function WriteApprovalDialog({ request, resolving, onResolve }: WriteApprovalDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const onResolveRef = useRef(onResolve)
  const resolvingRef = useRef(resolving)
  onResolveRef.current = onResolve
  resolvingRef.current = resolving

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => cancelRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !resolvingRef.current) onResolveRef.current(false)
      if (event.key !== "Tab") return
      const dialog = dialogRef.current
      if (!dialog) return
      const buttons = [...(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])]
      if (buttons.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = buttons[0]
      const last = buttons.at(-1)
      if (!first || !last) return
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
      <button type="button" tabIndex={-1} aria-label="Cancel database write" disabled={resolving} onClick={() => onResolve(false)} className="absolute inset-0 cursor-default focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger focus-visible:outline-none disabled:cursor-wait" />
      <section ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby="write-approval-title" aria-describedby="write-approval-description" aria-busy={resolving} className="relative z-10 w-full max-w-lg rounded-lg border border-line-strong bg-panel p-5 shadow-2xl focus:outline-none">
        <div className="flex items-start gap-3">
          <div className={`grid size-9 shrink-0 place-items-center rounded-md ${request.destructive ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"}`}>
            {request.destructive ? <Trash size={18} aria-hidden="true" /> : <ShieldWarning size={18} aria-hidden="true" />}
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-wider text-faint">{request.source} write request</p>
            <h2 id="write-approval-title" className="mt-1 text-base font-semibold text-ink">{request.title}</h2>
            <p id="write-approval-description" className="mt-2 text-xs leading-5 text-muted">{request.description}</p>
          </div>
        </div>
        {request.preview && <pre className="scrollbar-thin mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md border border-line bg-canvas p-3 font-mono text-[11px] leading-5 text-muted">{request.preview}</pre>}
        <p className="mt-3 text-[11px] leading-4 text-faint">Read/write mode enables this request but never approves it automatically. Approval expires automatically.</p>
        {resolving && <p role="status" className="mt-2 text-[11px] font-medium text-warning">Confirming approval with Mongo Pilot...</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" disabled={resolving} onClick={() => onResolve(false)} className="h-10 rounded-md border border-line px-4 text-xs font-medium text-muted hover:border-line-strong hover:bg-raised hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-wait disabled:opacity-50">Cancel</button>
          <button type="button" disabled={resolving} onClick={() => onResolve(true)} className={`h-10 rounded-md px-4 text-xs font-semibold text-canvas focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-panel focus-visible:outline-none disabled:cursor-wait disabled:opacity-60 ${request.destructive ? "bg-danger hover:brightness-110 focus-visible:ring-danger" : "bg-accent hover:bg-accent-strong focus-visible:ring-accent"}`}>
            {resolving ? "Confirming..." : request.destructive ? "Approve destructive write" : "Approve once"}
          </button>
        </div>
      </section>
    </div>
  )
}
