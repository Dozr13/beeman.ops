import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import '../global.css'

const qc = new QueryClient()

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <StatusBar style='light' />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#09090b' },
          headerTintColor: '#f4f4f5',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#09090b' }
        }}
      >
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  )
}
