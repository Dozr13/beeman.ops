import type { PropsWithChildren } from 'react'
import type { ViewProps } from 'react-native'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { cx } from './cx'

type Props = PropsWithChildren<
  ViewProps & {
    /** Outer container (SafeAreaView) */
    className?: string
    /** Inner padded container (View) */
    contentClassName?: string
  }
>

export const Screen = ({
  children,
  className,
  contentClassName,
  ...props
}: Props) => {
  return (
    <SafeAreaView className={cx('flex-1 bg-zinc-950', className)}>
      <View className={cx('flex-1 px-5 py-4', contentClassName)} {...props}>
        {children}
      </View>
    </SafeAreaView>
  )
}
