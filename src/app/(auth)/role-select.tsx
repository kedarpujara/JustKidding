import React from 'react';
import { Redirect } from 'expo-router';

// This screen is not used in the current flow
// Role selection is handled in onboarding
export default function RoleSelect() {
  return <Redirect href="/(auth)/onboarding" />;
}
