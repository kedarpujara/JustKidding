import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Loading, EmptyState, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services';
import { dateUtils } from '@/utils/date';
import { helpers } from '@/utils/helpers';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Child } from '@/types';

export default function ChildrenScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();

  const { data: children = [], isLoading, refetch } = useQuery({
    queryKey: ['children', userId],
    queryFn: () => childrenService.getChildren(userId!),
    enabled: !!userId,
  });

  const renderChild = ({ item }: { item: Child }) => {
    const age = dateUtils.calculateAge(item.date_of_birth);

    return (
      <Card
        style={styles.childCard}
        onPress={() => router.push(`/(guardian)/children/${item.id}`)}
      >
        <Avatar name={item.full_name} source={item.avatar_url} size="xl" />
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.full_name}</Text>
          <Text style={styles.childDetails}>
            {age.display} • {helpers.getGenderLabel(item.gender)}
          </Text>
          {item.blood_group && (
            <Text style={styles.childBloodGroup}>Blood Group: {item.blood_group}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
      </Card>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Children</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(guardian)/children/add')}
        >
          <Ionicons name="add" size={24} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Loading fullScreen />
      ) : children.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No children added"
          description="Add your child's profile to book appointments"
          actionLabel="Add Child"
          onAction={() => router.push('/(guardian)/children/add')}
        />
      ) : (
        <FlatList
          data={children}
          renderItem={renderChild}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={() => refetch()}
          refreshing={false}
          ListFooterComponent={
            <Button
              title="Add Another Child"
              variant="outline"
              onPress={() => router.push('/(guardian)/children/add')}
              style={styles.addMoreButton}
              icon={<Ionicons name="add" size={18} color={colors.primary[600]} />}
            />
          }
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  childInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  childName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  childDetails: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  childBloodGroup: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  addMoreButton: {
    marginTop: spacing.lg,
  },
});
