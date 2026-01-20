import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Loading, EmptyState } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { appointmentsService, doctorsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Appointment } from '@/types';

type TabType = 'upcoming' | 'past';

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const { data: doctorProfile } = useQuery({
    queryKey: ['doctorProfile', userId],
    queryFn: () => doctorsService.getDoctorByProfileId(userId!),
    enabled: !!userId,
  });

  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['doctorAllAppointments', doctorProfile?.id],
    queryFn: () => appointmentsService.getDoctorAllAppointments(doctorProfile!.id),
    enabled: !!doctorProfile?.id,
  });

  // Split appointments into upcoming and past
  const now = new Date();
  const upcomingAppointments = allAppointments.filter(
    (a) => new Date(a.scheduled_at) >= now && !['completed', 'canceled', 'no_show'].includes(a.status)
  );
  const pastAppointments = allAppointments.filter(
    (a) => new Date(a.scheduled_at) < now || ['completed', 'canceled', 'no_show'].includes(a.status)
  );

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  // Group appointments by date
  const groupedAppointments = React.useMemo(() => {
    const groups: { [key: string]: Appointment[] } = {};

    displayedAppointments.forEach((appointment) => {
      const dateKey = dateUtils.formatDate(appointment.scheduled_at, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(appointment);
    });

    return Object.entries(groups)
      .map(([date, appointments]) => ({
        title: dateUtils.formatDate(date, 'EEEE, dd MMMM yyyy'),
        data: appointments.sort((a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.data[0].scheduled_at).getTime();
        const dateB = new Date(b.data[0].scheduled_at).getTime();
        return activeTab === 'upcoming' ? dateA - dateB : dateB - dateA;
      });
  }, [displayedAppointments, activeTab]);

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    scheduled: { color: colors.primary[500], bg: colors.primary[100], label: 'Confirmed' },
    live: { color: colors.secondary[500], bg: colors.secondary[100], label: 'Live' },
    completed: { color: colors.success[500], bg: colors.success[100], label: 'Completed' },
    canceled: { color: colors.error[500], bg: colors.error[100], label: 'Cancelled' },
    no_show: { color: colors.error[500], bg: colors.error[100], label: 'No Show' },
    pending_payment: { color: colors.accent[500], bg: colors.accent[100], label: 'Pending Payment' },
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const config = statusConfig[item.status] || statusConfig.scheduled;

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => router.push(`/(doctor)/appointment/${item.id}`)}
      >
        <View style={styles.appointmentRow}>
          <Avatar
            name={item.child?.full_name || 'Patient'}
            source={item.child?.avatar_url}
            size="md"
          />
          <View style={styles.appointmentInfo}>
            <Text style={styles.patientName}>{item.child?.full_name}</Text>
            <Text style={styles.appointmentTime}>
              {dateUtils.formatTime(item.scheduled_at)}
            </Text>
            {item.chief_complaint && (
              <Text style={styles.complaint} numberOfLines={1}>
                {item.chief_complaint}
              </Text>
            )}
          </View>
          <View style={styles.appointmentRight}>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  if (!doctorProfile && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error[500]} />
          <Text style={styles.errorText}>Doctor profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <TouchableOpacity
          style={styles.availabilityButton}
          onPress={() => router.push('/(doctor)/availability')}
        >
          <Ionicons name="settings-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.availabilityText}>Set Availability</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingAppointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past ({pastAppointments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Loading />
      ) : displayedAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="calendar-outline"
            title={activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
            description={
              activeTab === 'upcoming'
                ? 'When patients book appointments, they will appear here.'
                : 'Your completed appointments will appear here.'
            }
          />
        </View>
      ) : (
        <SectionList
          sections={groupedAppointments}
          renderItem={renderAppointment}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  availabilityText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral[100],
  },
  activeTab: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  sectionHeader: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text.secondary,
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
  complaint: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  appointmentRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
});
