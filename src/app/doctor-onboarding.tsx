import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, AvatarPicker } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { doctorsService } from '@/services';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import { INDIAN_STATES, MBBS_INSTITUTES, MD_INSTITUTES } from '@/constants';
import type { DoctorStateRegistration } from '@/types';

export default function DoctorOnboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, userId, uploadAvatar, isLoading } = useAuthStore();

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Profile photo
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  // State registrations
  const [stateRegistrations, setStateRegistrations] = useState<DoctorStateRegistration[]>([
    { state: '', registration_number: '' },
  ]);

  // Education
  const [mbbsInstitute, setMbbsInstitute] = useState('');
  const [mbbsInstituteOther, setMbbsInstituteOther] = useState('');
  const [mdInstitute, setMdInstitute] = useState('');
  const [mdInstituteOther, setMdInstituteOther] = useState('');

  // Experience
  const [experienceYears, setExperienceYears] = useState('');

  // Bio
  const [bio, setBio] = useState('');

  // Modal state for dropdowns
  const [activeModal, setActiveModal] = useState<{
    type: 'state' | 'mbbs' | 'md';
    index?: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Errors
  const [errors, setErrors] = useState<{
    avatar?: string;
    stateRegistrations?: string;
    mbbsInstitute?: string;
  }>({});

  const handleBack = () => {
    Alert.alert(
      'Go Back?',
      'Your progress will be lost. Are you sure you want to go back?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Back',
          style: 'destructive',
          onPress: () => router.back()
        },
      ]
    );
  };

  const handleAvatarUpload = async (uri: string) => {
    const result = await uploadAvatar(uri);
    if (result.success && result.url) {
      setAvatarUrl(result.url);
      setErrors((prev) => ({ ...prev, avatar: undefined }));
    } else {
      Alert.alert('Upload Failed', result.error || 'Failed to upload photo');
    }
  };

  const addStateRegistration = () => {
    setStateRegistrations([...stateRegistrations, { state: '', registration_number: '' }]);
  };

  const removeStateRegistration = (index: number) => {
    if (stateRegistrations.length > 1) {
      setStateRegistrations(stateRegistrations.filter((_, i) => i !== index));
    }
  };

  const updateStateRegistration = (
    index: number,
    field: 'state' | 'registration_number',
    value: string
  ) => {
    const updated = [...stateRegistrations];
    updated[index] = { ...updated[index], [field]: value };
    setStateRegistrations(updated);
    setErrors((prev) => ({ ...prev, stateRegistrations: undefined }));
  };

  const getModalData = () => {
    if (!activeModal) return [];
    switch (activeModal.type) {
      case 'state':
        return INDIAN_STATES;
      case 'mbbs':
        return MBBS_INSTITUTES;
      case 'md':
        return MD_INSTITUTES;
      default:
        return [];
    }
  };

  const getModalTitle = () => {
    if (!activeModal) return '';
    switch (activeModal.type) {
      case 'state':
        return 'Select State';
      case 'mbbs':
        return 'Select MBBS Institute';
      case 'md':
        return 'Select MD Institute';
      default:
        return '';
    }
  };

  const handleModalSelect = (value: string) => {
    if (!activeModal) return;

    switch (activeModal.type) {
      case 'state':
        if (activeModal.index !== undefined) {
          updateStateRegistration(activeModal.index, 'state', value);
        }
        break;
      case 'mbbs':
        setMbbsInstitute(value);
        if (value !== 'Other') {
          setMbbsInstituteOther('');
        }
        setErrors((prev) => ({ ...prev, mbbsInstitute: undefined }));
        break;
      case 'md':
        setMdInstitute(value);
        if (value !== 'Other') {
          setMdInstituteOther('');
        }
        break;
    }

    setActiveModal(null);
    setSearchQuery('');
  };

  const filteredModalData = () => {
    const data = getModalData();
    if (!searchQuery.trim()) return data;
    return data.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Profile photo is required
    if (!avatarUrl) {
      newErrors.avatar = 'Profile photo is required';
    }

    // At least one complete state registration
    const hasValidRegistration = stateRegistrations.some(
      (reg) => reg.state && reg.registration_number.trim()
    );
    if (!hasValidRegistration) {
      newErrors.stateRegistrations = 'Please add at least one state registration';
    }

    // MBBS institute is required
    if (!mbbsInstitute) {
      newErrors.mbbsInstitute = 'Please select your MBBS institute';
    } else if (mbbsInstitute === 'Other' && !mbbsInstituteOther.trim()) {
      newErrors.mbbsInstitute = 'Please enter your MBBS institute name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Filter out incomplete registrations
    const validRegistrations = stateRegistrations.filter(
      (reg) => reg.state && reg.registration_number.trim()
    );

    setIsSaving(true);

    try {
      await doctorsService.createDoctorProfile(userId, {
        state_registrations: validRegistrations,
        mbbs_institute: mbbsInstitute,
        mbbs_institute_other: mbbsInstitute === 'Other' ? mbbsInstituteOther : undefined,
        md_institute: mdInstitute || undefined,
        md_institute_other: mdInstitute === 'Other' ? mdInstituteOther : undefined,
        experience_years: experienceYears ? parseInt(experienceYears, 10) : undefined,
        bio: bio || undefined,
      });

      router.replace('/(doctor)/home');
    } catch (error) {
      console.error('Failed to create doctor profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderDropdown = (
    label: string,
    value: string,
    placeholder: string,
    onPress: () => void,
    error?: string,
    required?: boolean
  ) => (
    <View style={styles.dropdownContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.dropdown, error && styles.dropdownError]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.neutral[400]} />
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header with back button */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Registration</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Help parents know more about you and build trust
          </Text>
        </View>

        {/* Profile Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Profile Photo <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.sectionHint}>
            A clear photo of your face helps parents feel more comfortable
          </Text>
          <View style={styles.avatarContainer}>
            <AvatarPicker
              currentImage={avatarUrl}
              name={profile?.full_name || 'Doctor'}
              size="xxl"
              onImageSelected={handleAvatarUpload}
            />
          </View>
          {errors.avatar && <Text style={styles.errorCenter}>{errors.avatar}</Text>}
        </View>

        {/* State Registration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Medical Registration <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.sectionHint}>
            Add your medical council registration details. You can add multiple states if registered in more than one.
          </Text>

          {stateRegistrations.map((registration, index) => (
            <View key={index} style={styles.registrationCard}>
              <View style={styles.registrationHeader}>
                <Text style={styles.registrationLabel}>Registration {index + 1}</Text>
                {stateRegistrations.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeStateRegistration(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error[500]} />
                  </TouchableOpacity>
                )}
              </View>

              {renderDropdown(
                'State',
                registration.state,
                'Select state',
                () => {
                  setSearchQuery(''); // Clear search when opening
                  setActiveModal({ type: 'state', index });
                },
                undefined,
                true
              )}

              <Input
                label="Registration Number"
                placeholder="e.g., MH/12345/2020"
                value={registration.registration_number}
                onChangeText={(text) =>
                  updateStateRegistration(index, 'registration_number', text)
                }
                autoCapitalize="characters"
              />
            </View>
          ))}

          {errors.stateRegistrations && (
            <Text style={styles.error}>{errors.stateRegistrations}</Text>
          )}

          <TouchableOpacity style={styles.addButton} onPress={addStateRegistration}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.addButtonText}>Add Another State</Text>
          </TouchableOpacity>
        </View>

        {/* Education Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          <Text style={styles.sectionHint}>
            Your educational background helps establish credibility
          </Text>

          {renderDropdown(
            'MBBS Institute',
            mbbsInstitute,
            'Select your MBBS institute',
            () => {
              setSearchQuery(''); // Clear search when opening
              setActiveModal({ type: 'mbbs' });
            },
            errors.mbbsInstitute,
            true
          )}

          {mbbsInstitute === 'Other' && (
            <Input
              label="Institute Name"
              placeholder="Enter your MBBS institute name"
              value={mbbsInstituteOther}
              onChangeText={setMbbsInstituteOther}
            />
          )}

          {renderDropdown(
            'MD/Post-graduation Institute (Optional)',
            mdInstitute,
            'Select your MD institute',
            () => {
              setSearchQuery(''); // Clear search when opening
              setActiveModal({ type: 'md' });
            }
          )}

          {mdInstitute === 'Other' && (
            <Input
              label="Institute Name"
              placeholder="Enter your MD institute name"
              value={mdInstituteOther}
              onChangeText={setMdInstituteOther}
            />
          )}

          <Input
            label="Years of Experience"
            placeholder="e.g., 5"
            value={experienceYears}
            onChangeText={(text) => {
              // Only allow numbers
              const numericValue = text.replace(/[^0-9]/g, '');
              setExperienceYears(numericValue);
            }}
            keyboardType="numeric"
            leftIcon="time-outline"
          />
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <View style={styles.bioHintContainer}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.secondary[600]}
            />
            <Text style={styles.bioHint}>
              A brief bio helps parents understand your experience and approach to pediatric care. Share what makes you passionate about children's health.
            </Text>
          </View>

          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Tell parents about yourself, your experience, and your approach to pediatric care..."
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={colors.neutral[400]}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>
        </View>

        {/* Submit Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            title="Complete Profile"
            onPress={handleSubmit}
            loading={isLoading || isSaving}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setActiveModal(null);
          setSearchQuery('');
        }}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getModalTitle()}</Text>
            <TouchableOpacity
              onPress={() => {
                setActiveModal(null);
                setSearchQuery('');
              }}
            >
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.neutral[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.neutral[400]}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredModalData()}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => handleModalSelect(item)}
              >
                <Text style={styles.modalItemText}>{item}</Text>
                {((activeModal?.type === 'state' &&
                  activeModal?.index !== undefined &&
                  stateRegistrations[activeModal.index]?.state === item) ||
                  (activeModal?.type === 'mbbs' && mbbsInstitute === item) ||
                  (activeModal?.type === 'md' && mdInstitute === item)) && (
                  <Ionicons name="checkmark" size={24} color={colors.primary[600]} />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.modalList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    lineHeight: fontSizes.base * 1.5,
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.lg,
    lineHeight: fontSizes.sm * 1.5,
  },
  required: {
    color: colors.error[500],
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  registrationCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  registrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  registrationLabel: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.secondary,
  },
  dropdownContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
  },
  dropdownError: {
    borderColor: colors.error[500],
  },
  dropdownText: {
    fontSize: fontSizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: colors.neutral[400],
  },
  error: {
    fontSize: fontSizes.sm,
    color: colors.error[500],
    marginTop: spacing.xs,
  },
  errorCenter: {
    fontSize: fontSizes.sm,
    color: colors.error[500],
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
  },
  bioHintContainer: {
    flexDirection: 'row',
    backgroundColor: colors.secondary[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  bioHint: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.secondary[700],
    lineHeight: fontSizes.sm * 1.5,
  },
  textAreaContainer: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 120,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.base,
    color: colors.text.primary,
  },
  charCount: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  footer: {
    paddingTop: spacing.xl,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.text.primary,
  },
  modalList: {
    paddingHorizontal: spacing.xl,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalItemText: {
    fontSize: fontSizes.base,
    color: colors.text.primary,
    flex: 1,
    paddingRight: spacing.md,
  },
});
