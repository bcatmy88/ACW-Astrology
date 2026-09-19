import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppointmentItem, AppLanguage } from '../types';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:mm", e.g. "08:00"
  leadTimeEnabled: boolean; // Remind in advance before appointment starts
  leadTimeMinutes: number; // e.g. 15, 30, 60, 120, 1440
}

export interface NativeReminderPlugin {
  getReminderSettings(): Promise<{ 
    enabled: boolean; 
    time: string; 
    leadTimeEnabled?: boolean; 
    leadTimeMinutes?: number; 
    hasPermission: boolean 
  }>;
  setReminderSettings(options: { 
    enabled: boolean; 
    time: string; 
    leadTimeEnabled?: boolean; 
    leadTimeMinutes?: number; 
  }): Promise<{ success: boolean; message: string }>;
  syncAppointments(options: { appointments: AppointmentItem[] }): Promise<{ success: boolean; count: number }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  triggerTestNotification(): Promise<{ success: boolean; message: string; count: number }>;
  getNotificationLaunchData(): Promise<{ openAppointments?: boolean }>;
}

// Register native plugin for Capacitor (matches AppointmentReminderPlugin on Android)
const AppointmentReminder = registerPlugin<NativeReminderPlugin>('AppointmentReminder');

const STORAGE_KEY = 'archan_wang_appointment_reminder_settings';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  time: '08:00',
  leadTimeEnabled: true,
  leadTimeMinutes: 30,
};

/**
 * Check if running in a native Android/Capacitor environment with the compiled AppointmentReminder plugin
 */
export function isNativeReminderPluginAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AppointmentReminder');
  } catch {
    return false;
  }
}

/**
 * Get stored reminder settings (from Native Android if running in Capacitor, or localStorage fallback)
 */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    if (isNativeReminderPluginAvailable()) {
      const res = await AppointmentReminder.getReminderSettings();
      if (res && typeof res.enabled === 'boolean') {
        return {
          enabled: res.enabled,
          time: res.time || DEFAULT_REMINDER_SETTINGS.time,
          leadTimeEnabled: typeof res.leadTimeEnabled === 'boolean' ? res.leadTimeEnabled : DEFAULT_REMINDER_SETTINGS.leadTimeEnabled,
          leadTimeMinutes: typeof res.leadTimeMinutes === 'number' ? res.leadTimeMinutes : DEFAULT_REMINDER_SETTINGS.leadTimeMinutes,
        };
      }
    }
  } catch (err) {
    console.warn('[ReminderService] Native plugin not available, falling back to localStorage', err);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_REMINDER_SETTINGS.enabled,
        time: parsed.time || DEFAULT_REMINDER_SETTINGS.time,
        leadTimeEnabled: typeof parsed.leadTimeEnabled === 'boolean' ? parsed.leadTimeEnabled : DEFAULT_REMINDER_SETTINGS.leadTimeEnabled,
        leadTimeMinutes: typeof parsed.leadTimeMinutes === 'number' ? parsed.leadTimeMinutes : DEFAULT_REMINDER_SETTINGS.leadTimeMinutes,
      };
    }
  } catch (e) {
    console.error('[ReminderService] Error parsing settings from localStorage', e);
  }

  return DEFAULT_REMINDER_SETTINGS;
}

export interface ReminderTestResult {
  success: boolean;
  message: string;
  isPluginMissing?: boolean;
}

export interface PermissionResult {
  granted: boolean;
  isPluginMissing?: boolean;
}

/**
 * Save reminder settings to both Native Android and localStorage
 */
export async function saveReminderSettings(settings: ReminderSettings): Promise<boolean> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.setReminderSettings({
        enabled: settings.enabled,
        time: settings.time,
        leadTimeEnabled: settings.leadTimeEnabled,
        leadTimeMinutes: settings.leadTimeMinutes,
      });
      return res.success;
    } catch (err) {
      console.warn('[ReminderService] Error saving settings to native plugin', err);
      return false;
    }
  }

  return true;
}

/**
 * Synchronize appointments to Native Android SharedPreferences so background AlarmManager can read them
 */
