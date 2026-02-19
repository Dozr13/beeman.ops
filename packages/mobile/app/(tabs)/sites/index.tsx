import { isOnline, SiteDto } from '@ops/shared'
import { useQuery } from '@tanstack/react-query'
import { Link, Stack } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'
import { Button } from '../../../src/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../src/ui/Card'
import { Pill } from '../../../src/ui/Pill'
import { cx } from '../../../src/ui/cx'

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

const ONLINE_WINDOW_MS = 3 * 60_000

type SortKey = 'status' | 'name'
type SortDir = 'asc' | 'desc'

const sortSites = (sites: SiteDto[], sortKey: SortKey, dir: SortDir) => {
  const items = [...sites]

  items.sort((a, b) => {
    const aName = (a.name ?? a.code).toLowerCase()
    const bName = (b.name ?? b.code).toLowerCase()

    const aOnline = isOnline(a.lastHeartbeat, ONLINE_WINDOW_MS)
    const bOnline = isOnline(b.lastHeartbeat, ONLINE_WINDOW_MS)

    const nameCmp = aName.localeCompare(bName, undefined, {
      numeric: true,
      sensitivity: 'base'
    })

    if (sortKey === 'status') {
      // online first when asc, offline first when desc
      const aRank = aOnline ? 0 : 1
      const bRank = bOnline ? 0 : 1
      const d0 = aRank - bRank
      if (d0 !== 0) return dir === 'asc' ? d0 : -d0

      return dir === 'asc' ? nameCmp : -nameCmp
    }

    // name sort
    return dir === 'asc' ? nameCmp : -nameCmp
  })

  return items
}

const KpiCard = ({
  title,
  subtitle,
  value,
  pill
}: {
  title: string
  subtitle: string
  value: React.ReactNode
  pill?: React.ReactNode
}) => {
  return (
    <Card className='border-zinc-800'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Text className='text-sm text-zinc-400'>{subtitle}</Text>
      </CardHeader>
      <CardContent>
        <Text className='text-4xl font-semibold tracking-tight text-zinc-100'>
          {value}
        </Text>
        {pill ? <View className='mt-2'>{pill}</View> : null}
      </CardContent>
    </Card>
  )
}

