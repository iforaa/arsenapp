import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useWorkoutStore } from '../../lib/store';
import { useWorkoutSession } from '../../lib/hooks/useWorkoutSession';
import { useWorkoutHistory } from '../../lib/hooks/useWorkoutHistory';
import { getAllExercises, getRecentExercises, addSet, getLastSetForExercise } from '../../db/queries';
import { Card, Badge, Button, NumberInput, WorkoutCard } from '../../components';
import { colors, spacing, typography, borderRadius } from '../../lib/theme';
import type { Exercise, Set } from '../../types';

// Map exercise names to translation keys
const exerciseTranslationKeys: Record<string, string> = {
  'Bench Press': 'exercise.benchPress',
  'Squat': 'exercise.squat',
  'Deadlift': 'exercise.deadlift',
  'Overhead Press': 'exercise.overheadPress',
  'Barbell Row': 'exercise.barbellRow',
  'Dumbbell Curl': 'exercise.dumbbellCurl',
  'Tricep Pushdown': 'exercise.tricepPushdown',
  'Lat Pulldown': 'exercise.latPulldown',
  'Leg Press': 'exercise.legPress',
  'Pull Up': 'exercise.pullUp',
  'Push Up': 'exercise.pushUp',
  'Dips': 'exercise.dips',
  'Plank': 'exercise.plank',
  'Wall Sit': 'exercise.wallSit',
  'Dead Hang': 'exercise.deadHang',
  'Stationary Bike': 'exercise.stationaryBike',
  'Treadmill': 'exercise.treadmill',
  'Rowing Machine': 'exercise.rowingMachine',
  'Elliptical': 'exercise.elliptical',
  'Running': 'exercise.running',
  'Cycling': 'exercise.cycling',
  'Swimming': 'exercise.swimming',
};

