import {
  getSiteLatLng,
  googleMapsDirectionsUrl,
  isOnline,
  SiteDto
} from '@ops/shared'

export const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : '—'

export const fmtNum = (n: unknown) => {
  const num = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(num)) return '—'
  return Intl.NumberFormat().format(num)
}

export const fmtDate = (d: string | null | undefined) => (d ? d : '—')

export const getDirectionsUrl = (s: SiteDto) => {
  const ll = getSiteLatLng(s)
  return ll ? googleMapsDirectionsUrl(ll) : null
}

export const getProduction = (meta: any) => {
  const p = meta?.production ?? meta?.prod ?? null
  return {
    oilBopd: p?.oilBopd ?? p?.oil ?? null,
    waterBwpd: p?.waterBwpd ?? p?.water ?? null,
    gasMcfpd: p?.gasMcfpd ?? p?.gas ?? null
  }
}

export const sitePillTone = (s: SiteDto) => (isOnline(s.lastHeartbeat) ? 'good' : 'bad')