export default function SitesScreen() {
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const q = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<SiteDto[]>('/sites')
  })

  const sites = q.data ?? []

  const sortedSites = useMemo(
    () => sortSites(sites, sortKey, sortDir),
    [sites, sortKey, sortDir]
  )

  const onlineCount = sites.filter((s) =>
    isOnline(s.lastHeartbeat, ONLINE_WINDOW_MS)
  ).length
  const offlineCount = sites.length - onlineCount

  const wellCount = sites.filter((s) => s.type === 'WELL').length
  const padCount = sites.filter((s) => s.type === 'PAD').length
  const facilityCount = sites.filter((s) => s.type === 'FACILITY').length
  const yardCount = sites.filter((s) => s.type === 'YARD').length
  const unknownCount = sites.filter(
    (s) => s.type === 'UNKNOWN' || !s.type
  ).length

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Sites' }} />

      <ScrollView
        className='px-5 py-5'
        refreshControl={
          <RefreshControl refreshing={q.isFetching} onRefresh={q.refetch} />
        }
      >
        <View className='flex-row items-start justify-between gap-3'>
          <View className='flex-1'>
            <Text className='text-3xl font-semibold tracking-tight text-zinc-100'>
              Sites
            </Text>
            <Text className='mt-1 text-sm text-zinc-400'>
              Site monitoring (heartbeat + devices). Huts are tracked
              separately.
            </Text>

            <View className='mt-3 flex-row flex-wrap items-center gap-2'>
              <Pill tone='neutral'>LIVE</Pill>
              <Text className='text-xs text-zinc-500'>
                Online = heartbeat within 3 minutes
              </Text>
            </View>
          </View>

          <Button title='Refresh' onPress={() => q.refetch()} />
        </View>

        <View className='mt-5 gap-4'>
          <View className='gap-4'>
            <KpiCard
              title='Total Sites'
              subtitle='Known sites'
              value={sites.length}
              pill={<Text className='text-xs text-zinc-500'>From ingest</Text>}
            />

            <View className='flex-row gap-4'>
              <View className='flex-1'>
                <KpiCard
                  title='Online'
                  subtitle='Heartbeat fresh'
                  value={onlineCount}
                  pill={<Pill tone='good'>ONLINE</Pill>}
                />
              </View>
              <View className='flex-1'>
                <KpiCard
                  title='Offline'
                  subtitle='No recent heartbeat'
                  value={offlineCount}
                  pill={<Pill tone='bad'>OFFLINE</Pill>}
                />
              </View>
            </View>
          </View>

          <View className='flex-row flex-wrap gap-2'>
            <Pill tone='neutral'>WELL: {wellCount}</Pill>
            <Pill tone='neutral'>PAD: {padCount}</Pill>
            <Pill tone='neutral'>FACILITY: {facilityCount}</Pill>
            <Pill tone='neutral'>YARD: {yardCount}</Pill>
            <Pill tone='neutral'>UNKNOWN: {unknownCount}</Pill>
          </View>

          {/* Sort controls */}
          <View className='flex-row flex-wrap items-center gap-2'>
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
              onPress={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
            >
              {sortDir === 'asc' ? 'ASC ↑' : 'DESC ↓'}
            </Pill>
          </View>

          <Text className='text-sm text-zinc-400'>
            Tap a site to view details.
          </Text>

          {q.isLoading ? (
            <View className='py-10'>
              <ActivityIndicator />
            </View>
          ) : q.isError ? (
            <View className='rounded-2xl border border-red-500/30 bg-red-950/30 p-4'>
              <Text className='text-red-200'>Failed to load sites.</Text>
              <Text className='mt-1 text-xs text-red-300/70'>
                {String(q.error)}
              </Text>
            </View>
          ) : (
            <View className='gap-3'>
              {sortedSites.map((s) => {
                const online = isOnline(s.lastHeartbeat, ONLINE_WINDOW_MS)

                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {}}
                    className='rounded-2xl'
                  >
                    <Link href={`/sites/${s.id}`} asChild>
                      <Pressable
                        className={cx(
                          'rounded-2xl border bg-zinc-950/20 px-4 py-4',
                          'border-zinc-800',
                          'active:opacity-90'
                        )}
                      >
                        <View className='flex-row items-start justify-between gap-3'>
                          <View className='flex-1'>
                            <Text className='text-lg font-semibold text-zinc-100'>
                              {s.name ?? s.code}
                            </Text>

                            <Text className='mt-1 text-xs text-zinc-400'>
                              <Text className='text-zinc-300'>{s.code}</Text>
                              <Text className='text-zinc-700'> • </Text>
                              <Text>{s.type ?? 'UNKNOWN'}</Text>
                              <Text className='text-zinc-700'> • </Text>
                              <Text>{s.timezone ?? 'n/a'}</Text>
                            </Text>
                          </View>

                          <View className='items-end gap-2'>
                            <Pill tone={online ? 'good' : 'bad'}>
                              {online ? 'ONLINE' : 'OFFLINE'}
                            </Pill>

                            {s.currentHut ? (
                              <Pill tone='neutral'>
                                HUT: {s.currentHut.code}
                              </Pill>
                            ) : (
                              <Pill tone='neutral'>NO HUT</Pill>
                            )}
                          </View>
                        </View>

                        <View className='mt-3 rounded-xl border border-zinc-800 bg-zinc-950/30 p-3'>
                          <Text className='text-xs text-zinc-500'>
                            Last heartbeat
                          </Text>
                          <Text className='mt-1 text-sm text-zinc-200'>
                            {fmt(s.lastHeartbeat)}
                          </Text>
                        </View>
                      </Pressable>
                    </Link>
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  )
}
