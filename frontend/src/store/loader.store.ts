import { create } from "zustand"

type LoaderState = {
  pending: number
  isLoading: boolean
  start: () => void
  stop: () => void
}

export const useLoaderStore = create<LoaderState>((set) => ({
  pending: 0,
  isLoading: false,
  start: () =>
    set((state) => {
      const pending = state.pending + 1
      return { pending, isLoading: true }
    }),
  stop: () =>
    set((state) => {
      const pending = Math.max(0, state.pending - 1)
      return { pending, isLoading: pending > 0 }
    }),
}))
