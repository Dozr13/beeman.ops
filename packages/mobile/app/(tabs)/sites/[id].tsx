import { googleMapsDirectionsUrl } from '@ops/shared'
import { useQuery } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { Stack, useLocalSearchParams } from 'expo-router'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { apiFetch } from '../../../src/lib/api'

type SiteDetail = {
  id: string
  code: string
  name?: string | null
  type: string
  timezone: string
  lat?: number | null
  lng?: number | null
  hutAssignments?: Array<{
    hutId: string
    endsAt: string | null
    hut: { id: string; code: string; name?: string | null }
  }> | null
}

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const q = useQuery({
    queryKey: ['site', id],
    queryFn: () => apiFetch<SiteDetail>(`/sites/${id}`)
  })

  const s = q.data

  return (
    <>
      <Stack.Screen options={{ title: 'Site' }} />

      <Screen>
        {q.isLoading ? <ActivityIndicator /> : null}
        {q.error ? (
          <Text className='text-red-400'>{(q.error as Error).message}</Text>
        ) : null}

        {s ? (
          <ScrollView>
            <Text className='text-slate-50 text-2xl font-bold'>{s.code}</Text>
            {s.name ? (
              <Text className='text-slate-200 mt-1'>{s.name}</Text>
            ) : null}
            <Text className='text-slate-400 mt-2'>
              {s.type} • {s.timezone}
            </Text>

            <View className='mt-4 border border-slate-800 rounded-xl p-3'>
              <Text className='text-slate-200 font-semibold'>Location</Text>
              <Text className='text-slate-400 mt-1'>
                {s.lat != null && s.lng != null
                  ? `${s.lat}, ${s.lng}`
                  : 'No lat/lng set'}
              </Text>

              {s.lat != null && s.lng != null ? (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      googleMapsDirectionsUrl({ lat: s.lat!, lng: s.lng! })
                    )
                  }
                  className='mt-3 bg-sky-600 rounded-lg px-3 py-2'
                >
                  <Text className='text-white font-semibold'>Open in Maps</Text>
                </Pressable>
              ) : null}
            </View>

            <View className='mt-4 border border-slate-800 rounded-xl p-3'>
              <Text className='text-slate-200 font-semibold'>
                Assigned huts
              </Text>
              {(s.hutAssignments ?? []).length ? (
                <View className='mt-2'>
                  {(s.hutAssignments ?? []).map((a) => (
                    <View
                      key={a.hutId}
                      className='py-2 border-b border-slate-800'
                    >
                      <Text className='text-slate-50 font-semibold'>
                        {a.hut.code}
                      </Text>
                      {a.hut.name ? (
                        <Text className='text-slate-400 mt-1'>
                          {a.hut.name}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className='text-slate-400 mt-1'>None</Text>
              )}
            </View>
          </ScrollView>
        ) : null}
      </Screen>
    </>
  )
}
