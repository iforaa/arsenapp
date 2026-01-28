import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../lib/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'highlighted';
  style?: ViewStyle;
}

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.card, variant === 'highlighted' && styles.highlighted, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
  },
  highlighted: {
    backgroundColor: '#E3F2FD',
  },
});
