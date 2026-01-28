import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../lib/theme';

interface BadgeProps {
  variant: 'success' | 'warning' | 'series';
  label: string;
}

export function Badge({ variant, label }: BadgeProps) {
  const icon = variant === 'success' ? '✓' : variant === 'series' ? '🔗' : '●';

  return (
    <View style={[styles.badge, styles[variant]]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {icon} {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.semibold,
  },
  success: {
    backgroundColor: 'transparent',
  },
  successText: {
    color: colors.success,
  },
  warning: {
    backgroundColor: 'transparent',
  },
  warningText: {
    color: colors.warning,
  },
  series: {
    backgroundColor: colors.warning,
  },
  seriesText: {
    color: colors.white,
  },
});
