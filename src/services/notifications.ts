import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { NotificationJob } from '@/types';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationsService = {
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification');
      return null;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Configure Android channel
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('appointments', {
        name: 'Appointments',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });

      Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    return token;
  },

  async savePushToken(userId: string, token: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      });

    if (error) console.error('Failed to save push token:', error);
  },

  async removePushToken(userId: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) console.error('Failed to remove push token:', error);
  },

  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Date | number,
    data?: Record<string, unknown>
  ): Promise<string> {
    const scheduledTime = trigger instanceof Date ? trigger : new Date(trigger);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        date: scheduledTime,
      },
    });

    return identifier;
  },

  async cancelNotification(identifier: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  },

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },

  // Schedule appointment reminders (called after booking confirmation)
  async scheduleAppointmentReminders(
    appointmentId: string,
    scheduledAt: string,
    childName: string,
    doctorName: string
  ): Promise<void> {
    const appointmentTime = new Date(scheduledAt);

    // 24 hours before
    const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminder24h > new Date()) {
      await this.scheduleLocalNotification(
        'Appointment Tomorrow',
        `${childName}'s appointment with Dr. ${doctorName} is tomorrow`,
        reminder24h,
        { appointmentId, type: 'reminder_24h' }
      );
    }

    // 1 hour before
    const reminder1h = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
    if (reminder1h > new Date()) {
      await this.scheduleLocalNotification(
        'Appointment in 1 Hour',
        `${childName}'s appointment with Dr. ${doctorName} starts in 1 hour`,
        reminder1h,
        { appointmentId, type: 'reminder_1h' }
      );
    }

    // 5 minutes before
    const reminder5min = new Date(appointmentTime.getTime() - 5 * 60 * 1000);
    if (reminder5min > new Date()) {
      await this.scheduleLocalNotification(
        'Appointment Starting Soon',
        `${childName}'s appointment with Dr. ${doctorName} starts in 5 minutes. Tap to join.`,
        reminder5min,
        { appointmentId, type: 'reminder_5min' }
      );
    }
  },

  // Add notification listener
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  },

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },

  // Server-side notification jobs (for viewing)
  async getNotificationJobs(appointmentId: string): Promise<NotificationJob[]> {
    const { data, error } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Send immediate notification (via edge function)
  async sendImmediateNotification(
    recipientId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        recipient_id: recipientId,
        title,
        body,
        data,
      },
    });

    if (error) throw error;
  },
};
