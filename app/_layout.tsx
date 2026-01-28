import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase, seedDefaultExercises } from '../lib/api';
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
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Workout Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
