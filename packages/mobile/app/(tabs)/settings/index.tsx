import { useEffect, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { getApiUrl, getReadKey, setApiUrl, setReadKey } from '../../../src/lib/storage'

export default function SettingsScreen() {
  const [apiUrl, setApiUrlState] = useState('')
  const [readKey, setReadKeyState] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setApiUrlState(await getApiUrl())
      setReadKeyState(await getReadKey())
    })()
  }, [])

  const save = async () => {
    await setApiUrl(apiUrl)
    await setReadKey(readKey)
    setSaved('Saved.')
    setTimeout(() => setSaved(null), 1500)
  }

  return (
    <Screen>
      <Text className="text-slate-50 text-xl font-bold">Settings</Text>

      <View className="mt-4 gap-3">
        <View>
          <Text className="text-slate-400 mb-1">API URL</Text>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrlState}
            autoCapitalize="none"
            placeholder="http://192.168.1.50:3000"
            placeholderTextColor="#334155"
            className="border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
          />
          <Text className="text-slate-500 mt-1 text-xs">
            Use LAN IP for a real phone. localhost only works on emulator/simulator.
          </Text>
        </View>

        <View>
          <Text className="text-slate-400 mb-1">OPS_READ_KEY</Text>
          <TextInput
            value={readKey}
            onChangeText={setReadKeyState}
            autoCapitalize="none"
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#334155"
            className="border border-slate-800 rounded-lg px-3 py-2 text-slate-100"
          />
        </View>

        {saved ? <Text className="text-emerald-400">{saved}</Text> : null}

        <Pressable onPress={save} className="bg-sky-600 rounded-lg px-3 py-3">
          <Text className="text-white font-semibold">Save</Text>
        </Pressable>
      </View>
    </Screen>
  )
}
