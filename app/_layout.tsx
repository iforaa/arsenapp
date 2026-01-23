import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase } from '../db/database';
import { seedDefaultExercises } from '../db/schema';

export default function RootLayout() {
  useEffect(() => {
    async function setupDatabase() {
      try {
        await initDatabase();
        await seedDefaultExercises();
      } catch (error) {
        console.error('Database setup failed:', error);
      }
    }

    setupDatabase();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="activity/[id]"
          options={{
            headerShown: true,
            headerBackTitle: 'Back',
            headerTitle: '',
          }}
        />
      </Stack>
    </>
  );
}
