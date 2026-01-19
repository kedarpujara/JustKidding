import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, Button } from '@/components/ui';
import { appointmentsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { helpers } from '@/utils/helpers';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { AppointmentStatus } from '@/types';

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Handle back navigation - always navigate to home to avoid nested stack issues
  const handleBack = () => {
    // Use replace to go directly to home without leaving extra history
    router.replace('/(guardian)/home');
  };

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsService.getAppointment(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => appointmentsService.cancelAppointment(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      Alert.alert('Cancelled', 'Your appointment has been cancelled');
      handleBack();
    },
    onError: (error) => {
      console.error('Cancel error:', error);
      Alert.alert('Error', (error as Error).message || 'Failed to cancel appointment');
    },
  });

  const handleCancel = () => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate('Cancelled by guardian'),
        },
      ]
    );
  };

  const getStatusConfig = (status: AppointmentStatus) => {
    const config = {
      pending_payment: { label: 'Pending Payment', variant: 'warning' as const, color: colors.accent[600] },
      scheduled: { label: 'Scheduled', variant: 'info' as const, color: colors.primary[600] },
      live: { label: 'In Progress', variant: 'success' as const, color: colors.success[600] },
      completed: { label: 'Completed', variant: 'success' as const, color: colors.success[600] },
      canceled: { label: 'Cancelled', variant: 'error' as const, color: colors.error[600] },
      no_show: { label: 'No Show', variant: 'error' as const, color: colors.error[600] },
    };
    return config[status];
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!appointment) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text>Appointment not found</Text>
        </View>
      </View>
    );
  }

  const statusConfig = getStatusConfig(appointment.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.color }]}>
          <Text style={styles.statusText}>{statusConfig.label}</Text>
          {appointment.status === 'pending_payment' && (
            <Text style={styles.statusSubtext}>Complete payment to confirm</Text>
          )}
        </View>

        {/* Doctor Info */}
        <Card style={styles.doctorCard}>
          <View style={styles.doctorRow}>
            <Avatar
              name={appointment.doctor?.profile?.full_name || 'Doctor'}
              source={appointment.doctor?.profile?.avatar_url}
              size="lg"
            />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>
                {appointment.doctor?.profile?.full_name}
              </Text>
              <Text style={styles.doctorSpec}>
                {appointment.doctor?.specialization}
              </Text>
            </View>
          </View>
        </Card>

        {/* Appointment Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Appointment Info</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Patient</Text>
              <Text style={styles.detailValue}>{appointment.child?.full_name}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {dateUtils.formatDate(appointment.scheduled_at)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="time-outline" size={20} color={colors.primary[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {new Date(appointment.scheduled_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="videocam-outline" size={20} color={colors.primary[600]} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>Video Consultation</Text>
            </View>
          </View>

          {appointment.chief_complaint && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary[600]} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Reason for Visit</Text>
                <Text style={styles.detailValue}>{appointment.chief_complaint}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Fee Info */}
        <Card style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeValue}>
              {helpers.formatCurrency(appointment.doctor?.consultation_fee || 0)}
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + spacing.md }]}>
        {appointment.status === 'pending_payment' && (
          <>
            <Button
              title="Pay Now"
              onPress={() => Alert.alert('Payment', 'Payment integration coming soon')}
              style={styles.actionButton}
            />
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => {
                  Alert.alert(
                    'Reschedule Appointment',
                    'Would you like to choose a different time?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reschedule',
                        onPress: () => router.push({
                          pathname: '/(guardian)/appointment/reschedule/[id]',
                          params: {
                            id: appointment.id,
                            doctorId: appointment.doctor_id,
                            childId: appointment.child_id,
                            rescheduleFee: '0', // No fee for pending payment appointments
                          },
                        }),
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary[600]} />
                <Text style={styles.rescheduleButtonText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {appointment.status === 'scheduled' && (
          <>
            <Button
              title="Join Video Call"
              onPress={() => router.push(`/(guardian)/video/${appointment.id}`)}
              style={styles.actionButton}
            />
            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.rescheduleButton}
                onPress={() => {
                  const rescheduleFee = appointmentsService.getRescheduleFee(appointment.scheduled_at);
                  const isWithin24Hours = appointmentsService.isWithin24Hours(appointment.scheduled_at);

                  const message = isWithin24Hours
                    ? `Rescheduling within 24 hours incurs a fee of ${helpers.formatCurrency(rescheduleFee)}. Do you want to continue?`
                    : 'Would you like to reschedule this appointment?';

                  Alert.alert(
                    'Reschedule Appointment',
                    message,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: isWithin24Hours ? `Pay ${helpers.formatCurrency(rescheduleFee)} & Reschedule` : 'Reschedule',
                        onPress: () => router.push({
                          pathname: '/(guardian)/appointment/reschedule/[id]',
                          params: {
                            id: appointment.id,
                            doctorId: appointment.doctor_id,
                            childId: appointment.child_id,
                            rescheduleFee: rescheduleFee.toString(),
                          },
                        }),
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.primary[600]} />
                <Text style={styles.rescheduleButtonText}>Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {appointment.status === 'live' && (
          <Button
            title="Rejoin Video Call"
            onPress={() => router.push(`/(guardian)/video/${appointment.id}`)}
            style={styles.actionButton}
          />
        )}

        {appointment.status === 'completed' && (
          <Button
            title="Book Again"
            onPress={() => router.push('/(guardian)/book')}
            style={styles.actionButton}
          />
        )}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['3xl'],
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  statusText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },
  statusSubtext: {
    fontSize: fontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: spacing.xs,
  },
  doctorCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  doctorName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  doctorSpec: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  detailsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  detailValue: {
    fontSize: fontSizes.base,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  feeCard: {
    marginHorizontal: spacing.lg,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
  },
  feeValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.primary[600],
  },
  bottomActions: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  rescheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  rescheduleButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.error[600],
  },
});
