import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'

type Alert = {
  id: string
  siteId: string | null
  deviceId: string | null
  severity: 'INFO' | 'WARN' | 'HIGH' | 'CRITICAL'
  code: string
  message: string
  details: any | null
  createdAt: string
  resolvedAt: string | null
}

const sevColor = (s: Alert['severity']) => {
  switch (s) {
    case 'CRITICAL':
      return 'text-red-400'
    case 'HIGH':
      return 'text-orange-400'
    case 'WARN':
      return 'text-amber-400'
    default:
      return 'text-slate-300'
  }
}

export default function AlertsScreen() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: () => apiFetch<Alert[]>('/alerts/recent'),
    refetchInterval: 30_000
  })

  const resolve = async (id: string) => {
    await apiFetch(`/alerts/${id}/resolve`, { method: 'POST', requireReadKey: true, body: {} })
    qc.invalidateQueries({ queryKey: ['alerts', 'recent'] })
  }

  return (
    <Screen>
      <Text className="text-slate-50 text-xl font-bold">Alerts</Text>

      {q.isLoading ? <ActivityIndicator /> : null}
      {q.error ? <Text className="text-red-400">{(q.error as Error).message}</Text> : null}

      <ScrollView className="mt-2">
        {(q.data ?? []).map((a) => {
          const created = new Date(a.createdAt).toLocaleString()
          return (
            <View key={a.id} className="border-b border-slate-800 py-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className={`${sevColor(a.severity)} font-semibold`}>
                    {a.severity} • {a.code}
                  </Text>
                  <Text className="text-slate-200 mt-1">{a.message}</Text>
                  <Text className="text-slate-500 mt-1 text-xs">{created}</Text>
                </View>

                {a.resolvedAt ? (
                  <Text className="text-emerald-400 text-xs font-semibold">resolved</Text>
                ) : (
                  <Pressable
                    onPress={() => resolve(a.id)}
                    className="bg-slate-800 rounded-lg px-3 py-2"
                  >
                    <Text className="text-slate-100 font-semibold text-xs">Resolve</Text>
                  </Pressable>
                )}
              </View>

              {a.details ? (
                <Text className="text-slate-500 mt-2 text-xs" numberOfLines={3}>
                  {typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}
                </Text>
              ) : null}
            </View>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
