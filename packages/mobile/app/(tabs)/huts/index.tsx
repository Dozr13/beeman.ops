import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { Row } from '../../../src/components/Row'
import { apiFetch } from '../../../src/lib/api'

type Hut = {
  id: string
  code: string
  name?: string | null
  currentSite?: { id: string; code: string; name?: string | null } | null
}

export default function HutsScreen() {
  const router = useRouter()
  const q = useQuery({
    queryKey: ['huts'],
    queryFn: () => apiFetch<Hut[]>('/huts')
  })

  return (
    <Screen>
      <Text className="text-slate-50 text-xl font-bold">Huts</Text>

      {q.isLoading ? <ActivityIndicator /> : null}
      {q.error ? <Text className="text-red-400">{(q.error as Error).message}</Text> : null}

      <ScrollView className="mt-2">
        {(q.data ?? []).map((h) => (
          <Row
            key={h.id}
            title={`${h.code}${h.name ? ` — ${h.name}` : ''}`}
            subtitle={h.currentSite ? `@ ${h.currentSite.code}` : 'unassigned'}
            onPress={() => router.push(`/huts/${encodeURIComponent(h.code)}`)}
          />
        ))}
      </ScrollView>
    </Screen>
  )
}
