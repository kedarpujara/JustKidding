import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui';
import { colors, spacing, fontSizes, fontWeights } from '@/lib/theme';

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Patients</Text></View>
      <Screen scrollable><Text style={styles.placeholder}>Patient history coming soon...</Text></Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text.primary },
  placeholder: { fontSize: fontSizes.base, color: colors.text.secondary, textAlign: 'center', marginTop: spacing['3xl'] },
});
