import { HutDetailDto, MinerRecordDto } from '@ops/shared'
import { useQuery } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'
import { Button } from '../../../src/ui/Button'
import {
  Card,
  CardBody,
  CardContent,
  CardHeader,
  CardTitle
} from '../../../src/ui/Card'
import { Pill } from '../../../src/ui/Pill'

type Bucket = 'CRIT' | 'WARN' | 'OK'
type KpiRow = { th: number | null; bucket: Bucket }

const fmtTh = (th: number) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(th)

const fmtPh = (th: number) =>
  Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(th / 1000)

export const HutKpiGrid = ({ rows }: { rows: KpiRow[] }) => {
  const totalTh = rows.reduce((sum, r) => sum + (r.th ?? 0), 0)
  const crit = rows.filter((r) => r.bucket === 'CRIT').length
  const warn = rows.filter((r) => r.bucket === 'WARN').length
  const ok = rows.filter((r) => r.bucket === 'OK').length

  return (
    <View className='mt-4 flex-row gap-3'>
      {/* Left column: Total hashrate */}
      <View className='flex-1'>
        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader className='pb-2'>
            <View className='flex-row items-center justify-between'>
              <CardTitle>Total Hashrate</CardTitle>
              <Pill tone='neutral'>LIVE</Pill>
            </View>
            <Text className='text-sm text-zinc-400'>
              Sum of best available miner metric
            </Text>
          </CardHeader>

          <CardContent className='pt-0'>
            <Text className='text-4xl font-semibold tracking-tight text-zinc-100'>
              {fmtTh(totalTh)}{' '}
              <Text className='text-base text-zinc-400'>TH</Text>
            </Text>
            <Text className='mt-1 text-sm text-zinc-400'>
              {fmtPh(totalTh)} PH
            </Text>
          </CardContent>
        </Card>
      </View>

      {/* Right column: Crit/Warn/OK stacked */}
      <View className='w-[42%] gap-1'>
        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader className='pb-2'>
            <CardTitle>Critical</CardTitle>
            <Text className='text-sm text-zinc-400'>
              Dead / not hashing / hard faults
            </Text>
          </CardHeader>
          <CardContent className='pt-0'>
            <Text className='text-3xl font-semibold tracking-tight text-zinc-100'>
              {crit}
            </Text>
            <View className='mt-2'>
              <Pill tone='bad'>CRIT</Pill>
            </View>
          </CardContent>
        </Card>

        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader className='pb-2'>
            <CardTitle>Warnings</CardTitle>
            <Text className='text-sm text-zinc-400'>
              Fixable issues / watchlist
            </Text>
          </CardHeader>
          <CardContent className='pt-0'>
            <Text className='text-3xl font-semibold tracking-tight text-zinc-100'>
              {warn}
            </Text>
            <View className='mt-2'>
              <Pill tone='warn'>WARN</Pill>
            </View>
          </CardContent>
        </Card>

        <Card className='border-zinc-800 bg-zinc-950/20'>
          <CardHeader className='pb-2'>
            <CardTitle>OK</CardTitle>
            <Text className='text-sm text-zinc-400'>
              Looks healthy right now
            </Text>
          </CardHeader>
          <CardContent className='pt-0'>
            <Text className='text-3xl font-semibold tracking-tight text-zinc-100'>
              {ok}
            </Text>
            <View className='mt-2'>
              <Pill tone='good'>OK</Pill>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}

const bestGhs = (m: MinerRecordDto) => m.ghs_5m ?? m.ghs_15m ?? m.ghs_5s ?? null

const ghsToTH = (ghs: number) => ghs / 1000

const classify = (m: MinerRecordDto, th: number | null): Bucket => {
  if (!m.reachable) return 'CRIT'
  if (m.api_4028 && (th == null || th < 0.5)) return 'CRIT'

  const errs = m.errors ?? []
  if (m.reachable && !m.api_4028) return 'WARN'
  if (errs.includes('overheat')) return 'WARN'

  return 'OK'
}

const toneFor = (b: Bucket) =>
  b === 'CRIT' ? 'bad' : b === 'WARN' ? 'warn' : 'good'

const StatCard = ({
  title,
  subtitle,
  value,
  footer
}: {
  title: string
  subtitle?: string
  value: string
  footer?: React.ReactNode
}) => (
  <Card className='w-full flex-1 bg-zinc-950/20'>
    <CardHeader className='pb-2'>
      <CardTitle>{title}</CardTitle>
      {subtitle ? (
        <Text className='text-sm text-zinc-400'>{subtitle}</Text>
      ) : null}
    </CardHeader>
    <CardContent className='pt-0'>
      <Text className='text-4xl font-semibold tracking-tight text-zinc-100'>
        {value}
      </Text>
      {footer ? <View className='mt-2'>{footer}</View> : null}
    </CardContent>
  </Card>
)

export default function HutDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>()
  const hutCode = typeof code === 'string' ? code : (code?.[0] ?? '')

  const [filter, setFilter] = useState<'ALL' | Bucket>('ALL')

  const hutQ = useQuery({
    queryKey: ['hut', hutCode],
    queryFn: () =>
      apiFetch<HutDetailDto>(`/huts/${encodeURIComponent(hutCode)}`),
    enabled: !!hutCode
  })

  const minersQ = useQuery({
    queryKey: ['hut', hutCode, 'miners'],
    queryFn: () =>
      apiFetch<{ miners: MinerRecordDto[] }>(
        `/huts/${encodeURIComponent(hutCode)}/miners`
      ),
    enabled: !!hutCode
  })

  const miners = minersQ.data?.miners ?? []

  const rows = useMemo(() => {
    return miners.map((m) => {
      const ghs = bestGhs(m)
      const th = typeof ghs === 'number' ? ghsToTH(ghs) : null
      const bucket = classify(m, th)
      return { m, ghs, th, bucket }
    })
  }, [miners])

  const kpiRows = useMemo<KpiRow[]>(
    () => rows.map((r) => ({ th: r.th, bucket: r.bucket })),
    [rows]
  )

  const stats = useMemo(() => {
    const totalTH = rows.reduce((acc, r) => acc + (r.th ?? 0), 0)
    const totalPH = totalTH / 1000

    const crit = rows.filter((r) => r.bucket === 'CRIT')
    const warn = rows.filter((r) => r.bucket === 'WARN')
    const ok = rows.filter((r) => r.bucket === 'OK')

    const crit_unreachable = crit.filter((r) => !r.m.reachable).length
    const crit_notHashing = crit.filter(
      (r) => r.m.api_4028 && (r.th == null || r.th < 0.5)
    ).length

    const warn_apiDown = warn.filter(
      (r) => r.m.reachable && !r.m.api_4028
    ).length
    const warn_overheat = warn.filter((r) =>
      (r.m.errors ?? []).includes('overheat')
    ).length

    return {
      totalTH,
      totalPH,
      crit: crit.length,
      warn: warn.length,
      ok: ok.length,
      crit_unreachable,
      crit_notHashing,
      warn_apiDown,
      warn_overheat
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    if (filter === 'ALL') return rows
    return rows.filter((r) => r.bucket === filter)
  }, [rows, filter])

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
            <Text className='text-zinc-100 text-2xl font-semibold tracking-tight'>
              {hutQ.data.code}
            </Text>
            {hutQ.data.name ? (
              <Text className='text-zinc-200 mt-1'>{hutQ.data.name}</Text>
            ) : null}
            <View className='mt-3 flex-row flex-wrap items-center gap-2'>
              <Pill tone='neutral'>LIVE</Pill>
              {hutQ.data.currentSite ? (
                <Pill tone='neutral'>@ {hutQ.data.currentSite.code}</Pill>
              ) : (
                <Pill tone='neutral'>unassigned</Pill>
              )}

              <Button
                title='Refresh'
                variant='secondary'
                size='sm'
                onPress={() => {
                  void minersQ.refetch()
                  void hutQ.refetch()
                }}
                className='ml-auto'
              />
            </View>
          </View>
        ) : null}

        <ScrollView>
          <HutKpiGrid rows={kpiRows} />
        </ScrollView>

        {/* Filters */}
        <View className='mt-3 flex-row flex-wrap gap-2'>
          <Pill
            tone={filter === 'ALL' ? 'neutral' : 'neutral'}
            onPress={() => setFilter('ALL')}
          >
            ALL ({rows.length})
          </Pill>
          <Pill
            tone={filter === 'CRIT' ? 'bad' : 'neutral'}
            onPress={() => setFilter('CRIT')}
          >
            CRIT ({stats.crit})
          </Pill>
          <Pill
            tone={filter === 'WARN' ? 'warn' : 'neutral'}
            onPress={() => setFilter('WARN')}
          >
            WARN ({stats.warn})
          </Pill>
          <Pill
            tone={filter === 'OK' ? 'good' : 'neutral'}
            onPress={() => setFilter('OK')}
          >
            OK ({stats.ok})
          </Pill>
        </View>

        <View className='mt-3 flex-row items-center justify-between'>
          <Text className='text-zinc-200 font-semibold'>Miners</Text>
          <Pill tone='neutral'>{filteredRows.length}</Pill>
        </View>
        {minersQ.isLoading ? <ActivityIndicator /> : null}
        {minersQ.error ? (
          <Text className='text-red-400'>
            {(minersQ.error as Error).message}
          </Text>
        ) : null}

        <ScrollView className='mt-3' contentContainerClassName='pb-6'>
          {filteredRows.map(({ m, ghs, th, bucket }) => {
            const err = m.errors?.[0]
            const tone = toneFor(bucket)
            return (
              <Card key={m.ip} className='mb-3 bg-zinc-950/20'>
                <CardBody className='gap-2'>
                  <View className='flex-row items-center justify-between'>
                    <CardTitle className='flex-1'>{m.ip}</CardTitle>
                    <Pill tone={tone}>{bucket.toLowerCase()}</Pill>
                  </View>

                  <Text className='text-zinc-400'>
                    {m.loc ? `${m.loc} • ` : ''}
                    {ghs != null ? `${Math.round(ghs)} GH/s` : '—'}
                    {th != null ? ` • ${th.toFixed(2)} TH` : ''} •{' '}
                    {m.power_w != null ? `${m.power_w} W` : '—'}
                  </Text>

                  {err ? (
                    <Text
                      className={
                        bucket === 'CRIT' ? 'text-rose-300' : 'text-amber-300'
                      }
                    >
                      {err}
                    </Text>
                  ) : null}
                </CardBody>
              </Card>
            )
          })}
        </ScrollView>
      </Screen>
    </>
  )
}
