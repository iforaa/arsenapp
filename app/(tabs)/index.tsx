import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../lib/store';
import { createWorkout, completeWorkout, getAllExercises, getRecentExercises, addSet, getLastSetForExercise } from '../../db/queries';
import type { Exercise } from '../../types';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function WorkoutScreen() {
  const router = useRouter();
  const { currentWorkout, currentWorkoutSets, setCurrentWorkout, clearWorkout, addSetToWorkout } = useWorkoutStore();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<number[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  // Load exercises and auto-start workout
  useEffect(() => {
    loadExercises();
    autoStartWorkout();
  }, []);

  async function loadExercises() {
    const exercises = await getAllExercises();
    setAllExercises(exercises);

    const recent = await getRecentExercises(100); // Get all recent
    setRecentExerciseIds(recent.map(e => e.id));
  }

  async function autoStartWorkout() {
    if (!currentWorkout) {
      try {
        const workoutId = await createWorkout();
        const workout = await import('../../db/queries').then(m => m.getWorkout(workoutId));
        if (workout) {
          setCurrentWorkout(workout);
        }
      } catch (error) {
        console.error('Failed to start workout:', error);
      }
    }
  }

  // Sort exercises: recent first, then alphabetically
  const sortedExercises = [...allExercises].sort((a, b) => {
    const aRecent = recentExerciseIds.indexOf(a.id);
    const bRecent = recentExerciseIds.indexOf(b.id);

    if (aRecent !== -1 && bRecent !== -1) {
      return aRecent - bRecent; // Both recent, sort by recency
    }
    if (aRecent !== -1) return -1; // a is recent, b is not
    if (bRecent !== -1) return 1;  // b is recent, a is not
    return a.name.localeCompare(b.name); // Both not recent, alphabetical
  });

  function getSetDisplay(set: any) {
    const trackingType = set.exercise.tracking_type;
    switch (trackingType) {
      case 'weight_reps':
        return `${set.weight}kg × ${set.reps} reps`;
      case 'time':
        return `${Math.floor(set.weight / 60)}:${(set.weight % 60).toString().padStart(2, '0')} min`;
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

  async function handleActivityTap(exercise: Exercise) {
    setSelectedExercise(exercise);

    // Load last set for this exercise to pre-fill inputs
    const lastSet = await getLastSetForExercise(exercise.id);
    if (lastSet) {
      setValue1(lastSet.weight.toString());
      if (exercise.tracking_type === 'weight_reps') {
        setValue2(lastSet.reps.toString());
      }
    } else {
      setValue1('');
      setValue2('');
    }

    bottomSheetRef.current?.expand();
  }

  function getInputConfig(trackingType: string) {
    switch (trackingType) {
      case 'weight_reps':
        return {
          label1: 'Weight',
          unit1: 'kg',
          placeholder1: '0',
          step1: 2.5,
          label2: 'Reps',
          unit2: '',
          placeholder2: '0',
          step2: 1
        };
      case 'time':
        return {
          label1: 'Duration',
          unit1: 'seconds',
          placeholder1: '0',
          step1: 5,
          label2: null,
          unit2: null,
          placeholder2: null,
          step2: null
        };
      case 'calories':
        return {
          label1: 'Calories',
          unit1: 'kcal',
          placeholder1: '0',
          step1: 10,
          label2: null,
          unit2: null,
          placeholder2: null,
          step2: null
        };
      case 'distance':
        return {
          label1: 'Distance',
          unit1: 'km',
          placeholder1: '0',
          step1: 0.5,
          label2: null,
          unit2: null,
          placeholder2: null,
          step2: null
        };
      case 'reps_only':
        return {
          label1: 'Reps',
          unit1: '',
          placeholder1: '0',
          step1: 1,
          label2: null,
          unit2: null,
          placeholder2: null,
          step2: null
        };
      default:
        return {
          label1: 'Value',
          unit1: '',
          placeholder1: '0',
          step1: 1,
          label2: 'Reps',
          unit2: '',
          placeholder2: '0',
          step2: 1
        };
    }
  }

  function adjustValue(currentValue: string, step: number, direction: 'up' | 'down') {
    const current = parseFloat(currentValue) || 0;
    const newValue = direction === 'up' ? current + step : current - step;
    return Math.max(0, newValue).toString();
  }

  async function handleLogSet() {
    if (!currentWorkout || !selectedExercise) {
      Alert.alert('Error', 'No active workout');
      return;
    }

    const config = getInputConfig(selectedExercise.tracking_type);

    if (!value1) {
      Alert.alert('Error', `Please enter ${config.label1.toLowerCase()}`);
      return;
    }

    const needsValue2 = selectedExercise.tracking_type === 'weight_reps';
    if (needsValue2 && !value2) {
      Alert.alert('Error', 'Please enter reps');
      return;
    }

    try {
      const weight = parseFloat(value1);
      const reps = needsValue2 ? parseInt(value2) : 0;

      const setId = await addSet(currentWorkout.id, selectedExercise.id, weight, reps);

      addSetToWorkout({
        id: setId,
        workout_id: currentWorkout.id,
        exercise_id: selectedExercise.id,
        weight: weight,
        reps: reps,
        order_in_workout: currentWorkoutSets.length + 1,
        timestamp: new Date().toISOString(),
        exercise: selectedExercise,
      });

      setValue1('');
      setValue2('');
      bottomSheetRef.current?.close();
    } catch (error) {
      console.error('Failed to add set:', error);
      Alert.alert('Error', 'Failed to log');
    }
  }

  function getSetDisplayForBottomSheet(weight: number, reps: number, trackingType: string) {
    switch (trackingType) {
      case 'weight_reps':
        return `${weight}kg × ${reps} reps`;
      case 'time':
        return `${Math.floor(weight / 60)}:${(weight % 60).toString().padStart(2, '0')} min`;
      case 'calories':
        return `${weight} kcal`;
      case 'distance':
        return `${weight} km`;
      case 'reps_only':
        return `${weight} reps`;
      default:
        return `${weight} × ${reps}`;
    }
  }

  async function handleFinishWorkout() {
    if (!currentWorkout) return;

    try {
      const duration = Math.floor((new Date().getTime() - new Date(currentWorkout.date).getTime()) / 1000 / 60);
      await completeWorkout(currentWorkout.id, duration);
      clearWorkout();
    } catch (error) {
      console.error('Failed to finish workout:', error);
      Alert.alert('Error', 'Failed to finish workout');
    }
  }

  const config = selectedExercise ? getInputConfig(selectedExercise.tracking_type) : null;
  const todaysSetsForExercise = selectedExercise
    ? currentWorkoutSets.filter(s => s.exercise_id === selectedExercise.id)
    : [];

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Activity Grid */}
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Activities</Text>
          <View style={styles.activityGrid}>
            {sortedExercises.map((exercise, index) => {
              const isRecent = recentExerciseIds.includes(exercise.id);

              return (
                <TouchableOpacity
                  key={exercise.id}
                  style={[
                    styles.activityCard,
                    isRecent && styles.activityCardRecent,
                  ]}
                  onPress={() => handleActivityTap(exercise)}
                >
                  <Text style={styles.activityName} numberOfLines={2}>
                    {exercise.name}
                  </Text>
                  <Text style={styles.activityMuscle} numberOfLines={1}>
                    {exercise.muscle_groups[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logged Sets */}
        {currentWorkoutSets.length > 0 && (
          <View style={styles.setsSection}>
            <Text style={styles.sectionTitle}>Today's Log ({currentWorkoutSets.length})</Text>
            {currentWorkoutSets.map((set, index) => (
              <View key={set.id} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setNumber}>#{index + 1}</Text>
                  <Text style={styles.exerciseName}>{set.exercise.name}</Text>
                </View>
                <Text style={styles.setDetails}>{getSetDisplay(set)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Finish Workout Button */}
      {currentWorkoutSets.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <BottomSheetScrollView contentContainerStyle={styles.bottomSheetContent}>
          {selectedExercise && config && (
            <>
              <Text style={styles.bottomSheetTitle}>{selectedExercise.name}</Text>
              <Text style={styles.bottomSheetSubtitle}>{selectedExercise.muscle_groups.join(', ')}</Text>

              <View style={styles.inputSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{config.label1}</Text>
                  <View style={styles.inputRow}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setValue1(adjustValue(value1, config.step1, 'down'))}
                    >
                      <Text style={styles.adjustButtonText}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.input}
                      value={value1}
                      onChangeText={setValue1}
                      keyboardType="decimal-pad"
                      placeholder={config.placeholder1}
                    />
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setValue1(adjustValue(value1, config.step1, 'up'))}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                    {config.unit1 && <Text style={styles.unit}>{config.unit1}</Text>}
                  </View>
                </View>

                {config.label2 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{config.label2}</Text>
                    <View style={styles.inputRow}>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => setValue2(adjustValue(value2, config.step2!, 'down'))}
                      >
                        <Text style={styles.adjustButtonText}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.input}
                        value={value2}
                        onChangeText={setValue2}
                        keyboardType="number-pad"
                        placeholder={config.placeholder2 || '0'}
                      />
                      <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => setValue2(adjustValue(value2, config.step2!, 'up'))}
                      >
                        <Text style={styles.adjustButtonText}>+</Text>
                      </TouchableOpacity>
                      {config.unit2 && <Text style={styles.unit}>{config.unit2}</Text>}
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.logButton} onPress={handleLogSet}>
                  <Text style={styles.logButtonText}>Log Set</Text>
                </TouchableOpacity>
              </View>

              {todaysSetsForExercise.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.historyTitle}>Today ({todaysSetsForExercise.length})</Text>
                  {todaysSetsForExercise.map((set, index) => (
                    <View key={set.id} style={styles.bottomSheetSetCard}>
                      <Text style={styles.setNumber}>#{index + 1}</Text>
                      <Text style={styles.setDetails}>
                        {getSetDisplayForBottomSheet(set.weight, set.reps, selectedExercise.tracking_type)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    width: '31%',
    minHeight: 70,
    justifyContent: 'space-between',
  },
  activityCardRecent: {
    backgroundColor: '#E3F2FD',
  },
  activityName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  activityMuscle: {
    fontSize: 11,
    color: '#666',
  },
  setsSection: {
    marginBottom: 24,
  },
  setCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  setDetails: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  finishButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#fff',
  },
  bottomSheetContent: {
    padding: 20,
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  bottomSheetSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputSection: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  unit: {
    fontSize: 18,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
  },
  logButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: 24,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  bottomSheetSetCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
