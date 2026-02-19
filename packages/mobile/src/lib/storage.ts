import * as SecureStore from 'expo-secure-store'

const k = {
  apiUrl: 'ops.apiUrl',
  readKey: 'ops.readKey'
} as const

export const getApiUrl = async () => (await SecureStore.getItemAsync(k.apiUrl)) ?? ''
export const setApiUrl = async (v: string) => SecureStore.setItemAsync(k.apiUrl, v.trim())

export const getReadKey = async () => (await SecureStore.getItemAsync(k.readKey)) ?? ''
export const setReadKey = async (v: string) => SecureStore.setItemAsync(k.readKey, v.trim())
