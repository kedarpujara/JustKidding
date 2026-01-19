import React, { useState, useMemo } from 'react';
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
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '@/components/ui';
import { doctorsService, appointmentsService } from '@/services';
import { helpers } from '@/utils/helpers';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { AppointmentSlot } from '@/types';

export default function RescheduleScreen() {
  const router = useRouter();
  const { id: appointmentId, doctorId, childId, rescheduleFee } = useLocalSearchParams<{
    id: string;
    doctorId: string;
    childId: string;
    rescheduleFee: string;
  }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const fee = parseInt(rescheduleFee || '0', 10);
  const hasFee = fee > 0;

  // Get doctor info
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorsService.getDoctor(doctorId!),
    enabled: !!doctorId,
  });

  // Get child info
  const { data: child, isLoading: childLoading } = useQuery({
    queryKey: ['child', childId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!childId,
  });

  // Get the next 7 days for date selection
  const dateOptions = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Calculate date range for API query
  const dateRange = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    return {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
    };
  }, [selectedDate]);

  // Get available slots for selected date
  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['slots', doctorId, dateRange.start, dateRange.end],
    queryFn: () => doctorsService.getAvailableSlots(doctorId!, dateRange.start, dateRange.end),
    enabled: !!doctorId,
  });

  // Group slots by time of day
  const groupedSlots = useMemo(() => {
    const morning: AppointmentSlot[] = [];
    const afternoon: AppointmentSlot[] = [];
    const evening: AppointmentSlot[] = [];

    slots.forEach((slot) => {
      const hour = new Date(slot.start_time).getHours();
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 17) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [slots]);

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlotId || !appointmentId) {
        throw new Error('Missing required reschedule information');
      }

      const slot = slots.find((s) => s.id === selectedSlotId);
      if (!slot) {
        throw new Error('Selected slot not found');
      }

      return appointmentsService.rescheduleAppointment(
        appointmentId,
        selectedSlotId,
        slot.start_time
      );
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment'] });

      Alert.alert(
        'Appointment Rescheduled!',
        `Your appointment has been rescheduled to ${dateUtils.formatDateTime(appointment.scheduled_at)}.`,
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(guardian)/appointments'),
          },
        ]
      );
    },
    onError: (error) => {
      setIsRescheduling(false);
      Alert.alert('Reschedule Failed', (error as Error).message);
    },
  });

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(slotId);
  };

  const handleReschedule = () => {
    if (!selectedSlotId) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    const confirmMessage = hasFee
      ? `A fee of ${helpers.formatCurrency(fee)} will be charged for rescheduling within 24 hours. Proceed?`
      : 'Are you sure you want to reschedule to this time?';

    Alert.alert('Confirm Reschedule', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: hasFee ? `Pay ${helpers.formatCurrency(fee)} & Reschedule` : 'Reschedule',
        onPress: () => {
          setIsRescheduling(true);
          rescheduleMutation.mutate();
        },
      },
    ]);
  };

  const renderDateSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateScrollContent}
    >
      {dateOptions.map((date, index) => {
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isToday = index === 0;
        return (
          <TouchableOpacity
            key={date.toISOString()}
            style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
            onPress={() => setSelectedDate(date)}
          >
            <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
              {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
            </Text>
            <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
              {date.getDate()}
            </Text>
            <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
              {date.toLocaleDateString('en-US', { month: 'short' })}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderSlotGroup = (title: string, icon: string, slotList: AppointmentSlot[]) => {
    if (slotList.length === 0) return null;

    return (
      <View style={styles.slotGroup}>
        <View style={styles.slotGroupHeader}>
          <Ionicons name={icon as any} size={18} color={colors.text.secondary} />
          <Text style={styles.slotGroupTitle}>{title}</Text>
          <Text style={styles.slotCount}>{slotList.length} slots</Text>
        </View>
        <View style={styles.slotsGrid}>
          {slotList.map((slot) => {
            const isSelected = selectedSlotId === slot.id;
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                onPress={() => handleSlotSelect(slot.id)}
              >
                <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected]}>
                  {new Date(slot.start_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (doctorLoading || childLoading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Reschedule</Text>
        <View style={styles.headerSpacer} />
      </View>

      {hasFee && (
        <View style={styles.feeWarning}>
          <Ionicons name="warning-outline" size={20} color={colors.accent[700]} />
          <Text style={styles.feeWarningText}>
            Rescheduling fee of {helpers.formatCurrency(fee)} applies (within 24 hours)
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Info Card */}
        {doctor && (
          <Card style={styles.doctorCard}>
            <View style={styles.doctorRow}>
              <Avatar
                name={doctor.profile?.full_name || 'Doctor'}
                source={doctor.profile?.avatar_url}
                size="lg"
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>
                  {doctor.profile?.full_name || 'Doctor'}
                </Text>
                <Text style={styles.doctorSpec}>{doctor.specialization}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Child Info */}
        {child && (
          <Card style={styles.childCard}>
            <View style={styles.childRow}>
              <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.childLabel}>Rescheduling for:</Text>
              <Text style={styles.childName}>{child.full_name}</Text>
            </View>
          </Card>
        )}

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select New Date</Text>
        {renderDateSelector()}

        {/* Slots */}
        <Text style={styles.sectionTitle}>Available Slots</Text>

        {slotsLoading ? (
          <Loading />
        ) : slots.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No slots available"
            description="The doctor has no available slots on this date. Please select another date."
          />
        ) : (
          <View style={styles.slotsContainer}>
            {renderSlotGroup('Morning', 'sunny-outline', groupedSlots.morning)}
            {renderSlotGroup('Afternoon', 'partly-sunny-outline', groupedSlots.afternoon)}
            {renderSlotGroup('Evening', 'moon-outline', groupedSlots.evening)}
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {selectedSlotId && (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>New Time:</Text>
            <Text style={styles.selectedTime}>
              {dateUtils.formatDate(selectedDate.toISOString())} at{' '}
              {new Date(slots.find((s) => s.id === selectedSlotId)?.start_time || '').toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
          {hasFee && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Reschedule Fee:</Text>
              <Text style={styles.feeValue}>{helpers.formatCurrency(fee)}</Text>
            </View>
          )}
          <Button
            title={isRescheduling ? 'Rescheduling...' : hasFee ? `Pay & Reschedule` : 'Confirm Reschedule'}
            onPress={handleReschedule}
            disabled={isRescheduling || rescheduleMutation.isPending}
            loading={isRescheduling || rescheduleMutation.isPending}
          />
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  headerSpacer: {
    width: 32,
  },
  feeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  feeWarningText: {
    fontSize: fontSizes.sm,
    color: colors.accent[700],
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  doctorCard: {
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
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  doctorSpec: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  childCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  childName: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  dateScrollContent: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateOption: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 70,
  },
  dateOptionSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  dateDayName: {
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dateDay: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  dateMonth: {
    fontSize: fontSizes.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  dateTextSelected: {
    color: colors.white,
  },
  slotsContainer: {
    gap: spacing.lg,
  },
  slotGroup: {
    marginBottom: spacing.md,
  },
  slotGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  slotGroupTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  slotCount: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  slotChipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  slotTime: {
    fontSize: fontSizes.sm,
    color: colors.text.primary,
  },
  slotTimeSelected: {
    color: colors.white,
    fontWeight: fontWeights.medium,
  },
  bottomAction: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  selectedLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  selectedTime: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  feeLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
  },
  feeValue: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.accent[600],
  },
});
