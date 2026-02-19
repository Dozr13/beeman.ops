import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import '../global.css'

const qc = new QueryClient()

export default function RootLayout() {
  return (
    <QueryClientProvider client={qc}>
      <StatusBar style='light' />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#020617' },
          headerTintColor: '#e2e8f0'
        }}
      />
    </QueryClientProvider>
  )
}
