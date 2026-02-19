import { TextInput, TextInputProps, View } from 'react-native'

export const Input = (props: TextInputProps) => {
  return (
    <View className='rounded-xl border border-border bg-card px-3 py-3'>
      <TextInput
        {...props}
        placeholderTextColor='#9ca3af'
        className='text-base text-text'
        autoCapitalize={props.autoCapitalize ?? 'none'}
      />
    </View>
  )
}
