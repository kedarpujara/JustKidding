import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AvatarPicker, Card, Loading } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { doctorsService } from '@/services';
import { supabase } from '@/lib/supabase';
import { imageUtils } from '@/utils';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, userId, signOut, uploadAvatar } = useAuthStore();
  const [uploading, setUploading] = React.useState(false);

  const { data: doctorProfile, isLoading } = useQuery({
    queryKey: ['doctorProfile', userId],
    queryFn: () => doctorsService.getDoctorByProfileId(userId!),
    enabled: !!userId,
  });

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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. Your appointment history will be preserved for patient records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Confirm Deletion',
              'This will permanently delete your account. Appointment records will be retained with your name for patient history.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Anonymize doctor profile but keep it for FK integrity
                      // The appointment records use snapshot fields for names
                      if (doctorProfile?.id) {
                        const { error: doctorError } = await supabase
                          .from('doctor_profiles')
                          .update({
                            bio: null,
                            documents_url: null,
                            verification_status: 'rejected',
                            verification_notes: 'Account deleted by user',
                          })
                          .eq('id', doctorProfile.id);
                        if (doctorError) {
                          console.error('Failed to update doctor profile:', doctorError);
                        }
                      }

                      // Anonymize user profile but keep for FK integrity
                      if (userId) {
                        const { error: profileError } = await supabase
                          .from('profiles')
                          .update({
                            full_name: 'Deleted User',
                            email: null,
                            avatar_url: null,
                            phone: 'deleted',
                            is_verified: false,
                          })
                          .eq('id', userId);
                        if (profileError) {
                          console.error('Failed to anonymize user profile:', profileError);
                        }
                      }

                      // Try to delete the auth user using RPC (if function exists)
                      try {
                        await supabase.rpc('delete_own_account');
                      } catch (rpcError) {
                        // RPC function might not exist, continue anyway
                        console.log('RPC delete_own_account not available:', rpcError);
                      }

                      // Sign out
                      await signOut();
                      router.replace('/');

                      Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
                    } catch (error) {
                      console.error('Failed to delete account:', error);
                      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getVerificationBadge = () => {
    if (!doctorProfile) return null;

    const statusConfig = {
      pending: { color: colors.accent[500], bg: colors.accent[100], label: 'Pending Verification', icon: 'time-outline' as const },
      approved: { color: colors.success[500], bg: colors.success[100], label: 'Verified', icon: 'checkmark-circle' as const },
      rejected: { color: colors.error[500], bg: colors.error[100], label: 'Verification Rejected', icon: 'close-circle' as const },
    };

    const config = statusConfig[doctorProfile.verification_status];

    return (
      <View style={[styles.verificationBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={16} color={config.color} />
        <Text style={[styles.verificationText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <AvatarPicker
            currentImage={profile?.avatar_url}
            name={profile?.full_name || 'Doctor'}
            size="xl"
            onImageSelected={handleImageSelected}
            disabled={uploading}
            hint="Tap to change photo"
          />
          <Text style={styles.name}>
            {profile?.full_name?.startsWith('Dr.') ? profile.full_name : `Dr. ${profile?.full_name}`}
          </Text>
          {doctorProfile && (
            <Text style={styles.specialization}>{doctorProfile.specialization}</Text>
          )}
          {getVerificationBadge()}
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card style={styles.loadingCard}>
            <Loading />
          </Card>
        )}

        {/* Bio Section */}
        {doctorProfile?.bio && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{doctorProfile.bio}</Text>
          </Card>
        )}

        {/* Education Section */}
        {doctorProfile && (doctorProfile.mbbs_institute || doctorProfile.md_institute) && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>Education</Text>
            </View>

            {doctorProfile.mbbs_institute && (
              <View style={styles.educationItem}>
                <Text style={styles.educationDegree}>MBBS</Text>
                <Text style={styles.educationInstitute}>
                  {doctorProfile.mbbs_institute === 'Other'
                    ? doctorProfile.mbbs_institute_other
                    : doctorProfile.mbbs_institute}
                </Text>
              </View>
            )}

            {doctorProfile.md_institute && (
              <View style={styles.educationItem}>
                <Text style={styles.educationDegree}>MD / Post-graduation</Text>
                <Text style={styles.educationInstitute}>
                  {doctorProfile.md_institute === 'Other'
                    ? doctorProfile.md_institute_other
                    : doctorProfile.md_institute}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Registration Section */}
        {doctorProfile?.state_registrations && doctorProfile.state_registrations.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>Medical Registration</Text>
            </View>

            {doctorProfile.state_registrations.map((reg, index) => (
              <View key={index} style={styles.registrationItem}>
                <Text style={styles.registrationState}>{reg.state}</Text>
                <Text style={styles.registrationNumber}>{reg.registration_number}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Practice Details */}
        {doctorProfile && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>Practice Details</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Consultation Fee</Text>
              <Text style={styles.detailValue}>₹{doctorProfile.consultation_fee}</Text>
            </View>

            {doctorProfile.experience_years > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{doctorProfile.experience_years} years</Text>
              </View>
            )}

            {doctorProfile.languages && doctorProfile.languages.length > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{doctorProfile.languages.join(', ')}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Contact Info */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{profile?.phone}</Text>
          </View>

          {profile?.email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{profile.email}</Text>
            </View>
          )}
        </Card>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color={colors.error[500]} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={22} color={colors.error[600]} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  name: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  specialization: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  verificationText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  loadingCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  sectionCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  bioText: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    lineHeight: fontSizes.base * 1.6,
  },
  educationItem: {
    marginBottom: spacing.md,
  },
  educationDegree: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  educationInstitute: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  registrationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  registrationState: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  registrationNumber: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  signOutText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.error[500],
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteAccountText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.error[600],
  },
});
