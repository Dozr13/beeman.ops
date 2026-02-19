try {
  require('dotenv/config')
} catch {
  // dotenv optional; env may be set by shell or Expo
}
import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'Beeman Ops',
  slug: 'beeman-ops',
  scheme: 'beemanops',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  plugins: ['expo-router', 'expo-secure-store'],
  ios: { supportsTablet: true },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#0b1220'
    }
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? ''
  }
}

export default config
