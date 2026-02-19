import { Text, View } from 'react-native'

export const Badge = ({ label }: { label: string }) => (
  <View className="px-2 py-1 rounded-md bg-slate-800">
    <Text className="text-slate-200 text-xs">{label}</Text>
  </View>
)
