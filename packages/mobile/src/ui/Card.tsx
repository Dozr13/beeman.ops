import type React from 'react'
import type { ViewProps } from 'react-native'
import { Text, View } from 'react-native'

import { cx } from './cx'

export const Card = ({ className, ...props }: ViewProps) => (
  <View
    {...props}
    className={cx(
      'rounded-2xl border border-zinc-800 bg-zinc-900/40',
      className
    )}
  />
)

export const CardHeader = ({ className, ...props }: ViewProps) => (
  <View {...props} className={cx('px-5 pt-5 pb-3', className)} />
)

export const CardContent = ({ className, ...props }: ViewProps) => (
  <View {...props} className={cx('px-5 pb-5', className)} />
)

export const CardTitle = ({
  className,
  ...props
}: React.ComponentProps<typeof Text>) => (
  <Text
    {...props}
    className={cx('text-base font-semibold tracking-tight text-zinc-100', className)}
  />
)

export const CardBody = ({ className, ...props }: ViewProps) => (
  <View {...props} className={cx('p-4', className)} />
)
