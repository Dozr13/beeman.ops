import { Text as RNText, TextProps } from 'react-native'
import { cx } from './cx'

export const H1 = (p: TextProps) => (
  <RNText
    {...p}
    className={cx(
      'text-2xl font-semibold tracking-tight text-zinc-100',
      p.className
    )}
  />
)

export const Label = (p: TextProps) => (
  <RNText
    {...p}
    className={cx('text-sm font-medium text-zinc-400', p.className)}
  />
)

export const Text = (p: TextProps) => (
  <RNText {...p} className={cx('text-base text-zinc-200', p.className)} />
)
