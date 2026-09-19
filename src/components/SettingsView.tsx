import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Bell, 
  Clock, 
  ShieldCheck, 
  Send, 
  Check, 
  AlertCircle, 
  Camera, 
  Trash2, 
  Upload, 
  User, 
  Sparkles,
  Calendar,
  Globe,
  Sliders,
  ChevronRight,
  Info,
  Smartphone,
  BatteryCharging,
  Zap,
  ExternalLink,
  Timer
} from 'lucide-react';
import type { AppLanguage, AppointmentItem } from '../types';
import LanguageToggle from './LanguageToggle';
import { 
  getReminderSettings, 
  saveReminderSettings, 
  requestNotificationPermission, 
  triggerTestReminder,
  scheduleOneMinuteTestReminder,
  checkNativePermissions,
  openNativeNotificationSettings,
  openNativeExactAlarmSettings,
  openNativeBatteryOptimizationSettings,
  getNativeScheduledReminders,
  isNativeReminderPluginAvailable,
  ReminderSettings,
  ReminderTestResult,
  NativePermissionStatus,
  ScheduledReminderItem,
  DEFAULT_REMINDER_SETTINGS
} from '../services/nativeReminder';

interface SettingsViewProps {
  onOpenMenu: () => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
  appointments: AppointmentItem[];
  profileAvatar: string;
  onSaveProfileAvatar: (avatar: string) => void;
  profileName: string;
  onSaveProfileName: (name: string) => void;
  onNavigateToNotes?: () => void;
}

// Compress uploaded profile image to a reasonable size (max 500px square, JPEG 0.85)
async function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let { width, height } = img;
        
        // Center crop square
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;
        
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const QUICK_TIMES = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];

const LEAD_TIME_OPTIONS = [
  { value: 15, labelZh: '提前 15 分钟', labelEn: '15 mins before' },
  { value: 30, labelZh: '提前 30 分钟 (推荐)', labelEn: '30 mins before (Rec)' },
  { value: 60, labelZh: '提前 1 小时', labelEn: '1 hour before' },
  { value: 120, labelZh: '提前 2 小时', labelEn: '2 hours before' },
  { value: 1440, labelZh: '提前 1 天', labelEn: '1 day before' },
];

