import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { colors, fontSizes, fontWeights } from '@/lib/theme';
import { helpers } from '@/utils/helpers';

interface AvatarProps {
  source?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  style,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when source changes
  useEffect(() => {
    setImageError(false);
  }, [source]);

  const getSizeValue = () => {
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 64;
      case 'xl':
        return 96;
      case 'xxl':
        return 120;
      default:
        return 48;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return fontSizes.xs;
      case 'lg':
        return fontSizes.xl;
      case 'xl':
        return fontSizes['3xl'];
      case 'xxl':
        return fontSizes['4xl'];
      default:
        return fontSizes.base;
    }
  };

  const sizeValue = getSizeValue();
  const initials = helpers.getInitials(name);

  const containerStyle: ViewStyle = {
    width: sizeValue,
    height: sizeValue,
    borderRadius: sizeValue / 2,
  };

  const imageContainerStyle: ImageStyle = {
    width: sizeValue,
    height: sizeValue,
    borderRadius: sizeValue / 2,
  };

  // Show initials fallback if no source or image failed to load
  if (!source || imageError) {
    return (
      <View style={[styles.placeholder, containerStyle, style]}>
        <Text style={[styles.initials, { fontSize: getFontSize() }]}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={[styles.image, imageContainerStyle]}
      onError={() => setImageError(true)}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.neutral[200],
  },
  placeholder: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary[700],
    fontWeight: fontWeights.semibold,
  },
});
