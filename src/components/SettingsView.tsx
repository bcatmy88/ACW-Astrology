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
  Info
} from 'lucide-react';
import type { AppLanguage, AppointmentItem } from '../types';
import LanguageToggle from './LanguageToggle';
import { 
  getReminderSettings, 
  saveReminderSettings, 
  requestNotificationPermission, 
  triggerTestReminder,
  ReminderSettings,
  ReminderTestResult,
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

// Compress uploaded profile image to a reasonable size (max 600px square, JPEG 0.85)
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
        
        const targetDim = Math.min(minDim, MAX_SIZE);
        canvas.width = targetDim;
        canvas.height = targetDim;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const QUICK_TIMES = ['07:00', '07:30', '08:00', '08:30', '09:00', '10:00'];

const LEAD_TIME_OPTIONS = [
  { value: 15, labelZh: '15 分钟前', labelEn: '15 mins before' },
  { value: 30, labelZh: '30 分钟前', labelEn: '30 mins before' },
  { value: 45, labelZh: '45 分钟前', labelEn: '45 mins before' },
  { value: 60, labelZh: '1 小时前', labelEn: '1 hour before' },
  { value: 120, labelZh: '2 小时前', labelEn: '2 hours before' },
  { value: 1440, labelZh: '1 天前', labelEn: '1 day before' },
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
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Profile fields
  const [nameInput, setNameInput] = useState(profileName || 'Archan Wang');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Load reminder settings
  useEffect(() => {
    let isMounted = true;
    getReminderSettings().then(res => {
      if (isMounted) {
        setSettings(res);
        setIsLoadingSettings(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setNameInput(profileName || 'Archan Wang');
  }, [profileName]);

  const showToast = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => {
      setSaveBanner(null);
    }, 3000);
  };

  // Save reminder settings
  const handleSaveReminder = async (newSettings: ReminderSettings) => {
    setSettings(newSettings);
    setIsSaving(true);
    try {
      await saveReminderSettings(newSettings);
      showToast(lang === 'zh' ? '提醒设置已更新' : 'Reminder settings saved');
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
      setHasPermission(res.granted);
      showToast(lang === 'zh' ? '每日待办提醒与通知已开启' : 'Daily reminders and notifications enabled');
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

  // Calculate upcoming appointment preview example
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
              {lang === 'zh' ? '系统设置' : 'Settings'}
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

      {/* SECTION 1: 手机 NOTIFICATION 现实时间 (DAILY NOTIFICATION TIME) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-gold shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {lang === 'zh' ? '手机每日预约通知' : 'Daily Appointment Notification'}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'zh' ? '设置手机状态栏每天弹出预约提醒的现实时间' : 'Configure daily morning notification trigger time'}
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
                  {lang === 'zh' ? '每天提醒现实时间' : 'Notification Trigger Time'}
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

            {/* Action Tools & Permissions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'zh' ? '检查 / 启用待办提醒' : 'Enable Reminders'}</span>
                {hasPermission === true && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    {lang === 'zh' ? '已开启' : 'Enabled'}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-gold border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTesting ? (lang === 'zh' ? '正在触发...' : 'Testing...') : (lang === 'zh' ? '立即测试发送提醒' : 'Test Reminder Now')}</span>
              </button>
            </div>

            {testResult && (
              <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5 border bg-emerald-950/40 border-emerald-800/50 text-emerald-300">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-emerald-200">{testResult.message}</span>
                  <span className="text-[11px] text-zinc-400 leading-relaxed">
                    {lang === 'zh' 
                      ? '系统规则：当天有待办预约（Pending 状态）时准时提醒。App 首页待办铃铛与红点计数将始终同步保持最新。' 
                      : 'Rule: Reminders fire when there are Pending appointments today.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-xs text-zinc-500">
            {lang === 'zh' ? '每日手机通知已停用。您仍可在应用内“待办提醒”弹窗中随时查看。' : 'Daily notifications are disabled.'}
          </div>
        )}
      </div>

      {/* SECTION 2: 预约开始前多久开始提醒 (LEAD TIME REMINDER) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                {lang === 'zh' ? '预约临近提前提醒' : 'Ahead-of-Time Appointment Alert'}
              </h2>
              <p className="text-xs text-zinc-400">
                {lang === 'zh' ? '设置在具体每个预约开始前多久发出提醒' : 'Configure how long before an appointment starts to remind you'}
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
                    ? `若客户预约时间为 14:30，系统将在提前 ${exampleLeadMinutes} 分钟准时在手机发出专门提醒：“[客户姓名] 的预约即将开始”。`
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

      {/* SECTION 3: 笔记页面 PROFILE PICTURE 照片设置 (NOTES PROFILE PICTURE) */}
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
