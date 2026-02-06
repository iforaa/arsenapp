import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from '../db/database';
import { seedDefaultExercises } from '../db/schema';
import '../lib/i18n';
import { loadSavedLanguage } from '../lib/i18n';

export default function RootLayout() {
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        await seedDefaultExercises();
        await loadSavedLanguage();
      } catch (error) {
        console.error('Setup failed:', error);
      }
    }

    setup();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/[id]"
          options={{ headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
