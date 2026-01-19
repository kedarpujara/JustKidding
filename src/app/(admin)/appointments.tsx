import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSizes, fontWeights } from '@/lib/theme';

export default function AdminAppointments() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Appointments</Text></View>
      <Text style={styles.placeholder}>Appointment management coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text.primary },
  placeholder: { fontSize: fontSizes.base, color: colors.text.secondary, textAlign: 'center', marginTop: spacing['3xl'], padding: spacing.lg },
});
