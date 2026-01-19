import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, EmptyState } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { appointmentsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Appointment, AppointmentStatus } from '@/types';

type TabType = 'upcoming' | 'past';

export default function AppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');

  const { data: upcoming = [], isLoading: upcomingLoading, refetch: refetchUpcoming } = useQuery({
    queryKey: ['upcomingAppointments', userId],
    queryFn: () => appointmentsService.getUpcomingAppointments(userId!, 'guardian'),
    enabled: !!userId,
  });

  const { data: past = [], isLoading: pastLoading, refetch: refetchPast } = useQuery({
    queryKey: ['pastAppointments', userId],
    queryFn: () => appointmentsService.getPastAppointments(userId!, 'guardian'),
    enabled: !!userId,
  });

  const appointments = activeTab === 'upcoming' ? upcoming : past;
  const isLoading = activeTab === 'upcoming' ? upcomingLoading : pastLoading;

  const getStatusBadge = (status: AppointmentStatus) => {
    const config = {
      scheduled: { label: 'Scheduled', variant: 'info' as const },
      live: { label: 'Live', variant: 'success' as const },
      pending_payment: { label: 'Pending Payment', variant: 'warning' as const },
      completed: { label: 'Completed', variant: 'success' as const },
      canceled: { label: 'Canceled', variant: 'error' as const },
      no_show: { label: 'No Show', variant: 'error' as const },
    };
    return config[status];
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const badge = getStatusBadge(item.status);

    return (
      <Card
        style={styles.appointmentCard}
        onPress={() => router.push(`/(guardian)/appointment/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Avatar name={item.doctor?.profile?.full_name || 'Doctor'} size="lg" />
          <View style={styles.cardInfo}>
            <Text style={styles.doctorName}>{item.doctor?.profile?.full_name}</Text>
            <Text style={styles.specialization}>{item.doctor?.specialization}</Text>
          </View>
          <Badge label={badge.label} variant={badge.variant} size="sm" />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{item.child?.full_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
            <Text style={styles.detailText}>
              {dateUtils.formatRelativeDate(item.scheduled_at)}
            </Text>
          </View>
          {item.chief_complaint && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.chief_complaint}
              </Text>
            </View>
          )}
        </View>

        {item.status === 'scheduled' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push(`/(guardian)/video/${item.id}`)}
            >
              <Ionicons name="videocam" size={18} color={colors.white} />
              <Text style={styles.joinButtonText}>Join Call</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Loading fullScreen />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
          description={activeTab === 'upcoming' ? 'Book a consultation to get started' : 'Your completed appointments will appear here'}
          actionLabel={activeTab === 'upcoming' ? 'Book Now' : undefined}
          onAction={activeTab === 'upcoming' ? () => router.push('/(guardian)/book') : undefined}
        />
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => activeTab === 'upcoming' ? refetchUpcoming() : refetchPast()}
          refreshing={false}
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
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tabActive: {
    backgroundColor: colors.primary[100],
  },
  tabText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.primary[700],
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  appointmentCard: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  doctorName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  specialization: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  cardDetails: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    flex: 1,
  },
  cardActions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  joinButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
});
