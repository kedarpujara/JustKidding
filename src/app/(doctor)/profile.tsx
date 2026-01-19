import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AvatarPicker, Card } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { imageUtils } from '@/utils';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut, uploadAvatar } = useAuthStore();
  const [uploading, setUploading] = React.useState(false);

  const handleImageSelected = async (uri: string) => {
    try {
      setUploading(true);
      const compressed = await imageUtils.compressForAvatar(uri);
      const result = await uploadAvatar(compressed.uri);
      if (!result.success) {
        Alert.alert('Upload Failed', result.error || 'Failed to upload photo');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><Text style={styles.title}>Profile</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <AvatarPicker
            currentImage={profile?.avatar_url}
            name={profile?.full_name || 'Doctor'}
            size="xl"
            onImageSelected={handleImageSelected}
            disabled={uploading}
            hint="Tap to change photo"
          />
          <Text style={styles.name}>Dr. {profile?.full_name}</Text>
        </Card>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={colors.error[500]} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border.light },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.text.primary },
  content: { padding: spacing.lg },
  profileCard: { alignItems: 'center', paddingVertical: spacing['2xl'], marginBottom: spacing.xl },
  name: { fontSize: fontSizes.xl, fontWeight: fontWeights.semibold, color: colors.text.primary, marginTop: spacing.lg },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, paddingVertical: spacing.lg, borderRadius: borderRadius.xl, gap: spacing.sm },
  signOutText: { fontSize: fontSizes.base, fontWeight: fontWeights.medium, color: colors.error[500] },
});
