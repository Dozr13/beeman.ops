import { Link } from 'expo-router'
import { Text, View } from 'react-native'

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#f4f4f5', fontSize: 18, fontWeight: '700' }}>Route not found</Text>
      <Link href="/sites" asChild>
        <Text style={{ color: '#818cf8', marginTop: 12, fontWeight: '700' }}>Go to Sites</Text>
      </Link>
    </View>
  )
}
