import { supabase } from '@/lib/supabase';
import type { DoctorProfile, DoctorAvailabilityRule, DoctorTimeOff, AppointmentSlot, Profile } from '@/types';

const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export type DoctorWithProfile = DoctorProfile & { profile: Profile };

export const doctorsService = {
  async getDoctors(filters?: {
    specialization?: string;
    isVerified?: boolean;
  }): Promise<DoctorWithProfile[]> {
    let query = supabase
      .from('doctor_profiles')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('verification_status', 'approved');

    if (filters?.specialization) {
      query = query.eq('specialization', filters.specialization);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDoctor(doctorId: string): Promise<DoctorWithProfile> {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('id', doctorId)
      .single();

    if (error) throw error;
    return data;
  },

  async getDoctorByProfileId(profileId: string): Promise<DoctorProfile | null> {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createDoctorProfile(
    profileId: string,
    doctorData: {
      state_registrations: { state: string; registration_number: string }[];
      mbbs_institute: string;
      mbbs_institute_other?: string;
      md_institute?: string;
      md_institute_other?: string;
      experience_years?: number;
      bio?: string;
    }
  ): Promise<DoctorProfile> {
    // Get the primary registration number from the first state registration
    const primaryRegistration = doctorData.state_registrations[0];

    const { data, error } = await supabase
      .from('doctor_profiles')
      .insert({
        profile_id: profileId,
        specialization: 'Pediatrics', // Default for this app
        qualification: doctorData.mbbs_institute === 'Other'
          ? doctorData.mbbs_institute_other
          : doctorData.mbbs_institute,
        registration_number: primaryRegistration?.registration_number || '',
        experience_years: doctorData.experience_years || 0,
        consultation_fee: 500, // Default fee, can be updated later
        bio: doctorData.bio || '',
        languages: ['English', 'Hindi'], // Default, can be updated later
        verification_status: DEV_MODE ? 'approved' : 'pending',
        state_registrations: doctorData.state_registrations,
        mbbs_institute: doctorData.mbbs_institute,
        mbbs_institute_other: doctorData.mbbs_institute_other,
        md_institute: doctorData.md_institute,
        md_institute_other: doctorData.md_institute_other,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAvailabilityRules(doctorId: string): Promise<DoctorAvailabilityRule[]> {
    const { data, error } = await supabase
      .from('doctor_availability_rules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async setAvailabilityRule(
    doctorId: string,
    rule: Omit<DoctorAvailabilityRule, 'id' | 'doctor_id' | 'created_at'>
  ): Promise<DoctorAvailabilityRule> {
    // First, deactivate existing rules for this day
    await supabase
      .from('doctor_availability_rules')
      .update({ is_active: false })
      .eq('doctor_id', doctorId)
      .eq('day_of_week', rule.day_of_week);

    const { data, error } = await supabase
      .from('doctor_availability_rules')
      .insert({
        doctor_id: doctorId,
        ...rule,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTimeOff(doctorId: string): Promise<DoctorTimeOff[]> {
    const { data, error } = await supabase
      .from('doctor_time_off')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('end_date', new Date().toISOString())
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addTimeOff(
    doctorId: string,
    timeOff: Omit<DoctorTimeOff, 'id' | 'doctor_id' | 'created_at'>
  ): Promise<DoctorTimeOff> {
    const { data, error } = await supabase
      .from('doctor_time_off')
      .insert({
        doctor_id: doctorId,
        ...timeOff,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeTimeOff(timeOffId: string): Promise<void> {
    const { error } = await supabase
      .from('doctor_time_off')
      .delete()
      .eq('id', timeOffId);

    if (error) throw error;
  },

  async getAvailableSlots(
    doctorId: string,
    startDate: string,
    endDate: string
  ): Promise<AppointmentSlot[]> {
    const { data, error } = await supabase
      .from('appointment_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_available', true)
      .gte('start_time', startDate)
      .lte('start_time', endDate)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async holdSlot(slotId: string, userId: string): Promise<AppointmentSlot> {
    const holdUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const { data, error } = await supabase
      .from('appointment_slots')
      .update({
        held_by: userId,
        held_until: holdUntil,
        is_available: false,
      })
      .eq('id', slotId)
      .eq('is_available', true)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async releaseSlot(slotId: string): Promise<void> {
    const { error } = await supabase
      .from('appointment_slots')
      .update({
        held_by: null,
        held_until: null,
        is_available: true,
      })
      .eq('id', slotId);

    if (error) throw error;
  },

  async getSpecializations(): Promise<string[]> {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('specialization')
      .eq('verification_status', 'approved');

    if (error) throw error;

    const specializations = [...new Set(data?.map((d) => d.specialization) || [])];
    return specializations.sort();
  },

  async updateDoctorProfile(
    doctorId: string,
    updates: Partial<Omit<DoctorProfile, 'id' | 'profile_id' | 'created_at' | 'updated_at'>>
  ): Promise<DoctorProfile> {
    const { data, error } = await supabase
      .from('doctor_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doctorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
