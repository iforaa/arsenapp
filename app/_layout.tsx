import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDatabase } from '../db/database';
import { seedDefaultExercises } from '../db/schema';

export default function RootLayout() {
  useEffect(() => {
    async function setupDatabase() {
      await initDatabase();
      await seedDefaultExercises();
    }

    setupDatabase();
  }, []);

  return <Stack />;
}
