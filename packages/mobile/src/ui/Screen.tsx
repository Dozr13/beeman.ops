import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import { View } from 'react-native'

type Props = ViewProps & {
  children?: ReactNode
}

export const Screen = ({ className, children, ...props }: Props) => {
  return (
    <View className={className} {...props}>
      {children}
    </View>
  )
}
