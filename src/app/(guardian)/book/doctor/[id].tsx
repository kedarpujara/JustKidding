import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, Button } from '@/components/ui';
import { useAppStore } from '@/stores/appStore';
import { doctorsService } from '@/services';
import { helpers } from '@/utils/helpers';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { id: doctorId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { setSelectedDoctor } = useAppStore();

  const { data: doctor, isLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorsService.getDoctor(doctorId!),
    enabled: !!doctorId,
  });

  const handleBookAppointment = () => {
    if (doctor) {
      setSelectedDoctor(doctor);
      router.push(`/(guardian)/book/slots/${doctor.id}`);
    }
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!doctor) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Doctor not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              name={doctor.profile?.full_name || 'Doctor'}
              source={doctor.profile?.avatar_url}
              size="xl"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.doctorName}>
                {doctor.profile?.full_name}
              </Text>
              <Text style={styles.specialization}>{doctor.specialization}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success[600]} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{doctor.experience_years}+</Text>
              <Text style={styles.statLabel}>Years Exp.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{helpers.formatCurrency(doctor.consultation_fee)}</Text>
              <Text style={styles.statLabel}>Per Consult</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </Card>

        {/* Qualification */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="school-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>Qualification</Text>
          </View>
          <Text style={styles.sectionContent}>{doctor.qualification}</Text>
        </Card>

        {/* Registration */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>Medical Registration</Text>
          </View>
          <Text style={styles.sectionContent}>{doctor.registration_number}</Text>
        </Card>

        {/* Languages */}
        {doctor.languages && doctor.languages.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>Languages</Text>
            </View>
            <View style={styles.languagesRow}>
              {doctor.languages.map((lang, index) => (
                <Badge key={index} label={lang} variant="default" size="sm" />
              ))}
            </View>
          </Card>
        )}

        {/* About */}
        {doctor.bio && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{doctor.bio}</Text>
          </Card>
        )}

        {/* Consultation Info */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="videocam-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.sectionTitle}>Consultation</Text>
          </View>
          <View style={styles.consultInfo}>
            <View style={styles.consultItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success[600]} />
              <Text style={styles.consultText}>Video consultations available</Text>
            </View>
            <View style={styles.consultItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success[600]} />
              <Text style={styles.consultText}>Digital prescriptions</Text>
            </View>
            <View style={styles.consultItem}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success[600]} />
              <Text style={styles.consultText}>Follow-up support</Text>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.feeInfo}>
          <Text style={styles.feeLabel}>Consultation Fee</Text>
          <Text style={styles.feeValue}>{helpers.formatCurrency(doctor.consultation_fee)}</Text>
        </View>
        <Button
          title="Book Appointment"
          onPress={handleBookAppointment}
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  profileCard: {
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  doctorName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  specialization: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  verifiedText: {
    fontSize: fontSizes.sm,
    color: colors.success[600],
    marginLeft: spacing.xs,
    fontWeight: fontWeights.medium,
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.primary[600],
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border.light,
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  bioText: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  consultInfo: {
    gap: spacing.sm,
  },
  consultItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultText: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  bottomAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  feeInfo: {
    flex: 1,
  },
  feeLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  feeValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  bookButton: {
    flex: 1,
    marginLeft: spacing.md,
  },
});
