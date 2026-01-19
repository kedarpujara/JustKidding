import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { helpers } from '@/utils/helpers';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sendOtp, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleSendOtp = async () => {
    // Validate phone
    if (!phone.trim()) {
      setPhoneError('Please enter your phone number');
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }

    setPhoneError('');
    clearError();

    const result = await sendOtp(cleanedPhone);

    if (result.success) {
      router.push({
        pathname: '/(auth)/verify',
        params: { phone: cleanedPhone },
      });
    } else {
      Alert.alert('Error', result.error || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code to confirm your identity
        </Text>

        <View style={styles.inputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>

          <View style={styles.phoneInputWrapper}>
            <Input
              placeholder="Phone number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/\D/g, '').slice(0, 10));
                setPhoneError('');
              }}
              keyboardType="phone-pad"
              maxLength={10}
              error={phoneError}
              containerStyle={styles.phoneInput}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title="Send OTP"
          onPress={handleSendOtp}
          loading={isLoading}
          disabled={phone.length < 10}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    paddingTop: spacing['2xl'],
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  countryCodeText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  phoneInputWrapper: {
    flex: 1,
  },
  phoneInput: {
    marginBottom: 0,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error[500],
    marginTop: spacing.sm,
  },
  footer: {
    paddingTop: spacing.xl,
  },
});
