import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'

type HutDetail = {
  id: string
  code: string
  name?: string | null
  currentSite?: { id: string; code: string; name?: string | null } | null
}

type Miner = {
  ip: string
  reachable: boolean
  api_4028: boolean
  loc?: string | null
  ghs_5s?: number | null
  ghs_5m?: number | null
  ghs_15m?: number | null
  power_w?: number | null
  errors?: string[] | null
}

export default function HutDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const hutCode = typeof code === 'string' ? code : code?.[0] ?? ''

  const hutQ = useQuery({
    queryKey: ['hut', hutCode],
    queryFn: () =>
      apiFetch<HutDetail>(`/huts/${encodeURIComponent(hutCode)}`),
    enabled: !!hutCode
  })

  const minersQ = useQuery({
    queryKey: ['hut', hutCode, 'miners'],
    queryFn: () =>
      apiFetch<{ miners: Miner[] }>(
        `/huts/${encodeURIComponent(hutCode)}/miners`
      ),
    enabled: !!hutCode
  })

  const miners = minersQ.data?.miners ?? []

  return (
    <>
      <Stack.Screen options={{ title: 'Hut' }} />

      <Screen>
        {hutQ.isLoading ? <ActivityIndicator /> : null}
        {hutQ.error ? (
          <Text className='text-red-400'>{(hutQ.error as Error).message}</Text>
        ) : null}

        {hutQ.data ? (
          <View className='pb-3'>
            <Text className='text-slate-50 text-2xl font-bold'>
              {hutQ.data.code}
            </Text>
            {hutQ.data.name ? (
              <Text className='text-slate-200 mt-1'>{hutQ.data.name}</Text>
            ) : null}
            <Text className='text-slate-400 mt-2'>
              {hutQ.data.currentSite
                ? `@ ${hutQ.data.currentSite.code}`
                : 'unassigned'}
            </Text>
          </View>
        ) : null}

        <Text className='text-slate-200 font-semibold mt-2'>Miners</Text>
        {minersQ.isLoading ? <ActivityIndicator /> : null}
        {minersQ.error ? (
          <Text className='text-red-400'>
            {(minersQ.error as Error).message}
          </Text>
        ) : null}

        <ScrollView className='mt-2'>
          {miners.map((m) => {
            const ghs = m.ghs_5m ?? m.ghs_15m ?? m.ghs_5s
            const err = m.errors?.[0]
            return (
              <View key={m.ip} className='border-b border-slate-800 py-3'>
                <View className='flex-row items-center justify-between'>
                  <Text className='text-slate-50 font-semibold'>{m.ip}</Text>
                  <Text
                    className={
                      m.reachable ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {m.reachable ? 'up' : 'down'}
                  </Text>
                </View>
                <Text className='text-slate-400 mt-1'>
                  {m.loc ? `${m.loc} • ` : ''}
                  {ghs != null ? `${Math.round(ghs)} GH/s` : '—'} •{' '}
                  {m.power_w != null ? `${m.power_w} W` : '—'}
                </Text>
                {err ? (
                  <Text className='text-amber-400 mt-1'>{err}</Text>
                ) : null}
              </View>
            )
          })}
        </ScrollView>
      </Screen>
    </>
  )
}
