import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { colors, spacing, fontSizes, fontWeights } from '@/lib/theme';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Admin Dashboard</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Total Users</Text></Card>
          <Card style={styles.statCard}><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Doctors</Text></Card>
        </View>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Appointments</Text></Card>
          <Card style={styles.statCard}><Text style={styles.statValue}>₹0</Text><Text style={styles.statLabel}>Revenue</Text></Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text.primary },
  content: { padding: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.xl },
  statValue: { fontSize: fontSizes['2xl'], fontWeight: fontWeights.bold, color: colors.primary[600] },
  statLabel: { fontSize: fontSizes.sm, color: colors.text.secondary, marginTop: spacing.xs },
});
