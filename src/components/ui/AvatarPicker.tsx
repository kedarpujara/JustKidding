import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  Text,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { colors, spacing, fontSizes } from '@/lib/theme';

interface AvatarPickerProps {
  currentImage?: string;
  name: string;
  size?: 'md' | 'lg' | 'xl' | 'xxl';
  onImageSelected: (uri: string) => Promise<void>;
  disabled?: boolean;
  hint?: string;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentImage,
  name,
  size = 'xl',
  onImageSelected,
  disabled = false,
  hint,
}) => {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and photo library permissions to upload photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    };

    try {
      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        try {
          await onImageSelected(result.assets[0].uri);
        } catch (error) {
          Alert.alert(
            'Upload Failed',
            (error as Error).message || 'Failed to upload image'
          );
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const showOptions = () => {
    if (disabled || loading) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          if (buttonIndex === 2) pickImage(false);
        }
      );
    } else {
      Alert.alert('Change Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
      ]);
    }
  };

  const getSizeValue = () => {
    switch (size) {
      case 'md':
        return 48;
      case 'lg':
        return 64;
      case 'xl':
        return 96;
      case 'xxl':
        return 120;
      default:
        return 96;
    }
  };

  const sizeValue = getSizeValue();

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        onPress={showOptions}
        disabled={disabled || loading}
        activeOpacity={0.7}
      >
        <Avatar source={currentImage} name={name} size={size} />

        {loading ? (
          <View
            style={[
              styles.overlay,
              {
                width: sizeValue,
                height: sizeValue,
                borderRadius: sizeValue / 2,
              },
            ]}
          >
            <ActivityIndicator color={colors.white} />
          </View>
        ) : (
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={16} color={colors.white} />
          </View>
        )}
      </TouchableOpacity>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
