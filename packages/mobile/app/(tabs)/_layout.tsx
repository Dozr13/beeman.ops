import { Tabs } from 'expo-router'
import { Bell, Building2, Settings, Warehouse } from 'lucide-react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0b1220' },
        headerTintColor: '#e5e7eb',
        tabBarStyle: { backgroundColor: '#0b1220', borderTopColor: '#1f2a3a' },
        tabBarActiveTintColor: '#e5e7eb',
        tabBarInactiveTintColor: '#9ca3af'
      }}
    >
      <Tabs.Screen
        name='sites/index'
        options={{
          title: 'Sites',
          tabBarIcon: ({ color, size }) => (
            <Building2 color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name='huts/index'
        options={{
          title: 'Huts',
          tabBarIcon: ({ color, size }) => (
            <Warehouse color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name='alerts/index'
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name='settings/index'
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          )
        }}
      />
    </Tabs>
  )
}
