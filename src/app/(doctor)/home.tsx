import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Loading, EmptyState } from '@/components/ui';
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

  const { data: upcomingAppointments = [], isLoading } = useQuery({
    queryKey: ['upcomingAppointments', doctorProfile?.id],
    queryFn: () => appointmentsService.getDoctorUpcomingAppointments(doctorProfile!.id),
    enabled: !!doctorProfile?.id,
  });

  // Get today's appointments for stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysAppointments = upcomingAppointments.filter(a => {
    const scheduledDate = new Date(a.scheduled_at);
    return scheduledDate >= today && scheduledDate < tomorrow;
  });

  const pendingToday = todaysAppointments.filter(a => a.status === 'scheduled' || a.status === 'pending_payment').length;
  const totalUpcoming = upcomingAppointments.length;

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
            <Text style={styles.statLabel}>Today</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{totalUpcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{todaysAppointments.length}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </Card>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            <TouchableOpacity onPress={() => router.push('/(doctor)/schedule')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Loading />
          ) : upcomingAppointments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="calendar-outline"
                title="No upcoming appointments"
                description="When patients book, they'll appear here."
              />
            </Card>
          ) : (
            upcomingAppointments.slice(0, 5).map((appointment) => (
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
    scheduled: { color: colors.primary[500], bg: colors.primary[100], label: 'Confirmed' },
    live: { color: colors.secondary[500], bg: colors.secondary[100], label: 'Live' },
    completed: { color: colors.neutral[500], bg: colors.neutral[100], label: 'Done' },
    canceled: { color: colors.error[500], bg: colors.error[100], label: 'Cancelled' },
    no_show: { color: colors.error[500], bg: colors.error[100], label: 'No Show' },
    pending_payment: { color: colors.accent[500], bg: colors.accent[100], label: 'Pending' },
  };

  const config = statusConfig[appointment.status];

  return (
    <TouchableOpacity style={styles.appointmentItem} onPress={onPress}>
      <View style={[styles.timeIndicator, { backgroundColor: config.bg }]}>
        <Text style={[styles.timeText, { color: config.color }]}>
          {dateUtils.formatTime(appointment.scheduled_at)}
        </Text>
        <Text style={[styles.dateText, { color: config.color }]}>
          {dateUtils.formatDate(appointment.scheduled_at, 'dd MMM')}
        </Text>
      </View>
      <View style={styles.appointmentItemContent}>
        <Text style={styles.appointmentPatient}>
          {appointment.child?.full_name || appointment.child_name || 'Unknown Patient'}
        </Text>
        <Text style={styles.appointmentComplaint} numberOfLines={1}>
          {appointment.chief_complaint || 'No complaint specified'}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
      </View>
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
  dateText: {
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
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
