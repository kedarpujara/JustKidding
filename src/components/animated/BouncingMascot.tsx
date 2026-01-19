import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeights, borderRadius } from '@/lib/theme';

interface BouncingMascotProps {
  size?: number;
}

export const BouncingMascot: React.FC<BouncingMascotProps> = ({
  size = 100,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance bounce
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 150,
      mass: 0.8,
      useNativeDriver: true,
    }).start();

    // Continuous gentle bounce
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.spring(translateY, {
          toValue: -6,
          damping: 12,
          stiffness: 100,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 12,
          stiffness: 100,
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle rotation wiggle
    const wiggleAnimation = Animated.loop(
      Animated.sequence([
        Animated.spring(rotate, {
          toValue: -2,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.spring(rotate, {
          toValue: 2,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ])
    );

    // Start animations after delays
    setTimeout(() => bounceAnimation.start(), 500);
    setTimeout(() => wiggleAnimation.start(), 700);

    return () => {
      bounceAnimation.stop();
      wiggleAnimation.stop();
    };
  }, []);

  // Interpolate rotation for degrees
  const rotateInterpolation = rotate.interpolate({
    inputRange: [-2, 2],
    outputRange: ['-2deg', '2deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [
            { translateY },
            { scale },
            { rotate: rotateInterpolation },
          ],
        },
      ]}
    >
      <View style={[styles.mascotBody, { width: size, height: size, borderRadius: size * 0.25 }]}>
        <Text style={[styles.mascotText, { fontSize: size * 0.4 }]}>JK</Text>
        <View style={styles.stethoscope}>
          <Ionicons
            name="medical"
            size={size * 0.2}
            color={colors.secondary[500]}
          />
        </View>
      </View>
      <View style={[styles.cheekLeft, { width: size * 0.15, height: size * 0.1, left: size * 0.08, bottom: size * 0.25 }]} />
      <View style={[styles.cheekRight, { width: size * 0.15, height: size * 0.1, right: size * 0.08, bottom: size * 0.25 }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mascotBody: {
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  mascotText: {
    fontWeight: fontWeights.bold,
    color: colors.white,
    letterSpacing: 2,
  },
  stethoscope: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cheekLeft: {
    position: 'absolute',
    backgroundColor: colors.playful.peach,
    borderRadius: borderRadius.full,
    opacity: 0.6,
  },
  cheekRight: {
    position: 'absolute',
    backgroundColor: colors.playful.peach,
    borderRadius: borderRadius.full,
    opacity: 0.6,
  },
});
