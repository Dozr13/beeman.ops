type CX = string | number | false | null | undefined | CX[]

const flat = (v: CX, out: Array<string | number>) => {
  if (Array.isArray(v)) {
    for (const x of v) flat(x, out)
    return
  }
  if (v === false || v === null || v === undefined) return
  out.push(v)
}

/**
 * Tiny className joiner for NativeWind.
 * Supports strings/numbers, falsy values, and nested arrays.
 */
export const cx = (...values: CX[]) => {
  const out: Array<string | number> = []
  for (const v of values) flat(v, out)
  return out.join(' ')
}
