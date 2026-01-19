import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { UserRole } from '@/types';

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { updateProfile, isLoading } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('guardian');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const validateForm = () => {
    const newErrors: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your name';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    const result = await updateProfile({
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      role: selectedRole,
    });

    if (result.success) {
      // If they selected doctor, go to doctor onboarding
      if (selectedRole === 'doctor') {
        router.replace('/(doctor)/onboarding');
      } else {
        router.replace('/');
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to save profile');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>
          Tell us a bit about yourself to get started
        </Text>

        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setErrors((prev) => ({ ...prev, fullName: undefined }));
          }}
          error={errors.fullName}
          leftIcon="person-outline"
        />

        <Input
          label="Email (optional)"
          placeholder="Enter your email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
          leftIcon="mail-outline"
        />

        <Text style={styles.roleLabel}>I am a...</Text>

        <View style={styles.roleContainer}>
          <RoleOption
            icon="people-outline"
            title="Parent/Guardian"
            description="I want to book consultations for my child"
            isSelected={selectedRole === 'guardian'}
            onPress={() => setSelectedRole('guardian')}
          />

          <RoleOption
            icon="medkit-outline"
            title="Doctor"
            description="I am a pediatrician offering consultations"
            isSelected={selectedRole === 'doctor'}
            onPress={() => setSelectedRole('doctor')}
          />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          disabled={!fullName.trim()}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

interface RoleOptionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

const RoleOption: React.FC<RoleOptionProps> = ({
  icon,
  title,
  description,
  isSelected,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.roleIconContainer,
        isSelected && styles.roleIconContainerSelected,
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={isSelected ? colors.primary[600] : colors.neutral[400]}
      />
    </View>
    <View style={styles.roleContent}>
      <Text
        style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}
      >
        {title}
      </Text>
      <Text style={styles.roleDescription}>{description}</Text>
    </View>
    <View
      style={[
        styles.roleCheckbox,
        isSelected && styles.roleCheckboxSelected,
      ]}
    >
      {isSelected && (
        <Ionicons name="checkmark" size={16} color={colors.white} />
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    lineHeight: fontSizes.base * 1.5,
    marginBottom: spacing['3xl'],
  },
  roleLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  roleContainer: {
    gap: spacing.md,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.white,
  },
  roleOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleIconContainerSelected: {
    backgroundColor: colors.primary[100],
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  roleTitleSelected: {
    color: colors.primary[700],
  },
  roleDescription: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  roleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  roleCheckboxSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  footer: {
    paddingTop: spacing.xl,
  },
});
