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

    const { appointment_id, amount } = await req.json();

    if (!appointment_id || !amount) {
      throw new Error('Missing required fields');
    }

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .select('*, doctor:doctor_profiles(*)')
      .eq('id', appointment_id)
      .single();

    if (appointmentError) throw appointmentError;

    // Create Razorpay order
    const razorpayKey = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`${razorpayKey}:${razorpaySecret}`)}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: `appt_${appointment_id}`,
        notes: {
          appointment_id,
          doctor_id: appointment.doctor_id,
        },
      }),
    });

    const order = await orderResponse.json();

    if (!orderResponse.ok) {
      throw new Error(order.error?.description || 'Failed to create Razorpay order');
    }

    // Store payment record
    const { error: paymentError } = await supabaseClient.from('payments').insert({
      appointment_id,
      guardian_id: appointment.guardian_id,
      amount,
      razorpay_order_id: order.id,
      status: 'created',
    });

    if (paymentError) throw paymentError;

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount,
        currency: 'INR',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
