import { HutDto } from '@ops/shared'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'
import { Button } from '../../../src/ui/Button'
import { CardContent, CardHeader, CardTitle } from '../../../src/ui/Card'
import { Pill } from '../../../src/ui/Pill'

type SortKey = 'status' | 'name'
type SortDir = 'asc' | 'desc'

const hutLabel = (h: HutDto) => (h.name ?? h.code ?? '').trim()

const sortHuts = (huts: HutDto[], key: SortKey, dir: SortDir) => {
  const mul = dir === 'asc' ? 1 : -1

  return [...huts].sort((a, b) => {
    if (key === 'status') {
      const aa = a.currentSite?.id ? 1 : 0
      const ba = b.currentSite?.id ? 1 : 0

      // asc => assigned first; desc => unassigned first
      if (aa !== ba) return (ba - aa) * mul

      return hutLabel(a).localeCompare(hutLabel(b))
    }

    // key === 'name'
    return hutLabel(a).localeCompare(hutLabel(b)) * mul
  })
}

export default function HutsScreen() {
  const router = useRouter()
  const [sortKey, setSortKey] = React.useState<SortKey>('status')
  const [sortDir, setSortDir] = React.useState<SortDir>('asc')

  const q = useQuery({
    queryKey: ['huts-page'],
    queryFn: async () => apiFetch<HutDto[]>('/huts')
  })

  const huts = q.data ?? []
  const sortedHuts = React.useMemo(
    () => sortHuts(huts, sortKey, sortDir),
    [huts, sortKey, sortDir]
  )

  const assignedCount = huts.filter((h) => Boolean(h.currentSite?.id)).length
  const unassignedCount = huts.length - assignedCount

  return (
    <Screen>
      <View className='flex-row items-start justify-between gap-3'>
        <View className='flex-1'>
          <Text className='text-zinc-100 text-2xl font-semibold tracking-tight'>
            Huts
          </Text>
          <Text className='mt-1 text-sm text-zinc-400'>
            Hash huts are devices/containers. They can be assigned to a site
            (location).
          </Text>
          <View className='mt-2 flex-row flex-wrap gap-2'>
            <Pill tone='neutral'>HUTS: {huts.length}</Pill>
            <Pill tone='neutral'>ASSIGNED: {assignedCount}</Pill>
            <Pill tone='neutral'>UNASSIGNED: {unassignedCount}</Pill>
          </View>
        </View>
      </View>

      {q.isLoading ? <ActivityIndicator /> : null}
      {q.error ? (
        <Text className='text-red-400'>{(q.error as Error).message}</Text>
      ) : null}

      {/* Sort */}
      <View className='mt-3 flex-row flex-wrap items-center gap-2'>
        <Text className='text-xs text-zinc-500'>Sort:</Text>
        <Pill
          tone={sortKey === 'status' ? 'good' : 'neutral'}
          onPress={() => setSortKey('status')}
        >
          Status
        </Pill>
        <Pill
          tone={sortKey === 'name' ? 'good' : 'neutral'}
          onPress={() => setSortKey('name')}
        >
          Name
        </Pill>
        <Pill
          tone='neutral'
          onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
        >
          {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
        </Pill>
      </View>

      <ScrollView className='mt-3' contentContainerClassName='pb-6'>
        {sortedHuts.map((h) => {
          const site = h.currentSite
          const assigned = Boolean(site?.id)

          return (
            <Pressable
              key={h.id}
              onPress={() => router.push(`/huts/${encodeURIComponent(h.code)}`)}
              className='mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/20 active:opacity-90'
            >
              <CardHeader className='flex-row items-start justify-between gap-3'>
                <View className='flex-1'>
                  <CardTitle numberOfLines={1}>
                    {h.code} • {h.name ?? ''}
                  </CardTitle>
                  <Text className='mt-1 text-xs text-zinc-400'>ID: {h.id}</Text>
                </View>

                <View className='items-end gap-2'>
                  <Pill tone={assigned ? 'good' : 'neutral'}>
                    {assigned ? 'ASSIGNED' : 'UNASSIGNED'}
                  </Pill>
                </View>
              </CardHeader>

              <CardContent className='gap-3'>
                <View className='rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                  <Text className='text-xs text-zinc-500'>Current site</Text>
                  <Text className='mt-1 text-sm text-zinc-200'>
                    {site?.name ?? site?.code ?? '—'}
                  </Text>
                </View>

                <View className='flex-row flex-wrap gap-2'>
                  <Button
                    title='Open hut →'
                    variant='secondary'
                    size='sm'
                    onPress={() =>
                      router.push(`/huts/${encodeURIComponent(h.code)}`)
                    }
                  />
                  {site?.id ? (
                    <Button
                      title='View site →'
                      variant='secondary'
                      size='sm'
                      onPress={() => router.push(`/sites/${site.id}`)}
                    />
                  ) : null}
                </View>
              </CardContent>
            </Pressable>
          )
        })}
      </ScrollView>
    </Screen>
  )
}
