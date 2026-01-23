import { Stack } from 'expo-router';
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

  return <Stack />;
}
