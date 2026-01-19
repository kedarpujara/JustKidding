import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { appointmentsService, doctorsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Appointment } from '@/types';

export default function DoctorHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, userId } = useAuthStore();

  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', userId],
    queryFn: () => doctorsService.getDoctorByProfileId(userId!),
    enabled: !!userId,
  });

  const { data: todaysAppointments = [], isLoading } = useQuery({
    queryKey: ['todaysAppointments', doctorProfile?.id],
    queryFn: () => appointmentsService.getTodaysAppointments(doctorProfile!.id),
    enabled: !!doctorProfile?.id,
  });

  const nextAppointment = todaysAppointments.find(a => a.status === 'scheduled');
  const completedToday = todaysAppointments.filter(a => a.status === 'completed').length;
  const pendingToday = todaysAppointments.filter(a => a.status === 'scheduled').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()}, {profile?.full_name?.replace(/^Dr\.?\s*/i, '').split(' ')[0]}</Text>
            <Text style={styles.date}>{dateUtils.formatDate(new Date(), 'EEEE, dd MMMM')}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{pendingToday}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{todaysAppointments.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </Card>
        </View>

        {/* Next Appointment */}
        {nextAppointment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next Appointment</Text>
            <Card style={styles.nextAppointmentCard}>
              <View style={styles.appointmentHeader}>
                <Avatar name={nextAppointment.child?.full_name || 'Patient'} source={nextAppointment.child?.avatar_url} size="lg" />
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>{nextAppointment.child?.full_name}</Text>
                  <Text style={styles.appointmentTime}>
                    {dateUtils.formatTime(nextAppointment.scheduled_at)}
                  </Text>
                </View>
                <Badge label="Upcoming" variant="info" />
              </View>
              {nextAppointment.chief_complaint && (
                <View style={styles.complaintContainer}>
                  <Text style={styles.complaintLabel}>Chief Complaint:</Text>
                  <Text style={styles.complaintText}>{nextAppointment.chief_complaint}</Text>
                </View>
              )}
              <View style={styles.appointmentActions}>
                <Button
                  title="View Intake"
                  variant="outline"
                  size="sm"
                  onPress={() => router.push(`/(doctor)/appointment/${nextAppointment.id}/intake`)}
                  style={styles.actionButton}
                />
                <Button
                  title="Start Call"
                  size="sm"
                  onPress={() => router.push(`/(doctor)/video/${nextAppointment.id}`)}
                  style={styles.actionButton}
                  icon={<Ionicons name="videocam" size={16} color={colors.white} />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => router.push('/(doctor)/schedule')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Loading />
          ) : todaysAppointments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="calendar-outline"
                title="No appointments today"
                description="Enjoy your day off!"
              />
            </Card>
          ) : (
            todaysAppointments.map((appointment) => (
              <AppointmentItem
                key={appointment.id}
                appointment={appointment}
                onPress={() => router.push(`/(doctor)/appointment/${appointment.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

interface AppointmentItemProps {
  appointment: Appointment;
  onPress: () => void;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({ appointment, onPress }) => {
  const statusConfig = {
    scheduled: { color: colors.primary[500], bg: colors.primary[100] },
    live: { color: colors.secondary[500], bg: colors.secondary[100] },
    completed: { color: colors.neutral[500], bg: colors.neutral[100] },
    canceled: { color: colors.error[500], bg: colors.error[100] },
    no_show: { color: colors.error[500], bg: colors.error[100] },
    pending_payment: { color: colors.accent[500], bg: colors.accent[100] },
  };

  const config = statusConfig[appointment.status];

  return (
    <TouchableOpacity style={styles.appointmentItem} onPress={onPress}>
      <View style={[styles.timeIndicator, { backgroundColor: config.bg }]}>
        <Text style={[styles.timeText, { color: config.color }]}>
          {dateUtils.formatTime(appointment.scheduled_at)}
        </Text>
      </View>
      <View style={styles.appointmentItemContent}>
        <Text style={styles.appointmentPatient}>{appointment.child?.full_name}</Text>
        <Text style={styles.appointmentComplaint} numberOfLines={1}>
          {appointment.chief_complaint || 'No complaint specified'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  greeting: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  date: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  seeAllText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  nextAppointmentCard: {
    padding: spacing.lg,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  patientName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  appointmentTime: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  complaintContainer: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  complaintLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  complaintText: {
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  emptyCard: {
    padding: spacing.xl,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  timeIndicator: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
  },
  timeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  appointmentItemContent: {
    flex: 1,
  },
  appointmentPatient: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  appointmentComplaint: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
