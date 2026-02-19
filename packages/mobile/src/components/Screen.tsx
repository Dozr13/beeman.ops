import type { PropsWithChildren } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export const Screen = ({ children }: PropsWithChildren) => {
  return (
    <SafeAreaView className='flex-1 bg-slate-950'>
      <View className='flex-1 px-4 py-3'>{children}</View>
    </SafeAreaView>
  )
}
