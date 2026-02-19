import { Text as RNText, TextProps } from 'react-native'

export const H1 = (p: TextProps) => (
  <RNText
    {...p}
    className={['text-2xl font-semibold text-text', p.className]
      .filter(Boolean)
      .join(' ')}
  />
)

export const Label = (p: TextProps) => (
  <RNText
    {...p}
    className={['text-sm font-medium text-muted', p.className]
      .filter(Boolean)
      .join(' ')}
  />
)

export const Text = (p: TextProps) => (
  <RNText
    {...p}
    className={['text-base text-text', p.className].filter(Boolean).join(' ')}
  />
)
