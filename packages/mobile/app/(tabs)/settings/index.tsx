import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Screen } from '../../../src/components/Screen'
import { getApiUrl, getReadKey, setApiUrl, setReadKey } from '../../../src/lib/storage'
import { Button } from '../../../src/ui/Button'
import { Input } from '../../../src/ui/Input'
import { H1, Label, Text } from '../../../src/ui/Text'

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
      <H1>Settings</H1>

      <View className='mt-5 gap-4'>
        <View>
          <Label className='mb-2'>API URL</Label>
          <Input
            value={apiUrl}
            onChangeText={setApiUrlState}
            autoCapitalize='none'
            placeholder='http://192.168.1.50:3000'
          />
          <Text className='text-zinc-500 mt-2 text-xs'>
            Use LAN IP for a real phone. localhost only works on emulator/simulator.
          </Text>
        </View>

        <View>
          <Label className='mb-2'>OPS_READ_KEY</Label>
          <Input
            value={readKey}
            onChangeText={setReadKeyState}
            autoCapitalize='none'
            secureTextEntry
            placeholder='••••••••'
          />
        </View>

        {saved ? <Text className='text-emerald-400'>{saved}</Text> : null}

        <Button title='Save' onPress={save} />
      </View>
    </Screen>
  )
}
