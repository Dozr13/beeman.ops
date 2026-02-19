import { AlertDto } from '@ops/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'
import { Button } from '../../../src/ui/Button'
import { Card, CardBody } from '../../../src/ui/Card'
import { Pill } from '../../../src/ui/Pill'

const sevTone = (
  s: AlertDto['severity']
): 'neutral' | 'good' | 'warn' | 'bad' =>
  s === 'CRITICAL' || s === 'HIGH' ? 'bad' : s === 'WARN' ? 'warn' : 'neutral'

export default function AlertsScreen() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: () => apiFetch<AlertDto[]>('/alerts/recent'),
    refetchInterval: 30_000
  })

  const resolve = async (id: string) => {
    await apiFetch(`/alerts/${id}/resolve`, {
      method: 'POST',
      requireReadKey: true,
      body: {}
    })
    qc.invalidateQueries({ queryKey: ['alerts', 'recent'] })
  }

  return (
    <Screen>
      <Text className='text-zinc-100 text-2xl font-semibold tracking-tight'>
        Alerts
      </Text>

      {q.isLoading ? <ActivityIndicator /> : null}
      {q.error ? (
        <Text className='text-red-400'>{(q.error as Error).message}</Text>
      ) : null}

      <ScrollView className='mt-3'>
        {(q.data ?? []).map((a) => {
          const created = new Date(a.createdAt).toLocaleString()
          return (
            <Card key={a.id} className='bg-zinc-950/20'>
              <CardBody className='gap-3'>
                <View className='flex-row items-start justify-between gap-3'>
                  <View className='flex-1'>
                    <View className='flex-row items-center gap-2'>
                      <Pill tone={sevTone(a.severity)}>{a.severity}</Pill>
                      <Text className='text-zinc-300 text-xs font-medium'>
                        {a.code}
                      </Text>
                    </View>

                    <Text className='text-zinc-100 mt-2'>{a.message}</Text>
                    <Text className='text-zinc-500 mt-1 text-xs'>
                      {created}
                    </Text>
                  </View>

                  {a.resolvedAt ? (
                    <Pill tone='good'>resolved</Pill>
                  ) : (
                    <Button
                      title='Resolve'
                      onPress={() => resolve(a.id)}
                      variant='secondary'
                      className='px-3 py-2'
                    />
                  )}
                </View>

                {a.details ? (
                  <Text className='text-zinc-500 text-xs' numberOfLines={3}>
                    {typeof a.details === 'string'
                      ? a.details
                      : JSON.stringify(a.details)}
                  </Text>
                ) : null}
              </CardBody>
            </Card>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
