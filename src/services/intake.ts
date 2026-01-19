import { supabase } from '@/lib/supabase';
import type { IntakeTemplate, IntakeResponse, IntakeEvent } from '@/types';

export const intakeService = {
  async getActiveTemplate(specialty?: string): Promise<IntakeTemplate> {
    let query = supabase
      .from('intake_templates')
      .select('*')
      .eq('is_active', true);

    if (specialty) {
      query = query.or(`specialty.eq.${specialty},specialty.is.null`);
    } else {
      query = query.is('specialty', null);
    }

    const { data, error } = await query
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  },

  async getIntakeResponse(appointmentId: string): Promise<IntakeResponse | null> {
    const { data, error } = await supabase
      .from('intake_responses')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async createIntakeResponse(
    appointmentId: string,
    templateId: string
  ): Promise<IntakeResponse> {
    const { data, error } = await supabase
      .from('intake_responses')
      .insert({
        appointment_id: appointmentId,
        template_id: templateId,
        responses: {},
        is_complete: false,
      })
      .select()
      .single();

    if (error) throw error;

    // Log intake started event
    await this.logEvent(appointmentId, 'started');

    return data;
  },

  async updateIntakeResponse(
    responseId: string,
    responses: Record<string, unknown>,
    isComplete = false
  ): Promise<IntakeResponse> {
    const { data, error } = await supabase
      .from('intake_responses')
      .update({
        responses,
        is_complete: isComplete,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId)
      .select()
      .single();

    if (error) throw error;

    // Log event
    const appointmentId = data.appointment_id;
    await this.logEvent(appointmentId, isComplete ? 'completed' : 'saved', { responseId });

    return data;
  },

  async saveProgress(
    appointmentId: string,
    responses: Record<string, unknown>
  ): Promise<IntakeResponse> {
    const existing = await this.getIntakeResponse(appointmentId);

    if (existing) {
      return this.updateIntakeResponse(existing.id, responses, false);
    }

    // Create new response if doesn't exist
    const template = await this.getActiveTemplate();
    const response = await this.createIntakeResponse(appointmentId, template.id);
    return this.updateIntakeResponse(response.id, responses, false);
  },

  async completeIntake(
    appointmentId: string,
    responses: Record<string, unknown>
  ): Promise<IntakeResponse> {
    const existing = await this.getIntakeResponse(appointmentId);

    if (existing) {
      return this.updateIntakeResponse(existing.id, responses, true);
    }

    // Create and complete
    const template = await this.getActiveTemplate();
    const response = await this.createIntakeResponse(appointmentId, template.id);
    return this.updateIntakeResponse(response.id, responses, true);
  },

  async logEvent(
    appointmentId: string,
    eventType: IntakeEvent['event_type'],
    data?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase.from('intake_events').insert({
      appointment_id: appointmentId,
      event_type: eventType,
      data,
    });

    if (error) console.error('Failed to log intake event:', error);
  },

  async requestAdditionalInfo(
    appointmentId: string,
    questions: string[]
  ): Promise<void> {
    await this.logEvent(appointmentId, 'additional_requested', { questions });

    // Could also send a push notification here
  },

  async getIntakeEvents(appointmentId: string): Promise<IntakeEvent[]> {
    const { data, error } = await supabase
      .from('intake_events')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
