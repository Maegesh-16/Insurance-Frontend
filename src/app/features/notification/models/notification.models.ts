export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationHistoryItem {
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  status: string;
  sentOn: string;
  attemptCount: number;
  failureReason: string | null;
  lastAttemptOn: string | null;
}