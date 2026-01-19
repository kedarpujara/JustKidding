import { supabase } from '@/lib/supabase';
import type { Payment, Refund } from '@/types';

export const paymentsService = {
  async createOrder(
    appointmentId: string,
    amount: number
  ): Promise<{ orderId: string; amount: number; currency: string }> {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: {
        appointment_id: appointmentId,
        amount,
      },
    });

    if (error) throw error;
    return data;
  },

  async verifyPayment(
    appointmentId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<{ success: boolean }> {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: {
        appointment_id: appointmentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      },
    });

    if (error) throw error;
    return data;
  },

  async getPayment(appointmentId: string): Promise<Payment | null> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getGuardianPayments(guardianId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('guardian_id', guardianId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async requestRefund(
    paymentId: string,
    appointmentId: string,
    reason: string
  ): Promise<Refund> {
    const { data, error } = await supabase
      .from('refunds')
      .insert({
        payment_id: paymentId,
        appointment_id: appointmentId,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRefunds(appointmentId: string): Promise<Refund[]> {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async processRefund(
    refundId: string,
    processedBy: string
  ): Promise<Refund> {
    const { data: refund, error: fetchError } = await supabase
      .from('refunds')
      .select('*, payment:payments(*)')
      .eq('id', refundId)
      .single();

    if (fetchError) throw fetchError;

    // Call edge function to process refund with Razorpay
    const { data: result, error: processError } = await supabase.functions.invoke(
      'process-razorpay-refund',
      {
        body: {
          refund_id: refundId,
          payment_id: refund.payment_id,
          amount: refund.amount || refund.payment.amount,
        },
      }
    );

    if (processError) throw processError;

    // Update refund status
    const { data, error } = await supabase
      .from('refunds')
      .update({
        status: 'processed',
        razorpay_refund_id: result.razorpay_refund_id,
        processed_by: processedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
