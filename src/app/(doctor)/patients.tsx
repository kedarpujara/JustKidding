import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Loading, EmptyState } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { appointmentsService, doctorsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function PatientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();

  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', userId],
    queryFn: () => doctorsService.getDoctorByProfileId(userId!),
    enabled: !!userId,
  });

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['doctorPatients', doctorProfile?.id],
    queryFn: () => appointmentsService.getDoctorPatients(doctorProfile!.id),
    enabled: !!doctorProfile?.id,
  });

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  const renderPatient = ({ item }: { item: { child: any; guardian: any; lastVisit: string } }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => router.push(`/(doctor)/patient/${item.child.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.patientRow}>
        <Avatar
          name={item.child.full_name}
          source={item.child.avatar_url}
          size="lg"
        />
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.child.full_name}</Text>
          <View style={styles.patientMeta}>
            <Text style={styles.metaText}>
              {item.child.gender === 'male' ? 'Boy' : item.child.gender === 'female' ? 'Girl' : 'Child'}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{calculateAge(item.child.date_of_birth)}</Text>
          </View>
          {item.guardian && (
            <View style={styles.guardianRow}>
              <Ionicons name="person-outline" size={14} color={colors.text.tertiary} />
              <Text style={styles.guardianText}>{item.guardian.full_name}</Text>
            </View>
          )}
        </View>
        <View style={styles.lastVisitContainer}>
          <View style={styles.lastVisit}>
            <Text style={styles.lastVisitLabel}>Last visit</Text>
            <Text style={styles.lastVisitDate}>
              {dateUtils.formatDate(item.lastVisit, 'dd MMM')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
        <Text style={styles.subtitle}>{patients.length} patient{patients.length !== 1 ? 's' : ''}</Text>
      </View>

      {isLoading ? (
        <Loading />
      ) : patients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="people-outline"
            title="No patients yet"
            description="Patients who book appointments with you will appear here."
          />
        </View>
      ) : (
        <FlatList
          data={patients}
          renderItem={renderPatient}
          keyExtractor={(item) => item.child.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  patientCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  patientName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  metaDot: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  guardianText: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  lastVisitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lastVisit: {
    alignItems: 'flex-end',
  },
  lastVisitLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  lastVisitDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
