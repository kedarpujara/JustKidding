import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentStatus } from '@/types';

export const appointmentsService = {
  async getGuardianAppointments(
    guardianId: string,
    status?: AppointmentStatus | AppointmentStatus[]
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('guardian_id', guardianId);

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getDoctorAppointments(
    doctorId: string,
    status?: AppointmentStatus | AppointmentStatus[]
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('doctor_id', doctorId);

    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data, error } = await query.order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAppointment(appointmentId: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        guardian:profiles!appointments_guardian_id_fkey(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('id', appointmentId)
      .single();

    if (error) throw error;
    return data;
  },

  async createAppointment(appointment: {
    slot_id: string;
    child_id: string;
    guardian_id: string;
    doctor_id: string;
    chief_complaint?: string;
    scheduled_at: string;
  }): Promise<Appointment> {
    // Fetch snapshot data for preservation
    const [doctorResult, guardianResult, childResult] = await Promise.all([
      supabase
        .from('doctor_profiles')
        .select('profile:profiles(full_name, avatar_url)')
        .eq('id', appointment.doctor_id)
        .single(),
      supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', appointment.guardian_id)
        .single(),
      supabase
        .from('children')
        .select('full_name, date_of_birth')
        .eq('id', appointment.child_id)
        .single(),
    ]);

    const doctorProfile = doctorResult.data?.profile as { full_name: string; avatar_url?: string } | null;
    const guardianProfile = guardianResult.data;
    const childData = childResult.data;

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointment,
        status: 'pending_payment',
        // Snapshot data for preservation
        doctor_name: doctorProfile?.full_name || 'Unknown Doctor',
        doctor_avatar_url: doctorProfile?.avatar_url,
        guardian_name: guardianProfile?.full_name || 'Unknown Guardian',
        guardian_phone: guardianProfile?.phone,
        child_name: childData?.full_name || 'Unknown Child',
        child_dob: childData?.date_of_birth,
      })
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updateAppointmentStatus(
    appointmentId: string,
    status: AppointmentStatus,
    additionalData?: {
      started_at?: string;
      ended_at?: string;
      canceled_at?: string;
      cancellation_reason?: string;
    }
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        ...additionalData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async cancelAppointment(
    appointmentId: string,
    reason: string
  ): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'canceled', {
      canceled_at: new Date().toISOString(),
      cancellation_reason: reason,
    });
  },

  async startAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'live', {
      started_at: new Date().toISOString(),
    });
  },

  async endAppointment(appointmentId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(appointmentId, 'completed', {
      ended_at: new Date().toISOString(),
    });
  },

  async getUpcomingAppointments(
    userId: string,
    role: 'guardian' | 'doctor'
  ): Promise<Appointment[]> {
    const now = new Date().toISOString();

    let query = supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .in('status', ['pending_payment', 'scheduled', 'live'])
      .gte('scheduled_at', now);

    if (role === 'guardian') {
      query = query.eq('guardian_id', userId);
    } else {
      query = query.eq('doctor_id', userId);
    }

    const { data, error } = await query
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (error) throw error;
    return data || [];
  },

  async getPastAppointments(
    userId: string,
    role: 'guardian' | 'doctor',
    limit = 20
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('status', 'completed');

    if (role === 'guardian') {
      query = query.eq('guardian_id', userId);
    } else {
      query = query.eq('doctor_id', userId);
    }

    const { data, error } = await query
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async rescheduleAppointment(
    oldAppointmentId: string,
    newSlotId: string,
    newScheduledAt: string
  ): Promise<Appointment> {
    // Get the old appointment first
    const oldAppointment = await this.getAppointment(oldAppointmentId);

    // Cancel the old appointment
    await this.cancelAppointment(oldAppointmentId, 'Rescheduled by guardian');

    // Release the old slot
    await supabase
      .from('appointment_slots')
      .update({ is_available: true, held_by: null, held_until: null })
      .eq('id', oldAppointment.slot_id);

    // Book the new slot
    await supabase
      .from('appointment_slots')
      .update({ is_available: false })
      .eq('id', newSlotId);

    // Create new appointment with preserved snapshot data
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        slot_id: newSlotId,
        child_id: oldAppointment.child_id,
        guardian_id: oldAppointment.guardian_id,
        doctor_id: oldAppointment.doctor_id,
        chief_complaint: oldAppointment.chief_complaint,
        scheduled_at: newScheduledAt,
        status: 'scheduled', // Already paid, so directly scheduled
        // Preserve snapshot data from old appointment
        doctor_name: oldAppointment.doctor_name,
        doctor_avatar_url: oldAppointment.doctor_avatar_url,
        guardian_name: oldAppointment.guardian_name,
        guardian_phone: oldAppointment.guardian_phone,
        child_name: oldAppointment.child_name,
        child_dob: oldAppointment.child_dob,
      })
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  isWithin24Hours(scheduledAt: string): boolean {
    const appointmentTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);
    return hoursUntil <= 24 && hoursUntil > 0;
  },

  getRescheduleFee(scheduledAt: string): number {
    return this.isWithin24Hours(scheduledAt) ? 250 : 0;
  },

  async getTodaysAppointments(doctorId: string): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('doctor_id', doctorId)
      .in('status', ['pending_payment', 'scheduled', 'live'])
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getDoctorUpcomingAppointments(doctorId: string): Promise<Appointment[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('doctor_id', doctorId)
      .in('status', ['pending_payment', 'scheduled', 'live'])
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getDoctorAllAppointments(doctorId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getChildAppointments(childId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        child:children(*),
        doctor:doctor_profiles(*, profile:profiles(*)),
        slot:appointment_slots(*)
      `)
      .eq('child_id', childId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDoctorPatients(doctorId: string): Promise<{ child: any; guardian: any; lastVisit: string }[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        child:children(*),
        guardian:profiles!appointments_guardian_id_fkey(*),
        scheduled_at
      `)
      .eq('doctor_id', doctorId)
      .order('scheduled_at', { ascending: false });

    if (error) throw error;

    // Get unique children with their most recent visit
    const patientMap = new Map<string, { child: any; guardian: any; lastVisit: string }>();

    data?.forEach((appointment) => {
      if (appointment.child && !patientMap.has(appointment.child.id)) {
        patientMap.set(appointment.child.id, {
          child: appointment.child,
          guardian: appointment.guardian,
          lastVisit: appointment.scheduled_at,
        });
      }
    });

    return Array.from(patientMap.values());
  },
};
