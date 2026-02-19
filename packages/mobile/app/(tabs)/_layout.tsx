import { Tabs } from 'expo-router'
import { Bell, Building2, Settings, Warehouse } from 'lucide-react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#09090b' },
        headerTintColor: '#f4f4f5',
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: '#09090b', borderTopColor: '#27272a' },
        tabBarActiveTintColor: '#f4f4f5',
        tabBarInactiveTintColor: '#a1a1aa'
      }}
    >
      {/* Hide non-tab routes that live under (tabs) */}
      <Tabs.Screen
        name='sites/new'
        options={{ href: null, title: 'New Site', headerShown: false }}
      />
      <Tabs.Screen
        name='sites/[id]'
        options={{ href: null, title: 'Site', headerShown: false }}
      />
      <Tabs.Screen
        name='huts/[code]'
        options={{ href: null, title: 'Hut', headerShown: false }}
      />

      <Tabs.Screen
        name='sites/index'
        options={{
          title: 'Sites',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Building2 color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name='huts/index'
        options={{
          title: 'Huts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Warehouse color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name='alerts/index'
        options={{
          title: 'Alerts',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name='settings/index'
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          )
        }}
      />
    </Tabs>
  )
}
