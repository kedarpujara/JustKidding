import { Redirect } from 'expo-router';

// Redirect to the new doctor onboarding screen (outside tabs)
export default function DoctorOnboardingRedirect() {
  return <Redirect href="/doctor-onboarding" />;
}
