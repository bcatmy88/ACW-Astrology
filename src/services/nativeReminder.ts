import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppointmentItem, AppLanguage } from '../types';

export interface ReminderSettings {
  enabled: boolean;
  time: string; // "HH:mm", e.g. "08:00"
  leadTimeEnabled: boolean; // Remind in advance before appointment starts
  leadTimeMinutes: number; // e.g. 15, 30, 60, 120, 1440
}

export interface ScheduledReminderItem {
  id: string;
  timestamp: number;
  title: string;
  body: string;
  extraData?: string;
}

export interface NativePermissionStatus {
  hasNotificationPermission: boolean;
  canScheduleExactAlarms: boolean;
  isIgnoringBatteryOptimizations: boolean;
  androidVersion: number;
  isNative: boolean;
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
  syncAppointments(options: { appointments: AppointmentItem[] }): Promise<{ 
    success: boolean; 
    syncedCount: number; 
    scheduledExactCount?: number 
  }>;
  scheduleReminder(options: {
    id: string;
    timestamp: number;
    title: string;
    body: string;
    extraData?: string;
  }): Promise<{ success: boolean; id: string; timestamp: number }>;
  cancelReminder(options: { id: string }): Promise<{ success: boolean; id: string }>;
  cancelAllReminders(): Promise<{ success: boolean }>;
  getScheduledReminders(): Promise<{ reminders: ScheduledReminderItem[]; count: number }>;
  scheduleTestReminder(options: { seconds: number }): Promise<{
    success: boolean;
    testId: string;
    triggerAt: number;
    seconds: number;
    message: string;
  }>;
  triggerTestNotification(): Promise<{ success: boolean; message: string }>;
  checkPermissions(): Promise<{
    hasNotificationPermission: boolean;
    canScheduleExactAlarms: boolean;
    isIgnoringBatteryOptimizations: boolean;
    androidVersion: number;
  }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  openNotificationSettings(): Promise<{ success: boolean }>;
  openExactAlarmSettings(): Promise<{ success: boolean; message?: string }>;
  openBatteryOptimizationSettings(): Promise<{ success: boolean }>;
  getNotificationLaunchData(): Promise<{ openAppointments?: boolean; reminderId?: string }>;
}

// Register native plugin for Capacitor (matches AppointmentReminderPlugin on Android)
export const AppointmentReminder = registerPlugin<NativeReminderPlugin>('AppointmentReminder');

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
 * Get real system permission statuses from Android Native
 */
export async function checkNativePermissions(): Promise<NativePermissionStatus> {
  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.checkPermissions();
      return {
        hasNotificationPermission: res.hasNotificationPermission,
        canScheduleExactAlarms: res.canScheduleExactAlarms,
        isIgnoringBatteryOptimizations: res.isIgnoringBatteryOptimizations,
        androidVersion: res.androidVersion,
        isNative: true,
      };
    } catch (e) {
      console.warn('[ReminderService] Error checking native permissions', e);
    }
  }

  // Web fallback check
  const hasWebNotification = typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  return {
    hasNotificationPermission: hasWebNotification,
    canScheduleExactAlarms: true,
    isIgnoringBatteryOptimizations: true,
    androidVersion: 0,
    isNative: false,
  };
}

/**
 * Request notification permission (Native Android 13+ POST_NOTIFICATIONS or Web Notification)
 */
export async function requestNotificationPermission(): Promise<{ granted: boolean }> {
  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.requestNotificationPermission();
      return { granted: !!res.granted };
    } catch (err: any) {
      console.warn('[ReminderService] Error requesting native permission', err);
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
 * Open Android system app notification settings
 */
export async function openNativeNotificationSettings(): Promise<boolean> {
  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.openNotificationSettings();
      return !!res.success;
    } catch (e) {
      console.warn('[ReminderService] Failed to open notification settings', e);
    }
  }
  return false;
}

/**
 * Open Android 12+ system exact alarm settings
 */
export async function openNativeExactAlarmSettings(): Promise<boolean> {
  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.openExactAlarmSettings();
      return !!res.success;
    } catch (e) {
      console.warn('[ReminderService] Failed to open exact alarm settings', e);
    }
  }
  return false;
}

/**
 * Open Android battery optimization settings
 */
export async function openNativeBatteryOptimizationSettings(): Promise<boolean> {
  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.openBatteryOptimizationSettings();
      return !!res.success;
    } catch (e) {
      console.warn('[ReminderService] Failed to open battery settings', e);
    }
  }
  return false;
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
 * Synchronize all appointments to Native Android AlarmManager & SharedPreferences
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
 * Calculate appointment reminder timestamp
 */
