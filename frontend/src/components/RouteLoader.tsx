import { useEffect } from "react"
import { useLocation } from "react-router-dom"

import { useLoaderStore } from "@/store/loader.store"

export function RouteLoader() {
  const { pathname } = useLocation()
  const start = useLoaderStore((state) => state.start)
  const stop = useLoaderStore((state) => state.stop)

  useEffect(() => {
    start()
    let done = false
    const id = window.setTimeout(() => {
      done = true
      stop()
    }, 180)
    return () => {
      window.clearTimeout(id)
      if (!done) {
        stop()
      }
    }
  }, [pathname, start, stop])

  return null
}
