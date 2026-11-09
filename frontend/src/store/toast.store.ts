import { create } from "zustand"

export type ToastKind = "success" | "warning" | "error"

type ToastItem = {
  id: number
  kind: ToastKind
  message: string
}

type ToastState = {
  items: ToastItem[]
  push: (kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (kind, message) => {
    const text = message.trim()
    if (!text) return
    const id = nextId
    nextId += 1
    set((state) => ({ items: [...state.items, { id, kind, message: text }].slice(-4) }))
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
    }, kind === "error" ? 7000 : 5000)
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}))

export function toastSuccess(message: string) {
  useToastStore.getState().push("success", message)
}

export function toastWarning(message: string) {
  useToastStore.getState().push("warning", message)
}

export function toastError(message: string) {
  useToastStore.getState().push("error", message)
}
