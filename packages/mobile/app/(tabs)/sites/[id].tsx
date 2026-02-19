import { getSiteLatLng, isOnline, SiteDetailDto } from '@ops/shared'
import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'
import { Button } from '../../../src/ui/Button'
import { Card } from '../../../src/ui/Card'
import { Pill } from '../../../src/ui/Pill'

// type SiteType = 'UNKNOWN' | 'WELL' | 'PAD' | 'FACILITY' | 'YARD'

// type SiteDetail = {
//   id: string
//   code: string
//   name: string | null
//   type: SiteType | null
//   timezone: string | null
//   meta: any
//   createdAt: string
//   lastHeartbeat: string | null
//   currentHut?: { id: string; code: string; name: string | null } | null
// }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

const ONLINE_WINDOW_MS = 3 * 60_000

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const q = useQuery({
    queryKey: ['site', id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<SiteDetailDto>(`/sites/${id}`)
  })

  if (q.isLoading) {
    return (
      <Screen>
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator />
        </View>
      </Screen>
    )
  }

  if (q.isError || !q.data) {
    return (
      <Screen>
        <View className='p-6'>
          <Text className='text-zinc-200'>Failed to load site.</Text>
          <Text className='mt-2 text-zinc-500'>{String(q.error)}</Text>
        </View>
      </Screen>
    )
  }

  const site = q.data
  const pingOnline = isOnline(site.lastHeartbeat, ONLINE_WINDOW_MS)
  const ll = getSiteLatLng(site)
  const llstr = ll
    ? `${ll.lat.toFixed(6)},${ll.lng.toFixed(6)}`
    : 'No lat/lng set'

  return (
    <Screen>
      <Stack.Screen options={{ title: site.name ?? site.code ?? 'Site' }} />

      <ScrollView className='px-5 py-5'>
        <View className='flex-row items-start justify-between gap-3'>
          <View className='flex-1'>
            <Text className='text-2xl font-semibold text-zinc-100'>
              {site.name ?? site.code}
            </Text>
            <Text className='mt-1 text-sm text-zinc-400'>{llstr}</Text>

            <View className='mt-3 flex-row flex-wrap gap-2'>
              {/* Site status pill: coming soon */}
              <Pill tone='neutral'>COMING SOON</Pill>

              {/* Ping status (derived ONLY from lastHeartbeat freshness) */}
              <Pill tone={pingOnline ? 'good' : 'bad'}>
                PING {pingOnline ? 'OK' : 'DOWN'}
              </Pill>

              <Pill tone='neutral'>{site.type ?? 'UNKNOWN'}</Pill>
              <Pill tone='neutral'>{site.timezone ?? 'n/a'}</Pill>
            </View>

            <Text className='mt-2 text-xs text-zinc-500'>
              Last ping: {fmt(site.lastHeartbeat)}
            </Text>
          </View>
        </View>

        <View className='mt-5 gap-4'>
          <Card className='p-4'>
            <Text className='text-sm font-semibold text-zinc-100'>
              Work in progress
            </Text>
            <Text className='mt-2 text-sm text-zinc-400'>
              This page will track equipment and production data for this
              location. For now, if a hut is assigned you can see that here.
            </Text>

            <View className='mt-3 gap-2'>
              <Text className='text-sm text-zinc-400'>Planned additions:</Text>
              <Text className='text-sm text-zinc-500'>
                • Routers / switches / sensors
              </Text>
              <Text className='text-sm text-zinc-500'>
                • Pressures and temperatures (where available)
              </Text>
              <Text className='text-sm text-zinc-500'>
                • Volumes / totals by site configuration
              </Text>
              <Text className='text-sm text-zinc-500'>• Alerts and trends</Text>
            </View>
          </Card>

          <Card className='p-4'>
            <Text className='text-sm font-semibold text-zinc-100'>
              Location
            </Text>
            <Text className='mt-1 text-sm text-zinc-400'>{llstr}</Text>
          </Card>

          <Card className='p-4'>
            <View className='flex-row items-center justify-between'>
              <Text className='text-sm font-semibold text-zinc-100'>
                Assigned hut
              </Text>
              <Pill tone='neutral'>{site.currentHut ? '1' : '0'}</Pill>
            </View>

            {site.currentHut ? (
              <View className='mt-3 gap-3'>
                <View>
                  <Text className='text-zinc-100'>{site.currentHut.code}</Text>
                  <Text className='mt-1 text-sm text-zinc-500'>
                    {site.currentHut.name ?? '—'}
                  </Text>
                </View>

                <Button
                  title='Open hut →'
                  onPress={() =>
                    router.push(
                      `/huts/${encodeURIComponent(site.currentHut!.code)}`
                    )
                  }
                />
              </View>
            ) : (
              <Text className='mt-2 text-sm text-zinc-500'>None</Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  )
}
