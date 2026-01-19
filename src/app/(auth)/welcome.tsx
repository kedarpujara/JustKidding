import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { FadeInView, FloatingElements, BouncingMascot } from '@/components/animated';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.tertiary]}
      style={styles.gradient}
    >
      <FloatingElements count={6} />

      <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
        <View style={styles.content}>
          <FadeInView delay={0} translateY={30}>
            <View style={styles.logoContainer}>
              <BouncingMascot size={80} />
            </View>
          </FadeInView>

          <FadeInView delay={200} translateY={20}>
            <Text style={styles.title}>JustKidding</Text>
          </FadeInView>

          <FadeInView delay={300} translateY={20}>
            <Text style={styles.subtitle}>
              Expert pediatric care for your little ones, right from your phone
            </Text>
          </FadeInView>

          <View style={styles.features}>
            <FeatureCard
              index={0}
              icon="videocam"
              iconColor={colors.playful.sky}
              iconBg={`${colors.playful.sky}30`}
              title="Video Consultations"
              description="Connect face-to-face with certified pediatricians"
            />
            <FeatureCard
              index={1}
              icon="shield-checkmark"
              iconColor={colors.playful.mint}
              iconBg={`${colors.playful.mint}30`}
              title="Safe & Secure"
              description="HIPAA-compliant platform for your peace of mind"
            />
            <FeatureCard
              index={2}
              icon="time"
              iconColor={colors.playful.lavender}
              iconBg={`${colors.playful.lavender}30`}
              title="Quick Access"
              description="Book appointments in minutes, not hours"
            />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <FadeInView delay={800}>
            <AnimatedButton
              title="Get Started"
              onPress={() => router.push('/(auth)/login')}
            />
          </FadeInView>

          {DEV_MODE && (
            <FadeInView delay={900}>
              <Button
                title="Dev Login (Test Users)"
                onPress={() => router.push('/devlogin')}
                variant="outline"
                fullWidth
                size="lg"
                style={styles.devButton}
              />
            </FadeInView>
          )}

          <FadeInView delay={1000}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </FadeInView>
        </View>
      </View>
    </LinearGradient>
  );
}

interface FeatureCardProps {
  index: number;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  index,
  icon,
  iconColor,
  iconBg,
  title,
  description,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <FadeInView delay={400 + index * 100} translateY={15}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.featureCard, { transform: [{ scale }] }]}>
          <View style={[styles.featureIcon, { backgroundColor: iconBg }]}>
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </FadeInView>
  );
};

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({ title, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={[colors.primary[500], colors.primary[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>{title}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} style={styles.buttonIcon} />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: fontSizes.sm * 1.5,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  features: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    lineHeight: fontSizes.xs * 1.4,
  },
  footer: {
    paddingTop: spacing.xl,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  buttonIcon: {
    marginLeft: spacing.sm,
  },
  termsText: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  termsLink: {
    color: colors.primary[600],
  },
  devButton: {
    marginTop: spacing.md,
  },
});
