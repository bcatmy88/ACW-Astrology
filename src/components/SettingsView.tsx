import React, { useState, useRef } from 'react';
import { 
  Menu, 
  Camera, 
  Trash2, 
  Upload, 
  Sparkles, 
  ChevronRight, 
  Check, 
  Sliders, 
  User, 
  ShieldCheck, 
  Database,
  Calendar,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import type { AppLanguage, AppointmentItem } from '../types';
import LanguageToggle from './LanguageToggle';

interface SettingsViewProps {
  onOpenMenu: () => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
  appointments?: AppointmentItem[];
  profileAvatar: string;
  onSaveProfileAvatar: (avatar: string) => void;
  profileName: string;
  onSaveProfileName: (name: string) => void;
  onNavigateToNotes?: () => void;
  reportLogo?: string;
  onSaveReportLogo?: (logo: string) => void;
}

// Compress / prepare uploaded logo as transparent PNG (max 600px)
async function compressLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 600;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Compress uploaded profile image (max 500px square, JPEG 0.85)
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
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SettingsView({
  onOpenMenu,
  lang = 'zh',
  onToggleLang,
  appointments = [],
  profileAvatar,
  onSaveProfileAvatar,
  profileName,
  onSaveProfileName,
  onNavigateToNotes,
  reportLogo = '',
  onSaveReportLogo
}: SettingsViewProps) {
  const [nameInput, setNameInput] = useState(profileName || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const compressedDataUrl = await compressAvatar(file);
      onSaveProfileAvatar(compressedDataUrl);
      triggerSuccess(lang === 'zh' ? '专属头像已更新' : 'Avatar updated');
    } catch (err) {
      console.error('Failed to compress avatar', err);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const processedLogo = await compressLogo(file);
      if (onSaveReportLogo) {
        onSaveReportLogo(processedLogo);
      } else {
        localStorage.setItem('destiny_report_logo', processedLogo);
      }
      triggerSuccess(lang === 'zh' ? 'PDF 专属 LOGO 已更新' : 'Report logo updated');
    } catch (err) {
      console.error('Failed to process logo', err);
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleResetLogo = () => {
    if (onSaveReportLogo) {
      onSaveReportLogo('');
    } else {
      localStorage.removeItem('destiny_report_logo');
    }
    triggerSuccess(lang === 'zh' ? '已清除专属 LOGO，恢复默认星徽' : 'Reset logo to default');
  };

  const handleResetAvatar = () => {
    onSaveProfileAvatar('');
    triggerSuccess(lang === 'zh' ? '已恢复默认金色徽章' : 'Reset to default badge');
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    onSaveProfileName(trimmed);
    triggerSuccess(lang === 'zh' ? '作者名称已保存' : 'Author name saved');
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3000);
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-16">
      {/* Top Header Bar */}
      <header 
        className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between gap-2 mb-2 shadow-lg"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            type="button"
            onClick={onOpenMenu}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95 shrink-0"
            title="菜单 (Menu)"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide leading-none truncate flex items-center gap-2">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-gold shrink-0" />
              <span className="truncate">{lang === 'zh' ? '系统与个性化设置' : 'System & Profile Settings'}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
        </div>
      </header>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-gold/15 border border-gold/40 text-gold px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-md">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-gold shrink-0 stroke-[3]" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {/* SECTION 1: 随手笔记个人头像与名称 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {lang === 'zh' ? '随手笔记个人头像与名称' : 'Notes Profile Picture & Name'}
            </h2>
            <p className="text-xs text-zinc-400">
              {lang === 'zh' ? '设置在“随手笔记”心得中发表时显示的专属头像与署名' : 'Set your avatar photo and author name displayed in the Notes feed'}
            </p>
          </div>
        </div>

        {/* Avatar Setup Area */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
          {/* Avatar Preview Ring */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-yellow-700 via-gold to-yellow-300 shadow-xl overflow-hidden flex items-center justify-center">
              {profileAvatar ? (
                <img 
                  src={profileAvatar} 
                  alt="Profile Avatar" 
                  className="w-full h-full rounded-full object-cover bg-zinc-950" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-gold shadow-inner">
                  <User className="w-12 h-12 text-gold/70" />
                </div>
              )}
            </div>

            {/* Quick overlay change button */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
              title={lang === 'zh' ? '点击更换照片' : 'Click to change photo'}
            >
              <Camera className="w-7 h-7 drop-shadow-md text-gold" />
            </button>
          </div>

          {/* Controls & Name Input */}
          <div className="flex-1 flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gold" />
                <span>{lang === 'zh' ? '笔记作者署名 (Author Name)' : 'Author Name'}</span>
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  placeholder="例如: Archan Wang 阿赞旺"
                  className="flex-1 bg-zinc-950 border border-zinc-700 focus:border-gold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm text-white font-medium outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border border-zinc-700 active:scale-95"
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
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-zinc-950 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingAvatar ? (lang === 'zh' ? '处理中...' : 'Processing...') : (lang === 'zh' ? '上传专属照片' : 'Upload Photo')}</span>
              </button>

              {profileAvatar && (
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-zinc-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '恢复默认金色头像' : 'Reset to Default'}</span>
                </button>
              )}

              {onNavigateToNotes && (
                <button
                  type="button"
                  onClick={onNavigateToNotes}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer ml-auto"
                >
                  <span>{lang === 'zh' ? '前往随手笔记' : 'Go to Notes'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gold" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Mockup Feed Preview */}
        <div className="pt-4 border-t border-zinc-800/60 flex flex-col gap-2.5">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            {lang === 'zh' ? '在“随手笔记”页面中的即时展示预览：' : 'Live Preview in Notes feed:'}
          </span>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-yellow-700 via-gold to-yellow-300 shadow-sm shrink-0 overflow-hidden">
              {profileAvatar ? (
                <img src={profileAvatar} alt="preview" className="w-full h-full rounded-full object-cover bg-zinc-950" />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center text-gold">
                  <User className="w-5 h-5 text-gold/70" />
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
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gold/15 text-gold border border-gold/30 font-semibold">
                  {lang === 'zh' ? '随手心得' : 'Insight'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                {lang === 'zh' ? '今日 · 公开 · 心得笔记' : 'Today · Public · Note'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: 命理档案与 PDF 专属 LOGO */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-5 shadow-xl">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {lang === 'zh' ? '命理档案与 PDF 专属 LOGO' : 'Report & PDF Custom Logo'}
            </h2>
            <p className="text-xs text-zinc-400">
              {lang === 'zh' ? '在此上传品牌或工作室 LOGO，将自动展示在 PDF 导出档案及页眉左上角（取代默认图案）' : 'Upload custom logo shown at top-left of PDF export reports'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-1">
          {/* Logo Preview Box */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl p-2 bg-zinc-950 border-2 border-gold/40 shadow-xl overflow-hidden flex items-center justify-center">
              {reportLogo ? (
                <img 
                  src={reportLogo} 
                  alt="Custom Report Logo" 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-1.5">
                  <Sparkles className="w-8 h-8 text-gold/60" />
                  <span className="text-[9px] text-zinc-500 font-bold">{lang === 'zh' ? '默认金星标' : 'Default'}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
              title={lang === 'zh' ? '点击更换 LOGO' : 'Click to change logo'}
            >
              <Upload className="w-6 h-6 drop-shadow-md text-gold" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-1 text-xs text-zinc-300">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-gold" />
                {lang === 'zh' ? '实时同步至 PDF 全息报告导出' : 'Syncs instantly to PDF report export'}
              </span>
              <p className="text-zinc-400 leading-relaxed">
                {lang === 'zh' 
                  ? '支持透明 PNG、JPG 或 SVG 格式标志。上传后将自动保存在浏览器中，生成命理全息档案 PDF 时将在左上角展示您的专属标志。'
                  : 'Supports transparent PNG, JPG or SVG formats. Automatically persists locally and renders in PDF report headers.'}
              </p>
            </div>

            <input 
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFileChange}
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-zinc-950 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingLogo ? (lang === 'zh' ? '处理中...' : 'Processing...') : (lang === 'zh' ? '上传专属 LOGO' : 'Upload Logo')}</span>
              </button>

              {reportLogo && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-all cursor-pointer border border-zinc-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '清除 LOGO' : 'Clear Logo'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: 档案与数据状态 */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {lang === 'zh' ? '数据与功能状态' : 'Data & System Status'}
            </h2>
            <p className="text-xs text-zinc-400">
              {lang === 'zh' ? '本地数据存储与核心命理系统引擎运行状况' : 'Local storage and core destiny engine status'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-zinc-950/70 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-zinc-300">
                {lang === 'zh' ? '预约记录总数' : 'Appointments Count'}
              </span>
            </div>
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-zinc-800">
              {appointments.length}
            </span>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-zinc-300">
                {lang === 'zh' ? 'PDF报告导出支持' : 'PDF Report Export'}
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {lang === 'zh' ? '已就绪 (黑金版)' : 'Ready (Black Gold)'}
            </span>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-zinc-300">
                {lang === 'zh' ? '命理引擎 (八字/数字/占星/命宫)' : 'Destiny Core Engine'}
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {lang === 'zh' ? '运行中' : 'Active'}
            </span>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-zinc-300">
                {lang === 'zh' ? '系统环境' : 'Runtime'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-300 px-2 py-0.5 rounded bg-zinc-800">
              v2.8 (Full Offline)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
