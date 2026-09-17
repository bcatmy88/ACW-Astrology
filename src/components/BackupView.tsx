import React, { useState, useRef } from 'react';
import { 
  Download, 
  UploadCloud, 
  Copy, 
  Check, 
  Menu, 
  Database, 
  Users, 
  Layers, 
  BookOpen, 
  Calendar as CalendarIcon,
  AlertTriangle, 
  Trash2, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { SavedClient, CaseItem, NoteItem, AppointmentItem, BackupData, AppLanguage } from '../types';
import LanguageToggle from './LanguageToggle';

interface BackupViewProps {
  savedClients: SavedClient[];
  cases: CaseItem[];
  notes: NoteItem[];
  appointments?: AppointmentItem[];
  mainUserId: string | null;
  onRestoreData: (backup: BackupData, mode: 'overwrite' | 'merge') => void;
  onClearAllData?: () => void;
  onOpenMenu: () => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
}

export default function BackupView({
  savedClients,
  cases,
  notes,
  appointments = [],
  mainUserId,
  onRestoreData,
  onClearAllData,
  onOpenMenu,
  lang = 'zh',
  onToggleLang
}: BackupViewProps) {
  const [copied, setCopied] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Approximate storage usage
  const allImagesCount = notes.reduce((acc, n) => acc + (n.images ? n.images.length : 0), 0);
  const jsonString = JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    clients: savedClients,
    mainUserId,
    cases,
    notes,
    appointments
  });
  const dataSizeBytes = new Blob([jsonString]).size;
  const dataSizeKB = (dataSizeBytes / 1024).toFixed(1);

  // Generate backup payload
  const createBackupData = (): BackupData => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      clients: savedClients,
      mainUserId,
      cases,
      notes,
      appointments
    };
  };

  // Download JSON file
  const handleDownloadBackup = () => {
    const data = createBackupData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopyBackup = async () => {
    try {
      const data = createBackupData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
      alert("复制败");
    }
  };

  // File selection for restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || (typeof parsed !== 'object')) {
          throw new Error("格式错");
        }
        
        const normalized: BackupData = {
          version: parsed.version || '1.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          clients: Array.isArray(parsed.clients) ? parsed.clients : [],
          mainUserId: parsed.mainUserId || null,
          cases: Array.isArray(parsed.cases) ? parsed.cases : [],
          notes: Array.isArray(parsed.notes) ? parsed.notes : []
        };

        if (normalized.clients.length === 0 && normalized.cases.length === 0 && normalized.notes.length === 0) {
          throw new Error("无数据");
        }

        setParsedBackup(normalized);
      } catch (err: any) {
        console.error(err);
        setRestoreError(err.message || "解析败");
        setParsedBackup(null);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Execute restore
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    const confirmMsg = restoreMode === 'overwrite'
      ? "全覆盖？"
      : "合并入？";

    if (confirm(confirmMsg)) {
      onRestoreData(parsedBackup, restoreMode);
      setRestoreSuccess(true);
      setParsedBackup(null);
      setTimeout(() => setRestoreSuccess(false), 2500);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto flex flex-col gap-4">
      {/* HEADER */}
      <header 
        className="sticky top-0 z-40 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenMenu}
            className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
            {lang === 'zh' ? '数据备份与还原' : 'Backup & Restore'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
          <span className="text-xs font-bold text-gold px-2.5 py-1 rounded-xl bg-gold/10 border border-gold/30">
            {dataSizeKB} KB
          </span>
        </div>
      </header>

      {/* DATA OVERVIEW STATS */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
        <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-xs sm:text-sm font-semibold">
            <Users className="w-3.5 h-3.5 text-gold shrink-0" />
            <span className="truncate">{lang === 'zh' ? '档案' : 'Archives'}</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1">{savedClients.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-xs sm:text-sm font-semibold">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '预约' : 'Booking'}</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-amber-400 mt-1">{appointments.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-xs sm:text-sm font-semibold">
            <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '个案' : 'Cases'}</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1">{cases.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-xs sm:text-sm font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '笔记' : 'Notes'}</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1">{notes.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-xs sm:text-sm font-semibold">
            <Database className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '相片' : 'Photos'}</span>
          </div>
          <span className="text-sm sm:text-lg font-bold text-white mt-1">{allImagesCount}</span>
        </div>
      </div>

      {/* SECTION 1: EXPORT DATA */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-gold" />
          <h2 className="text-sm sm:text-base font-bold text-white">{lang === 'zh' ? '导出并下载备份' : 'Export & Download'}</h2>
        </div>

        <div className="flex items-center gap-3 flex-col sm:flex-row">
          <button
            onClick={handleDownloadBackup}
            className="w-full sm:flex-1 min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-98 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'zh' ? '下载备份文件 (.json)' : 'Download JSON File'}</span>
          </button>

          <button
            onClick={handleCopyBackup}
            className="w-full sm:flex-1 min-h-[46px] flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors border border-zinc-700 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            <span>{copied ? (lang === 'zh' ? '已复制到剪贴板' : 'Copied!') : (lang === 'zh' ? '复制备份文本' : 'Copy JSON Text')}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: RESTORE DATA */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">{lang === 'zh' ? '导入并恢复备份' : 'Import & Restore'}</h2>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[56px] border border-dashed border-zinc-700 hover:border-gold/50 bg-black/30 hover:bg-zinc-900/50 rounded-xl p-4 flex items-center justify-center gap-2.5 cursor-pointer transition-colors"
        >
          <UploadCloud className="w-5 h-5 text-zinc-400" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-200">
            {lang === 'zh' ? '点击选择要导入的备份文件 (.json)' : 'Select backup JSON file to import'}
          </span>
        </div>

        {/* Error message */}
        {restoreError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs sm:text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{restoreError}</span>
          </div>
        )}

        {/* Success message */}
        {restoreSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center gap-2 font-bold">
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{lang === 'zh' ? '数据已成功恢复！' : 'Data restored successfully!'}</span>
          </div>
        )}

        {/* Preview of Parsed Backup */}
        {parsedBackup && (
          <div className="bg-zinc-950 border border-gold/40 rounded-xl p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-gold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {lang === 'zh' ? '已识别备份数据内容' : 'Recognized Backup Data'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-400 block">{lang === 'zh' ? '档案' : 'Clients'}</span>
                <span className="text-sm sm:text-base font-bold text-white mt-0.5">{parsedBackup.clients.length}</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-400 block">{lang === 'zh' ? '预约' : 'Bookings'}</span>
                <span className="text-sm sm:text-base font-bold text-amber-400 mt-0.5">{(parsedBackup.appointments || []).length}</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-400 block">{lang === 'zh' ? '个案' : 'Cases'}</span>
                <span className="text-sm sm:text-base font-bold text-sky-400 mt-0.5">{parsedBackup.cases.length}</span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-400 block">{lang === 'zh' ? '笔记' : 'Notes'}</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">{parsedBackup.notes.length}</span>
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRestoreMode('overwrite')}
                className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                  restoreMode === 'overwrite'
                    ? 'bg-rose-500/15 border-rose-500/60 text-rose-300 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {lang === 'zh' ? '覆盖全部现有数据' : 'Overwrite All Data'}
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`min-h-[42px] px-3 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                  restoreMode === 'merge'
                    ? 'bg-gold/15 border-gold/60 text-gold font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {lang === 'zh' ? '与现有数据合并' : 'Merge with Existing'}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setParsedBackup(null)}
                className="min-h-[40px] px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="min-h-[40px] px-5 py-2 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{lang === 'zh' ? '确认恢复' : 'Confirm Restore'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: DANGER ZONE */}
      {onClearAllData && (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 text-zinc-500" />
            <span className="font-semibold">{lang === 'zh' ? '数据重置' : 'Reset Data'}</span>
          </div>
          <button
            onClick={() => {
              if (confirm(lang === 'zh' ? '确定要清空全部数据吗？此操作无法撤销！' : 'Clear all data? This cannot be undone!')) {
                if (confirm(lang === 'zh' ? '再次确认：清空后将失去所有档案、笔记和预约！' : 'Final confirmation: all records will be deleted!')) {
                  onClearAllData();
                }
              }
            }}
            className="min-h-[40px] px-4 py-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{lang === 'zh' ? '清空全部数据' : 'Clear All'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
