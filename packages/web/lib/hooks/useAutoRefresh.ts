'use client'

import { useEffect, useRef } from 'react'

type Args = {
  enabled: boolean
  fn: () => Promise<void> | void
  intervalMs: number
  /** if true, pause refreshing while tab is hidden */
  pauseWhenHidden?: boolean
  /** backoff caps */
  minMs?: number
  maxMs?: number
}

export const useAutoRefresh = ({
  enabled,
  fn,
  intervalMs,
  pauseWhenHidden = true,
  minMs = 5_000,
  maxMs = 120_000
}: Args) => {
  const inFlight = useRef(false)
  const timer = useRef<number | null>(null)
  const delay = useRef(intervalMs)

  useEffect(() => {
    if (!enabled) return

    const clear = () => {
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = null
    }

    const schedule = (ms: number) => {
      clear()
      timer.current = window.setTimeout(tick, ms)
    }

    const tick = async () => {
      if (!enabled) return
      if (pauseWhenHidden && document.visibilityState !== 'visible') {
        schedule(intervalMs)
        return
      }
      if (inFlight.current) {
        schedule(intervalMs)
        return
      }

      inFlight.current = true
      try {
        await fn()
        delay.current = intervalMs // reset on success
      } catch {
        // backoff on failure (bounded)
        delay.current = Math.min(maxMs, Math.max(minMs, delay.current * 2))
      } finally {
        inFlight.current = false
        schedule(delay.current)
      }
    }

    // kick once right away
    schedule(0)

    const onVis = () => {
      if (!enabled) return
      // when user comes back, refresh soon
      if (document.visibilityState === 'visible') schedule(250)
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      clear()
    }
  }, [enabled, fn, intervalMs, pauseWhenHidden, minMs, maxMs])
}
