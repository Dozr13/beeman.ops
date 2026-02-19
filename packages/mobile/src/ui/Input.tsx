import { TextInput, TextInputProps, View } from 'react-native'
import { cx } from './cx'

export const Input = (props: TextInputProps) => {
  return (
    <View className='rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3'>
      <TextInput
        {...props}
        placeholderTextColor={props.placeholderTextColor ?? '#71717a'}
        className={cx('text-base text-zinc-100', props.className)}
        autoCapitalize={props.autoCapitalize ?? 'none'}
      />
    </View>
  )
}
