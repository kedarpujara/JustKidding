import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes } from '@/lib/theme';

export default function GuardianLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border.light,
          height: 88,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.xs,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          href: null, // Hide from tab bar - accessible via home screen
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          href: null, // Hide from tab bar - accessible via home screen "See All"
        }}
      />
      <Tabs.Screen
        name="appointment"
        options={{
          href: null, // Hide from tab bar - detail screen
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          href: null, // Hide from tab bar - video call screen
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          href: null, // Hide from tab bar - accessible via quick actions
        }}
      />
      <Tabs.Screen
        name="children"
        options={{
          href: null, // Hide from tab bar - accessible via home and profile
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
