import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function ChildrenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.secondary },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
