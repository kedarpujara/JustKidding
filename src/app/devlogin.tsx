import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

const TEST_PASSWORD = 'TestPass123!';

const TEST_USERS = [
  { email: 'guardian1@test.justkidding.app', name: 'Priya Sharma', role: 'guardian' },
  { email: 'guardian2@test.justkidding.app', name: 'Rahul Patel', role: 'guardian' },
  { email: 'doctor1@test.justkidding.app', name: 'Dr. Anjali Desai', role: 'doctor' },
  { email: 'doctor2@test.justkidding.app', name: 'Dr. Vikram Singh', role: 'doctor' },
  { email: 'doctor3@test.justkidding.app', name: 'Dr. Meera Krishnan', role: 'doctor' },
  { email: 'kedar@justkidding.app', name: 'Kedar Pujara', role: 'admin' },
  { email: 'malav@justkidding.app', name: 'Malav Shah', role: 'admin' },
];

export default function DevLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { devLogin, isLoading } = useAuthStore();

  const handleLogin = async (email: string, name: string) => {
    const result = await devLogin(email, TEST_PASSWORD);
    if (result.success) {
      router.replace('/');
    } else {
      Alert.alert('Login Failed', `${result.error}\n\nMake sure you created this user in Supabase Dashboard.`);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Dev Login</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.hint}>Tap a user to log in. Password: {TEST_PASSWORD}</Text>

        {TEST_USERS.map((user) => (
          <TouchableOpacity
            key={user.email}
            style={styles.userCard}
            onPress={() => handleLogin(user.email, user.name)}
            disabled={isLoading}
          >
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userRole}>{user.role}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  userCard: {
    backgroundColor: colors.neutral[50],
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  userEmail: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  userRole: {
    fontSize: fontSizes.xs,
    color: colors.primary[600],
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
});
