import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getWorkout, getWorkoutSets, deleteWorkout } from '../../db/queries';
import { Card, Badge, Button } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../lib/theme';
import type { Workout, Set, Exercise } from '../../types';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [sets, setSets] = useState<(Set & { exercise: Exercise })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkoutDetails();
  }, [id]);

  async function loadWorkoutDetails() {
    try {
      const workoutData = await getWorkout(parseInt(id as string));
      const setsData = await getWorkoutSets(parseInt(id as string));
      setWorkout(workoutData);
      setSets(setsData);
    } catch (error) {
      console.error('Failed to load workout:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function getSetDisplay(set: Set & { exercise: Exercise }) {
    const trackingType = set.exercise.tracking_type;
    switch (trackingType) {
      case 'weight_reps':
        return `${set.weight}kg × ${set.reps} reps`;
      case 'time':
        return `${Math.floor(set.weight / 60)}:${(set.weight % 60).toString().padStart(2, '0')} ${t('min')}`;
      case 'calories':
        return `${set.weight} kcal`;
      case 'distance':
        return `${set.weight} km`;
      case 'reps_only':
        return `${set.weight} reps`;
      default:
        return `${set.weight} × ${set.reps}`;
    }
  }

  async function handleDelete() {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(t('deleteWorkoutConfirm'))
      : await new Promise<boolean>((resolve) => {
          Alert.alert(t('deleteWorkout'), t('deleteWorkoutConfirm'), [
            { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
            { text: t('delete'), style: 'destructive', onPress: () => resolve(true) },
          ]);
        });

    if (confirmed) {
      try {
        await deleteWorkout(parseInt(id as string));
        router.back();
      } catch (error) {
        console.error('Failed to delete workout:', error);
      }
    }
  }

  // Group sets by series
  const groupedSets = groupSetsBySeries(sets);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t('workoutNotFound')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('workoutDetails'),
          headerBackTitle: t('back'),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDate(workout.date)}</Text>
          <Text style={styles.timeText}>{formatTime(workout.date)}</Text>
          {workout.duration_minutes && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {workout.duration_minutes} {t('min')}
              </Text>
            </View>
          )}
        </View>

        {groupedSets.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.groupSection}>
            {group.seriesId && (
              <Badge variant="series" label={`${t('series')} ${groupIndex + 1}`} />
            )}
            <View style={styles.setsContainer}>
              {group.sets.map((set) => (
                <Card key={set.id} style={styles.setCard}>
                  <View style={styles.setHeader}>
                    <Text style={styles.setNumber}>#{set.order_in_workout + 1}</Text>
                    <Text style={styles.exerciseName}>{set.exercise.name}</Text>
                  </View>
                  <Text style={styles.setDetails}>{getSetDisplay(set)}</Text>
                  <Text style={styles.muscleGroups}>{set.exercise.muscle_groups.join(', ')}</Text>
                </Card>
              ))}
            </View>
          </View>
        ))}

        {sets.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('noSetsRecorded')}</Text>
          </View>
        )}

        <Button
          title={t('deleteWorkout')}
          onPress={handleDelete}
          variant="danger"
          size="lg"
          style={styles.deleteButton}
        />
      </ScrollView>
    </>
  );
}

function groupSetsBySeries(sets: (Set & { exercise: Exercise })[]) {
  const seriesMap = new Map<string | null, (Set & { exercise: Exercise })[]>();

  sets.forEach((set) => {
    const key = set.series_id || null;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, []);
    }
    seriesMap.get(key)!.push(set);
  });

  const result: { seriesId: string | null; sets: (Set & { exercise: Exercise })[] }[] = [];
  seriesMap.forEach((sets, seriesId) => {
    result.push({ seriesId, sets });
  });

  return result;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: spacing.xxl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
  },
  dateText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: typography.sizes.lg,
    color: colors.gray[600],
    marginBottom: spacing.sm,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  durationText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  groupSection: {
    marginBottom: spacing.xxl,
  },
  setsContainer: {
    marginTop: spacing.md,
  },
  setCard: {
    marginBottom: spacing.sm,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  setNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  exerciseName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
  },
  setDetails: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  muscleGroups: {
    fontSize: typography.sizes.sm,
    color: colors.gray[600],
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.gray[600],
  },
  errorText: {
    fontSize: typography.sizes.lg,
    color: colors.gray[600],
  },
  deleteButton: {
    marginTop: spacing.xxl,
    marginBottom: 40,
  },
});