const muscleTranslationKeys: Record<string, string> = {
  'chest': 'muscle.chest',
  'back': 'muscle.back',
  'legs': 'muscle.legs',
  'shoulders': 'muscle.shoulders',
  'biceps': 'muscle.biceps',
  'triceps': 'muscle.triceps',
  'core': 'muscle.core',
  'glutes': 'muscle.glutes',
  'cardio': 'muscle.cardio',
};

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentWorkout, currentWorkoutSets, addSetToWorkout } = useWorkoutStore();

  // Hooks
  const { workouts, loading: loadingHistory, refresh, formatDate, formatTime } = useWorkoutHistory();
  const {
    workoutStarted,
    activeSeries,
    seriesCount,
    startWorkout,
    finishWorkout,
    goBackToHistory,
    nextSeries,
  } = useWorkoutSession(refresh);

  // Exercise state
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<number[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Input state
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');
  const [cardioTrackingMode, setCardioTrackingMode] = useState<'distance' | 'calories' | 'time'>('distance');

  // Helper functions for translations
  const getExerciseName = (exercise: Exercise) => {
    const key = exerciseTranslationKeys[exercise.name];
    return key ? t(key) : exercise.name;
  };

  const getMuscleGroupName = (muscle: string) => {
    const key = muscleTranslationKeys[muscle];
    return key ? t(key) : muscle;
  };

  // Load exercises on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Load history when screen focuses and not in workout
  useFocusEffect(
    useCallback(() => {
      if (!workoutStarted) {
        refresh();
      }
    }, [workoutStarted, refresh])
  );

  async function loadExercises() {
    const exercises = await getAllExercises();
    setAllExercises(exercises);
    const recent = await getRecentExercises(100);
    setRecentExerciseIds(recent.map((e) => e.id));
  }

  // Sort exercises: recent first, then alphabetically
  const sortedExercises = [...allExercises].sort((a, b) => {
    const aRecent = recentExerciseIds.indexOf(a.id);
    const bRecent = recentExerciseIds.indexOf(b.id);
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
    if (aRecent !== -1) return -1;
    if (bRecent !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  async function handleActivityTap(exercise: Exercise) {
    setSelectedExercise(exercise);

    const isCardio = ['cardio', 'legs'].some((mg) => exercise.muscle_groups.includes(mg as any));
    if (isCardio) setCardioTrackingMode('distance');

    const lastSet = await getLastSetForExercise(exercise.id);
    if (lastSet) {
      setValue1(lastSet.weight.toString());
      setValue2(exercise.tracking_type === 'weight_reps' ? lastSet.reps.toString() : '');
    } else {
      setValue1('');
      setValue2(exercise.tracking_type === 'weight_reps' ? '3' : '');
    }
  }

  async function handleAddExercise() {
    if (!currentWorkout || !selectedExercise || !value1) return;

    const needsValue2 = selectedExercise.tracking_type === 'weight_reps';
    if (needsValue2 && !value2) return;

    // Determine tracking mode: use cardio selector for cardio exercises, otherwise use exercise's tracking_type
    const isCardio = checkIsCardio(selectedExercise);
    const trackingMode = isCardio ? cardioTrackingMode : selectedExercise.tracking_type;

    try {
      const weight = parseFloat(value1);
      const reps = needsValue2 ? parseInt(value2) : 0;
      const setId = await addSet(currentWorkout.id, selectedExercise.id, weight, reps, activeSeries, trackingMode);

      addSetToWorkout({
        id: setId,
        workout_id: currentWorkout.id,
        exercise_id: selectedExercise.id,
        weight,
        reps,
        order_in_workout: currentWorkoutSets.length + 1,
        series_id: activeSeries,
        tracking_mode: trackingMode,
        timestamp: new Date().toISOString(),
        exercise: selectedExercise,
      });

      // Clear selection for next exercise
      setSelectedExercise(null);
      setValue1('');
      setValue2('');
    } catch (error) {
      console.error('Failed to add exercise:', error);
    }
  }

  function handleFinish() {
    finishWorkout();
    setSelectedExercise(null);
  }

  function handleBack() {
    goBackToHistory();
    setSelectedExercise(null);
  }

  function handleNextSeries() {
    nextSeries();
    setSelectedExercise(null);
    setValue1('');
    setValue2('');
  }

  // Get sets in current series
  const currentSeriesSets = currentWorkoutSets.filter((s) => s.series_id === activeSeries);

  const config = selectedExercise ? getInputConfig(selectedExercise, cardioTrackingMode, t) : null;
  const isCardio = checkIsCardio(selectedExercise);
  const canAdd = selectedExercise && value1 && (selectedExercise.tracking_type !== 'weight_reps' || value2);

  const midpoint = Math.ceil(sortedExercises.length / 2);
  const row1Exercises = sortedExercises.slice(0, midpoint);
  const row2Exercises = sortedExercises.slice(midpoint);

  // === RENDER ===

  if (!workoutStarted) {
    return (
      <View style={styles.container}>
        {loadingHistory ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>{t('noWorkoutsYet')}</Text>
            <Text style={styles.emptySubtext}>{t('completeFirstWorkout')}</Text>
          </View>
        ) : (
          <FlatList
            data={workouts}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <WorkoutCard
                workout={item}
                onPress={() => router.push(`/workout/${item.id}`)}
                formatDate={formatDate}
                formatTime={formatTime}
              />
            )}
          />
        )}
        <TouchableOpacity style={styles.fab} onPress={startWorkout}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Badge variant="series" label={`${t('series')} ${seriesCount || 1}`} />
      </View>

      {/* Exercise cards */}
      <View style={styles.activitiesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {row1Exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              name={getExerciseName(ex)}
              muscle={getMuscleGroupName(ex.muscle_groups[0])}
              isRecent={recentExerciseIds.includes(ex.id)}
              isSelected={selectedExercise?.id === ex.id}
              onPress={() => handleActivityTap(ex)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {row2Exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              name={getExerciseName(ex)}
              muscle={getMuscleGroupName(ex.muscle_groups[0])}
              isRecent={recentExerciseIds.includes(ex.id)}
              isSelected={selectedExercise?.id === ex.id}
              onPress={() => handleActivityTap(ex)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Exercise form */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {selectedExercise && config && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>{getExerciseName(selectedExercise)}</Text>
            <Text style={styles.selectedSubtitle}>
              {selectedExercise.muscle_groups.map(getMuscleGroupName).join(', ')}
            </Text>

            {isCardio && (
              <View style={styles.modeSelector}>
                {(['distance', 'calories', 'time'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeButton, cardioTrackingMode === mode && styles.modeButtonActive]}
                    onPress={() => setCardioTrackingMode(mode)}
                  >
                    <Text style={[styles.modeButtonText, cardioTrackingMode === mode && styles.modeButtonTextActive]}>
                      {t(mode === 'time' ? 'duration' : mode)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Card style={styles.inputCard}>
              <NumberInput
                label={config.label1}
                value={value1}
                onChangeValue={setValue1}
                unit={config.unit1}
                step={config.step1}
              />
              {config.label2 && (
                <NumberInput
                  label={config.label2}
                  value={value2}
                  onChangeValue={setValue2}
                  unit={config.unit2 || undefined}
                  step={config.step2!}
                />
              )}
            </Card>

            <Button
              title={t('add')}
              onPress={handleAddExercise}
              variant="success"
              size="lg"
              disabled={!canAdd}
              style={styles.addButton}
            />
          </View>
        )}

        {/* Current series exercises */}
        {currentSeriesSets.length > 0 && (
          <View style={styles.currentSeriesSection}>
            <Text style={styles.sectionTitle}>{t('currentSeries')}</Text>
            {currentSeriesSets.map((set, index) => (
              <Card key={set.id} style={styles.setCard}>
                <View style={styles.setInfo}>
                  <Text style={styles.setNumber}>#{index + 1}</Text>
                  <Text style={styles.setExerciseName}>
                    {set.exercise ? getExerciseName(set.exercise) : ''}
                  </Text>
                </View>
                <Text style={styles.setDetails}>
                  {set.exercise ? formatSetDisplay(set.weight, set.reps, set.tracking_mode || set.exercise.tracking_type) : ''}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button title={t('nextSeries')} onPress={handleNextSeries} variant="primary" size="lg" style={styles.nextButton} />
        <Button title={t('finish')} onPress={handleFinish} variant="secondary" size="lg" style={styles.finishButton} />
      </View>
    </View>
  );
}

// === HELPER COMPONENTS ===

function ExerciseCard({
  exercise,
  name,
  muscle,
  isRecent,
  isSelected,
  onPress,
}: {
  exercise: Exercise;
  name: string;
  muscle: string;
  isRecent: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.activityCard, isRecent && styles.activityCardRecent, isSelected && styles.activityCardSelected]}
      onPress={onPress}
    >
      <Text style={[styles.activityName, isSelected && styles.activityNameSelected]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.activityMuscle, isSelected && styles.activityMuscleSelected]} numberOfLines={1}>
        {muscle}
      </Text>
    </TouchableOpacity>
  );
}

// === HELPER FUNCTIONS ===

function checkIsCardio(exercise: Exercise | null): boolean {
  if (!exercise) return false;
  return (
    exercise.muscle_groups.includes('cardio' as any) ||
    (exercise.muscle_groups.includes('legs' as any) &&
      ['Stationary Bike', 'Treadmill', 'Elliptical', 'Running', 'Cycling', 'Rowing Machine'].includes(exercise.name))
  );
}

function getInputConfig(exercise: Exercise, cardioMode: string, t: (key: string) => string) {
  const isCardio = checkIsCardio(exercise);

  if (isCardio) {
    const configs: Record<string, any> = {
      distance: { label1: t('distance'), unit1: 'km', step1: 0.5, label2: null },
      calories: { label1: t('calories'), unit1: 'kcal', step1: 10, label2: null },
      time: { label1: t('duration'), unit1: t('min'), step1: 1, label2: null },
    };
    return configs[cardioMode];
  }

  const configs: Record<string, any> = {
    weight_reps: { label1: t('weight'), unit1: 'kg', step1: 2.5, label2: t('reps'), unit2: '', step2: 1 },
    time: { label1: t('duration'), unit1: 'seconds', step1: 5, label2: null },
    reps_only: { label1: t('reps'), unit1: '', step1: 1, label2: null },
  };
  return configs[exercise.tracking_type] || { label1: t('value'), unit1: '', step1: 1, label2: t('reps'), step2: 1 };
}

function formatSetDisplay(weight: number, reps: number, trackingType: string): string {
  switch (trackingType) {
    case 'weight_reps':
      return `${weight}kg × ${reps}`;
    case 'time':
      return `${Math.floor(weight / 60)}:${(weight % 60).toString().padStart(2, '0')}`;
    case 'calories':
      return `${weight} kcal`;
    case 'distance':
      return `${weight} km`;
    case 'reps_only':
      return `${weight}`;
    default:
      return `${weight} × ${reps}`;
  }
}

// === STYLES ===

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.sizes.lg,
    color: colors.gray[600],
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: typography.weights.semibold,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.lg,
  },
  backButtonText: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  activitiesSection: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[300],
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  activityCard: {
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: 110,
    height: 70,
    justifyContent: 'space-between',
  },
  activityCardRecent: {
    backgroundColor: '#E3F2FD',
  },
  activityCardSelected: {
    backgroundColor: colors.primary,
  },
  activityName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
  },
  activityNameSelected: {
    color: colors.white,
  },
  activityMuscle: {
    fontSize: typography.sizes.xs,
    color: colors.gray[600],
  },
  activityMuscleSelected: {
    color: '#E3F2FD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  selectedSection: {
    marginBottom: spacing.xl,
  },
  selectedTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  selectedSubtitle: {
    fontSize: typography.sizes.lg,
    color: colors.gray[600],
    marginBottom: spacing.lg,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.gray[600],
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  inputCard: {
    backgroundColor: colors.gray[100],
    marginBottom: spacing.lg,
  },
  addButton: {
    marginBottom: spacing.lg,
  },
  currentSeriesSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  setCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  setInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  setNumber: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginRight: spacing.sm,
    width: 30,
  },
  setExerciseName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.gray[900],
    flex: 1,
  },
  setDetails: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[700],
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[300],
  },
  nextButton: {
    flex: 2,
  },
  finishButton: {
    flex: 1,
  },
});
