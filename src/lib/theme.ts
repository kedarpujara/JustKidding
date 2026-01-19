import { Platform } from 'react-native';

export const colors = {
  // Primary - Soft Coral (warm, inviting, kid-friendly)
  primary: {
    50: '#FFF5F3',
    100: '#FFE8E3',
    200: '#FFD5CC',
    300: '#FFB8A8',
    400: '#FF9580',
    500: '#FF7A5C',
    600: '#F06449',
    700: '#D94D34',
    800: '#B33D2A',
    900: '#8F3122',
  },

  // Secondary - Soft Teal (calming, trustworthy)
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },

  // Accent - Sunshine Yellow (playful, happy)
  accent: {
    50: '#FFFEF5',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FADF4A',
    500: '#EAB308',
    600: '#CA8A04',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
  },

  // Playful palette - additional kid-friendly colors
  playful: {
    sky: '#7DD3FC',
    mint: '#86EFAC',
    lavender: '#C4B5FD',
    peach: '#FECACA',
    sunshine: '#FDE68A',
    bubble: '#E0E7FF',
    coral: '#FF9580',
  },

  // Success - Green
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Error - Red
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutral - Gray
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Background colors - warmer tones
  background: {
    primary: '#FFFCFA',
    secondary: '#FFF8F5',
    tertiary: '#FFF1EB',
  },

  // Text colors
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  // Border colors
  border: {
    light: '#F3E8E4',
    default: '#E8DCD7',
    dark: '#9CA3AF',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const fontWeights = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

// Increased border radius for softer, more playful feel
export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  '3xl': 36,
  full: 9999,
};

export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
  // Playful colored shadow for special elements
  playful: Platform.select({
    ios: {
      shadowColor: '#FF7A5C',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
};

export const theme = {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  lineHeights,
  borderRadius,
  shadows,
};

export type Theme = typeof theme;
