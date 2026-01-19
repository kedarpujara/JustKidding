import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes } from '@/lib/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border.light, height: 88, paddingTop: 8, paddingBottom: 28 },
        tabBarLabelStyle: { fontSize: fontSizes.xs, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="doctors" options={{ title: 'Doctors', tabBarIcon: ({ color, size }) => <Ionicons name="medkit-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="appointments" options={{ title: 'Appointments', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
