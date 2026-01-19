import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, fontSizes } from '@/lib/theme';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export const Loading: React.FC<LoadingProps> = ({
  message,
  size = 'large',
  color = colors.primary[500],
  fullScreen = false,
  style,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  message: {
    marginTop: spacing.md,
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