export async function syncAppointmentsToNative(appointments: AppointmentItem[]): Promise<void> {
  if (isNativeReminderPluginAvailable()) {
    try {
      await AppointmentReminder.syncAppointments({ appointments });
    } catch (err) {
      console.warn('[ReminderService] Failed to sync appointments to native Android', err);
    }
  }
}

/**
 * Request notification permission (Android 13+ POST_NOTIFICATIONS or Web Notification)
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (Capacitor.isNativePlatform()) {
    if (isNativeReminderPluginAvailable()) {
      try {
        const res = await AppointmentReminder.requestNotificationPermission();
        return { granted: !!res.granted };
      } catch (err: any) {
        console.warn('[ReminderService] Error requesting native permission', err);
        const msg = String(err?.message || '');
        return { 
          granted: false, 
          isPluginMissing: msg.toLowerCase().includes('not implemented')
        };
      }
    } else {
      // Installed APK does not have the native Java plugin compiled in yet
      return { granted: false, isPluginMissing: true };
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return { granted: perm === 'granted' };
    } catch {
      return { granted: false };
    }
  }

  return { granted: false };
}

/**
 * Trigger immediate test reminder notification
 */
export async function triggerTestReminder(
  todayAppointments: AppointmentItem[],
  lang: AppLanguage = 'zh'
): Promise<ReminderTestResult> {
  // If native Android plugin is compiled and available in this APK
  if (isNativeReminderPluginAvailable()) {
    try {
      // First sync current appointments to ensure native storage has them
      await AppointmentReminder.syncAppointments({ appointments: todayAppointments });
      const res = await AppointmentReminder.triggerTestNotification();
      return { success: res.success, message: res.message };
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('not implemented')) {
        return {
          success: false,
          isPluginMissing: true,
          message: lang === 'zh'
            ? '当前手机安装的 APK 尚未编译原生提醒插件。请重新打包安装最新版 APK 即可激活手机状态栏通知！'
            : 'Installed APK lacks native reminder plugin. Please rebuild & reinstall APK.'
        };
      }
      return { success: false, message: msg || 'Native notification error' };
    }
  }

  // If on native platform but the plugin was not compiled into this APK
  if (Capacitor.isNativePlatform() && !isNativeReminderPluginAvailable()) {
    return {
      success: false,
      isPluginMissing: true,
      message: lang === 'zh'
        ? '检测到手机上运行的是旧版 APK，尚未编译进最新的原生 Java 提醒插件与 POST_NOTIFICATIONS 权限。重新打包并安装最新 APK 即可恢复手机状态栏提醒！'
        : 'The installed APK is an earlier build without the native reminder plugin or POST_NOTIFICATIONS permission. Please reinstall the updated APK.'
    };
  }

  // Web fallback simulation
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission !== 'granted') {
      const permRes = await requestNotificationPermission();
      if (!permRes.granted) {
        return {
          success: false,
          message: lang === 'zh' ? '请先允许通知权限' : 'Please grant notification permission',
        };
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayList = todayAppointments.filter(a => a.date === todayStr && a.status === 'Pending');

    if (todayList.length === 0) {
      return {
        success: true,
        message: lang === 'zh' ? '今日无待办预约，按规则不发送通知' : 'No appointments today; no notification sent as expected.',
      };
    }

    const summary = lang === 'zh' 
      ? `今日有 ${todayList.length} 项预约`
      : `You have ${todayList.length} appointment(s) today.`;
    
    const bodyText = todayList
      .map(a => `${a.time || '全天'} — ${a.clientName}${a.services?.length ? ` (${a.services.join(', ')})` : ''}`)
      .join('\n');

    new Notification(lang === 'zh' ? "今日预约提醒" : "Today's Appointments", {
      body: `${summary}\n${bodyText}`,
      icon: '/favicon.ico',
    });

    return {
      success: true,
      message: lang === 'zh' ? '已触发模拟通知' : 'Test notification triggered',
    };
  }

  return {
    success: true,
    message: lang === 'zh' ? '在 Android 手机真机环境下将调用原生通知中心' : 'Native Android notification will fire on device',
  };
}

/**
 * Check if the application was launched from a notification tap
 */
export async function checkNotificationLaunch(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await AppointmentReminder.getNotificationLaunchData();
      return !!res.openAppointments;
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('open') === 'appointments' || window.location.hash === '#appointments') {
      return true;
    }
  }

  return false;
}
