import { Link } from 'expo-router'
import { Text, View } from 'react-native'

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#e2e8f0', fontSize: 18, fontWeight: '700' }}>Route not found</Text>
      <Link href="/sites" asChild>
        <Text style={{ color: '#38bdf8', marginTop: 12, fontWeight: '700' }}>Go to Sites</Text>
      </Link>
    </View>
  )
}
