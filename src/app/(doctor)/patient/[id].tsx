import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { appointmentsService, doctorsService, consultService } from '@/services';
import { supabase } from '@/lib/supabase';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Appointment, Prescription } from '@/types';

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id: childId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();

  // Get child details
  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ['child', childId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('children')
        .select('*, guardian:profiles!children_guardian_id_fkey(*)')
        .eq('id', childId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!childId,
  });

  // Get doctor profile for filtering appointments
  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', userId],
    queryFn: () => doctorsService.getDoctorByProfileId(userId!),
    enabled: !!userId,
  });

  // Get all appointments for this child with this doctor
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['childAppointments', childId, doctorProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          child:children(*),
          doctor:doctor_profiles(*, profile:profiles(*)),
          slot:appointment_slots(*)
        `)
        .eq('child_id', childId)
        .eq('doctor_id', doctorProfile!.id)
        .order('scheduled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!childId && !!doctorProfile?.id,
  });

  // Get prescriptions for this child from this doctor
  const { data: prescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['childPrescriptions', childId, doctorProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('child_id', childId)
        .eq('doctor_id', doctorProfile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!childId && !!doctorProfile?.id,
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
      return `${months} month${months !== 1 ? 's' : ''} old`;
    }
    return `${years} year${years !== 1 ? 's' : ''} old`;
  };

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    scheduled: { color: colors.primary[500], bg: colors.primary[100], label: 'Scheduled' },
    live: { color: colors.secondary[500], bg: colors.secondary[100], label: 'Live' },
    completed: { color: colors.success[500], bg: colors.success[100], label: 'Completed' },
    canceled: { color: colors.error[500], bg: colors.error[100], label: 'Cancelled' },
    no_show: { color: colors.error[500], bg: colors.error[100], label: 'No Show' },
    pending_payment: { color: colors.accent[500], bg: colors.accent[100], label: 'Pending' },
  };

  const isLoading = childLoading || appointmentsLoading || prescriptionsLoading;

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!child) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Patient Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="person-outline"
            title="Patient not found"
            description="This patient record could not be found."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Patient Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <Card style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <Avatar
              name={child.full_name}
              source={child.avatar_url}
              size="xl"
            />
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{child.full_name}</Text>
              <View style={styles.patientMeta}>
                <Text style={styles.metaText}>
                  {child.gender === 'male' ? 'Boy' : child.gender === 'female' ? 'Girl' : 'Child'}
                </Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaText}>{calculateAge(child.date_of_birth)}</Text>
              </View>
              <Text style={styles.dobText}>
                DOB: {dateUtils.formatDate(child.date_of_birth, 'dd MMM yyyy')}
              </Text>
            </View>
          </View>

          {/* Guardian Info */}
          {child.guardian && (
            <View style={styles.guardianSection}>
              <Text style={styles.sectionLabel}>Guardian</Text>
              <View style={styles.guardianRow}>
                <Avatar
                  name={child.guardian.full_name}
                  source={child.guardian.avatar_url}
                  size="sm"
                />
                <View style={styles.guardianInfo}>
                  <Text style={styles.guardianName}>{child.guardian.full_name}</Text>
                  {child.guardian.phone && (
                    <Text style={styles.guardianPhone}>{child.guardian.phone}</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Medical Info */}
          {(child.blood_group || child.allergies?.length > 0) && (
            <View style={styles.medicalSection}>
              <Text style={styles.sectionLabel}>Medical Information</Text>
              <View style={styles.medicalGrid}>
                {child.blood_group && (
                  <View style={styles.medicalItem}>
                    <Text style={styles.medicalLabel}>Blood Group</Text>
                    <Text style={styles.medicalValue}>{child.blood_group}</Text>
                  </View>
                )}
                {child.allergies?.length > 0 && (
                  <View style={styles.medicalItem}>
                    <Text style={styles.medicalLabel}>Allergies</Text>
                    <Text style={styles.medicalValue}>{child.allergies.join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Total Visits</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{prescriptions.length}</Text>
            <Text style={styles.statLabel}>Prescriptions</Text>
          </Card>
        </View>

        {/* Appointment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment History</Text>
          {appointments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="calendar-outline"
                title="No appointments yet"
                description="No appointment history with this patient."
              />
            </Card>
          ) : (
            appointments.map((appointment) => {
              const config = statusConfig[appointment.status] || statusConfig.scheduled;
              return (
                <TouchableOpacity
                  key={appointment.id}
                  style={styles.appointmentCard}
                  onPress={() => router.push(`/(doctor)/appointment/${appointment.id}`)}
                >
                  <View style={styles.appointmentRow}>
                    <View style={styles.appointmentDateCol}>
                      <Text style={styles.appointmentDate}>
                        {dateUtils.formatDate(appointment.scheduled_at, 'dd MMM')}
                      </Text>
                      <Text style={styles.appointmentYear}>
                        {dateUtils.formatDate(appointment.scheduled_at, 'yyyy')}
                      </Text>
                    </View>
                    <View style={styles.appointmentContent}>
                      <Text style={styles.appointmentTime}>
                        {dateUtils.formatTime(appointment.scheduled_at)}
                      </Text>
                      {appointment.chief_complaint && (
                        <Text style={styles.complaint} numberOfLines={2}>
                          {appointment.chief_complaint}
                        </Text>
                      )}
                      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                        <Text style={[styles.statusText, { color: config.color }]}>
                          {config.label}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Prescriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescriptions</Text>
          {prescriptions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="document-text-outline"
                title="No prescriptions"
                description="No prescriptions issued for this patient yet."
              />
            </Card>
          ) : (
            prescriptions.map((prescription) => (
              <Card key={prescription.id} style={styles.prescriptionCard}>
                <View style={styles.prescriptionHeader}>
                  <Ionicons name="document-text" size={24} color={colors.primary[500]} />
                  <View style={styles.prescriptionInfo}>
                    <Text style={styles.prescriptionDate}>
                      {dateUtils.formatDate(prescription.created_at, 'dd MMM yyyy')}
                    </Text>
                    <Text style={styles.prescriptionMeds}>
                      {prescription.medications?.length || 0} medication(s)
                    </Text>
                  </View>
                  {prescription.pdf_url && (
                    <TouchableOpacity style={styles.downloadButton}>
                      <Ionicons name="download-outline" size={20} color={colors.primary[600]} />
                    </TouchableOpacity>
                  )}
                </View>
                {prescription.medications?.slice(0, 3).map((med: any, index: number) => (
                  <View key={index} style={styles.medItem}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medDosage}>{med.dosage} - {med.frequency}</Text>
                  </View>
                ))}
                {prescription.medications?.length > 3 && (
                  <Text style={styles.moreMeds}>
                    +{prescription.medications.length - 3} more
                  </Text>
                )}
              </Card>
            ))
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  patientCard: {
    marginBottom: spacing.lg,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  patientName: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
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
  dobText: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  guardianSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guardianInfo: {
    marginLeft: spacing.md,
  },
  guardianName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  guardianPhone: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  medicalSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  medicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  medicalItem: {
    flex: 1,
    minWidth: '45%',
  },
  medicalLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  medicalValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.primary[600],
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptyCard: {
    padding: spacing.xl,
  },
  appointmentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentDateCol: {
    alignItems: 'center',
    width: 50,
    marginRight: spacing.md,
  },
  appointmentDate: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: colors.primary[600],
  },
  appointmentYear: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  appointmentContent: {
    flex: 1,
  },
  appointmentTime: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  complaint: {
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  prescriptionCard: {
    marginBottom: spacing.sm,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  prescriptionInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  prescriptionDate: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  prescriptionMeds: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  downloadButton: {
    padding: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  medItem: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  medName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  medDosage: {
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  moreMeds: {
    fontSize: fontSizes.xs,
    color: colors.primary[600],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
