import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function AdminSettings() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Settings</Text></View>
      <View style={styles.content}>
        <TouchableOpacity style={styles.signOutButton} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: signOut }])}>
          <Ionicons name="log-out-outline" size={22} color={colors.error[500]} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text.primary },
  content: { padding: spacing.lg },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, gap: spacing.sm },
  signOutText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.error[500] },
});