export function calculateAppointmentTimestamp(
  apt: AppointmentItem,
  leadTimeMinutes: number = 30
): number | null {
  if (!apt.date || apt.status !== 'Pending') return null;

  try {
    let dateStr = apt.date;
    let timeStr = apt.time || '09:00';
    const combined = `${dateStr}T${timeStr}:00`;
    const aptDate = new Date(combined);
    if (isNaN(aptDate.getTime())) return null;

    let triggerMs = aptDate.getTime();
    if (leadTimeMinutes > 0) {
      triggerMs -= leadTimeMinutes * 60 * 1000;
    }

    return triggerMs;
  } catch {
    return null;
  }
}

/**
 * Schedule or update an exact native alarm for a single appointment
 */
export async function scheduleAppointmentExactReminder(
  apt: AppointmentItem,
  settings?: ReminderSettings
): Promise<boolean> {
  if (!isNativeReminderPluginAvailable()) return false;

  const currentSettings = settings || await getReminderSettings();
  if (!currentSettings.enabled) {
    await cancelAppointmentExactReminder(apt.id);
    return false;
  }

  if (apt.status !== 'Pending') {
    await cancelAppointmentExactReminder(apt.id);
    return false;
  }

  const leadMinutes = currentSettings.leadTimeEnabled ? currentSettings.leadTimeMinutes : 0;
  const triggerMs = calculateAppointmentTimestamp(apt, leadMinutes);

  if (!triggerMs || triggerMs <= Date.now()) {
    // Past or invalid
    await cancelAppointmentExactReminder(apt.id);
    return false;
  }

  try {
    const title = `⏰ 预约提醒 (Appointment Reminder)`;
    const body = `您与 ${apt.clientName || '客户'} 的预约将于 ${apt.time || '今日'} 进行 (${apt.services?.join('、') || '命理咨询'})`;
    
    const res = await AppointmentReminder.scheduleReminder({
      id: apt.id,
      timestamp: triggerMs,
      title,
      body,
      extraData: JSON.stringify({ appointmentId: apt.id, date: apt.date, time: apt.time }),
    });

    return !!res.success;
  } catch (err) {
    console.warn('[ReminderService] Error scheduling native exact reminder', err);
    return false;
  }
}

/**
 * Cancel an exact native alarm for an appointment
 */
export async function cancelAppointmentExactReminder(appointmentId: string): Promise<boolean> {
  if (!isNativeReminderPluginAvailable()) return false;
  try {
    const res = await AppointmentReminder.cancelReminder({ id: appointmentId });
    return !!res.success;
  } catch (err) {
    console.warn('[ReminderService] Error cancelling native exact reminder', err);
    return false;
  }
}

/**
 * Get list of currently scheduled native alarms from Android AlarmManager
 */
export async function getNativeScheduledReminders(): Promise<ScheduledReminderItem[]> {
  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.getScheduledReminders();
      return res.reminders || [];
    } catch (err) {
      console.warn('[ReminderService] Error getting scheduled reminders', err);
    }
  }
  return [];
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
 * Schedule a 1-minute test reminder for testing lock screen and background wake-up
 */
export async function scheduleOneMinuteTestReminder(
  seconds: number = 60,
  lang: AppLanguage = 'zh'
): Promise<{ success: boolean; message: string; triggerAt: number }> {
  playChimeSound();
  vibrateDevice();

  if (isNativeReminderPluginAvailable()) {
    try {
      const res = await AppointmentReminder.scheduleTestReminder({ seconds });
      return {
        success: res.success,
        message: lang === 'zh'
          ? `⏰ 已成功向 Android 注册 ${seconds} 秒后精确闹钟！请现在关闭屏幕或锁定手机，系统将准时响铃、震动并点亮锁屏通知。`
          : `⏰ Scheduled exact alarm for ${seconds}s from now! You can now turn off the screen or lock your phone.`,
        triggerAt: res.triggerAt,
      };
    } catch (err: any) {
      console.warn('[ReminderService] Native scheduleTestReminder failed', err);
    }
  }

  // Web fallback simulation timer
  const triggerAt = Date.now() + (seconds * 1000);
  setTimeout(() => {
    playChimeSound();
    vibrateDevice();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(lang === 'zh' ? '⏰ 1分钟测试提醒已到达' : '⏰ 1-Minute Test Reminder Fired', {
        body: lang === 'zh' ? '这是一条网页倒计时测试提醒。' : 'This is a web simulated test notification.',
        icon: '/favicon.ico',
      });
    }
  }, seconds * 1000);

  return {
    success: true,
    message: lang === 'zh'
      ? `⏰ 已启动 ${seconds} 秒倒计时测试（由于当前不在 Android 原生环境，将使用计时器模拟）。`
      : `⏰ Started ${seconds}s simulation test timer.`,
    triggerAt,
  };
}

export interface ReminderTestResult {
  success: boolean;
  message: string;
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
      console.warn('[ReminderService] Native plugin call failed, using fallback', err);
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
