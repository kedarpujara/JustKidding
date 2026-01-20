import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Loading, EmptyState, Button } from '@/components/ui';
import { appointmentsService, intakeService, consultService } from '@/services';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { id: appointmentId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // Get appointment details
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentsService.getAppointment(appointmentId!),
    enabled: !!appointmentId,
  });

  // Get intake response
  const { data: intakeResponse } = useQuery({
    queryKey: ['intakeResponse', appointmentId],
    queryFn: () => intakeService.getIntakeResponse(appointmentId!),
    enabled: !!appointmentId,
  });

  // Get consult notes
  const { data: consultNote } = useQuery({
    queryKey: ['consultNote', appointmentId],
    queryFn: () => consultService.getConsultNote(appointmentId!),
    enabled: !!appointmentId,
  });

  // Get prescription
  const { data: prescription } = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: () => consultService.getPrescription(appointmentId!),
    enabled: !!appointmentId,
  });

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    scheduled: { color: colors.primary[500], bg: colors.primary[100], label: 'Scheduled' },
    live: { color: colors.secondary[500], bg: colors.secondary[100], label: 'In Progress' },
    completed: { color: colors.success[500], bg: colors.success[100], label: 'Completed' },
    canceled: { color: colors.error[500], bg: colors.error[100], label: 'Cancelled' },
    no_show: { color: colors.error[500], bg: colors.error[100], label: 'No Show' },
    pending_payment: { color: colors.accent[500], bg: colors.accent[100], label: 'Pending Payment' },
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  if (appointmentLoading) {
    return <Loading fullScreen />;
  }

  if (!appointment) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Appointment</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="calendar-outline"
            title="Appointment not found"
            description="This appointment could not be found."
          />
        </View>
      </View>
    );
  }

  const config = statusConfig[appointment.status] || statusConfig.scheduled;
  const child = appointment.child;
  const guardian = appointment.guardian;
  const intakeData = intakeResponse?.responses as Record<string, any> || {};

  // Get display values with fallbacks for deleted accounts
  const childName = child?.full_name || appointment.child_name || 'Unknown Patient';
  const childDob = child?.date_of_birth || appointment.child_dob;
  const guardianName = guardian?.full_name || appointment.guardian_name || 'Unknown Guardian';
  const guardianPhone = guardian?.phone || appointment.guardian_phone;
  const guardianAvatar = guardian?.avatar_url;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Appointment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Date Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Text style={styles.appointmentDate}>
              {dateUtils.formatDate(appointment.scheduled_at, 'EEEE, dd MMM yyyy')}
            </Text>
          </View>
          <Text style={styles.appointmentTime}>
            {dateUtils.formatTime(appointment.scheduled_at)}
          </Text>
          {appointment.chief_complaint && (
            <View style={styles.complaintBox}>
              <Text style={styles.complaintLabel}>Chief Complaint</Text>
              <Text style={styles.complaintText}>{appointment.chief_complaint}</Text>
            </View>
          )}
        </Card>

        {/* Patient Card */}
        {(child || appointment.child_name) && (
          <TouchableOpacity
            style={styles.patientCard}
            onPress={() => child ? router.push(`/(doctor)/patient/${child.id}`) : null}
            disabled={!child}
          >
            <Card>
              <View style={styles.patientRow}>
                <Avatar name={childName} source={child?.avatar_url} size="lg" />
                <View style={styles.patientInfo}>
                  <Text style={styles.patientName}>{childName}</Text>
                  <View style={styles.patientMeta}>
                    {child?.gender && (
                      <>
                        <Text style={styles.metaText}>
                          {child.gender === 'male' ? 'Boy' : child.gender === 'female' ? 'Girl' : 'Child'}
                        </Text>
                        <Text style={styles.metaDot}>•</Text>
                      </>
                    )}
                    {childDob && (
                      <Text style={styles.metaText}>{calculateAge(childDob)}</Text>
                    )}
                  </View>
                </View>
                {child && (
                  <View style={styles.viewProfileButton}>
                    <Text style={styles.viewProfileText}>View Profile</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary[600]} />
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Guardian Info */}
        {(guardian || appointment.guardian_name) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Guardian</Text>
            <View style={styles.guardianRow}>
              <Avatar
                name={guardianName}
                source={guardianAvatar}
                size="md"
              />
              <View style={styles.guardianInfo}>
                <Text style={styles.guardianName}>{guardianName}</Text>
                {guardianPhone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${guardianPhone}`)}>
                    <Text style={styles.guardianPhone}>{guardianPhone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Intake Form Data */}
        {intakeResponse && Object.keys(intakeData).length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Intake Information</Text>

            {/* Vitals */}
            {(intakeData.height || intakeData.weight || intakeData.temperature) && (
              <View style={styles.vitalsGrid}>
                {intakeData.height && (
                  <View style={styles.vitalItem}>
                    <Ionicons name="resize-outline" size={20} color={colors.primary[500]} />
                    <Text style={styles.vitalValue}>{intakeData.height} cm</Text>
                    <Text style={styles.vitalLabel}>Height</Text>
                  </View>
                )}
                {intakeData.weight && (
                  <View style={styles.vitalItem}>
                    <Ionicons name="fitness-outline" size={20} color={colors.primary[500]} />
                    <Text style={styles.vitalValue}>{intakeData.weight} kg</Text>
                    <Text style={styles.vitalLabel}>Weight</Text>
                  </View>
                )}
                {intakeData.temperature && (
                  <View style={styles.vitalItem}>
                    <Ionicons name="thermometer-outline" size={20} color={colors.primary[500]} />
                    <Text style={styles.vitalValue}>{intakeData.temperature}°F</Text>
                    <Text style={styles.vitalLabel}>Temperature</Text>
                  </View>
                )}
              </View>
            )}

            {/* Symptoms */}
            {intakeData.symptoms && (
              <View style={styles.intakeItem}>
                <Text style={styles.intakeLabel}>Symptoms</Text>
                <Text style={styles.intakeValue}>
                  {Array.isArray(intakeData.symptoms)
                    ? intakeData.symptoms.join(', ')
                    : intakeData.symptoms}
                </Text>
              </View>
            )}

            {/* Duration */}
            {intakeData.symptom_duration && (
              <View style={styles.intakeItem}>
                <Text style={styles.intakeLabel}>Duration</Text>
                <Text style={styles.intakeValue}>{intakeData.symptom_duration}</Text>
              </View>
            )}

            {/* Additional Notes */}
            {intakeData.additional_notes && (
              <View style={styles.intakeItem}>
                <Text style={styles.intakeLabel}>Additional Notes</Text>
                <Text style={styles.intakeValue}>{intakeData.additional_notes}</Text>
              </View>
            )}

            {/* Medical History */}
            {intakeData.medical_history && (
              <View style={styles.intakeItem}>
                <Text style={styles.intakeLabel}>Medical History</Text>
                <Text style={styles.intakeValue}>{intakeData.medical_history}</Text>
              </View>
            )}

            {/* Current Medications */}
            {intakeData.current_medications && (
              <View style={styles.intakeItem}>
                <Text style={styles.intakeLabel}>Current Medications</Text>
                <Text style={styles.intakeValue}>{intakeData.current_medications}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Consultation Notes */}
        {consultNote && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Consultation Notes</Text>
            {consultNote.diagnosis && (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Diagnosis</Text>
                <Text style={styles.noteValue}>{consultNote.diagnosis}</Text>
              </View>
            )}
            {consultNote.notes && (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Notes</Text>
                <Text style={styles.noteValue}>{consultNote.notes}</Text>
              </View>
            )}
            {consultNote.recommendations && (
              <View style={styles.noteItem}>
                <Text style={styles.noteLabel}>Recommendations</Text>
                <Text style={styles.noteValue}>{consultNote.recommendations}</Text>
              </View>
            )}
            {consultNote.follow_up_required && (
              <View style={styles.followUpBadge}>
                <Ionicons name="calendar" size={16} color={colors.accent[600]} />
                <Text style={styles.followUpText}>Follow-up Required</Text>
              </View>
            )}
          </Card>
        )}

        {/* Prescription */}
        {prescription && (
          <Card style={styles.section}>
            <View style={styles.prescriptionHeader}>
              <Text style={styles.sectionTitle}>Prescription</Text>
              {prescription.pdf_url && (
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => Linking.openURL(prescription.pdf_url!)}
                >
                  <Ionicons name="download-outline" size={18} color={colors.primary[600]} />
                  <Text style={styles.downloadText}>Download PDF</Text>
                </TouchableOpacity>
              )}
            </View>

            {prescription.medications?.map((med: any, index: number) => (
              <View key={index} style={styles.medicationItem}>
                <View style={styles.medHeader}>
                  <Ionicons name="medical" size={16} color={colors.primary[500]} />
                  <Text style={styles.medName}>{med.name}</Text>
                </View>
                <View style={styles.medDetails}>
                  <Text style={styles.medDetail}>Dosage: {med.dosage}</Text>
                  <Text style={styles.medDetail}>Frequency: {med.frequency}</Text>
                  {med.duration && <Text style={styles.medDetail}>Duration: {med.duration}</Text>}
                  {med.instructions && (
                    <Text style={styles.medInstructions}>{med.instructions}</Text>
                  )}
                </View>
              </View>
            ))}

            {prescription.instructions && (
              <View style={styles.prescriptionNotes}>
                <Text style={styles.prescriptionNotesLabel}>Instructions</Text>
                <Text style={styles.prescriptionNotesText}>{prescription.instructions}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        {(appointment.status === 'scheduled' || appointment.status === 'pending_payment') && (
          <View style={styles.actionButtons}>
            <Button
              title="Start Video Call"
              onPress={() => router.push(`/(doctor)/video/${appointment.id}`)}
              icon={<Ionicons name="videocam" size={20} color={colors.white} />}
              fullWidth
            />
          </View>
        )}
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
  statusCard: {
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  appointmentDate: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  appointmentTime: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  complaintBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
  },
  complaintLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  complaintText: {
    fontSize: fontSizes.base,
    color: colors.text.primary,
  },
  patientCard: {
    marginBottom: spacing.md,
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
    fontSize: fontSizes.lg,
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
    marginHorizontal: spacing.xs,
    color: colors.text.tertiary,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewProfileText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
    color: colors.primary[600],
    marginTop: spacing.xs,
  },
  vitalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  vitalItem: {
    alignItems: 'center',
  },
  vitalValue: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  vitalLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  intakeItem: {
    marginBottom: spacing.md,
  },
  intakeLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  intakeValue: {
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },
  noteItem: {
    marginBottom: spacing.md,
  },
  noteLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  noteValue: {
    fontSize: fontSizes.sm,
    color: colors.text.primary,
    lineHeight: fontSizes.sm * 1.5,
  },
  followUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  followUpText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.accent[600],
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  downloadText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  medicationItem: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  medName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  medDetails: {
    marginLeft: spacing.lg + spacing.sm,
  },
  medDetail: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  medInstructions: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  prescriptionNotes: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  prescriptionNotesLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  prescriptionNotesText: {
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },
  actionButtons: {
    marginTop: spacing.lg,
  },
});
