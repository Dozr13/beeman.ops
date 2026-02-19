import { Stack, router } from 'expo-router'
import { useCallback, useState } from 'react'
import { KeyboardAvoidingView, Platform, View } from 'react-native'

import { apiFetch } from '../../../src/lib/api'
import { Button } from '../../../src/ui/Button'
import { Input } from '../../../src/ui/Input'
import { Screen } from '../../../src/ui/Screen'
import { H1, Label, Text } from '../../../src/ui/Text'

export default function NewSite() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const create = useCallback(async () => {
    const codeTrim = code.trim()
    const nameTrim = name.trim()

    if (!codeTrim) {
      setErr('Code is required')
      return
    }

    setErr(null)
    setSaving(true)
    try {
      const s = await apiFetch<{ id: string }>(`/sites`, {
        method: 'POST',
        requireReadKey: true,
        body: { code: codeTrim, name: nameTrim || null }
      })
      router.replace(`/sites/${s.id}`)
    } catch (e: any) {
      setErr(e?.message ?? 'Failed')
    } finally {
      setSaving(false)
    }
  }, [code, name])

  return (
    <>
      <Stack.Screen options={{ title: 'New Site' }} />
      <Screen className='flex-1 bg-slate-950'>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className='flex-1 px-4 pt-4'
        >
          <H1 className='mb-6 text-slate-50'>New Site</H1>

          <View className='gap-4'>
            <View className='gap-2'>
              <Label className='text-slate-300'>Code</Label>
              <Input
                value={code}
                onChangeText={setCode}
                placeholder='WC55'
                autoCapitalize='characters'
              />
            </View>

            <View className='gap-2'>
              <Label className='text-slate-300'>Name</Label>
              <Input
                value={name}
                onChangeText={setName}
                placeholder='Well pad #5'
              />
            </View>

            {err ? <Text className='text-red-400'>{err}</Text> : null}

            <View className='pt-2'>
              <Button
                title={saving ? 'Creating…' : 'Create'}
                disabled={saving}
                onPress={create}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </>
  )
}
