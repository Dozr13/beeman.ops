import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { Row } from '../../../src/components/Row'
import { apiFetch } from '../../../src/lib/api'

type Site = {
  id: string
  code: string
  name?: string | null
  type: string
  timezone: string
  latestHeartbeat?: { ts: string } | null
  alertCounts?: { HIGH: number; CRITICAL: number; WARN: number; INFO: number } | null
}

export default function SitesScreen() {
  const router = useRouter()
  const q = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<Site[]>('/sites')
  })

  return (
    <Screen>
      <View className="flex-row items-center justify-between pb-2">
        <Text className="text-slate-50 text-xl font-bold">Sites</Text>
        <Link href="/sites/new" asChild>
          <Text className="text-sky-400 font-semibold">+ New</Text>
        </Link>
      </View>

      {q.isLoading ? <ActivityIndicator /> : null}
      {q.error ? <Text className="text-red-400">{(q.error as Error).message}</Text> : null}

      <ScrollView className="mt-2">
        {(q.data ?? []).map((s) => (
          <Row
            key={s.id}
            title={`${s.code}${s.name ? ` — ${s.name}` : ''}`}
            subtitle={`${s.type} • ${s.timezone}`}
            right={(() => {
              const c = s.alertCounts
              const parts = c
                ? [
                    c.CRITICAL ? `C:${c.CRITICAL}` : null,
                    c.HIGH ? `H:${c.HIGH}` : null,
                    c.WARN ? `W:${c.WARN}` : null
                  ].filter(Boolean)
                : []
              return parts.length ? parts.join(' ') : s.latestHeartbeat?.ts ? 'online' : '—'
            })()}
            onPress={() => router.push(`/sites/${s.id}`)}
          />
        ))}
      </ScrollView>
    </Screen>
  )
}