export default function SettingsView({
  onOpenMenu,
  lang = 'zh',
  onToggleLang,
  appointments,
  profileAvatar,
  onSaveProfileAvatar,
  profileName,
  onSaveProfileName,
  onNavigateToNotes
}: SettingsViewProps) {
  // Reminder settings state
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ReminderTestResult | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Native permissions & status
  const [permStatus, setPermStatus] = useState<NativePermissionStatus | null>(null);
  const [scheduledAlarms, setScheduledAlarms] = useState<ScheduledReminderItem[]>([]);
  const [isRefreshingPerms, setIsRefreshingPerms] = useState(false);

  // 1-minute lockscreen test countdown
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [countdownMsg, setCountdownMsg] = useState<string | null>(null);

  // Profile fields
  const [nameInput, setNameInput] = useState(profileName || 'Archan Wang');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Load reminder settings & permissions
  const refreshPermissions = async () => {
    setIsRefreshingPerms(true);
    try {
      const status = await checkNativePermissions();
      setPermStatus(status);
      const alarms = await getNativeScheduledReminders();
      setScheduledAlarms(alarms);
    } finally {
      setIsRefreshingPerms(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getReminderSettings().then(res => {
      if (isMounted) {
        setSettings(res);
        setIsLoadingSettings(false);
      }
    });

    refreshPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle test countdown timer
  useEffect(() => {
    if (testCountdown === null || testCountdown <= 0) return;
    const timer = setInterval(() => {
      setTestCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [testCountdown]);

  useEffect(() => {
    setNameInput(profileName || 'Archan Wang');
  }, [profileName]);

  const showToast = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => {
      setSaveBanner(null);
    }, 3500);
  };

  // Save reminder settings
  const handleSaveReminder = async (newSettings: ReminderSettings) => {
    setSettings(newSettings);
    setIsSaving(true);
    try {
      await saveReminderSettings(newSettings);
      showToast(lang === 'zh' ? '提醒设置已保存并同步至系统后台' : 'Reminder settings saved & synced to Android');
    } catch (e) {
      console.error('Failed to save reminder settings', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsTesting(true);
    try {
      const res = await requestNotificationPermission();
      await refreshPermissions();
      if (res.granted) {
        showToast(lang === 'zh' ? '通知权限已开启！' : 'Notification permission granted!');
      } else {
        showToast(lang === 'zh' ? '权限未被授予，请在系统设置中允许' : 'Permission not granted, please enable in system settings');
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await triggerTestReminder(appointments, lang);
      setTestResult(res);
      if (res.success) {
        showToast(res.message);
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || (lang === 'zh' ? '触发测试失败' : 'Failed to trigger test notification')
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleOneMinuteLockScreenTest = async () => {
    setIsTesting(true);
    try {
      const res = await scheduleOneMinuteTestReminder(60, lang);
      setTestCountdown(60);
      setCountdownMsg(res.message);
      showToast(res.message);
    } catch (e: any) {
      alert(e?.message || 'Failed to schedule 1-minute test');
    } finally {
      setIsTesting(false);
    }
  };

  // Avatar handling
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const base64 = await compressAvatar(file);
      onSaveProfileAvatar(base64);
      showToast(lang === 'zh' ? '头像照片已更新！笔记页面已同步。' : 'Avatar updated! Synced to Notes.');
    } catch (err) {
      console.error('Failed to process avatar image', err);
      alert(lang === 'zh' ? '图片处理失败，请重试' : 'Failed to process image, please try again.');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleResetAvatar = () => {
    if (confirm(lang === 'zh' ? '确认恢复为默认“王”字金色徽章？' : 'Reset avatar to default badge?')) {
      onSaveProfileAvatar('');
      showToast(lang === 'zh' ? '已恢复默认金色徽章' : 'Reset to default badge');
    }
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim() || 'Archan Wang';
    setNameInput(trimmed);
    onSaveProfileName(trimmed);
    showToast(lang === 'zh' ? '姓名已保存！' : 'Name saved!');
  };

  const exampleLeadMinutes = settings.leadTimeMinutes || 30;

  return (
    <div className="max-w-[760px] mx-auto flex flex-col gap-5 pb-16">
      {/* STICKY HEADER */}
      <header 
        className="sticky top-0 z-40 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onOpenMenu}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={lang === 'zh' ? '主菜单' : 'Menu'}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-gold" />
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              {lang === 'zh' ? '系统与提醒设置' : 'System & Reminder Settings'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
        </div>
      </header>

      {/* TOAST FEEDBACK BANNER */}
      {saveBanner && (
        <div className="bg-emerald-950/90 border border-emerald-600/60 text-emerald-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveBanner}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: ANDROID NATIVE PERMISSIONS & BACKGROUND ENGINE */}
      <div className="bg-zinc-900/90 border border-gold/30 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-gold/40 flex items-center justify-center text-gold shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {lang === 'zh' ? 'Android 原生提醒引擎与系统权限' : 'Android Native Reminder Engine & Permissions'}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'zh' ? '基于 AlarmManager 与高优先级锁屏通知，实现手机黑屏/锁屏时强行推送' : 'Ensures precise notification dispatch even when screen is locked or app is closed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={refreshPermissions}
            disabled={isRefreshingPerms}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors font-medium cursor-pointer"
          >
            {isRefreshingPerms ? (lang === 'zh' ? '检测中...' : 'Checking...') : (lang === 'zh' ? '刷新状态' : 'Refresh')}
          </button>
        </div>

        {/* Permission Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Permission 1: Notification */}
          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Bell className="w-4 h-4 text-gold shrink-0" />
                <span>{lang === 'zh' ? '通知发布权限' : 'Notifications'}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                permStatus?.hasNotificationPermission
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {permStatus?.hasNotificationPermission 
                  ? (lang === 'zh' ? '已开启' : 'Allowed')
                  : (lang === 'zh' ? '未允许' : 'Blocked')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              {lang === 'zh' ? '允许在状态栏和锁屏界面弹出预约通知' : 'Allows alert display on status bar & lock screen'}
            </p>
            <div className="flex gap-1.5 pt-1 border-t border-zinc-800/80">
              {!permStatus?.hasNotificationPermission ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="flex-1 py-1 px-2 bg-gold hover:bg-yellow-400 text-zinc-950 rounded-lg text-xs font-bold transition-all text-center cursor-pointer"
                >
                  {lang === 'zh' ? '授权开启' : 'Grant'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => openNativeNotificationSettings()}
                className="flex-1 py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{lang === 'zh' ? '系统设置' : 'Settings'}</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Permission 2: Exact Alarm */}
          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{lang === 'zh' ? '精确闹钟唤醒' : 'Exact Alarms'}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                permStatus?.canScheduleExactAlarms !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {permStatus?.canScheduleExactAlarms !== false
                  ? (lang === 'zh' ? '准时触发' : 'Exact')
                  : (lang === 'zh' ? '受系统限制' : 'Restricted')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              {lang === 'zh' ? 'Android 12+ 准时闹钟唤醒，规避系统省电延迟' : 'Uses AlarmManager RTC_WAKEUP for on-the-minute accuracy'}
            </p>
            <div className="flex gap-1.5 pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => openNativeExactAlarmSettings()}
                className="w-full py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{lang === 'zh' ? '精确闹钟权限设置' : 'Exact Alarm Settings'}</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Permission 3: Battery Optimization */}
          <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{lang === 'zh' ? '电池优化白名单' : 'Battery Whitelist'}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                permStatus?.isIgnoringBatteryOptimizations
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-300'
              }`}>
                {permStatus?.isIgnoringBatteryOptimizations
                  ? (lang === 'zh' ? '后台保活' : 'Unrestricted')
                  : (lang === 'zh' ? '受电池优化' : 'Optimized')}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              {lang === 'zh' ? '加入白名单可避免黑屏时被小米/华为等厂商深度清理' : 'Prevents aggressive OEM task killers from delaying alarms'}
            </p>
            <div className="flex gap-1.5 pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => openNativeBatteryOptimizationSettings()}
                className="w-full py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{lang === 'zh' ? '忽略电池优化设置' : 'Battery Settings'}</span>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </button>
            </div>
          </div>
        </div>

        {/* REAL-TIME TEST LAB */}
        <div className="pt-2 border-t border-zinc-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-gold" />
              {lang === 'zh' ? '黑屏 / 锁屏提醒实机验证工具' : 'Real Lock Screen Verification Tools'}
            </span>
            {scheduledAlarms.length > 0 && (
              <span className="text-[11px] text-gold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">
                {lang === 'zh' ? `已在系统注册 ${scheduledAlarms.length} 个精确闹钟` : `${scheduledAlarms.length} active alarms`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Test Button 1: Immediate Push */}
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-gold" />
              <span>{isTesting ? (lang === 'zh' ? '触发中...' : 'Sending...') : (lang === 'zh' ? '立即发送高优先级测试通知' : 'Instant High-Priority Test')}</span>
            </button>

            {/* Test Button 2: 1-Minute Lockscreen Exact Alarm */}
            <button
              type="button"
              onClick={handleOneMinuteLockScreenTest}
              disabled={isTesting || (testCountdown !== null && testCountdown > 0)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gold hover:bg-yellow-400 text-zinc-950 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Timer className="w-4 h-4" />
              <span>
                {testCountdown !== null && testCountdown > 0 
                  ? (lang === 'zh' ? `倒计时 ${testCountdown} 秒 (请立即锁屏)` : `Count: ${testCountdown}s (Lock phone now)`)
                  : (lang === 'zh' ? '⏰ 测试 1 分钟后锁屏唤醒闹钟' : 'Test 1-Min Lock Screen Alarm')}
              </span>
            </button>
          </div>

          {/* Active Countdown Banner */}
          {testCountdown !== null && testCountdown > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/50 border border-gold/40 text-amber-200 text-xs flex items-start gap-3 animate-pulse">
              <Timer className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-white text-sm">
                  {lang === 'zh' ? `闹钟已注册！还剩 ${testCountdown} 秒触发` : `Alarm registered! ${testCountdown}s remaining`}
                </span>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  {lang === 'zh'
                    ? '【操作指引】：请立即按手机侧边电源键关灭屏幕或锁定手机。60 秒到达时，Android 系统 AlarmManager 将唤醒 CPU 并准时在锁屏界面弹出金色提示通知！'
                    : 'Action guide: Lock your phone or turn off screen now. When 60s expires, Android AlarmManager will wake up and alert on your lock screen!'}
                </p>
              </div>
            </div>
          )}

          {testResult && (
            <div className="p-3 rounded-xl text-xs flex items-start gap-2 border bg-emerald-950/40 border-emerald-800/50 text-emerald-300">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-emerald-200">{testResult.message}</span>
                <span className="text-[11px] text-zinc-400">
                  {lang === 'zh' ? '通知渠道：appointment_reminders (高优先级、振动、金色指示灯、锁屏可见)' : 'Channel: appointment_reminders (High priority, lockscreen visible)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: 手机 NOTIFICATION 现实时间 (DAILY NOTIFICATION TIME) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-gold shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {lang === 'zh' ? '每日晨间预约汇总通知' : 'Daily Morning Appointment Summary'}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'zh' ? '每天早晨准时汇总推送当天所有待办客户预约' : 'Sends a comprehensive summary notification each morning'}
              </p>
            </div>
          </div>

          {/* Master Switch */}
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => {
                handleSaveReminder({
                  ...settings,
                  enabled: e.target.checked
                });
              }}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
          </label>
        </div>

        {/* Enabled Config Body */}
        {settings.enabled ? (
          <div className="flex flex-col gap-4 pt-1">
            {/* Time Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60 border border-zinc-800/80 p-3.5 rounded-xl">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-gold shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-zinc-200">
                  {lang === 'zh' ? '每日提醒现实时间' : 'Notification Trigger Time'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="time" 
                  value={settings.time}
                  onChange={(e) => {
                    handleSaveReminder({
                      ...settings,
                      time: e.target.value || '08:00'
                    });
                  }}
                  className="bg-zinc-900 border border-zinc-700 hover:border-gold focus:border-gold text-white font-mono font-bold text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                />
                <span className="text-xs text-zinc-400 font-medium">
                  {lang === 'zh' ? '(24小时制)' : '(24h)'}
                </span>
              </div>
            </div>

            {/* Quick Preset Times */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400 font-medium">
                {lang === 'zh' ? '常用推荐时段：' : 'Quick Preset Times:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TIMES.map(t => {
                  const isSelected = settings.time === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        handleSaveReminder({
                          ...settings,
                          time: t
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gold text-zinc-950 border-gold shadow-sm' 
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-xs text-zinc-500">
            {lang === 'zh' ? '每日早晨预约通知已停用。具体预约临近提醒依然独立生效。' : 'Daily morning notifications disabled.'}
          </div>
        )}
      </div>

      {/* SECTION 3: 预约临近提前提醒 (LEAD TIME REMINDER) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {lang === 'zh' ? '每个预约临近独立精确提醒' : 'Ahead-of-Time Individual Appointment Alert'}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'zh' ? '在每个预约到达前通过精确闹钟强行弹出通知，即使关闭 App 或手机处于锁屏' : 'Schedules an individual AlarmManager wakeup before each appointment'}
              </p>
            </div>
          </div>

          {/* Lead Time Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={settings.leadTimeEnabled !== false}
              onChange={(e) => {
                handleSaveReminder({
                  ...settings,
                  leadTimeEnabled: e.target.checked
                });
              }}
              className="sr-only peer"
            />
            <div className="w-12 h-6.5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>

        {settings.leadTimeEnabled !== false ? (
          <div className="flex flex-col gap-4 pt-1">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-300">
                {lang === 'zh' ? '选择提前提醒时间：' : 'Select Lead Time:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEAD_TIME_OPTIONS.map(opt => {
                  const isSelected = (settings.leadTimeMinutes || 30) === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleSaveReminder({
                          ...settings,
                          leadTimeMinutes: opt.value
                        });
                      }}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-500/20 border-blue-500 text-blue-200 shadow-sm' 
                          : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <span>{lang === 'zh' ? opt.labelZh : opt.labelEn}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Minutes Input */}
            <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-xl text-xs">
              <span className="text-zinc-300 font-medium">
                {lang === 'zh' ? '自定义提前分钟数' : 'Custom Minutes Before'}
              </span>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="5"
                  max="2880"
                  step="5"
                  value={settings.leadTimeMinutes || 30}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      handleSaveReminder({
                        ...settings,
                        leadTimeMinutes: val
                      });
                    }
                  }}
                  className="w-20 bg-zinc-900 border border-zinc-700 focus:border-blue-400 text-white font-mono font-bold text-center px-2 py-1 rounded-lg"
                />
                <span className="text-zinc-400">
                  {lang === 'zh' ? '分钟' : 'mins'}
                </span>
              </div>
            </div>

            {/* Visual Example Card */}
            <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex items-start gap-2.5 text-xs text-zinc-300">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 leading-relaxed">
                <span className="font-bold text-white">
                  {lang === 'zh' ? '工作逻辑演示：' : 'Workflow Example:'}
                </span>
                <p className="text-zinc-400">
                  {lang === 'zh' 
                    ? `若客户预约时间为 14:30，系统将在提前 ${exampleLeadMinutes} 分钟准时在手机发出独立锁屏强提醒：“[客户姓名] 的预约即将开始”。`
                    : `For a 14:30 appointment, you will receive a notification ${exampleLeadMinutes} minutes in advance.`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-xs text-zinc-500">
            {lang === 'zh' ? '临近预约提前提醒已关闭，系统仅按每日早晨的总体计划进行提醒。' : 'Ahead-of-time appointment reminders are disabled.'}
          </div>
        )}
      </div>

      {/* SECTION 4: 笔记页面 PROFILE PICTURE 照片设置 (NOTES PROFILE PICTURE) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              {lang === 'zh' ? '随手笔记个人头像与名称' : 'Notes Profile Picture & Name'}
            </h2>
            <p className="text-xs text-zinc-400">
              {lang === 'zh' ? '设置在“随手笔记”页面中发表心得、发帖时显示的专属头像照片' : 'Set your avatar photo and author name displayed in the Notes feed'}
            </p>
          </div>
        </div>

        {/* Avatar Setup Area */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pt-2">
          {/* Avatar Preview Ring */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-yellow-700 via-gold to-yellow-300 shadow-xl overflow-hidden flex items-center justify-center">
              {profileAvatar ? (
                <img 
                  src={profileAvatar} 
                  alt="Profile Avatar" 
                  className="w-full h-full rounded-full object-cover bg-zinc-950" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-gold font-black text-2xl shadow-inner">
                  王
                </div>
              )}
            </div>

            {/* Quick overlay change button */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
              title={lang === 'zh' ? '点击更换照片' : 'Click to change photo'}
            >
              <Camera className="w-6 h-6 drop-shadow-md" />
            </button>
          </div>

          {/* Controls & Name Input */}
          <div className="flex-1 flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {lang === 'zh' ? '笔记作者署名 (Author Name)' : 'Author Name'}
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  placeholder="例如: Archan Wang"
                  className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-gold px-3.5 py-2 rounded-xl text-xs sm:text-sm text-white font-medium"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  {lang === 'zh' ? '保存名字' : 'Save'}
                </button>
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gold hover:bg-yellow-400 text-zinc-950 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingAvatar ? (lang === 'zh' ? '处理中...' : 'Processing...') : (lang === 'zh' ? '上传专属照片' : 'Upload Photo')}</span>
              </button>

              {profileAvatar && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '恢复默认金色“王”徽章' : 'Reset to Default'}</span>
                </button>
              )}

              {onNavigateToNotes && (
                <button
                  type="button"
                  onClick={onNavigateToNotes}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer ml-auto"
                >
                  <span>{lang === 'zh' ? '查看随手笔记效果' : 'Go to Notes'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Mockup Feed Preview */}
        <div className="pt-3 border-t border-zinc-800/60 flex flex-col gap-2">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            {lang === 'zh' ? '在“随手笔记”页面中的即时预览效果：' : 'Live Preview in Notes feed:'}
          </span>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-yellow-700 via-gold to-yellow-300 shadow-sm shrink-0 overflow-hidden">
              {profileAvatar ? (
                <img src={profileAvatar} alt="preview" className="w-full h-full rounded-full object-cover bg-zinc-950" />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-gold font-black text-xs">
                  王
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white">
                  {nameInput || 'Archan Wang'}
                </span>
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gold text-zinc-950">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/10 text-gold border border-gold/25 font-semibold">
                  {lang === 'zh' ? '随手心得' : 'Insight'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                {lang === 'zh' ? '今日 · 公开 · 心得笔记' : 'Today · Public · Note'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
