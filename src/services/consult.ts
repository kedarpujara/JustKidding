import { supabase } from '@/lib/supabase';
import type { ConsultNote, Prescription, PrescriptionMedication } from '@/types';

export const consultService = {
  // Consult Notes
  async getConsultNote(appointmentId: string): Promise<ConsultNote | null> {
    const { data, error } = await supabase
      .from('consult_notes')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createConsultNote(
    appointmentId: string,
    doctorId: string,
    note: Omit<ConsultNote, 'id' | 'appointment_id' | 'doctor_id' | 'created_at' | 'updated_at'>
  ): Promise<ConsultNote> {
    const { data, error } = await supabase
      .from('consult_notes')
      .insert({
        appointment_id: appointmentId,
        doctor_id: doctorId,
        ...note,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateConsultNote(
    noteId: string,
    updates: Partial<Omit<ConsultNote, 'id' | 'appointment_id' | 'doctor_id' | 'created_at' | 'updated_at'>>
  ): Promise<ConsultNote> {
    const { data, error } = await supabase
      .from('consult_notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async saveConsultNote(
    appointmentId: string,
    doctorId: string,
    note: Omit<ConsultNote, 'id' | 'appointment_id' | 'doctor_id' | 'created_at' | 'updated_at'>
  ): Promise<ConsultNote> {
    const existing = await this.getConsultNote(appointmentId);

    if (existing) {
      return this.updateConsultNote(existing.id, note);
    }

    return this.createConsultNote(appointmentId, doctorId, note);
  },

  // Prescriptions
  async getPrescription(appointmentId: string): Promise<Prescription | null> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createPrescription(
    appointmentId: string,
    doctorId: string,
    childId: string,
    medications: PrescriptionMedication[],
    instructions?: string
  ): Promise<Prescription> {
    const { data, error } = await supabase
      .from('prescriptions')
      .insert({
        appointment_id: appointmentId,
        doctor_id: doctorId,
        child_id: childId,
        medications,
        instructions,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate PDF asynchronously
    this.generatePrescriptionPdf(data.id).catch(console.error);

    return data;
  },

  async updatePrescription(
    prescriptionId: string,
    medications: PrescriptionMedication[],
    instructions?: string
  ): Promise<Prescription> {
    const { data, error } = await supabase
      .from('prescriptions')
      .update({
        medications,
        instructions,
      })
      .eq('id', prescriptionId)
      .select()
      .single();

    if (error) throw error;

    // Regenerate PDF
    this.generatePrescriptionPdf(data.id).catch(console.error);

    return data;
  },

  async generatePrescriptionPdf(prescriptionId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-prescription-pdf', {
      body: {
        prescription_id: prescriptionId,
      },
    });

    if (error) throw error;

    return data.pdf_url;
  },

  async getPrescriptionPdfUrl(prescriptionId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('pdf_url')
      .eq('id', prescriptionId)
      .single();

    if (error) throw error;
    return data?.pdf_url;
  },

  async getChildPrescriptions(childId: string): Promise<Prescription[]> {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDoctorConsultNotes(
    doctorId: string,
    limit = 20
  ): Promise<ConsultNote[]> {
    const { data, error } = await supabase
      .from('consult_notes')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
