export type LatLng = { lat: number; lng: number }

export const parseLatLngFromCode = (
  code: string | null | undefined
): LatLng | null => {
  if (!code) return null
  // expected: "40.609484,-107.911308"
  const parts = code.split(',').map((p) => p.trim())
  if (parts.length !== 2) return null

  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90) return null
  if (lng < -180 || lng > 180) return null

  return { lat, lng }
}

export const googleMapsDirectionsUrl = (ll: LatLng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${ll.lat},${ll.lng}`

export const appleMapsDirectionsUrl = (ll: LatLng) =>
  `https://maps.apple.com/?daddr=${ll.lat},${ll.lng}`

/**
 * Prefer meta.geo first, fallback to parsing site.code.
 * meta shape: { geo: { lat: number, lng: number } }
 */
export const getSiteLatLng = (site: {
  code?: string | null
  meta?: any
}): LatLng | null => {
  const g = site?.meta?.geo
  if (g) {
    const lat = Number(g.lat)
    const lng = Number(g.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (lat >= -90 && lat <= 90 && lng >= 180 && lng <= 180) {
        return { lat, lng }
      }
    }
  }
  // if (g && Number.isFinite(g.lat) && Number.isFinite(g.lng)) {
  //   return { lat: Number(g.lat), lng: Number(g.lng) }
  // }
  return parseLatLngFromCode(site?.code)
}
