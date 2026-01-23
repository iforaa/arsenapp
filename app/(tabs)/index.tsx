import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../lib/store';
import { createWorkout, completeWorkout, getAllExercises, getRecentExercises, addSet, getLastSetForExercise } from '../../db/queries';
import type { Exercise } from '../../types';

export default function WorkoutScreen() {
  const router = useRouter();
  const { currentWorkout, currentWorkoutSets, setCurrentWorkout, clearWorkout, addSetToWorkout } = useWorkoutStore();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [recentExerciseIds, setRecentExerciseIds] = useState<number[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');
  const [cardioTrackingMode, setCardioTrackingMode] = useState<'distance' | 'calories' | 'time'>('distance');
  const [activeSeries, setActiveSeries] = useState<string | null>(null);

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

    // Default cardio mode to distance
    const isCardio = ['cardio', 'legs'].some(mg => exercise.muscle_groups.includes(mg as any));
    if (isCardio) {
      setCardioTrackingMode('distance');
    }

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
  }

  function getInputConfig(trackingType: string, exercise?: Exercise) {
    // Check if it's a cardio exercise
    const isCardio = exercise?.muscle_groups.includes('cardio' as any) ||
                     (exercise?.muscle_groups.includes('legs' as any) &&
                      ['Stationary Bike', 'Treadmill', 'Elliptical', 'Running', 'Cycling', 'Rowing Machine'].includes(exercise.name));

    if (isCardio) {
      // Use cardio tracking mode
      switch (cardioTrackingMode) {
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
        case 'time':
          return {
            label1: 'Duration',
            unit1: 'min',
            placeholder1: '0',
            step1: 1,
            label2: null,
            unit2: null,
            placeholder2: null,
            step2: null
          };
      }
    }

    // Non-cardio exercises use original tracking type
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

  function handleEndSeries() {
    setActiveSeries(null);
  }

  async function handleLogSet() {
    if (!currentWorkout || !selectedExercise) {
      Alert.alert('Error', 'No active workout');
      return;
    }

    const config = getInputConfig(selectedExercise.tracking_type, selectedExercise);

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
      // Auto-start series if not active
      let currentSeriesId = activeSeries;
      if (!currentSeriesId) {
        currentSeriesId = `series_${Date.now()}`;
        setActiveSeries(currentSeriesId);
      }

      const weight = parseFloat(value1);
      const reps = needsValue2 ? parseInt(value2) : 0;

      const setId = await addSet(currentWorkout.id, selectedExercise.id, weight, reps, currentSeriesId);

      addSetToWorkout({
        id: setId,
        workout_id: currentWorkout.id,
        exercise_id: selectedExercise.id,
        weight: weight,
        reps: reps,
        order_in_workout: currentWorkoutSets.length + 1,
        series_id: currentSeriesId,
        timestamp: new Date().toISOString(),
        exercise: selectedExercise,
      });

      // Keep values for easy repeat logging
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
      // End active series if any
      if (activeSeries) {
        handleEndSeries();
      }

      const duration = Math.floor((new Date().getTime() - new Date(currentWorkout.date).getTime()) / 1000 / 60);
      await completeWorkout(currentWorkout.id, duration);
      clearWorkout();
    } catch (error) {
      console.error('Failed to finish workout:', error);
      Alert.alert('Error', 'Failed to finish workout');
    }
  }

  const config = selectedExercise ? getInputConfig(selectedExercise.tracking_type, selectedExercise) : null;
  const isCardio = selectedExercise?.muscle_groups.includes('cardio' as any) ||
                   (selectedExercise?.muscle_groups.includes('legs' as any) &&
                    ['Stationary Bike', 'Treadmill', 'Elliptical', 'Running', 'Cycling', 'Rowing Machine'].includes(selectedExercise.name));
  const todaysSetsForExercise = selectedExercise
    ? currentWorkoutSets.filter(s => s.exercise_id === selectedExercise.id)
    : [];

  // Split exercises into two rows
  const midpoint = Math.ceil(sortedExercises.length / 2);
  const row1Exercises = sortedExercises.slice(0, midpoint);
  const row2Exercises = sortedExercises.slice(midpoint);

  const renderActivityCard = (exercise: Exercise) => {
    const isRecent = recentExerciseIds.includes(exercise.id);
    const isSelected = selectedExercise?.id === exercise.id;

    return (
      <TouchableOpacity
        key={exercise.id}
        style={[
          styles.activityCard,
          isRecent && styles.activityCardRecent,
          isSelected && styles.activityCardSelected,
        ]}
        onPress={() => handleActivityTap(exercise)}
      >
        <Text
          style={[
            styles.activityName,
            isSelected && styles.activityNameSelected,
          ]}
          numberOfLines={2}
        >
          {exercise.name}
        </Text>
        <Text
          style={[
            styles.activityMuscle,
            isSelected && styles.activityMuscleSelected,
          ]}
          numberOfLines={1}
        >
          {exercise.muscle_groups[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Activity Scroll - Two Rows */}
      <View style={styles.activitiesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {row1Exercises.map(renderActivityCard)}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalScroll}
        >
          {row2Exercises.map(renderActivityCard)}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Selected Exercise Form */}
        {selectedExercise && config && (
          <View style={styles.selectedSection}>
            {activeSeries && (
              <View style={styles.seriesBadge}>
                <Text style={styles.seriesBadgeText}>🔗 Series Active</Text>
              </View>
            )}
            <Text style={styles.selectedTitle}>{selectedExercise.name}</Text>
            <Text style={styles.selectedSubtitle}>{selectedExercise.muscle_groups.join(', ')}</Text>

            {/* Cardio Mode Selector */}
            {isCardio && (
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[styles.modeButton, cardioTrackingMode === 'distance' && styles.modeButtonActive]}
                  onPress={() => setCardioTrackingMode('distance')}
                >
                  <Text style={[styles.modeButtonText, cardioTrackingMode === 'distance' && styles.modeButtonTextActive]}>
                    Distance
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, cardioTrackingMode === 'calories' && styles.modeButtonActive]}
                  onPress={() => setCardioTrackingMode('calories')}
                >
                  <Text style={[styles.modeButtonText, cardioTrackingMode === 'calories' && styles.modeButtonTextActive]}>
                    Calories
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, cardioTrackingMode === 'time' && styles.modeButtonActive]}
                  onPress={() => setCardioTrackingMode('time')}
                >
                  <Text style={[styles.modeButtonText, cardioTrackingMode === 'time' && styles.modeButtonTextActive]}>
                    Time
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{config.label1}</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={value1}
                    onChangeText={setValue1}
                    keyboardType="decimal-pad"
                    placeholder={config.placeholder1}
                  />
                  <View style={styles.adjustButtons}>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setValue1(adjustValue(value1, config.step1, 'down'))}
                    >
                      <Text style={styles.adjustButtonText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => setValue1(adjustValue(value1, config.step1, 'up'))}
                    >
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {config.unit1 && <Text style={styles.unit}>{config.unit1}</Text>}
                </View>
              </View>

              {config.label2 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{config.label2}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={value2}
                      onChangeText={setValue2}
                      keyboardType="number-pad"
                      placeholder={config.placeholder2 || '0'}
                    />
                    <View style={styles.adjustButtons}>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => setValue2(adjustValue(value2, config.step2!, 'down'))}
                      >
                        <Text style={styles.adjustButtonText}>−</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        onPress={() => setValue2(adjustValue(value2, config.step2!, 'up'))}
                      >
                        <Text style={styles.adjustButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
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
                  <View key={set.id} style={styles.setCard}>
                    <Text style={styles.setNumber}>#{index + 1}</Text>
                    <Text style={styles.setDetails}>
                      {getSetDisplayForBottomSheet(set.weight, set.reps, selectedExercise.tracking_type)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Footer Buttons */}
      {currentWorkoutSets.length > 0 && (
        <View style={styles.footer}>
          {activeSeries && (
            <TouchableOpacity style={styles.seriesButton} onPress={handleEndSeries}>
              <Text style={styles.seriesButtonText}>End Series</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
            <Text style={styles.finishButtonText}>Finish Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  activitiesSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    gap: 8,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activityCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 12,
    width: 110,
    height: 70,
    justifyContent: 'space-between',
  },
  activityCardRecent: {
    backgroundColor: '#E3F2FD',
  },
  activityCardSelected: {
    backgroundColor: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  selectedSection: {
    marginBottom: 24,
  },
  seriesBadge: {
    backgroundColor: '#FF9500',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  seriesBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  selectedSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  activityName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  activityNameSelected: {
    color: '#fff',
  },
  activityMuscle: {
    fontSize: 10,
    color: '#666',
  },
  activityMuscleSelected: {
    color: '#E3F2FD',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  seriesButton: {
    flex: 1,
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  seriesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  finishButton: {
    flex: 1,
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
  adjustButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  adjustButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 20,
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
    marginTop: 24,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  setCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  setDetails: {
    fontSize: 16,
    color: '#000',
  },
});
