import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Loading } from '@/components/ui';
import { colors } from '@/lib/theme';

export default function Index() {
  const { isLoading, isAuthenticated, profile, role, signOut } = useAuthStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // If authenticated but no profile on app start, sign them out
  // This happens when user didn't complete onboarding before closing the app
  useEffect(() => {
    if (!isLoading && isAuthenticated && !profile) {
      setIsSigningOut(true);
      signOut().finally(() => setIsSigningOut(false));
    }
  }, [isLoading, isAuthenticated, profile]);

  if (isLoading || isSigningOut) {
    return (
      <View style={styles.container}>
        <Loading message="Loading..." fullScreen />
      </View>
    );
  }

  // Not authenticated - go to auth flow
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  // Authenticated but no profile - sign out handled by useEffect above
  // This redirect is a fallback during the signOut process
  if (!profile) {
    return (
      <View style={styles.container}>
        <Loading message="Loading..." fullScreen />
      </View>
    );
  }

  // Route based on role
  switch (role) {
    case 'guardian':
      return <Redirect href="/(guardian)/home" />;
    case 'doctor':
      return <Redirect href="/(doctor)/home" />;
    case 'admin':
      return <Redirect href="/(admin)/dashboard" />;
    default:
      return <Redirect href="/(auth)/welcome" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
});
