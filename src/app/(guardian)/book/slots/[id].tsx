import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { doctorsService, appointmentsService } from '@/services';
import { helpers } from '@/utils/helpers';
import { dateUtils } from '@/utils/date';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { AppointmentSlot } from '@/types';

export default function SlotsScreen() {
  const router = useRouter();
  const { id: doctorId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const { selectedChild, selectedDoctor, setSelectedSlot, resetBookingFlow } = useAppStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Get doctor info
  const { data: doctor, isLoading: doctorLoading } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => doctorsService.getDoctor(doctorId!),
    enabled: !!doctorId,
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

  // Book appointment mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlotId || !selectedChild || !userId || !doctorId) {
        throw new Error('Missing required booking information');
      }

      const slot = slots.find((s) => s.id === selectedSlotId);
      if (!slot) {
        throw new Error('Selected slot not found');
      }

      // Hold the slot first
      await doctorsService.holdSlot(selectedSlotId, userId);

      // Create the appointment
      return appointmentsService.createAppointment({
        slot_id: selectedSlotId,
        child_id: selectedChild.id,
        guardian_id: userId,
        doctor_id: doctorId,
        chief_complaint: chiefComplaint || undefined,
        scheduled_at: slot.start_time,
      });
    },
    onSuccess: (appointment) => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });

      // Navigate to confirmation/payment
      router.replace(`/(guardian)/appointments`);

      Alert.alert(
        'Appointment Booked!',
        `Your appointment has been scheduled for ${dateUtils.formatDateTime(appointment.scheduled_at)}. Please complete payment to confirm.`,
        [{ text: 'OK' }]
      );

      resetBookingFlow();
    },
    onError: (error) => {
      Alert.alert('Booking Failed', (error as Error).message);
      // Release the slot if it was held
      if (selectedSlotId) {
        doctorsService.releaseSlot(selectedSlotId).catch(console.error);
      }
    },
  });

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(slotId);
    setSelectedSlot(slotId);
  };

  const handleBook = () => {
    if (!selectedChild) {
      Alert.alert('Error', 'Please select a child first');
      router.back();
      return;
    }

    if (!selectedSlotId) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    setIsBooking(true);
    bookMutation.mutate();
  };

  const formatSlotTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
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

  if (doctorLoading) {
    return <Loading fullScreen />;
  }

  const displayDoctor = doctor || selectedDoctor;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Time Slot</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Info Card */}
        {displayDoctor && (
          <Card style={styles.doctorCard}>
            <View style={styles.doctorRow}>
              <Avatar
                name={displayDoctor.profile?.full_name || 'Doctor'}
                size="lg"
              />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>
                  {displayDoctor.profile?.full_name || 'Doctor'}
                </Text>
                <Text style={styles.doctorSpec}>{displayDoctor.specialization}</Text>
                <View style={styles.doctorMeta}>
                  <Badge label="Video Consult" variant="info" size="sm" />
                  <Text style={styles.doctorFee}>
                    {helpers.formatCurrency(displayDoctor.consultation_fee)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}

        {/* Child Info */}
        {selectedChild && (
          <Card style={styles.childCard}>
            <View style={styles.childRow}>
              <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
              <Text style={styles.childLabel}>Booking for:</Text>
              <Text style={styles.childName}>{selectedChild.full_name}</Text>
            </View>
          </Card>
        )}

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select Date</Text>
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

        {/* Chief Complaint Input */}
        {selectedSlotId && (
          <View style={styles.complaintSection}>
            <Text style={styles.sectionTitle}>Reason for Visit (Optional)</Text>
            <TextInput
              style={styles.complaintInput}
              placeholder="E.g., Fever, cough, regular checkup..."
              value={chiefComplaint}
              onChangeText={setChiefComplaint}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Action */}
      {selectedSlotId && (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected:</Text>
            <Text style={styles.selectedTime}>
              {dateUtils.formatDate(selectedDate.toISOString())} at{' '}
              {new Date(slots.find((s) => s.id === selectedSlotId)?.start_time || '').toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </Text>
          </View>
          <Button
            title={isBooking ? 'Booking...' : 'Confirm Booking'}
            onPress={handleBook}
            disabled={isBooking || bookMutation.isPending}
            loading={isBooking || bookMutation.isPending}
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
  doctorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  doctorFee: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.primary[600],
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
  complaintSection: {
    marginTop: spacing.lg,
  },
  complaintInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSizes.base,
    color: colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
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
    marginBottom: spacing.md,
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
});
