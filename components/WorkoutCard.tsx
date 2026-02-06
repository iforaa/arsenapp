import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius, spacing, typography } from '../lib/theme';
import type { Workout } from '../types';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  formatDate: (date: string) => string;
  formatTime: (date: string) => string;
}

export function WorkoutCard({ workout, onPress, formatDate, formatTime }: WorkoutCardProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatDate(workout.date)}</Text>
          <Text style={styles.time}>{formatTime(workout.date)}</Text>
        </View>
        <View style={styles.stats}>
          {workout.duration_minutes && (
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{workout.duration_minutes}</Text>
              <Text style={styles.statLabel}>{t('min')}</Text>
            </View>
          )}
        </View>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  date: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.gray[900],
    marginBottom: 2,
  },
  time: {
    fontSize: typography.sizes.md,
    color: colors.gray[600],
  },
  stats: {
    flexDirection: 'row',
  },
  statBadge: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray[600],
  },
});
