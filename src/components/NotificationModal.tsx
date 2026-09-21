import React, { useState, useMemo } from 'react';
import { 
  Bell, 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  CheckCircle2, 
  ChevronRight, 
  AlertCircle, 
  Sparkles, 
  ClipboardList, 
  CalendarDays,
  Check,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AppointmentItem, CaseItem, SavedClient, AppLanguage } from '../types';
import { buildWhatsAppUrl } from '../utils/phoneUtils';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  appointments: AppointmentItem[];
  cases: CaseItem[];
  savedClients: SavedClient[];
  onSaveAppointment: (appointment: AppointmentItem) => void;
  onSaveCase: (caseItem: CaseItem) => void;
  onNavigateToAppointments?: (date?: string) => void;
  onNavigateToCases?: () => void;
  onInspectClientBazi?: (client: SavedClient) => void;
  lang?: AppLanguage;
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTomorrowString(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr: string, lang: AppLanguage = 'zh'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;

  const zhDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = lang === 'zh' ? zhDays[dateObj.getDay()] : enDays[dateObj.getDay()];

  return lang === 'zh' 
    ? `${y}年${m}月${d}日 · ${dayName}`
    : `${m}/${d}/${y} · ${dayName}`;
}

export default function NotificationModal({
  isOpen,
  onClose,
  initialDate,
  appointments,
  cases,
  savedClients,
  onSaveAppointment,
  onSaveCase,
  onNavigateToAppointments,
  onNavigateToCases,
  onInspectClientBazi,
  lang = 'zh'
}: NotificationModalProps) {
  const todayStr = useMemo(() => getTodayString(), []);
  const tomorrowStr = useMemo(() => getTomorrowString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(() => initialDate || todayStr);
  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'cases'>('all');

  // Synchronize when initialDate changes
  React.useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  // Client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, SavedClient>();
    savedClients.forEach(c => map.set(c.id, c));
    return map;
  }, [savedClients]);

  // Unfinished appointments on the selected date
  const unfinishedAppointmentsOnDate = useMemo(() => {
    return appointments.filter(apt => {
      const isUnfinished = apt.status === 'Pending';
      return isUnfinished && apt.date === selectedDate;
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [appointments, selectedDate]);

  // All ongoing unfinished cases (not constrained by date)
  const unfinishedCases = useMemo(() => {
    return cases.filter(c => {
      return c.status === 'Reviewing' || c.status === 'Executing';
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cases]);

  // Total unfinished on this same date
  const totalUnfinishedOnDate = unfinishedAppointmentsOnDate.length + unfinishedCases.length;

  // Other dates with pending items (for quick switching)
  const otherDatesWithPending = useMemo(() => {
    const dateMap = new Map<string, number>();

    appointments.forEach(apt => {
      if (apt.status === 'Pending' && apt.date) {
        const count = dateMap.get(apt.date) || 0;
        dateMap.set(apt.date, count + 1);
      }
    });

    // Array sorted by date
    return Array.from(dateMap.entries())
      .map(([date, count]) => ({
        date,
        total: count,
        appointmentsCount: count,
        casesCount: 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments]);

  // Quick action: Complete an appointment
  const handleMarkAppointmentCompleted = (apt: AppointmentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveAppointment({
      ...apt,
      status: 'Completed',
      updatedAt: Date.now()
    });
  };

  // Quick action: Settle a case
  const handleMarkCaseSettled = (item: CaseItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onSaveCase({
      ...item,
      status: 'Settled',
      updatedAt: Date.now()
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal / Sheet Container */}
        <motion.div 
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* TOP BAR */}
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    {lang === 'zh' ? '待办与预约提醒' : 'Notifications'}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    {totalUnfinishedOnDate}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-gold" />
                  <span>{formatDateDisplay(selectedDate, lang)}</span>
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DATE SELECTOR & METRICS STRIP */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-zinc-900/30 border-b border-zinc-800/60 flex flex-col gap-3 shrink-0">
            {/* Quick date buttons & native date picker */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedDate === todayStr 
                      ? 'bg-gold text-zinc-950 shadow-md scale-105' 
                      : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                  }`}
                >
                  {lang === 'zh' ? '今天' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedDate === tomorrowStr 
                      ? 'bg-gold text-zinc-950 shadow-md scale-105' 
                      : 'bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800'
                  }`}
                >
                  {lang === 'zh' ? '明天' : 'Tomorrow'}
                </button>
              </div>

              {/* Date Input */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-zinc-400 font-medium">
                  {lang === 'zh' ? '指定日期:' : 'Date:'}
                </span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="min-h-[38px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Metrics cards on that same date: 2 columns */}
            <div className="grid grid-cols-2 gap-2.5">
              <div 
                onClick={() => setActiveTab(activeTab === 'appointments' ? 'all' : 'appointments')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'appointments'
                    ? 'bg-zinc-800/90 border-amber-500/60 shadow-md'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-400">
                    {lang === 'zh' ? '未完成预约' : 'Appointments'}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-black text-amber-400 mt-1">
                  {unfinishedAppointmentsOnDate.length}
                  {lang === 'zh' && <span className="text-xs font-normal text-zinc-400 ml-1">项</span>}
                </div>
              </div>

              <div 
                onClick={() => setActiveTab(activeTab === 'cases' ? 'all' : 'cases')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  activeTab === 'cases'
                    ? 'bg-zinc-800/90 border-sky-500/60 shadow-md'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-semibold text-zinc-400">
                    {lang === 'zh' ? '进行中个案' : 'Active Cases'}
                  </span>
                  <ClipboardList className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl font-black text-sky-400 mt-1">
                  {unfinishedCases.length}
                  {lang === 'zh' && <span className="text-xs font-normal text-zinc-400 ml-1">项</span>}
                </div>
              </div>
            </div>

            {/* Other dates with pending pills */}
            {otherDatesWithPending.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
                <span className="text-xs text-zinc-400 shrink-0 font-bold">
                  {lang === 'zh' ? '其他有待办日期:' : 'Other dates:'}
                </span>
                {otherDatesWithPending.map(item => {
                  const isCurrent = item.date === selectedDate;
                  const isOverdue = item.date < todayStr;
                  return (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => setSelectedDate(item.date)}
                      className={`text-xs px-2.5 py-1 rounded-xl border font-semibold shrink-0 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-gold/20 text-gold border-gold/60'
                          : isOverdue
                            ? 'bg-red-950/40 text-red-400 border-red-800/50 hover:border-red-600'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {item.date.slice(5)} ({item.total})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CONTENT LIST (SCROLLABLE) */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-5">
            {/* When all tasks are finished on this date */}
            {totalUnfinishedOnDate === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  {lang === 'zh' ? '该日期无待办事项' : 'All Clear'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 max-w-sm">
                  {lang === 'zh' 
                    ? `在 ${selectedDate} 这一天，所有的预约与个案均已圆满或暂无待办。` 
                    : `No pending tasks for ${selectedDate}.`}
                </p>
              </div>
            )}

            {/* 1. UNFINISHED APPOINTMENTS SECTION */}
            {(activeTab === 'all' || activeTab === 'appointments') && unfinishedAppointmentsOnDate.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400">
                      {lang === 'zh' ? '未完成预约' : 'Appointments'} ({unfinishedAppointmentsOnDate.length})
                    </h3>
                  </div>
                  {onNavigateToAppointments && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToAppointments(selectedDate);
                      }}
                      className="text-xs text-zinc-400 hover:text-gold flex items-center gap-1 transition-colors cursor-pointer py-1 px-1.5"
                    >
                      <span>{lang === 'zh' ? '打开预约看板' : 'Calendar'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {unfinishedAppointmentsOnDate.map(apt => {
                    const client = apt.clientId ? clientMap.get(apt.clientId) : undefined;
                    return (
                      <div 
                        key={apt.id}
                        className="bg-zinc-900/80 border border-zinc-800/90 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 transition-all shadow-sm group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1 shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              {apt.time || (lang === 'zh' ? '全天' : 'All day')}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-white truncate">
                              {apt.clientName}
                            </span>
                            {apt.clientPhone && (
                              <a
                                href={buildWhatsAppUrl(apt.clientPhone, `您好 ${apt.clientName}，关于您的预约：`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-zinc-400 hover:text-emerald-400 shrink-0 flex items-center gap-1 transition-colors underline-offset-2 hover:underline"
                                title="WhatsApp 联系客户"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{apt.clientPhone}</span>
                              </a>
                            )}
                          </div>

                          {/* Action Button: Mark Completed */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleMarkAppointmentCompleted(apt, e)}
                              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-zinc-950 transition-all active:scale-95 cursor-pointer"
                              title={lang === 'zh' ? '标记已完成' : 'Done'}
                            >
                              <Check className="w-4 h-4" />
                              <span>{lang === 'zh' ? '完成' : 'Done'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Services tags */}
                        {apt.services && apt.services.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {apt.services.map((svc, idx) => (
                              <span 
                                key={idx}
                                className="text-xs font-medium bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg"
                              >
                                {svc}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Notes preview if any */}
                        {apt.notes && (
                          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/40 leading-relaxed">
                            {apt.notes}
                          </p>
                        )}

                        {/* Jump to Bazi or Schedule */}
                        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/40">
                          <span>{lang === 'zh' ? '待赴约' : 'Pending'}</span>
                          <div className="flex items-center gap-3">
                            {client && onInspectClientBazi && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onInspectClientBazi(client);
                                }}
                                className="hover:text-gold flex items-center gap-1 cursor-pointer py-1 px-1.5"
                              >
                                <span>{lang === 'zh' ? '看八字' : 'Bazi'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onNavigateToAppointments && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onNavigateToAppointments(selectedDate);
                                }}
                                className="hover:text-gold flex items-center gap-1 cursor-pointer py-1 px-1.5"
                              >
                                <span>{lang === 'zh' ? '排期看板' : 'Schedule'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 2. UNFINISHED CASES SECTION */}
            {(activeTab === 'all' || activeTab === 'cases') && unfinishedCases.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-400">
                      {lang === 'zh' ? '进行中个案' : 'Active Cases'} ({unfinishedCases.length})
                    </h3>
                  </div>
                  {onNavigateToCases && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToCases();
                      }}
                      className="text-xs text-zinc-400 hover:text-gold flex items-center gap-1 transition-colors cursor-pointer py-1 px-1.5"
                    >
                      <span>{lang === 'zh' ? '个案看板' : 'Cases'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-2.5">
                  {unfinishedCases.map(item => {
                    const client = clientMap.get(item.clientId);
                    const isReviewing = item.status === 'Reviewing';
                    return (
                      <div 
                        key={item.id}
                        className="bg-zinc-900/80 border border-zinc-800/90 hover:border-sky-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                              isReviewing 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            }`}>
                              {isReviewing 
                                ? (lang === 'zh' ? '审核中' : 'Review') 
                                : (lang === 'zh' ? '进行中' : 'Active')}
                            </span>
                            <span className="text-base sm:text-lg font-bold text-white truncate">
                              {item.title}
                            </span>
                            {client && (
                              <span className="text-xs sm:text-sm text-zinc-400 shrink-0 font-medium">
                                ({client.name})
                              </span>
                            )}
                          </div>

                          {/* Action Button: Mark Settled */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleMarkCaseSettled(item, e)}
                              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-zinc-950 transition-all active:scale-95 cursor-pointer"
                              title={lang === 'zh' ? '标记已圆满' : 'Done'}
                            >
                              <Check className="w-4 h-4" />
                              <span>{lang === 'zh' ? '圆满' : 'Done'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Description snippet */}
                        {item.description && (
                          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/40 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Jump to Case or Client */}
                        <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800/40">
                          <span className="text-zinc-500">{lang === 'zh' ? '个案记录' : 'Case'}</span>
                          <div className="flex items-center gap-3">
                            {client && onInspectClientBazi && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onInspectClientBazi(client);
                                }}
                                className="hover:text-gold flex items-center gap-1 cursor-pointer py-1 px-1.5"
                              >
                                <span>{lang === 'zh' ? '看八字' : 'Bazi'}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onNavigateToCases && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onNavigateToCases();
                                }}
                                className="hover:text-gold flex items-center gap-1 cursor-pointer py-1 px-1.5"
                              >
                                <span>{lang === 'zh' ? '个案看板' : 'Detail'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* BOTTOM ACTIONS BAR */}
          <div className="p-3.5 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              {lang === 'zh' ? '关闭' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
