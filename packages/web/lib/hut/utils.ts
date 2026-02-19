export const cn = (...parts: Array<string | undefined | false | null>) =>
  parts.filter(Boolean).join(' ')
