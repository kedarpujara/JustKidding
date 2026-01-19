import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

    // Verify webhook signature
    const expectedSignature = createHmac('sha256', webhookSecret!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(body);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      // Update payment status
      const { data: paymentRecord, error: updateError } = await supabaseClient
        .from('payments')
        .update({
          razorpay_payment_id: payment.id,
          status: 'captured',
        })
        .eq('razorpay_order_id', orderId)
        .select('appointment_id')
        .single();

      if (updateError) throw updateError;

      // Update appointment status to scheduled
      await supabaseClient
        .from('appointments')
        .update({ status: 'scheduled' })
        .eq('id', paymentRecord.appointment_id);

      // Create video room for the appointment
      await supabaseClient.functions.invoke('create-video-room', {
        body: { appointment_id: paymentRecord.appointment_id },
      });
    }

    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;

      await supabaseClient
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: payment.error_description,
        })
        .eq('razorpay_order_id', payment.order_id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
