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
        className="sticky top-0 z-40 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-2.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onOpenMenu}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {lang === 'zh' ? '备份' : 'Backup'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
          <span className="text-[10px] font-bold text-gold px-2 py-0.5 rounded bg-gold/10 border border-gold/30">
            {dataSizeKB} KB
          </span>
        </div>
      </header>

      {/* DATA OVERVIEW STATS */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <div className="bg-zinc-900/60 border border-zinc-800 p-2 sm:p-2.5 rounded-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-[10px] sm:text-[11px] font-semibold">
            <Users className="w-3 h-3 text-gold shrink-0" />
            <span className="truncate">{lang === 'zh' ? '档案' : 'Archives'}</span>
          </div>
          <span className="text-xs sm:text-base font-bold text-white mt-0.5">{savedClients.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2 sm:p-2.5 rounded-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-[10px] sm:text-[11px] font-semibold">
            <CalendarIcon className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '预约' : 'Booking'}</span>
          </div>
          <span className="text-xs sm:text-base font-bold text-amber-400 mt-0.5">{appointments.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2 sm:p-2.5 rounded-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-[10px] sm:text-[11px] font-semibold">
            <Layers className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '个案' : 'Cases'}</span>
          </div>
          <span className="text-xs sm:text-base font-bold text-white mt-0.5">{cases.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2 sm:p-2.5 rounded-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-[10px] sm:text-[11px] font-semibold">
            <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '笔记' : 'Notes'}</span>
          </div>
          <span className="text-xs sm:text-base font-bold text-white mt-0.5">{notes.length}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-2 sm:p-2.5 rounded-xl flex flex-col items-center text-center">
          <div className="flex items-center gap-1 text-zinc-400 text-[10px] sm:text-[11px] font-semibold">
            <Database className="w-3 h-3 text-rose-400 shrink-0" />
            <span className="truncate">{lang === 'zh' ? '相片' : 'Photos'}</span>
          </div>
          <span className="text-xs sm:text-base font-bold text-white mt-0.5">{allImagesCount}</span>
        </div>
      </div>

      {/* SECTION 1: EXPORT DATA */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-gold" />
          <h2 className="text-xs sm:text-sm font-bold text-white">导出</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg text-xs transition-all active:scale-98"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导文件</span>
          </button>

          <button
            onClick={handleCopyBackup}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg text-xs transition-colors border border-zinc-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? '已复制' : '拷文本'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: RESTORE DATA */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-sky-400" />
          <h2 className="text-xs sm:text-sm font-bold text-white">导入</h2>
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
          className="border border-dashed border-zinc-700 hover:border-gold/50 bg-black/20 hover:bg-zinc-900/50 rounded-xl p-3.5 flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <UploadCloud className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-300">
            选文件
          </span>
        </div>

        {/* Error message */}
        {restoreError && (
          <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-[11px] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        {/* Success message */}
        {restoreSuccess && (
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[11px] flex items-center gap-1.5 font-bold">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>已恢复</span>
          </div>
        )}

        {/* Preview of Parsed Backup */}
        {parsedBackup && (
          <div className="bg-zinc-950 border border-gold/40 rounded-xl p-3 flex flex-col gap-2.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                已识别
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">档案</span>
                <span className="text-xs font-bold text-white">{parsedBackup.clients.length}</span>
              </div>
              <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">预约</span>
                <span className="text-xs font-bold text-amber-400">{(parsedBackup.appointments || []).length}</span>
              </div>
              <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">个案</span>
                <span className="text-xs font-bold text-sky-400">{parsedBackup.cases.length}</span>
              </div>
              <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">笔记</span>
                <span className="text-xs font-bold text-emerald-400">{parsedBackup.notes.length}</span>
              </div>
            </div>

            {/* Mode selection */}
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setRestoreMode('overwrite')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                  restoreMode === 'overwrite'
                    ? 'bg-rose-500/10 border-rose-500/50 text-rose-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                全覆盖
              </button>
              <button
                type="button"
                onClick={() => setRestoreMode('merge')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                  restoreMode === 'merge'
                    ? 'bg-gold/10 border-gold/50 text-gold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                合并入
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setParsedBackup(null)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-semibold rounded-lg text-xs transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-3.5 py-1 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>确认</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: DANGER ZONE */}
      {onClearAllData && (
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-semibold">清空</span>
          </div>
          <button
            onClick={() => {
              if (confirm("清全部？")) {
                if (confirm("再确认？")) {
                  onClearAllData();
                }
              }
            }}
            className="px-2.5 py-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>清全部</span>
          </button>
        </div>
      )}
    </div>
  );
}
