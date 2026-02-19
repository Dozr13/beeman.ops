import { Text, View } from 'react-native'

export const Badge = ({ label }: { label: string }) => (
  <View className='px-2 py-1 rounded-md border border-zinc-800 bg-zinc-950/40'>
    <Text className='text-zinc-200 text-xs font-medium'>{label}</Text>
  </View>
)
