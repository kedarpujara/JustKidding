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
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointment,
        status: 'pending_payment',
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

    // Create new appointment
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
      .in('status', ['scheduled', 'live'])
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', tomorrow.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
