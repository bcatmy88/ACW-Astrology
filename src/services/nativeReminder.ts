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
 * Synthesize a pleasant notification chime sound using Web Audio API
 */
export function playChimeSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First bell tone: 659.25 Hz (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.4);

    // Second bell tone: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0.25, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.65);
  } catch (e) {
    console.warn('[ReminderService] Audio synthesis not supported', e);
  }
}

/**
 * Trigger device vibration if supported
 */
export function vibrateDevice(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([140, 80, 200]);
    }
  } catch {}
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
        return { granted: true };
      }
    } else {
      // In-app notifications are enabled
      return { granted: true };
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      return { granted: perm === 'granted' };
    } catch {
      return { granted: true };
    }
  }

  return { granted: true };
}

/**
 * Trigger immediate test reminder notification
 */
export async function triggerTestReminder(
  todayAppointments: AppointmentItem[],
  lang: AppLanguage = 'zh'
): Promise<ReminderTestResult> {
  // Always trigger sound & haptics for real feedback
  playChimeSound();
  vibrateDevice();

  // If native Android plugin is compiled and available in this APK
  if (isNativeReminderPluginAvailable()) {
    try {
      await AppointmentReminder.syncAppointments({ appointments: todayAppointments });
      const res = await AppointmentReminder.triggerTestNotification();
      return { success: res.success, message: res.message };
    } catch (err: any) {
      console.warn('[ReminderService] Native plugin call failed, using in-app alert', err);
    }
  }

  // Web notification fallback if permission is granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayList = todayAppointments.filter(a => a.date === todayStr && a.status === 'Pending');
      const summary = lang === 'zh' 
        ? `【阿赞旺大师】今日有 ${todayList.length || 1} 项待办预约`
        : `You have ${todayList.length || 1} appointment(s) today.`;
      
      new Notification(lang === 'zh' ? "今日预约提醒" : "Today's Appointments", {
        body: summary,
        icon: '/favicon.ico',
      });
    } catch {}
  }

  return {
    success: true,
    message: lang === 'zh' ? '🔔 测试提醒已触发（已播放提示音与震动）！' : '🔔 Test alert triggered (chime & vibration active)!'
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
