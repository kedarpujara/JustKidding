import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

const OTP_LENGTH = 6;
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function Verify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, sendOtp, isLoading, error, clearError, profile } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Countdown timer for resend
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);

      // Focus last filled input or the next empty one
      const lastFilledIndex = Math.min(index + pastedOtp.length - 1, OTP_LENGTH - 1);
      inputRefs.current[lastFilledIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');

    if (otpString.length !== OTP_LENGTH) {
      Alert.alert('Error', 'Please enter the complete OTP');
      return;
    }

    clearError();
    const result = await verifyOtp(phone!, otpString);

    if (result.success) {
      // Check if user has a profile (returning user) or needs onboarding (new user)
      const { profile: updatedProfile } = useAuthStore.getState();
      if (updatedProfile) {
        router.replace('/');
      } else {
        router.replace('/(auth)/onboarding');
      }
    } else {
      Alert.alert('Error', result.error || 'Invalid OTP. Please try again.');
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    clearError();
    const result = await sendOtp(phone!);

    if (result.success) {
      setResendTimer(30);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      Alert.alert('Success', 'OTP sent successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to resend OTP');
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Verify your number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.phoneNumber}>+91 {phone}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                error && styles.otpInputError,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value.replace(/\D/g, ''), index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {DEV_MODE && (
          <View style={styles.devHint}>
            <Text style={styles.devHintText}>Dev Mode: Use OTP 123456</Text>
          </View>
        )}

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={resendTimer > 0 || isLoading}
          >
            <Text
              style={[
                styles.resendButton,
                resendTimer > 0 && styles.resendButtonDisabled,
              ]}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title="Verify"
          onPress={handleVerify}
          loading={isLoading}
          disabled={!isOtpComplete}
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
  phoneNumber: {
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  otpInputFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  otpInputError: {
    borderColor: colors.error[500],
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.error[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  devHint: {
    backgroundColor: colors.accent[100],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  devHintText: {
    fontSize: fontSizes.sm,
    color: colors.accent[700],
    textAlign: 'center',
    fontWeight: fontWeights.medium,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  resendText: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  resendButton: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary[600],
  },
  resendButtonDisabled: {
    color: colors.text.tertiary,
  },
  footer: {
    paddingTop: spacing.xl,
  },
});
