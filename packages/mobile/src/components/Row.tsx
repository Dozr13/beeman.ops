import type { PropsWithChildren } from 'react'
import { Pressable, Text, View } from 'react-native'

export const Row = ({
  title,
  subtitle,
  right,
  onPress
}: PropsWithChildren<{
  title: string
  subtitle?: string
  right?: string
  onPress?: () => void
}>) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="border-b border-slate-800"
      android_ripple={{ color: '#0f172a' }}
    >
      <View className="py-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-slate-50 text-base font-semibold">{title}</Text>
          {right ? <Text className="text-slate-400 text-sm">{right}</Text> : null}
        </View>
        {subtitle ? <Text className="text-slate-400 mt-1">{subtitle}</Text> : null}
      </View>
    </Pressable>
  )
}
