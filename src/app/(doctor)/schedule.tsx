import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, Button, Loading } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { doctorsService } from '@/services';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { DoctorAvailabilityRule } from '@/types';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const DEFAULT_SLOT_DURATION = 30; // minutes

interface DayAvailability {
  dayOfWeek: number;
  isEnabled: boolean;
  startTime: string;
  endTime: string;
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'start' | 'end'>('start');
  const [tempTime, setTempTime] = useState(new Date());
  const [availability, setAvailability] = useState<DayAvailability[]>(
    DAYS_OF_WEEK.map((_, index) => ({
      dayOfWeek: index,
      isEnabled: index >= 1 && index <= 5, // Mon-Fri enabled by default
      startTime: '09:00',
      endTime: '17:00',
    }))
  );

  // Get doctor profile
  const { data: doctorProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['doctorProfile', userId],
    queryFn: () => doctorsService.getDoctorByProfileId(userId!),
    enabled: !!userId,
  });

  // Get existing availability rules
  const { data: existingRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['availabilityRules', doctorProfile?.id],
    queryFn: () => doctorsService.getAvailabilityRules(doctorProfile!.id),
    enabled: !!doctorProfile?.id,
  });

  // Load existing rules into state
  useEffect(() => {
    if (existingRules.length > 0) {
      setAvailability((prev) =>
        prev.map((day) => {
          const existingRule = existingRules.find(
            (r) => r.day_of_week === day.dayOfWeek
          );
          if (existingRule) {
            return {
              ...day,
              isEnabled: existingRule.is_active,
              startTime: existingRule.start_time,
              endTime: existingRule.end_time,
            };
          }
          return day;
        })
      );
    }
  }, [existingRules]);

  // Save availability mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!doctorProfile?.id) throw new Error('Doctor profile not found');

      const promises = availability
        .filter((day) => day.isEnabled)
        .map((day) =>
          doctorsService.setAvailabilityRule(doctorProfile.id, {
            day_of_week: day.dayOfWeek,
            start_time: day.startTime,
            end_time: day.endTime,
            slot_duration_minutes: DEFAULT_SLOT_DURATION,
            is_active: true,
          })
        );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilityRules'] });
      Alert.alert('Success', 'Availability saved successfully');
    },
    onError: (error) => {
      Alert.alert('Error', (error as Error).message);
    },
  });

  // Generate slots mutation
  const generateSlotsMutation = useMutation({
    mutationFn: async () => {
      if (!doctorProfile?.id) throw new Error('Doctor profile not found');

      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 14);

      // Get existing slots to avoid duplicates
      const { data: existingSlots } = await supabase
        .from('appointment_slots')
        .select('start_time')
        .eq('doctor_id', doctorProfile.id)
        .gte('start_time', now.toISOString())
        .lte('start_time', endDate.toISOString());

      const existingTimes = new Set(
        existingSlots?.map((s) => new Date(s.start_time).getTime()) || []
      );

      // Generate slots for the next 14 days
      const slots = [];

      for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const date = new Date(now);
        date.setDate(date.getDate() + dayOffset);
        const dayOfWeek = date.getDay();

        const dayAvail = availability.find((a) => a.dayOfWeek === dayOfWeek);
        if (!dayAvail?.isEnabled) continue;

        const [startHour, startMin] = dayAvail.startTime.split(':').map(Number);
        const [endHour, endMin] = dayAvail.endTime.split(':').map(Number);

        const slotStart = new Date(date);
        slotStart.setHours(startHour, startMin, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(endHour, endMin, 0, 0);

        while (slotStart < dayEnd) {
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + DEFAULT_SLOT_DURATION);

          // Only add if slot is in the future and doesn't already exist
          if (slotEnd <= dayEnd && slotStart > now && !existingTimes.has(slotStart.getTime())) {
            slots.push({
              doctor_id: doctorProfile.id,
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              is_available: true,
            });
          }

          slotStart.setMinutes(slotStart.getMinutes() + DEFAULT_SLOT_DURATION);
        }
      }

      if (slots.length === 0) {
        return 0; // No new slots to generate
      }

      // Insert only new slots
      const { error } = await supabase.from('appointment_slots').insert(slots);

      if (error) throw error;

      return slots.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['slots'] });
      if (count === 0) {
        Alert.alert('Info', 'All slots already exist for the next 14 days');
      } else {
        Alert.alert('Success', `Generated ${count} new appointment slots`);
      }
    },
    onError: (error) => {
      Alert.alert('Error', (error as Error).message);
    },
  });

  const toggleDay = (dayIndex: number) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayIndex ? { ...day, isEnabled: !day.isEnabled } : day
      )
    );
  };

  const openTimePicker = (dayIndex: number, field: 'start' | 'end') => {
    const day = availability.find((d) => d.dayOfWeek === dayIndex);
    if (!day) return;

    const timeStr = field === 'start' ? day.startTime : day.endTime;
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    setTempTime(date);
    setEditingDay(dayIndex);
    setEditingField(field);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    if (selectedDate && editingDay !== null) {
      const timeStr = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;

      setAvailability((prev) =>
        prev.map((day) =>
          day.dayOfWeek === editingDay
            ? {
                ...day,
                [editingField === 'start' ? 'startTime' : 'endTime']: timeStr,
              }
            : day
        )
      );
    }

    setShowTimePicker(false);
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (profileLoading || rulesLoading) {
    return <Loading fullScreen />;
  }

  if (!doctorProfile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Schedule</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error[500]} />
          <Text style={styles.errorText}>Doctor profile not found</Text>
          <Text style={styles.errorSubtext}>
            Please complete your profile setup first
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Set Your Availability</Text>
        <Text style={styles.sectionSubtitle}>
          Choose which days and times you're available for consultations
        </Text>

        <Card style={styles.availabilityCard}>
          {availability.map((day) => (
            <View
              key={day.dayOfWeek}
              style={[
                styles.dayRow,
                day.dayOfWeek === 6 && styles.dayRowLast,
              ]}
            >
              <View style={styles.dayInfo}>
                <Switch
                  value={day.isEnabled}
                  onValueChange={() => toggleDay(day.dayOfWeek)}
                  trackColor={{
                    false: colors.neutral[200],
                    true: colors.primary[400],
                  }}
                  thumbColor={day.isEnabled ? colors.primary[600] : colors.neutral[400]}
                />
                <Text
                  style={[
                    styles.dayName,
                    !day.isEnabled && styles.dayNameDisabled,
                  ]}
                >
                  {DAYS_OF_WEEK[day.dayOfWeek]}
                </Text>
              </View>

              {day.isEnabled && (
                <View style={styles.timeRange}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker(day.dayOfWeek, 'start')}
                  >
                    <Text style={styles.timeText}>{formatTime(day.startTime)}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeSeparator}>to</Text>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => openTimePicker(day.dayOfWeek, 'end')}
                  >
                    <Text style={styles.timeText}>{formatTime(day.endTime)}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.infoText}>
              Slot duration: {DEFAULT_SLOT_DURATION} minutes
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.infoText}>
              Slots will be generated for the next 14 days
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Save Availability"
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            variant="outline"
            style={styles.button}
          />
          <Button
            title="Generate Slots"
            onPress={() => generateSlotsMutation.mutate()}
            loading={generateSlotsMutation.isPending}
            style={styles.button}
          />
        </View>
      </ScrollView>

      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={handleTimeChange}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  availabilityCard: {
    padding: 0,
    overflow: 'hidden',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dayRowLast: {
    borderBottomWidth: 0,
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  dayNameDisabled: {
    color: colors.text.tertiary,
  },
  timeRange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  timeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  timeSeparator: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  infoCard: {
    marginTop: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  button: {
    width: '100%',
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
  errorSubtext: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
