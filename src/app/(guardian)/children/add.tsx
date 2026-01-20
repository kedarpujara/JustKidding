import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Gender } from '@/types';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AddChildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date()); // Temporary date while picker is open
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState<Gender>('male');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string }>({});

  const createChildMutation = useMutation({
    mutationFn: (data: Parameters<typeof childrenService.createChild>[0]) =>
      childrenService.createChild(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      Alert.alert('Success', 'Child profile created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to create child profile');
    },
  });

  const validateForm = () => {
    const newErrors: { fullName?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Please enter child's name";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !userId) return;

    const childData = {
      guardian_id: userId,
      full_name: fullName.trim(),
      date_of_birth: dateOfBirth.toISOString().split('T')[0],
      gender,
      blood_group: bloodGroup || undefined,
      height_cm: heightCm ? parseFloat(heightCm) : undefined,
      weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      allergies: allergies.trim()
        ? allergies.split(',').map((a) => a.trim())
        : undefined,
      chronic_conditions: conditions.trim()
        ? conditions.split(',').map((c) => c.trim())
        : undefined,
      current_medications: medications.trim()
        ? medications.split(',').map((m) => m.trim())
        : undefined,
    };

    createChildMutation.mutate(childData);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Child</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Child's Full Name"
          placeholder="Enter child's name"
          value={fullName}
          onChangeText={(text) => {
            setFullName(text);
            setErrors({});
          }}
          error={errors.fullName}
          leftIcon="person-outline"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              setTempDate(dateOfBirth);
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.neutral[400]} />
            <Text style={styles.dateText}>{formatDate(dateOfBirth)}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>
        </View>

        {/* iOS: Use modal with Done button since spinner fires onChange on every scroll */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setDateOfBirth(tempDate);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempDate(selectedDate);
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android: Use default display which has built-in OK/Cancel */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={dateOfBirth}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setDateOfBirth(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderContainer}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[
                  styles.genderOption,
                  gender === g.value && styles.genderOptionSelected,
                ]}
                onPress={() => setGender(g.value)}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === g.value && styles.genderTextSelected,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Blood Group (Optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bloodGroupContainer}
          >
            {BLOOD_GROUPS.map((bg) => (
              <TouchableOpacity
                key={bg}
                style={[
                  styles.bloodGroupOption,
                  bloodGroup === bg && styles.bloodGroupOptionSelected,
                ]}
                onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
              >
                <Text
                  style={[
                    styles.bloodGroupText,
                    bloodGroup === bg && styles.bloodGroupTextSelected,
                  ]}
                >
                  {bg}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Input
              label="Height (Optional)"
              placeholder="cm"
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="numeric"
              leftIcon="resize-outline"
            />
          </View>
          <View style={styles.halfField}>
            <Input
              label="Weight (Optional)"
              placeholder="kg"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              leftIcon="scale-outline"
            />
          </View>
        </View>

        <Input
          label="Allergies (Optional)"
          placeholder="e.g., Peanuts, Dairy (comma separated)"
          value={allergies}
          onChangeText={setAllergies}
          leftIcon="alert-circle-outline"
          multiline
        />

        <Input
          label="Chronic Conditions (Optional)"
          placeholder="e.g., Asthma, Diabetes (comma separated)"
          value={conditions}
          onChangeText={setConditions}
          leftIcon="medkit-outline"
          multiline
        />

        <Input
          label="Current Medications (Optional)"
          placeholder="e.g., Inhaler, Insulin (comma separated)"
          value={medications}
          onChangeText={setMedications}
          leftIcon="medical-outline"
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button
          title="Add Child"
          onPress={handleSubmit}
          loading={createChildMutation.isPending}
          disabled={!fullName.trim()}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
  dateText: {
    flex: 1,
    fontSize: fontSizes.base,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  genderText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  genderTextSelected: {
    color: colors.primary[600],
  },
  bloodGroupContainer: {
    gap: spacing.sm,
  },
  bloodGroupOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: borderRadius.full,
  },
  bloodGroupOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  bloodGroupText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  bloodGroupTextSelected: {
    color: colors.primary[600],
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  halfField: {
    flex: 1,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing['2xl'],
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  datePickerCancel: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
  },
  datePickerDone: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary[500],
  },
});
