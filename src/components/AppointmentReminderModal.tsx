import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Play, 
  Sparkles,
  RefreshCw,
  Power
} from 'lucide-react';
import type { AppointmentItem, AppLanguage } from '../types';
import { 
  getReminderSettings, 
  saveReminderSettings, 
  requestNotificationPermission, 
  triggerTestReminder, 
  type ReminderSettings,
  DEFAULT_REMINDER_SETTINGS 
} from '../services/nativeReminder';

interface AppointmentReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: AppointmentItem[];
  lang?: AppLanguage;
  onSettingsUpdated?: (settings: ReminderSettings) => void;
}

const PRESET_TIMES = ['07:30', '08:00', '08:30', '09:00', '10:00'];

export default function AppointmentReminderModal({
  isOpen,
  onClose,
  appointments,
  lang = 'zh',
  onSettingsUpdated
}: AppointmentReminderModalProps) {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getReminderSettings().then(s => {
        setSettings(s);
      });
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionStatus(Notification.permission === 'granted');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = async (enabled: boolean) => {
    const updated = { ...settings, enabled };
    setSettings(updated);
    setIsSaving(true);
    await saveReminderSettings(updated);
    setIsSaving(false);
    if (onSettingsUpdated) onSettingsUpdated(updated);
    
    setFeedback({
      type: 'success',
      message: enabled 
        ? (lang === 'zh' ? '已开启每日提醒，将在设定时间按时发送' : 'Daily reminder enabled')
        : (lang === 'zh' ? '已停用每日提醒计划' : 'Daily reminder disabled')
    });
  };

  const handleTimeChange = async (newTime: string) => {
    const updated = { ...settings, time: newTime };
    setSettings(updated);
    setIsSaving(true);
    await saveReminderSettings(updated);
    setIsSaving(false);
    if (onSettingsUpdated) onSettingsUpdated(updated);

    setFeedback({
      type: 'success',
      message: lang === 'zh' ? `已更新提醒时间为 ${newTime}` : `Reminder time updated to ${newTime}`
    });
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted);
    setFeedback({
      type: granted ? 'success' : 'error',
      message: granted 
        ? (lang === 'zh' ? '通知权限已开启！' : 'Notification permission granted!')
        : (lang === 'zh' ? '未授予通知权限，请在系统设置中允许通知' : 'Permission denied. Please enable in Android Settings.')
    });
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const res = await triggerTestReminder(appointments, lang);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message
      });
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e?.message || 'Error triggering test'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPendingAppointments = appointments.filter(a => a.date === todayStr && a.status === 'Pending');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-gold shadow-sm">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {lang === 'zh' ? '每日预约提醒设置' : 'Daily Appointment Reminder'}
                <span className="text-[10px] bg-gold/20 text-gold border border-gold/40 px-2 py-0.5 rounded-full font-bold">
                  Android 原生
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'zh' ? '每天早晨自动检查并推送今日预约摘要' : 'Automated morning notification for today\'s bookings'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-zinc-200 text-sm">
          
          {/* Feedback banner */}
          {feedback && (
            <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{feedback.message}</div>
              <button 
                type="button" 
                onClick={() => setFeedback(null)} 
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section 1: Enable / Disable Toggle */}
          <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Power className={`w-4 h-4 ${settings.enabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                {lang === 'zh' ? '启用每日预约提醒' : 'Enable Daily Reminder'}
              </span>
              <span className="text-xs text-zinc-400 mt-1">
                {lang === 'zh' 
                  ? '开启后，系统将在设定时间自动检测今日待办预约' 
                  : 'Checks for pending appointments every morning'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggle(!settings.enabled)}
              className={`min-h-[44px] min-w-[60px] px-3 py-1.5 rounded-full font-bold text-xs transition-all flex items-center justify-center border cursor-pointer ${
                settings.enabled
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {settings.enabled 
                ? (lang === 'zh' ? '已开启' : 'ON') 
                : (lang === 'zh' ? '已停用' : 'OFF')}
            </button>
          </div>

          {/* Section 2: Time Picker */}
          <div className={`bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 space-y-3 transition-opacity ${
            settings.enabled ? 'opacity-100' : 'opacity-50 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold" />
                <span className="font-bold text-white text-sm">
                  {lang === 'zh' ? '每天提醒时间' : 'Daily Notification Time'}
                </span>
              </div>
              <span className="text-xs text-gold font-mono font-bold bg-gold/10 px-2 py-0.5 rounded-md border border-gold/30">
                {settings.time} {Number(settings.time.split(':')[0]) < 12 ? 'AM' : 'PM'}
              </span>
            </div>

            {/* Native time input */}
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={settings.time}
                onChange={e => handleTimeChange(e.target.value)}
                className="flex-1 min-h-[44px] bg-black border border-zinc-700 focus:border-gold rounded-xl px-3 text-white font-mono text-base outline-none transition-colors"
              />
              <span className="text-xs text-zinc-500">
                {lang === 'zh' ? '默认: 08:00 AM' : 'Default: 8:00 AM'}
              </span>
            </div>

            {/* Quick presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-xs text-zinc-400 mr-1">{lang === 'zh' ? '快捷选择:' : 'Presets:'}</span>
              {PRESET_TIMES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTimeChange(t)}
                  className={`min-h-[36px] px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                    settings.time === t
                      ? 'bg-gold text-zinc-950 border-gold shadow-sm font-black'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {t} {t === '08:00' ? (lang === 'zh' ? ' (默认)' : ' (def)') : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Android Permission Status */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-zinc-400" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  {lang === 'zh' ? 'Android 13+ 通知权限' : 'Notification Permission'}
                  {permissionStatus === true && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                      {lang === 'zh' ? '已授权' : 'Granted'}
                    </span>
                  )}
                  {permissionStatus === false && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-1.5 py-0.2 rounded font-bold">
                      {lang === 'zh' ? '未授权' : 'Not Granted'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {lang === 'zh' ? 'Android 13 及以上系统需获得通知许可' : 'Required on Android 13+ to post alerts'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestPermission}
              className="min-h-[40px] px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              {lang === 'zh' ? '检查 / 授予权限' : 'Check / Request'}
            </button>
          </div>

          {/* Section 4: System Architecture & Feature Checklist */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-zinc-300">
            <div className="font-bold text-gold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'zh' ? '提醒运行规则与特性：' : 'Reminder System Rules:'}
            </div>
            <ul className="space-y-1.5 pl-4 list-disc text-zinc-400 leading-relaxed">
              <li>
                <strong className="text-zinc-200">{lang === 'zh' ? '按需触发：' : 'Selective Alerts: '}</strong>
                {lang === 'zh' ? '当天有待办预约时才发通知；若当天没有预约，自动静默不打扰。' : 'Only notifies if appointments exist today; stays silent if empty.'}
              </li>
              <li>
                <strong className="text-zinc-200">{lang === 'zh' ? '后台保活：' : 'Background Survival: '}</strong>
                {lang === 'zh' ? '采用原生 AlarmManager (RTC_WAKEUP)，App 完全关闭、息屏或省电模式下均能准时触发。' : 'Utilizes native AlarmManager; triggers even when app is killed or phone locked.'}
              </li>
              <li>
                <strong className="text-zinc-200">{lang === 'zh' ? '开机自启：' : 'Reboot Safe: '}</strong>
                {lang === 'zh' ? '监听 BOOT_COMPLETED 广播，手机重启后自动无缝重新注册每日闹钟计划。' : 'Auto-rescheduled upon device reboot.'}
              </li>
              <li>
                <strong className="text-zinc-200">{lang === 'zh' ? '点击直达：' : 'Quick Navigation: '}</strong>
                {lang === 'zh' ? '点击手机通知栏直接唤醒 App 并定位至预约看板与今日列表。' : 'Tapping opens Appointment Dashboard directly.'}
              </li>
            </ul>
          </div>

          {/* Section 5: Current Status & Test Button */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-zinc-400">{lang === 'zh' ? '今日待办预约：' : 'Today\'s Pending: '}</span>
              <span className="font-bold text-gold font-mono ml-1">{todayPendingAppointments.length} 项</span>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTesting}
              className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-amber-600 to-gold text-zinc-950 hover:brightness-110 rounded-xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {isTesting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{lang === 'zh' ? '立即测试发送通知' : 'Test Notification Now'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 bg-gold text-zinc-950 hover:brightness-110 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg shadow-gold/20 active:scale-95"
          >
            {lang === 'zh' ? '完成' : 'Done'}
          </button>
        </div>

      </div>
    </div>
  );
}
