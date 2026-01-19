import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Avatar, Badge, Loading, EmptyState, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { childrenService, doctorsService } from '@/services';
import { helpers } from '@/utils/helpers';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Child, DoctorProfile, Profile } from '@/types';

type BookingStep = 'child' | 'doctor' | 'slot' | 'confirm';

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const { selectedChild, selectedDoctor, setSelectedChild, setSelectedDoctor } = useAppStore();

  const [step, setStep] = useState<BookingStep>('child');

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children', userId],
    queryFn: () => childrenService.getChildren(userId!),
    enabled: !!userId,
  });

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorsService.getDoctors(),
  });

  const { data: specializations = [] } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => doctorsService.getSpecializations(),
  });

  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
    setStep('doctor');
  };

  const handleViewProfile = (doctor: DoctorProfile & { profile: Profile }) => {
    setSelectedDoctor(doctor);
    router.push(`/(guardian)/book/doctor/${doctor.id}`);
  };

  const handleBookNow = (doctor: DoctorProfile & { profile: Profile }) => {
    setSelectedDoctor(doctor);
    router.push(`/(guardian)/book/slots/${doctor.id}`);
  };

  const renderChildSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Child</Text>
      <Text style={styles.stepSubtitle}>Choose which child this appointment is for</Text>

      {childrenLoading ? (
        <Loading />
      ) : children.length === 0 ? (
        <EmptyState
          icon="person-add-outline"
          title="No children added"
          description="Add a child profile to book an appointment"
          actionLabel="Add Child"
          onAction={() => router.push('/(guardian)/children/add')}
        />
      ) : (
        <View style={styles.childrenList}>
          {children.map((child) => (
            <Card
              key={child.id}
              style={[
                styles.childCard,
                selectedChild?.id === child.id && styles.childCardSelected,
              ]}
              onPress={() => handleChildSelect(child)}
            >
              <Avatar name={child.full_name} source={child.avatar_url} size="lg" />
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.full_name}</Text>
                <Text style={styles.childAge}>
                  {dateUtils.calculateAge(child.date_of_birth).display}
                </Text>
              </View>
              <View style={[
                styles.selectIndicator,
                selectedChild?.id === child.id && styles.selectIndicatorSelected,
              ]}>
                {selectedChild?.id === child.id && (
                  <Ionicons name="checkmark" size={16} color={colors.white} />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );

  const renderDoctorSelection = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backStep} onPress={() => setStep('child')}>
        <Ionicons name="arrow-back" size={20} color={colors.primary[600]} />
        <Text style={styles.backStepText}>Back to child selection</Text>
      </TouchableOpacity>

      <Text style={styles.stepTitle}>Choose a Doctor</Text>
      <Text style={styles.stepSubtitle}>Select a pediatrician for {selectedChild?.full_name}</Text>

      {doctorsLoading ? (
        <Loading />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="No doctors available"
          description="Please check back later"
        />
      ) : (
        <View style={styles.doctorsList}>
          {doctors.filter(d => d.profile).map((doctor) => (
            <Card
              key={doctor.id}
              style={styles.doctorCard}
              onPress={() => handleViewProfile(doctor)}
            >
              <View style={styles.doctorHeader}>
                <Avatar name={doctor.profile?.full_name || 'Doctor'} source={doctor.profile?.avatar_url} size="lg" />
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.profile?.full_name || 'Doctor'}</Text>
                  <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
                  <Text style={styles.doctorQualification}>{doctor.qualification}</Text>
                  <View style={styles.doctorMeta}>
                    <Text style={styles.doctorExperience}>
                      {doctor.experience_years} yrs exp
                    </Text>
                    <Text style={styles.doctorFee}>
                      {helpers.formatCurrency(doctor.consultation_fee)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.doctorFooter}>
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => handleViewProfile(doctor)}
                >
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookNowButton}
                  onPress={() => handleBookNow(doctor)}
                >
                  <Text style={styles.bookNowText}>Book Now</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Book Appointment</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 'child' && renderChildSelection()}
        {step === 'doctor' && renderDoctorSelection()}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  backStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backStepText: {
    fontSize: fontSizes.sm,
    color: colors.primary[600],
    marginLeft: spacing.xs,
  },
  childrenList: {
    gap: spacing.md,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  childInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  childName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  childAge: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  selectIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectIndicatorSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  doctorsList: {
    gap: spacing.md,
  },
  doctorCard: {
    padding: spacing.lg,
  },
  doctorHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  doctorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  doctorName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  doctorSpecialization: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  doctorQualification: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  doctorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  doctorExperience: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  doctorFee: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary[600],
  },
  doctorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  viewProfileButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[500],
    alignItems: 'center',
  },
  viewProfileText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  bookNowButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  bookNowText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.white,
  },
});
