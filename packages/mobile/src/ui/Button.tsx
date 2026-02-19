import { Pressable, Text } from 'react-native'
import { cx } from './cx'

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  className
}: {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
}) => {
  const base =
    size === 'sm'
      ? 'rounded-xl px-3 py-2 items-center justify-center'
      : 'rounded-xl px-4 py-3 items-center justify-center'
  const styles =
    variant === 'primary'
      ? 'bg-indigo-600 border border-indigo-500/40'
      : variant === 'danger'
        ? 'bg-rose-600 border border-rose-500/40'
        : 'bg-zinc-950/40 border border-zinc-800'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cx(
        base,
        styles,
        disabled ? 'opacity-50' : 'active:opacity-90',
        className
      )}
    >
      <Text
        className={cx(
          'font-semibold',
          size === 'sm' ? 'text-sm' : 'text-base',
          variant === 'secondary' ? 'text-zinc-100' : 'text-white'
        )}
      >
        {title}
      </Text>
    </Pressable>
  )
}
