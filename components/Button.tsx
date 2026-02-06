import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, styles[`${variant}Text`], styles[`size_${size}_text`]]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.weights.semibold,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.white,
  },
  secondary: {
    backgroundColor: colors.gray[500],
  },
  secondaryText: {
    color: colors.white,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dangerText: {
    color: colors.white,
  },
  success: {
    backgroundColor: colors.success,
  },
  successText: {
    color: colors.white,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.primary,
  },

  // Sizes
  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  size_sm_text: {
    fontSize: typography.sizes.md,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  size_md_text: {
    fontSize: typography.sizes.lg,
  },
  size_lg: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  size_lg_text: {
    fontSize: 15,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
});
