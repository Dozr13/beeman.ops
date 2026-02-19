import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { cx } from './cx'

export const Pill = ({
  children,
  tone = 'neutral',
  className,
  onPress
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
  className?: string
  onPress?: () => void
}) => {
  // NOTE: On native, `text-*` classes on a View/Pressable don't affect Text.
  // Keep container styling (bg/border) separate from text styling.
  const toneWrapCls =
    tone === 'good'
      ? 'bg-emerald-500/15 border-emerald-500/30'
      : tone === 'warn'
        ? 'bg-amber-500/15 border-amber-500/30'
        : tone === 'bad'
          ? 'bg-red-500/15 border-red-500/30'
          : 'bg-zinc-500/15 border-zinc-500/30'

  const toneTextCls =
    tone === 'good'
      ? 'text-emerald-200'
      : tone === 'warn'
        ? 'text-amber-200'
        : tone === 'bad'
          ? 'text-red-200'
          : 'text-zinc-200'

  const base = cx(
    'flex-row items-center rounded-full border px-2.5 py-1',
    toneWrapCls,
    onPress ? 'active:opacity-85' : '',
    className
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={base}>
        <Text className={cx('text-xs font-medium', toneTextCls)}>
          {children}
        </Text>
      </Pressable>
    )
  }

  return (
    <View className={base}>
      <Text className={cx('text-xs font-medium', toneTextCls)}>{children}</Text>
    </View>
  )
}
