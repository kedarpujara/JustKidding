import { supabase } from '@/lib/supabase';
import type { VideoSession, VideoCallEvent } from '@/types';

export const videoService = {
  async createVideoRoom(appointmentId: string): Promise<VideoSession> {
    const { data, error } = await supabase.functions.invoke('create-video-room', {
      body: {
        appointment_id: appointmentId,
      },
    });

    if (error) throw error;
    return data;
  },

  async getVideoSession(appointmentId: string): Promise<VideoSession | null> {
    const { data, error } = await supabase
      .from('video_sessions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getJoinToken(
    appointmentId: string,
    role: 'doctor' | 'patient'
  ): Promise<{ token: string; roomName: string }> {
    const session = await this.getVideoSession(appointmentId);

    if (!session) {
      throw new Error('Video session not found');
    }

    // For security, tokens should be refreshed from the server
    // This is a simplified version - in production, call an edge function
    const token = role === 'doctor' ? session.doctor_token : session.patient_token;

    if (!token) {
      // Generate new token
      const { data, error } = await supabase.functions.invoke('refresh-video-token', {
        body: {
          session_id: session.id,
          role,
        },
      });

      if (error) throw error;
      return { token: data.token, roomName: session.room_name };
    }

    return { token, roomName: session.room_name };
  },

  async logCallEvent(
    sessionId: string,
    eventType: VideoCallEvent['event_type'],
    participantId: string,
    participantRole: 'doctor' | 'patient',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase.from('video_call_events').insert({
      session_id: sessionId,
      event_type: eventType,
      participant_id: participantId,
      participant_role: participantRole,
      metadata,
    });

    if (error) console.error('Failed to log call event:', error);
  },

  async startSession(sessionId: string): Promise<VideoSession> {
    const { data, error } = await supabase
      .from('video_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async endSession(sessionId: string): Promise<VideoSession> {
    const { data, error } = await supabase
      .from('video_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCallEvents(sessionId: string): Promise<VideoCallEvent[]> {
    const { data, error } = await supabase
      .from('video_call_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  canJoinCall(scheduledAt: string): { canJoin: boolean; minutesUntil: number } {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Can join 5 minutes before
    return {
      canJoin: diffMinutes <= 5,
      minutesUntil: diffMinutes,
    };
  },
};
