import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card, Avatar, Badge, Loading, EmptyState, Button } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import { appointmentsService } from '@/services';
import { dateUtils } from '@/utils/date';
import { helpers } from '@/utils/helpers';
import { colors, spacing, fontSizes, fontWeights, borderRadius } from '@/lib/theme';
import type { Appointment, Child } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock data generator for test mode
const generateMockAppointments = (children: Child[]): Appointment[] => {
  if (!children.length) return [];

  const mockDoctors = [
    { name: 'Dr. Priya Sharma', specialization: 'General Pediatrics' },
    { name: 'Dr. Rajesh Kumar', specialization: 'Pediatric Pulmonology' },
    { name: 'Dr. Anita Desai', specialization: 'Pediatric Dermatology' },
    { name: 'Dr. Vikram Singh', specialization: 'Pediatric Gastroenterology' },
  ];

  const commonReasons = [
    'Routine checkup',
    'Fever and cold symptoms',
    'Vaccination',
    'Skin rash',
    'Stomach ache',
    'Annual wellness visit',
    'Ear infection',
    'Cough and congestion',
  ];

  const appointments: Appointment[] = [];
  const now = new Date();

  // Generate 3-8 appointments spread over the past 2 years
  const numAppointments = Math.floor(Math.random() * 6) + 3;

  for (let i = 0; i < numAppointments; i++) {
    const randomChild = children[Math.floor(Math.random() * children.length)];
    const randomDoctor = mockDoctors[Math.floor(Math.random() * mockDoctors.length)];
    const randomReason = commonReasons[Math.floor(Math.random() * commonReasons.length)];

    // Random date in past 2 years
    const daysAgo = Math.floor(Math.random() * 730) + 1;
    const appointmentDate = new Date(now);
    appointmentDate.setDate(appointmentDate.getDate() - daysAgo);
    appointmentDate.setHours(9 + Math.floor(Math.random() * 8), Math.random() > 0.5 ? 0 : 30, 0, 0);

    appointments.push({
      id: `mock-${i}-${Date.now()}`,
      slot_id: `mock-slot-${i}`,
      child_id: randomChild.id,
      guardian_id: randomChild.guardian_id,
      doctor_id: `mock-doctor-${i}`,
      status: 'completed',
      chief_complaint: randomReason,
      scheduled_at: appointmentDate.toISOString(),
      started_at: appointmentDate.toISOString(),
      ended_at: new Date(appointmentDate.getTime() + 15 * 60000).toISOString(),
      created_at: appointmentDate.toISOString(),
      updated_at: appointmentDate.toISOString(),
      child: randomChild,
      doctor: {
        id: `mock-doctor-${i}`,
        profile_id: `mock-profile-${i}`,
        specialization: randomDoctor.specialization,
        qualification: 'MBBS, MD',
        registration_number: 'REG123456',
        experience_years: 10,
        consultation_fee: 500,
        languages: ['English', 'Hindi'],
        verification_status: 'approved',
        created_at: appointmentDate.toISOString(),
        updated_at: appointmentDate.toISOString(),
        profile: {
          id: `mock-profile-${i}`,
          phone: '+919999999999',
          role: 'doctor',
          full_name: randomDoctor.name,
          is_verified: true,
          created_at: appointmentDate.toISOString(),
          updated_at: appointmentDate.toISOString(),
        },
      },
    } as Appointment);
  }

  // Sort by date descending
  return appointments.sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
  );
};

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuthStore();
  const queryClient = useQueryClient();
  const [testMode, setTestMode] = useState(false);
  const [mockData, setMockData] = useState<Appointment[]>([]);

  // Fetch children for mock data generation
  const { data: children = [] } = useQuery({
    queryKey: ['children', userId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('guardian_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch past appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['pastAppointments', userId],
    queryFn: () => appointmentsService.getPastAppointments(userId!, 'guardian', 50),
    enabled: !!userId,
  });

  const displayAppointments = testMode && mockData.length > 0 ? mockData : appointments;

  // Stats calculation
  const stats = useMemo(() => {
    if (!displayAppointments.length) {
      return {
        totalVisits: 0,
        uniqueDoctors: 0,
        uniqueChildren: 0,
        lastVisit: null,
        visitsByMonth: [],
      };
    }

    const doctorIds = new Set(displayAppointments.map((a) => a.doctor_id));
    const childIds = new Set(displayAppointments.map((a) => a.child_id));
    const sortedByDate = [...displayAppointments].sort(
      (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );

    // Group by month for the chart
    const monthCounts: Record<string, number> = {};
    displayAppointments.forEach((apt) => {
      const monthKey = new Date(apt.scheduled_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    });

    // Get last 6 months of data
    const months: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const fullKey = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      months.push({ label, count: monthCounts[fullKey] || 0 });
    }

    return {
      totalVisits: displayAppointments.length,
      uniqueDoctors: doctorIds.size,
      uniqueChildren: childIds.size,
      lastVisit: sortedByDate[0],
      visitsByMonth: months,
    };
  }, [displayAppointments]);

  // Group appointments by child
  const appointmentsByChild = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    displayAppointments.forEach((apt) => {
      const childId = apt.child_id;
      if (!grouped[childId]) grouped[childId] = [];
      grouped[childId].push(apt);
    });
    return grouped;
  }, [displayAppointments]);

  const toggleTestMode = () => {
    if (!testMode) {
      if (children.length === 0) {
        Alert.alert('No Children', 'Please add a child first to generate test data.');
        return;
      }
      const newMockData = generateMockAppointments(children);
      setMockData(newMockData);
      Alert.alert('Test Mode Enabled', `Generated ${newMockData.length} mock appointments.`);
    } else {
      setMockData([]);
    }
    setTestMode(!testMode);
  };

  const getMaxCount = () => Math.max(...stats.visitsByMonth.map((m) => m.count), 1);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  const hasAppointments = displayAppointments.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Health History</Text>
        <TouchableOpacity
          style={[styles.testModeButton, testMode && styles.testModeButtonActive]}
          onPress={toggleTestMode}
        >
          <Ionicons
            name={testMode ? 'flask' : 'flask-outline'}
            size={18}
            color={testMode ? colors.white : colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {testMode && (
        <View style={styles.testModeBanner}>
          <Ionicons name="information-circle" size={16} color={colors.primary[700]} />
          <Text style={styles.testModeText}>Test mode - showing sample data</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!hasAppointments ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Ionicons name="document-text-outline" size={80} color={colors.neutral[300]} />
            </View>
            <Text style={styles.emptyTitle}>No Visit History Yet</Text>
            <Text style={styles.emptyDescription}>
              Your child's medical visit history will appear here after your first appointment.
              Book a consultation to get started!
            </Text>
            <Button
              title="Book First Appointment"
              onPress={() => router.push('/(guardian)/book')}
              style={styles.bookButton}
              icon={<Ionicons name="calendar" size={20} color={colors.white} />}
            />
            <TouchableOpacity style={styles.testModeLink} onPress={toggleTestMode}>
              <Text style={styles.testModeLinkText}>
                Want to see how this looks? Enable test mode
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary Stats */}
            <View style={styles.statsRow}>
              <Card style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success[500]} />
                </View>
                <Text style={styles.statValue}>{stats.totalVisits}</Text>
                <Text style={styles.statLabel}>Total Visits</Text>
              </Card>
              <Card style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="medical" size={24} color={colors.primary[500]} />
                </View>
                <Text style={styles.statValue}>{stats.uniqueDoctors}</Text>
                <Text style={styles.statLabel}>Doctors Seen</Text>
              </Card>
            </View>

            {/* Visit Frequency Chart */}
            <Card style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Visit Frequency</Text>
              <Text style={styles.chartSubtitle}>Last 6 months</Text>
              <View style={styles.chartContainer}>
                {stats.visitsByMonth.map((month, index) => (
                  <View key={index} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: month.count > 0
                              ? Math.max((month.count / getMaxCount()) * 80, 8)
                              : 4,
                            backgroundColor:
                              month.count > 0 ? colors.primary[500] : colors.neutral[200],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{month.label}</Text>
                    {month.count > 0 && (
                      <Text style={styles.barCount}>{month.count}</Text>
                    )}
                  </View>
                ))}
              </View>
            </Card>

            {/* Last Visit Summary */}
            {stats.lastVisit && (
              <Card style={styles.lastVisitCard}>
                <View style={styles.lastVisitHeader}>
                  <Text style={styles.sectionTitle}>Most Recent Visit</Text>
                  <Badge label="Completed" variant="success" size="sm" />
                </View>
                <TouchableOpacity
                  style={styles.lastVisitContent}
                  onPress={() =>
                    router.push(`/(guardian)/appointment/${stats.lastVisit!.id}`)
                  }
                >
                  <Avatar
                    name={stats.lastVisit.doctor?.profile?.full_name || 'Doctor'}
                    source={stats.lastVisit.doctor?.profile?.avatar_url}
                    size="lg"
                  />
                  <View style={styles.lastVisitInfo}>
                    <Text style={styles.lastVisitDoctor}>
                      {stats.lastVisit.doctor?.profile?.full_name}
                    </Text>
                    <Text style={styles.lastVisitSpec}>
                      {stats.lastVisit.doctor?.specialization}
                    </Text>
                    <View style={styles.lastVisitMeta}>
                      <Ionicons name="person" size={14} color={colors.text.tertiary} />
                      <Text style={styles.lastVisitMetaText}>
                        {stats.lastVisit.child?.full_name}
                      </Text>
                      <Text style={styles.lastVisitDot}>•</Text>
                      <Text style={styles.lastVisitMetaText}>
                        {dateUtils.formatDate(stats.lastVisit.scheduled_at, 'dd MMM yyyy')}
                      </Text>
                    </View>
                    {stats.lastVisit.chief_complaint && (
                      <Text style={styles.lastVisitReason} numberOfLines={1}>
                        {stats.lastVisit.chief_complaint}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </TouchableOpacity>
              </Card>
            )}

            {/* Appointments by Child */}
            {Object.entries(appointmentsByChild).map(([childId, childAppointments]) => {
              const child = childAppointments[0]?.child;
              if (!child) return null;

              return (
                <View key={childId} style={styles.childSection}>
                  <View style={styles.childHeader}>
                    <Avatar
                      name={child.full_name}
                      source={child.avatar_url}
                      size="md"
                    />
                    <View style={styles.childHeaderInfo}>
                      <Text style={styles.childName}>{child.full_name}</Text>
                      <Text style={styles.childVisitCount}>
                        {childAppointments.length} visit{childAppointments.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {childAppointments.slice(0, 3).map((apt) => (
                    <TouchableOpacity
                      key={apt.id}
                      style={styles.visitItem}
                      onPress={() => router.push(`/(guardian)/appointment/${apt.id}`)}
                    >
                      <View style={styles.visitTimeline}>
                        <View style={styles.visitDot} />
                        <View style={styles.visitLine} />
                      </View>
                      <View style={styles.visitContent}>
                        <Text style={styles.visitDate}>
                          {dateUtils.formatDate(apt.scheduled_at, 'dd MMM yyyy')}
                        </Text>
                        <Text style={styles.visitDoctor}>
                          {apt.doctor?.profile?.full_name}
                        </Text>
                        {apt.chief_complaint && (
                          <Text style={styles.visitReason} numberOfLines={1}>
                            {apt.chief_complaint}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
                    </TouchableOpacity>
                  ))}

                  {childAppointments.length > 3 && (
                    <TouchableOpacity style={styles.viewMoreButton}>
                      <Text style={styles.viewMoreText}>
                        View {childAppointments.length - 3} more visits
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Quick Book CTA */}
            <Card style={styles.quickBookCard}>
              <View style={styles.quickBookContent}>
                <View>
                  <Text style={styles.quickBookTitle}>Need another checkup?</Text>
                  <Text style={styles.quickBookSubtitle}>
                    Book an appointment with ease
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.quickBookButton}
                  onPress={() => router.push('/(guardian)/book')}
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}
      </ScrollView>
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
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  testModeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  testModeButtonActive: {
    backgroundColor: colors.primary[500],
  },
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  testModeText: {
    fontSize: fontSizes.sm,
    color: colors.primary[700],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
  },
  emptyIllustration: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  bookButton: {
    minWidth: 200,
  },
  testModeLink: {
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  testModeLinkText: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  statIconContainer: {
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  chartCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  chartSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: spacing.lg,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  bar: {
    width: 24,
    borderRadius: 12,
  },
  barLabel: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  barCount: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    color: colors.primary[600],
    marginTop: spacing.xs,
  },
  lastVisitCard: {
    marginBottom: spacing.lg,
  },
  lastVisitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  lastVisitContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastVisitInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  lastVisitDoctor: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  lastVisitSpec: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  lastVisitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  lastVisitMetaText: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  lastVisitDot: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
  },
  lastVisitReason: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  childSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  childHeaderInfo: {
    marginLeft: spacing.md,
  },
  childName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.text.primary,
  },
  childVisitCount: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  visitTimeline: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  visitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
  },
  visitLine: {
    width: 2,
    height: 40,
    backgroundColor: colors.primary[100],
    marginTop: spacing.xs,
  },
  visitContent: {
    flex: 1,
  },
  visitDate: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.text.primary,
  },
  visitDoctor: {
    fontSize: fontSizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  visitReason: {
    fontSize: fontSizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  viewMoreText: {
    fontSize: fontSizes.sm,
    color: colors.primary[600],
    fontWeight: fontWeights.medium,
  },
  quickBookCard: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  quickBookContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickBookTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.primary[700],
  },
  quickBookSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.primary[600],
    marginTop: spacing.xs,
  },
  quickBookButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
