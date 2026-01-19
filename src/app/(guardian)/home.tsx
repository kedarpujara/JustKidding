import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Avatar, Badge, Loading, EmptyState } from '@/components/ui';
import { FadeInView } from '@/components/animated';
import { useAuthStore } from '@/stores/authStore';
import { childrenService, appointmentsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { helpers } from '@/utils/helpers';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Appointment, Child } from '@/types';

export default function GuardianHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, userId } = useAuthStore();

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children', userId],
    queryFn: () => childrenService.getChildren(userId!),
    enabled: !!userId,
  });

  const { data: upcomingAppointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['upcomingAppointments', userId],
    queryFn: () => appointmentsService.getUpcomingAppointments(userId!, 'guardian'),
    enabled: !!userId,
  });

  const isLoading = childrenLoading || appointmentsLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeInView delay={0}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>
                Hello, {profile?.full_name?.split(' ')[0] || 'there'}!
              </Text>
              <Text style={styles.subGreeting}>
                How can we help your little ones today?
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => {}}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Quick Book Card */}
        <FadeInView delay={100}>
          <LinearGradient
            colors={[colors.primary[500], colors.primary[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickBookCard}
          >
          <View style={styles.quickBookContent}>
            <View style={styles.quickBookIcon}>
              <Ionicons name="videocam" size={28} color={colors.white} />
            </View>
            <View style={styles.quickBookText}>
              <Text style={styles.quickBookTitle}>Book a Consultation</Text>
              <Text style={styles.quickBookSubtitle}>
                Connect with expert pediatricians
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.quickBookButton}
            onPress={() => router.push('/(guardian)/book')}
          >
            <Text style={styles.quickBookButtonText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.primary[600]} />
          </TouchableOpacity>
          </LinearGradient>
        </FadeInView>

        {/* Upcoming Appointments */}
        <FadeInView delay={200}>
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
            {upcomingAppointments.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/(guardian)/appointments')}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <Loading />
          ) : upcomingAppointments.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyContent}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color={colors.neutral[300]}
                />
                <Text style={styles.emptyText}>No upcoming appointments</Text>
              </View>
            </Card>
          ) : (
            upcomingAppointments.slice(0, 2).map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onPress={() =>
                  router.push(`/(guardian)/appointment/${appointment.id}`)
                }
              />
            ))
          )}
          </View>
        </FadeInView>

        {/* Children Section */}
        <FadeInView delay={300}>
          <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Children</Text>
            <TouchableOpacity
              onPress={() => router.push('/(guardian)/children')}
            >
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <Loading />
          ) : children.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={styles.emptyContent}>
                <Ionicons
                  name="person-add-outline"
                  size={32}
                  color={colors.neutral[300]}
                />
                <Text style={styles.emptyText}>No children added yet</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(guardian)/children/add')}
                >
                  <Text style={styles.emptyLink}>Add your first child</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childrenScroll}
            >
              {children.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  onPress={() =>
                    router.push(`/(guardian)/children/${child.id}`)
                  }
                />
              ))}
              <TouchableOpacity
                style={styles.addChildCard}
                onPress={() => router.push('/(guardian)/children/add')}
              >
                <View style={styles.addChildIcon}>
                  <Ionicons name="add" size={24} color={colors.primary[600]} />
                </View>
                <Text style={styles.addChildText}>Add Child</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          </View>
        </FadeInView>

        {/* Quick Actions */}
        <FadeInView delay={400}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <QuickAction
                icon="document-text-outline"
                label="Prescriptions"
                onPress={() => router.push('/(guardian)/prescriptions')}
              />
              <QuickAction
                icon="time-outline"
                label="History"
                onPress={() => router.push('/(guardian)/history')}
              />
              <QuickAction
                icon="help-circle-outline"
                label="Help"
                onPress={() => {}}
              />
              <QuickAction
                icon="settings-outline"
                label="Settings"
                onPress={() => router.push('/(guardian)/profile')}
              />
            </View>
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  onPress: () => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onPress,
}) => {
  const statusColor = {
    scheduled: 'info',
    live: 'success',
    pending_payment: 'warning',
    completed: 'success',
    canceled: 'error',
    no_show: 'error',
  } as const;

  return (
    <Card style={styles.appointmentCard} onPress={onPress}>
      <View style={styles.appointmentHeader}>
        <Avatar
          name={appointment.doctor?.profile?.full_name || 'Doctor'}
          source={appointment.doctor?.profile?.avatar_url}
          size="md"
        />
        <View style={styles.appointmentInfo}>
          <Text style={styles.doctorName}>
            {appointment.doctor?.profile?.full_name}
          </Text>
          <Text style={styles.specialization}>
            {appointment.doctor?.specialization}
          </Text>
        </View>
        <Badge
          label={appointment.status.replace('_', ' ')}
          variant={statusColor[appointment.status]}
          size="sm"
        />
      </View>
      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentDetail}>
          <Ionicons
            name="person-outline"
            size={16}
            color={colors.text.tertiary}
          />
          <Text style={styles.appointmentDetailText}>
            {appointment.child?.full_name}
          </Text>
        </View>
        <View style={styles.appointmentDetail}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.text.tertiary}
          />
          <Text style={styles.appointmentDetailText}>
            {dateUtils.formatRelativeDate(appointment.scheduled_at)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

interface ChildCardProps {
  child: Child;
  onPress: () => void;
}

const ChildCard: React.FC<ChildCardProps> = ({ child, onPress }) => {
  const age = dateUtils.calculateAge(child.date_of_birth);

  return (
    <Card style={styles.childCard} onPress={onPress}>
      <Avatar name={child.full_name} source={child.avatar_url} size="lg" />
      <Text style={styles.childName} numberOfLines={1}>
        {child.full_name}
      </Text>
      <Text style={styles.childAge}>{age.display}</Text>
    </Card>
  );
};

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress}>
    <View style={styles.quickActionIcon}>
      <Ionicons name={icon} size={24} color={colors.primary[600]} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

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
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  subGreeting: {
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
  quickBookCard: {
    marginBottom: spacing.xl,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  quickBookContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickBookIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  quickBookText: {
    flex: 1,
  },
  quickBookTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  quickBookSubtitle: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  quickBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  quickBookButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary[600],
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
    padding: spacing['2xl'],
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  emptyLink: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary[600],
    marginTop: spacing.sm,
  },
  appointmentCard: {
    marginBottom: spacing.md,
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
  doctorName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  specialization: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  appointmentDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  appointmentDetailText: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
  },
  childrenScroll: {
    paddingRight: spacing.lg,
  },
  childCard: {
    width: 120,
    alignItems: 'center',
    marginRight: spacing.md,
    padding: spacing.lg,
  },
  childName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  childAge: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  addChildCard: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    padding: spacing.lg,
  },
  addChildIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChildText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
    marginTop: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quickAction: {
    alignItems: 'center',
    width: '22%',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
