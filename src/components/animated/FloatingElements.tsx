import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@/lib/theme';

interface FloatingElement {
  color: string;
  size: number;
  initialX: number;
  initialY: number;
  delay: number;
  duration: number;
  amplitude: number;
}

const FloatingBubble: React.FC<FloatingElement> = ({
  color,
  size,
  initialX,
  initialY,
  delay,
  duration,
  amplitude,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.6,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating Y animation (looping)
    const floatY = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -amplitude,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: amplitude,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Floating X animation (looping)
    const floatX = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: amplitude * 0.5,
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -amplitude * 0.5,
          duration: duration * 1.2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Start floating after delay
    setTimeout(() => {
      floatY.start();
    }, delay);

    setTimeout(() => {
      floatX.start();
    }, delay + 200);

    return () => {
      floatY.stop();
      floatX.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: initialX,
          top: initialY,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
        },
      ]}
    />
  );
};

interface FloatingElementsProps {
  count?: number;
}

export const FloatingElements: React.FC<FloatingElementsProps> = ({
  count = 6,
}) => {
  // Pre-defined positions for more control
  const predefinedElements: FloatingElement[] = [
    {
      color: colors.playful.sky,
      size: 16,
      initialX: 20,
      initialY: 80,
      delay: 0,
      duration: 2500,
      amplitude: 10,
    },
    {
      color: colors.playful.mint,
      size: 12,
      initialX: 85,
      initialY: 120,
      delay: 300,
      duration: 2200,
      amplitude: 8,
    },
    {
      color: colors.playful.lavender,
      size: 20,
      initialX: 10,
      initialY: 200,
      delay: 600,
      duration: 2800,
      amplitude: 12,
    },
    {
      color: colors.playful.peach,
      size: 14,
      initialX: 90,
      initialY: 280,
      delay: 200,
      duration: 2400,
      amplitude: 9,
    },
    {
      color: colors.playful.sunshine,
      size: 18,
      initialX: 75,
      initialY: 400,
      delay: 400,
      duration: 2600,
      amplitude: 11,
    },
    {
      color: colors.playful.bubble,
      size: 15,
      initialX: 5,
      initialY: 350,
      delay: 500,
      duration: 2300,
      amplitude: 10,
    },
  ];

  return (
    <View style={styles.container} pointerEvents="none">
      {predefinedElements.slice(0, count).map((element, index) => (
        <FloatingBubble key={index} {...element} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
  },
});
