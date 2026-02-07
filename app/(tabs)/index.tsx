import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput, SectionList, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore } from '../../lib/store';
import { useWorkoutSession } from '../../lib/hooks/useWorkoutSession';
import { useWorkoutHistory } from '../../lib/hooks/useWorkoutHistory';
import { getAllExercises, getRecentExercises, addSet, getLastSetForExercise } from '../../db/queries';
import { Badge, Button, NumberInput, WorkoutCard } from '../../components';
import { SimpleBottomSheet } from '../../components/SimpleBottomSheet';
import { colors, spacing, typography, borderRadius } from '../../lib/theme';
import type { Exercise, MuscleGroup } from '../../types';

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
  'hamstrings': 'muscle.hamstrings',
  'abs': 'muscle.abs',
  'quads': 'muscle.quads',
  'calves': 'muscle.calves',
  'forearms': 'muscle.forearms',
  'lats': 'muscle.lats',
  'traps': 'muscle.traps',
};

export default function HistoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentWorkout, currentWorkoutSets, addSetToWorkout } = useWorkoutStore();

  // Hooks
  const insets = useSafeAreaInsets();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFabTooltip, setShowFabTooltip] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Shake animation for series badge
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

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

  // Group exercises by muscle for SectionList
  interface ExerciseSection {
    title: string;
    data: Exercise[];
    isRecent?: boolean;
  }

  const exerciseSections = useMemo((): ExerciseSection[] => {
    // Filter by search query if present
    let filtered = allExercises;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = allExercises.filter(
        (ex) =>
          getExerciseName(ex).toLowerCase().includes(query) ||
          ex.muscle_groups.some((mg) => getMuscleGroupName(mg).toLowerCase().includes(query))
      );
    }

    const sections: ExerciseSection[] = [];

    // Add "Recently Used" section (only when not searching)
    if (!searchQuery.trim()) {
      const recentExercises = filtered
        .filter((ex) => recentExerciseIds.includes(ex.id))
        .sort((a, b) => recentExerciseIds.indexOf(a.id) - recentExerciseIds.indexOf(b.id))
        .slice(0, 4);

      if (recentExercises.length > 0) {
        sections.push({
          title: t('recentlyUsed'),
          data: recentExercises,
          isRecent: true,
        });
      }
    }

    // Group by primary muscle group
    const muscleOrder: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'cardio'];
    const groups = new Map<string, Exercise[]>();
    for (const muscle of muscleOrder) {
      groups.set(muscle, []);
    }

    for (const ex of filtered) {
      const primaryMuscle = ex.muscle_groups[0];
      if (groups.has(primaryMuscle)) {
        groups.get(primaryMuscle)!.push(ex);
      }
    }

    // Add muscle group sections
    for (const muscle of muscleOrder) {
      const exercises = groups.get(muscle)!;
      if (exercises.length > 0) {
        sections.push({
          title: getMuscleGroupName(muscle),
          data: exercises.sort((a, b) => getExerciseName(a).localeCompare(getExerciseName(b))),
        });
      }
    }

    return sections;
  }, [allExercises, recentExerciseIds, searchQuery, t]);

  async function handleActivityTap(exercise: Exercise) {
    setSelectedExercise(exercise);

    const lastSet = await getLastSetForExercise(exercise.id);

    // For cardio exercises, use last tracking mode or default to 'distance'
    if (checkIsCardio(exercise)) {
      const lastTrackingMode = lastSet?.tracking_mode as 'distance' | 'calories' | 'time' | undefined;
      setCardioTrackingMode(lastTrackingMode || 'distance');
    }

    if (lastSet) {
      setValue1(lastSet.weight.toString());
      setValue2(lastSet.reps > 0 ? lastSet.reps.toString() : '3');
    } else {
      setValue1('');
      setValue2('3');
    }

    // Open bottom sheet
    setShowBottomSheet(true);
  }

  async function handleAddExercise() {
    if (!currentWorkout || !selectedExercise || !value1) return;

    const isRepsOnly = selectedExercise.tracking_type === 'reps_only';
    // For reps_only, value2 is not used; for all others, value2 is required
    if (!isRepsOnly && !value2) return;

    // Determine tracking mode: use cardio selector for cardio exercises, otherwise use exercise's tracking_type
    const isCardio = checkIsCardio(selectedExercise);
    const trackingMode = isCardio ? cardioTrackingMode : selectedExercise.tracking_type;

    try {
      const weight = parseFloat(value1);
      const reps = isRepsOnly ? parseInt(value1) : parseInt(value2);
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

      // Refresh recent exercises list
      const recent = await getRecentExercises(100);
      setRecentExerciseIds(recent.map((e) => e.id));

      // Clear selection and close bottom sheet
      setSelectedExercise(null);
      setValue1('');
      setValue2('');
      setShowBottomSheet(false);
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
    triggerShake();
    setSelectedExercise(null);
    setValue1('');
    setValue2('');
  }

  // Get sets in current series
  const currentSeriesSets = currentWorkoutSets.filter((s) => s.series_id === activeSeries);

  const config = selectedExercise ? getInputConfig(selectedExercise, cardioTrackingMode, t) : null;
  const isCardio = checkIsCardio(selectedExercise);
  const isRepsOnly = selectedExercise?.tracking_type === 'reps_only';
  const canAdd = selectedExercise && value1 && (isRepsOnly || value2);

  // === RENDER ===

  if (!workoutStarted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <View
          style={styles.fabContainer}
          // @ts-ignore - web only props
          onMouseEnter={() => setShowFabTooltip(true)}
          onMouseLeave={() => setShowFabTooltip(false)}
        >
          {showFabTooltip && (
            <View style={styles.fabTooltip}>
              <Text style={styles.fabTooltipText}>{t('startWorkout')}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.fab}
            onPress={startWorkout}
            accessibilityLabel={t('startWorkout')}
            accessibilityRole="button"
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← {t('back')}</Text>
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <Badge variant="series" label={`${t('series')} ${seriesCount || 1}`} />
        </Animated.View>
      </View>

      {/* Exercise picker - stretches to footer */}
      <View style={styles.exercisePickerContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('searchExercises')}
            placeholderTextColor={colors.gray[500]}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
        {exerciseSections.length === 0 ? (
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchText}>{t('noExercisesFound')}</Text>
          </View>
        ) : (
          <SectionList
            sections={exerciseSections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item, section }) => (
              <ExerciseRow
                exercise={item}
                name={getExerciseName(item)}
                muscle={item.muscle_groups.map(getMuscleGroupName).join(', ')}
                isRecent={section.isRecent ?? false}
                isSelected={selectedExercise?.id === item.id}
                onPress={() => handleActivityTap(item)}
              />
            )}
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHeader, section.isRecent && styles.sectionHeaderRecent]}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
              </View>
            )}
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={true}
          />
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button title={`🔗 ${t('nextSeries')}`} onPress={handleNextSeries} variant="warning" size="lg" style={styles.nextButton} disabled={currentSeriesSets.length === 0} />
        <Button title={`🏁 ${t('finish')}`} onPress={handleFinish} variant="danger" size="lg" style={styles.finishButton} />
      </View>

      {/* Bottom Sheet for exercise input */}
      <SimpleBottomSheet
        visible={showBottomSheet}
        onClose={() => {
          setShowBottomSheet(false);
          setSelectedExercise(null);
        }}
      >
        {selectedExercise && config && (
          <View style={styles.sheetContent}>
            {/* Current series info */}
            <View style={styles.seriesInfo}>
              <View style={styles.seriesBadge}>
                <Text style={styles.seriesTitle}>🔗 {t('series')} {seriesCount}</Text>
              </View>
              {currentSeriesSets.length > 0 ? (
                <View style={styles.seriesExercises}>
                  {currentSeriesSets.map((set, index) => (
                    <Text key={set.id} style={styles.seriesExerciseItem}>
                      {index + 1}. {set.exercise ? getExerciseName(set.exercise) : ''} — {set.exercise ? formatSetDisplay(set.weight, set.reps, set.tracking_mode || set.exercise.tracking_type, t) : ''}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.seriesEmpty}>{t('noExercisesYet')}</Text>
              )}
            </View>

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{getExerciseName(selectedExercise)}</Text>
              <Text style={styles.sheetSubtitle}>
                {selectedExercise.muscle_groups.map(getMuscleGroupName).join(', ')}
              </Text>
            </View>

            {isCardio && (
              <View style={styles.modeSelectorRow}>
                {(['distance', 'calories', 'time'] as const).map((mode) => {
                  const modeEmoji = mode === 'distance' ? '📏' : mode === 'calories' ? '🔥' : '⏱️';
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[styles.modeButton, cardioTrackingMode === mode && styles.modeButtonActive]}
                      onPress={() => setCardioTrackingMode(mode)}
                    >
                      <Text style={[styles.modeButtonText, cardioTrackingMode === mode && styles.modeButtonTextActive]}>
                        {modeEmoji} {t(mode === 'time' ? 'duration' : mode)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.sheetInputRow}>
              {config.label2 ? (
                <>
                  <NumberInput
                    label={config.label1}
                    value={value1}
                    onChangeValue={setValue1}
                    unit={config.unit1}
                    step={config.step1}
                    compact
                  />
                  <NumberInput
                    label={config.label2}
                    value={value2}
                    onChangeValue={setValue2}
                    unit={config.unit2 || undefined}
                    step={config.step2!}
                    compact
                  />
                </>
              ) : (
                <>
                  <View style={styles.inputPlaceholder} />
                  <NumberInput
                    label={config.label1}
                    value={value1}
                    onChangeValue={setValue1}
                    unit={config.unit1}
                    step={config.step1}
                    compact
                  />
                </>
              )}
            </View>

            <Button
              title={`✓ ${t('add')}`}
              onPress={handleAddExercise}
              variant="success"
              size="lg"
              disabled={!canAdd}
              style={styles.sheetAddButton}
            />
          </View>
        )}
      </SimpleBottomSheet>
    </View>
  );
}

// === HELPER COMPONENTS ===

function ExerciseRow({
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
      style={[
        styles.exerciseRow,
        isRecent && !isSelected && styles.exerciseRowRecent,
        isSelected && styles.exerciseRowSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseRowContent}>
        <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.exerciseMuscle, isSelected && styles.exerciseMuscleSelected]} numberOfLines={1}>
          {muscle}
        </Text>
      </View>
      <Text style={[styles.exerciseChevron, isSelected && styles.exerciseNameSelected]}>›</Text>
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
      distance: { label1: t('distance'), unit1: t('m'), step1: 100, label2: t('reps'), unit2: '', step2: 1 },
      calories: { label1: t('calories'), unit1: t('kcal'), step1: 1, label2: t('reps'), unit2: '', step2: 1 },
      time: { label1: t('duration'), unit1: t('sec'), step1: 5, label2: t('reps'), unit2: '', step2: 1 },
    };
    return configs[cardioMode];
  }

  const configs: Record<string, any> = {
    weight_reps: { label1: t('weight'), unit1: t('kg'), step1: 2.5, label2: t('reps'), unit2: '', step2: 1 },
    time: { label1: t('duration'), unit1: t('sec'), step1: 5, label2: t('reps'), unit2: '', step2: 1 },
    reps_only: { label1: t('reps'), unit1: '', step1: 1, label2: null },
  };
  return configs[exercise.tracking_type] || { label1: t('value'), unit1: '', step1: 1, label2: t('reps'), step2: 1 };
}

function formatSetDisplay(weight: number, reps: number, trackingType: string, t: (key: string) => string): string {
  switch (trackingType) {
    case 'weight_reps':
      return `${weight}${t('kg')} × ${reps}`;
    case 'time':
      return `${Math.floor(weight / 60)}:${(weight % 60).toString().padStart(2, '0')} × ${reps}`;
    case 'calories':
      return `${weight}${t('kcal')} × ${reps}`;
    case 'distance':
      return `${weight}${t('m')} × ${reps}`;
    case 'reps_only':
      return `${reps}`;
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
  fabContainer: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    alignItems: 'center',
  },
  fabTooltip: {
    position: 'absolute',
    bottom: 72,
    backgroundColor: colors.gray[900],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    whiteSpace: 'nowrap',
  },
  fabTooltipText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  fab: {
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
    fontSize: 40,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    lineHeight: 40,
    marginTop: -2,
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
  exercisePickerContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
    fontSize: typography.sizes.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.lg,
    color: colors.gray[900],
    paddingVertical: spacing.sm,
  },
  sectionHeader: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sectionHeaderRecent: {
    backgroundColor: '#E3F2FD',
  },
  sectionHeaderText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    minHeight: 60,
  },
  exerciseRowRecent: {
    backgroundColor: '#F5FAFF',
  },
  exerciseRowSelected: {
    backgroundColor: colors.primary,
  },
  exerciseRowContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
  },
  exerciseNameSelected: {
    color: colors.white,
  },
  exerciseMuscle: {
    fontSize: typography.sizes.md,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  exerciseMuscleSelected: {
    color: '#E3F2FD',
  },
  exerciseChevron: {
    fontSize: typography.sizes.xxl,
    color: colors.gray[400],
    marginLeft: spacing.sm,
  },
  emptySearch: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: typography.sizes.lg,
    color: colors.gray[500],
  },
  modeSelectorRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[200],
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.gray[600],
    textAlign: 'center',
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  inputPlaceholder: {
    flex: 1,
    marginRight: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[300],
  },
  nextButton: {
    flex: 1,
    marginRight: spacing.xs,
  },
  finishButton: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  // Bottom sheet styles
  sheetContent: {
    padding: spacing.lg,
  },
  seriesInfo: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  seriesBadge: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  seriesTitle: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  seriesExercises: {
    marginLeft: spacing.xs,
  },
  seriesExerciseItem: {
    fontSize: typography.sizes.md,
    color: colors.gray[700],
    marginBottom: spacing.xs,
  },
  seriesEmpty: {
    fontSize: typography.sizes.md,
    color: colors.gray[500],
    fontStyle: 'italic',
  },
  sheetHeader: {
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.gray[900],
  },
  sheetSubtitle: {
    fontSize: typography.sizes.md,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  sheetInputRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  sheetAddButton: {
    marginTop: spacing.sm,
  },
});
