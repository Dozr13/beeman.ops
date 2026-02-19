import type { PropsWithChildren } from 'react'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { cx } from '../ui/cx'

export const Row = ({
  title,
  subtitle,
  right,
  onPress
}: PropsWithChildren<{
  title: string
  subtitle?: string
  right?: string | ReactNode
  onPress?: () => void
}>) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={cx(
        'mb-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/20',
        onPress ? 'active:opacity-95' : 'opacity-90'
      )}
      android_ripple={{ color: '#111827' }}
    >
      <View className='px-4 py-4'>
        <View className='flex-row items-center justify-between gap-3'>
          <Text className='flex-1 text-zinc-100 text-base font-semibold'>
            {title}
          </Text>
          {typeof right === 'string' ? (
            <View className='rounded-full border border-zinc-800 bg-zinc-950/40 px-2.5 py-1'>
              <Text className='text-zinc-300 text-xs font-medium'>{right}</Text>
            </View>
          ) : right ? (
            right
          ) : null}
        </View>
        {subtitle ? (
          <Text className='text-zinc-400 mt-1'>{subtitle}</Text>
        ) : null}
      </View>
    </Pressable>
  )
}
