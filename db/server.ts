import { neon } from '@neondatabase/serverless';

// Server-side only database connection
// Uses process.env which is only available on the server
export function getServerDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
}
