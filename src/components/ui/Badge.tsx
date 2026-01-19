import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
  textStyle,
}) => {
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'success':
        return {
          container: {
            backgroundColor: colors.secondary[100],
          },
          text: {
            color: colors.secondary[700],
          },
        };
      case 'warning':
        return {
          container: {
            backgroundColor: colors.accent[100],
          },
          text: {
            color: colors.accent[700],
          },
        };
      case 'error':
        return {
          container: {
            backgroundColor: colors.error[100],
          },
          text: {
            color: colors.error[700],
          },
        };
      case 'info':
        return {
          container: {
            backgroundColor: colors.primary[100],
          },
          text: {
            color: colors.primary[700],
          },
        };
      default:
        return {
          container: {
            backgroundColor: colors.neutral[100],
          },
          text: {
            color: colors.neutral[700],
          },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        variantStyles.container,
        size === 'sm' && styles.containerSm,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variantStyles.text,
          size === 'sm' && styles.textSm,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  text: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  textSm: {
    fontSize: fontSizes.xs,
  },
});
