export const DEFAULT_ONLINE_WINDOW_MS = 10 * 60_000 // 10 minutes

export const isOnline = (
  lastHeartbeat: string | null,
  windowMs: number = DEFAULT_ONLINE_WINDOW_MS
) => {
  if (!lastHeartbeat) return false
  const ms = Date.now() - new Date(lastHeartbeat).getTime()
  return ms < windowMs
}
