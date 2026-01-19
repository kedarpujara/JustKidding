import { Easing } from 'react-native';

// Spring configurations for playful feel
export const springConfigs = {
  gentle: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 150,
    mass: 0.8,
  },
  snappy: {
    damping: 20,
    stiffness: 200,
    mass: 0.5,
  },
  wobbly: {
    damping: 8,
    stiffness: 120,
    mass: 1,
  },
};

// Timing configurations
export const timingConfigs = {
  fast: { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
  normal: { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
  slow: { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
  playful: { duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1) },
};

// Stagger delay for list items
export const staggerDelay = (index: number, baseDelay: number = 100) => {
  return index * baseDelay;
};

// Button press scale values
export const buttonPressScale = {
  pressed: 0.96,
  normal: 1,
};

// Floating animation values
export const floatValues = {
  amplitude: 8,
  duration: 2000,
};
