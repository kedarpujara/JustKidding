import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointment_id } = await req.json();

    if (!appointment_id) {
      throw new Error('Missing appointment_id');
    }

    // Check if video session already exists
    const { data: existing } = await supabaseClient
      .from('video_sessions')
      .select('*')
      .eq('appointment_id', appointment_id)
      .single();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique room name
    const roomName = `jk-${appointment_id.slice(0, 8)}-${Date.now()}`;

    // For Agora: Generate tokens
    // This is a simplified version - in production, use proper token generation
    const agoraAppId = Deno.env.get('AGORA_APP_ID');
    const agoraAppCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    // Generate tokens (simplified - use Agora SDK in production)
    const doctorToken = `doctor_${roomName}_${Date.now()}`;
    const patientToken = `patient_${roomName}_${Date.now()}`;

    // Create video session record
    const { data: session, error } = await supabaseClient
      .from('video_sessions')
      .insert({
        appointment_id,
        room_name: roomName,
        provider: 'agora',
        provider_room_id: agoraAppId,
        doctor_token: doctorToken,
        patient_token: patientToken,
        status: 'created',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(session), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
