import { Stack } from 'expo-router';

export default function AppointmentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          // Prevent this screen from being kept in stack when navigating back
          gestureEnabled: true,
        }}
      />
      <Stack.Screen name="reschedule/[id]" />
    </Stack>
  );
}
