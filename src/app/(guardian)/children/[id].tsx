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
import { AvatarPicker, Card, Loading, Button } from '@/components/ui';
import { childrenService } from '@/services';
import { dateUtils, helpers, imageUtils } from '@/utils';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';

export default function ChildDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: child, isLoading } = useQuery({
    queryKey: ['child', id],
    queryFn: () => childrenService.getChild(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => childrenService.deleteChild(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to delete child profile');
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      const compressed = await imageUtils.compressForAvatar(uri);
      return childrenService.uploadAvatar(id!, compressed.uri);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child', id] });
      queryClient.invalidateQueries({ queryKey: ['children'] });
    },
    onError: (error: Error) => {
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Child Profile',
      `Are you sure you want to delete ${child?.full_name}'s profile? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!child) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text>Child not found</Text>
      </View>
    );
  }

  const age = dateUtils.calculateAge(child.date_of_birth);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Child Profile</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/(guardian)/children/edit/${id}`)}
          >
            <Ionicons name="create-outline" size={22} color={colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.error[500]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <AvatarPicker
            currentImage={child.avatar_url}
            name={child.full_name}
            size="xxl"
            onImageSelected={(uri) => uploadAvatarMutation.mutateAsync(uri)}
            disabled={uploadAvatarMutation.isPending}
            hint="Tap to change photo"
          />
          <Text style={styles.childName}>{child.full_name}</Text>
          <Text style={styles.childAge}>
            {age.display} • {helpers.getGenderLabel(child.gender)}
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <InfoRow
            icon="calendar-outline"
            label="Date of Birth"
            value={dateUtils.formatDate(child.date_of_birth, 'dd MMM yyyy')}
          />

          {child.blood_group && (
            <InfoRow
              icon="water-outline"
              label="Blood Group"
              value={child.blood_group}
            />
          )}

          {(child.height_cm || child.weight_kg) && (
            <InfoRow
              icon="body-outline"
              label="Physical Stats"
              value={[
                child.height_cm ? `${child.height_cm} cm` : null,
                child.weight_kg ? `${child.weight_kg} kg` : null,
              ].filter(Boolean).join(' • ')}
            />
          )}
        </Card>

        {(child.allergies?.length || child.chronic_conditions?.length || child.current_medications?.length) && (
          <Card style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Medical Information</Text>

            {child.allergies && child.allergies.length > 0 && (
              <InfoRow
                icon="alert-circle-outline"
                label="Allergies"
                value={child.allergies.join(', ')}
              />
            )}

            {child.chronic_conditions && child.chronic_conditions.length > 0 && (
              <InfoRow
                icon="medkit-outline"
                label="Chronic Conditions"
                value={child.chronic_conditions.join(', ')}
              />
            )}

            {child.current_medications && child.current_medications.length > 0 && (
              <InfoRow
                icon="medical-outline"
                label="Current Medications"
                value={child.current_medications.join(', ')}
              />
            )}
          </Card>
        )}

        <Button
          title="Book Appointment"
          onPress={() => router.push({
            pathname: '/(guardian)/book',
            params: { childId: child.id },
          })}
          fullWidth
          size="lg"
          icon={<Ionicons name="calendar" size={20} color={colors.white} />}
        />
      </ScrollView>
    </View>
  );
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={20} color={colors.primary[500]} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  childName: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  childAge: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
});
