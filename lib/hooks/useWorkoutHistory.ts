import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getRecentWorkouts } from '../../db/queries';
import type { Workout } from '../../types';

interface UseWorkoutHistoryReturn {
  workouts: Workout[];
  loading: boolean;
  refresh: () => Promise<void>;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
}

export function useWorkoutHistory(limit: number = 20): UseWorkoutHistoryReturn {
  const { t } = useTranslation();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getRecentWorkouts(limit);
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const formatDate = useCallback(
    (dateString: string): string => {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return t('today');
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return t('yesterday');
      }

      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    },
    [t]
  );

  const formatTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  return {
    workouts,
    loading,
    refresh,
    formatDate,
    formatTime,
  };
}
