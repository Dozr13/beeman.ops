import { Pressable, Text } from 'react-native'

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled
}: {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}) => {
  const base = 'rounded-xl px-4 py-3 items-center'
  const styles =
    variant === 'primary'
      ? 'bg-brand'
      : variant === 'danger'
        ? 'bg-danger'
        : 'bg-card border border-border'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[base, styles, disabled ? 'opacity-50' : ''].join(' ')}
    >
      <Text
        className={
          variant === 'secondary'
            ? 'text-text font-semibold'
            : 'text-bg font-semibold'
        }
      >
        {title}
      </Text>
    </Pressable>
  )
}
