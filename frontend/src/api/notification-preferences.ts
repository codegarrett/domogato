import apiClient from './client'

export interface NotificationPref {
  event_category: string
  in_app: boolean
  email: boolean
  email_delivery: 'instant' | 'digest'
}

export async function getNotificationPreferences(): Promise<NotificationPref[]> {
  const { data } = await apiClient.get<NotificationPref[]>('/users/me/notification-preferences')
  return data
}

export async function updateNotificationPreferences(prefs: NotificationPref[]): Promise<NotificationPref[]> {
  const { data } = await apiClient.put<NotificationPref[]>('/users/me/notification-preferences', prefs)
  return data
}
