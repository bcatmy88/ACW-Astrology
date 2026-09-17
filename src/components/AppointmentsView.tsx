import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock4, 
  Menu, 
  Sparkles, 
  Tag, 
  FileText, 
  X,
  CalendarDays,
  Check,
  Contact,
  UserPlus,
  UserCheck
} from 'lucide-react';
import type { AppointmentItem, AppointmentStatus, SavedClient, AppLanguage, CaseItem } from '../types';
import LanguageToggle from './LanguageToggle';

interface AppointmentsViewProps {
  appointments: AppointmentItem[];
  savedClients: SavedClient[];
  onSaveAppointment: (appointment: AppointmentItem) => void;
  onDeleteAppointment: (id: string) => void;
  onOpenMenu: () => void;
  onInspectClientBazi?: (client: SavedClient) => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
  cases?: CaseItem[];
  onSaveCase?: (caseItem: CaseItem) => void;
  onNavigateToCases?: () => void;
}

const PRESET_SERVICES = [
  { id: 'bazi', zh: '算命问事', en: 'Fortune Telling' },
  { id: 'flower_bath', zh: '冲花凉', en: 'Flower Bath' },
  { id: 'fengshui_altar', zh: '风水安神', en: 'Feng Shui & Altar' },
  { id: 'couple_harmony', zh: '夫妻和合', en: 'Couple Harmony' },
  { id: 'amulet', zh: '佛牌加持', en: 'Amulet Blessing' },
  { id: 'other', zh: '其他', en: 'Other' },
];

const PRESET_TIME_SLOTS = [
  '10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00', '20:30'
];

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekdayLabel(dateStr: string, currentLang: AppLanguage = 'zh'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return '';
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return '';
  const zhDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return currentLang === 'zh' ? zhDays[dateObj.getDay()] : enDays[dateObj.getDay()];
}

export default function AppointmentsView({
  appointments,
  savedClients,
  onSaveAppointment,
  onDeleteAppointment,
  onOpenMenu,
  onInspectClientBazi,
  lang = 'zh',
  onToggleLang,
  cases = [],
  onSaveCase,
  onNavigateToCases
}: AppointmentsViewProps) {
  const todayStr = useMemo(() => getTodayString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'selected' | 'pending' | 'all' | 'completed'>('selected');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar year and month navigation
  const [currentCalYear, setCurrentCalYear] = useState<number>(() => new Date().getFullYear());
  const [currentCalMonth, setCurrentCalMonth] = useState<number>(() => new Date().getMonth()); // 0-11

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [clientInputMode, setClientInputMode] = useState<'manual' | 'archive'>('manual');
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientId, setFormClientId] = useState<string>('');
  const [formDate, setFormDate] = useState(todayStr);
  const [formTime, setFormTime] = useState('14:00');
  const [formServices, setFormServices] = useState<string[]>(['算命问事']);
  const [formCustomService, setFormCustomService] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<AppointmentStatus>('Pending');

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentCalMonth === 0) {
      setCurrentCalYear(y => y - 1);
      setCurrentCalMonth(11);
    } else {
      setCurrentCalMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentCalMonth === 11) {
      setCurrentCalYear(y => y + 1);
      setCurrentCalMonth(0);
    } else {
      setCurrentCalMonth(m => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentCalYear(now.getFullYear());
    setCurrentCalMonth(now.getMonth());
    setSelectedDate(todayStr);
    setActiveTab('selected');
  };

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentCalYear, currentCalMonth, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentCalYear, currentCalMonth, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = currentCalMonth === 0 ? 12 : currentCalMonth;
      const prevYear = currentCalMonth === 0 ? currentCalYear - 1 : currentCalYear;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Trailing days from next month to fill complete weeks (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = currentCalMonth === 11 ? 1 : currentCalMonth + 2;
        const nextYear = currentCalMonth === 11 ? currentCalYear + 1 : currentCalYear;
        const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ dateStr, dayNum: d, isCurrentMonth: false });
      }
    }

    return days;
  }, [currentCalYear, currentCalMonth]);

  // Appointment counts grouped by date
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, AppointmentItem[]>();
    appointments.forEach(apt => {
      const existing = map.get(apt.date) || [];
      existing.push(apt);
      map.set(apt.date, existing);
    });
    return map;
  }, [appointments]);

  // Filtered appointments to display
  const displayedAppointments = useMemo(() => {
    let list = [...appointments];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(apt => 
        apt.clientName.toLowerCase().includes(q) ||
        (apt.clientPhone && apt.clientPhone.includes(q)) ||
        (apt.services && apt.services.some(s => s.toLowerCase().includes(q))) ||
        (apt.notes && apt.notes.toLowerCase().includes(q))
      );
    } else {
      if (activeTab === 'selected') {
        list = list.filter(apt => apt.date === selectedDate);
      } else if (activeTab === 'pending') {
        list = list.filter(apt => apt.status === 'Pending');
      } else if (activeTab === 'completed') {
        list = list.filter(apt => apt.status === 'Completed');
      }
    }

    // Sort by date then time
    list.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.time || '').localeCompare(b.time || '');
    });

    return list;
  }, [appointments, selectedDate, activeTab, searchQuery]);

  // Form open handlers
  const handleOpenCreateModal = (targetDate?: string) => {
    setEditingId(null);
    setClientInputMode(savedClients.length > 0 ? 'archive' : 'manual');
    setFormClientName('');
    setFormClientPhone('');
    setFormClientId('');
    setFormDate(targetDate || selectedDate || todayStr);
    setFormTime('14:00');
    setFormServices(['算命问事']);
    setFormCustomService('');
    setFormNotes('');
    setFormStatus('Pending');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (apt: AppointmentItem) => {
    setEditingId(apt.id);
    setClientInputMode(apt.clientId ? 'archive' : 'manual');
    setFormClientName(apt.clientName);
    setFormClientPhone(apt.clientPhone || '');
    setFormClientId(apt.clientId || '');
    setFormDate(apt.date);
    setFormTime(apt.time || '14:00');

    // Parse services to check for '其他' or custom items
    const rawServices = apt.services || [];
    const parsedServices: string[] = [];
    let customVal = '';

    rawServices.forEach(s => {
      if (s.startsWith('其他: ')) {
        if (!parsedServices.includes('其他')) parsedServices.push('其他');
        customVal = s.replace('其他: ', '').trim();
      } else if (s === '其他') {
        if (!parsedServices.includes('其他')) parsedServices.push('其他');
      } else if (PRESET_SERVICES.some(p => p.zh === s)) {
        parsedServices.push(s);
      } else {
        if (!parsedServices.includes('其他')) parsedServices.push('其他');
        customVal = s;
      }
    });

    setFormServices(parsedServices.length > 0 ? parsedServices : ['算命问事']);
    setFormCustomService(customVal);
    setFormNotes(apt.notes || '');
    setFormStatus(apt.status);
    setIsModalOpen(true);
  };

  const handlePickExistingClient = (clientId: string) => {
    setFormClientId(clientId);
    if (!clientId) return;
    const client = savedClients.find(c => c.id === clientId);
    if (client) {
      setFormClientName(client.name);
      setFormClientPhone(client.phone || '');
    }
  };

  const toggleService = (svcName: string) => {
    setFormServices(prev => 
      prev.includes(svcName) 
        ? prev.filter(s => s !== svcName)
        : [...prev, svcName]
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) {
      alert(lang === 'zh' ? '请填写或选择客户姓名' : 'Please enter or select client name');
      return;
    }
    if (!formDate) {
      alert(lang === 'zh' ? '请选择预约日期' : 'Please select date');
      return;
    }

    const now = Date.now();
    const finalServices = formServices.map(s => {
      if (s === '其他') {
        return formCustomService.trim() ? `其他: ${formCustomService.trim()}` : '其他';
      }
      return s;
    });

    const services = finalServices.length > 0 
      ? finalServices 
      : formNotes.trim()
        ? [formNotes.trim().split(/[\n,，]/)[0].slice(0, 15)]
        : [lang === 'zh' ? '算命问事' : 'Consultation'];

    const itemToSave: AppointmentItem = {
      id: editingId || `apt_${now}_${Math.random().toString(36).substring(2, 6)}`,
      clientName: formClientName.trim(),
      clientPhone: formClientPhone.trim() || undefined,
      clientId: formClientId || undefined,
      date: formDate,
      time: formTime.trim() || undefined,
      services,
      notes: formNotes.trim(),
      status: formStatus,
      createdAt: editingId ? (appointments.find(a => a.id === editingId)?.createdAt || now) : now,
      updatedAt: now,
    };

    onSaveAppointment(itemToSave);
    setIsModalOpen(false);
    setSelectedDate(formDate);
  };

  const handleQuickStatusChange = (apt: AppointmentItem, newStatus: AppointmentStatus) => {
    onSaveAppointment({
      ...apt,
      status: newStatus,
      updatedAt: Date.now()
    });
  };

  const selectedDateAppointmentsCount = (appointmentsByDate.get(selectedDate) || []).length;
  const pendingAppointmentsCount = appointments.filter(a => a.status === 'Pending').length;

  const weekdays = lang === 'zh' 
    ? ['日', '一', '二', '三', '四', '五', '六'] 
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col gap-4 relative">
      {/* HEADER BAR */}
      <header 
        className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between gap-2 mb-2 shadow-lg"
        style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            type="button"
            onClick={onOpenMenu}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white cursor-pointer active:scale-95 shrink-0"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
              {lang === 'zh' ? '预约排期' : 'Appointments'}
            </h1>
            <span className="text-xs bg-gold/20 text-gold border border-gold/40 px-2 py-0.5 rounded-full font-bold shrink-0">
              {appointments.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} className="shrink-0" />}
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="min-h-[40px] flex items-center gap-1.5 bg-gradient-to-r from-yellow-600 to-gold text-zinc-950 hover:brightness-110 px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{lang === 'zh' ? '新建预约' : 'New Booking'}</span>
          </button>
        </div>
      </header>

      {/* 1. INTERACTIVE CALENDAR CONTAINER */}
      <section className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-3.5">
        {/* Calendar Month & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gold" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-100">
              {currentCalYear}{lang === 'zh' ? '年 ' : ' / '}{currentCalMonth + 1}{lang === 'zh' ? '月' : ''}
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="h-8 px-2.5 text-xs font-bold text-zinc-300 hover:text-gold border border-zinc-800 hover:border-gold/40 bg-zinc-950/60 rounded-lg transition-all cursor-pointer flex items-center justify-center"
            >
              {lang === 'zh' ? '今天' : 'Today'}
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-zinc-400 pb-1.5 border-b border-zinc-800/60">
          {weekdays.map((w, idx) => (
            <div key={idx} className={idx === 0 || idx === 6 ? 'text-amber-500' : ''}>
              {w}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarDays.map((cell, idx) => {
            const isSelected = cell.dateStr === selectedDate;
            const isToday = cell.dateStr === todayStr;
            const dayAppointments = appointmentsByDate.get(cell.dateStr) || [];
            const aptCount = dayAppointments.length;
            const hasPending = dayAppointments.some(a => a.status === 'Pending');

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  setActiveTab('selected');
                }}
                className={`min-h-[50px] sm:min-h-[56px] rounded-xl p-1 sm:p-1.5 flex flex-col items-center justify-between transition-all relative border cursor-pointer ${
                  isSelected 
                    ? 'bg-gold/20 border-gold shadow-[0_0_14px_rgba(212,175,55,0.3)]' 
                    : isToday 
                    ? 'bg-zinc-800 border-zinc-600 hover:border-gold/50' 
                    : cell.isCurrentMonth
                    ? 'bg-zinc-950/70 border-zinc-800/90 hover:bg-zinc-800/50 hover:border-zinc-700'
                    : 'bg-zinc-950/20 border-transparent opacity-40 hover:opacity-70'
                }`}
              >
                {/* Day Number */}
                <span className={`text-xs sm:text-sm font-bold leading-none mt-0.5 ${
                  isSelected 
                    ? 'text-gold' 
                    : isToday 
                    ? 'text-yellow-400 font-extrabold' 
                    : cell.isCurrentMonth 
                    ? 'text-zinc-200' 
                    : 'text-zinc-500'
                }`}>
                  {cell.dayNum}
                </span>

                {/* Appointment indicator tag / dot */}
                {aptCount > 0 ? (
                  <div className="flex items-center gap-0.5 mb-0.5">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-tight ${
                      hasPending 
                        ? 'bg-gold text-zinc-950' 
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {aptCount}
                    </span>
                  </div>
                ) : (
                  <div className="h-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Summary & Quick Add */}
        <div className="pt-2.5 border-t border-zinc-800/70 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="text-zinc-300">
              {lang === 'zh' ? '已选日期：' : 'Selected: '}
              <strong className="text-white font-bold ml-1">{selectedDate}</strong>
            </span>
            {selectedDate === todayStr && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">
                {lang === 'zh' ? '今天' : 'Today'}
              </span>
            )}
            <span className="text-xs text-zinc-400">
              ({selectedDateAppointmentsCount} {lang === 'zh' ? '个预约' : 'bookings'})
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateModal(selectedDate)}
            className="flex items-center gap-1 text-gold hover:text-yellow-300 font-bold text-xs sm:text-sm hover:underline cursor-pointer whitespace-nowrap shrink-0 py-1"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{lang === 'zh' ? `为 ${selectedDate} 预约` : `Book for ${selectedDate}`}</span>
          </button>
        </div>
      </section>

      {/* 2. SEARCH & TABS ROW */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Quick Tabs */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('selected')}
            className={`min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'selected' 
                ? 'bg-gold text-zinc-950 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang === 'zh' ? '选中日期' : 'Selected'} ({selectedDateAppointmentsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pending' 
                ? 'bg-gold text-zinc-950 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang === 'zh' ? '待赴约' : 'Pending'} ({pendingAppointmentsCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-gold text-zinc-950 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang === 'zh' ? '全部' : 'All'} ({appointments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`min-h-[38px] px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'completed' 
                ? 'bg-gold text-zinc-950 shadow-sm' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {lang === 'zh' ? '已完成' : 'Done'}
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 max-w-full sm:max-w-[260px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'zh' ? '搜索姓名/电话/项目...' : 'Search appointments...'}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-9 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-gold/60"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. APPOINTMENTS LIST */}
      <div className="flex flex-col gap-3">
        {displayedAppointments.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
            <CalendarIcon className="w-10 h-10 text-zinc-600" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-zinc-300">
                {searchQuery 
                  ? (lang === 'zh' ? '未找到相关预约' : 'No matching appointments') 
                  : activeTab === 'selected'
                  ? (lang === 'zh' ? `${selectedDate} 尚无预约安排` : `No bookings on ${selectedDate}`)
                  : (lang === 'zh' ? '暂无此分类预约' : 'No appointments in this category')}
              </h3>
              <p className="text-xs text-zinc-500">
                {lang === 'zh' ? '点击右上角或下方按钮快速为客户录入预约' : 'Click the button below to add an appointment for this day'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreateModal(selectedDate)}
              className="mt-1 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-gold border border-gold/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? `录入 ${selectedDate} 预约` : `Add Booking for ${selectedDate}`}</span>
            </button>
          </div>
        ) : (
          displayedAppointments.map(item => {
            const linkedClient = item.clientId ? savedClients.find(c => c.id === item.clientId) : undefined;
            const isToday = item.date === todayStr;

            return (
              <div
                key={item.id}
                className="bg-zinc-900/85 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 transition-all shadow-sm"
              >
                {/* Top Row: Client Info & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-zinc-950 border border-gold/40 flex items-center justify-center text-gold font-black text-sm shrink-0 shadow-inner">
                      {item.clientName[0] || '客'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                          {item.clientName}
                        </span>
                        {item.status === 'Pending' ? (
                          <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                            {lang === 'zh' ? '待赴约' : 'Pending'}
                          </span>
                        ) : item.status === 'Completed' ? (
                          <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                            {lang === 'zh' ? '已完成' : 'Completed'}
                          </span>
                        ) : (
                          <span className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                            {lang === 'zh' ? '已取消' : 'Canceled'}
                          </span>
                        )}
                      </div>

                      {/* Phone / Contact */}
                      {item.clientPhone && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{item.clientPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(lang === 'zh' ? '确认删除此预约？' : 'Delete this booking?')) {
                          onDeleteAppointment(item.id);
                        }
                      }}
                      className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Date & Time pill row */}
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold border ${
                    isToday 
                      ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300' 
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                  }`}>
                    <CalendarDays className="w-4 h-4 text-gold shrink-0" />
                    <span>{item.date}</span>
                    {isToday && <span className="text-xs font-black text-yellow-400 ml-1">({lang === 'zh' ? '今天' : 'Today'})</span>}
                  </div>

                  {item.time && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-zinc-950 border border-zinc-800 text-zinc-300">
                      <Clock className="w-4 h-4 text-gold shrink-0" />
                      <span>{item.time}</span>
                    </div>
                  )}

                  {linkedClient && onInspectClientBazi && (
                    <button
                      type="button"
                      onClick={() => onInspectClientBazi(linkedClient)}
                      className="min-h-[34px] flex items-center gap-1.5 text-xs text-gold hover:text-yellow-300 bg-gold/10 hover:bg-gold/20 border border-gold/30 px-3 py-1 rounded-xl transition-all ml-auto cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '查看八字' : 'View Bazi'}</span>
                    </button>
                  )}
                </div>

                {/* Services Chips (要做的事项目) */}
                {item.services && item.services.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {item.services.map((svc, sIdx) => (
                      <span 
                        key={sIdx}
                        className="bg-gold/10 border border-gold/30 text-gold text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1.5"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{svc}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Detailed Notes / Requirements */}
                {item.notes && (
                  <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-line break-words">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 mb-1">
                      <FileText className="w-3.5 h-3.5 text-gold" />
                      <span>{lang === 'zh' ? '具体要求与说明：' : 'Details & Requirements:'}</span>
                    </div>
                    {item.notes}
                  </div>
                )}

                {/* Status Toggle Bar */}
                <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="text-xs text-zinc-400 font-medium">
                    {lang === 'zh' ? '预约状态：' : 'Status:'}
                  </span>

                  <div className="flex items-center gap-2">
                    {item.status !== 'Completed' ? (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(item, 'Completed')}
                        className="min-h-[36px] flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-700/50 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{lang === 'zh' ? '标记已赴约完成' : 'Mark Completed'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(item, 'Pending')}
                        className="min-h-[36px] flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <Clock4 className="w-4 h-4" />
                        <span>{lang === 'zh' ? '改为待赴约' : 'Set to Pending'}</span>
                      </button>
                    )}

                    {item.status !== 'Canceled' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(item, 'Canceled')}
                        className="min-h-[36px] text-xs sm:text-sm text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. APPOINTMENT MODAL (CREATE / EDIT) - 尊享雅致排版 */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg sm:max-w-xl overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-800/90 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shadow-sm shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    {editingId 
                      ? (lang === 'zh' ? '修改预约记录' : 'Edit Booking') 
                      : (lang === 'zh' ? '新建客户预约' : 'New Appointment')}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span>{lang === 'zh' ? '预约日期：' : 'Date: '}</span>
                    <span className="text-gold font-bold">{formDate}</span>
                    {formDate && (
                      <span className="px-2 py-0.5 text-[11px] rounded-md bg-zinc-800/90 text-zinc-300 font-bold border border-zinc-700">
                        {getWeekdayLabel(formDate, lang)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="flex flex-col">
              <div className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto max-h-[calc(85vh-120px)]">
                {/* 1. 客户基本资料 */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-300">
                      <User className="w-4 h-4 text-gold" />
                      <span>{lang === 'zh' ? '客户基本资料' : 'Client Profile'}</span>
                    </div>
                    {savedClients.length > 0 && (
                      <span className="text-xs text-zinc-400 font-medium">
                        {lang === 'zh' ? `档案库共有 ${savedClients.length} 位客户` : `${savedClients.length} archived clients`}
                      </span>
                    )}
                  </div>

                  {/* 模式选择：选择原有客户 VS 手动填写客户 */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/70 border border-zinc-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setClientInputMode('archive')}
                      className={`min-h-[42px] px-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        clientInputMode === 'archive'
                          ? 'bg-zinc-800 text-gold border border-gold/40 shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Contact className="w-4 h-4 text-gold shrink-0" />
                      <span className="truncate">{lang === 'zh' ? '选择原有客户' : 'Existing Client'}</span>
                      {savedClients.length > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gold/15 text-gold font-bold shrink-0">
                          {savedClients.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientInputMode('manual');
                      }}
                      className={`min-h-[42px] px-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        clientInputMode === 'manual'
                          ? 'bg-zinc-800 text-gold border border-gold/40 shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 text-gold shrink-0" />
                      <span className="truncate">{lang === 'zh' ? '手动填写客户' : 'Manual Entry'}</span>
                    </button>
                  </div>

                  {/* 档案下拉选择区 */}
                  {clientInputMode === 'archive' && (
                    <div className="flex flex-col gap-2.5 p-3.5 bg-black border border-zinc-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-gold" />
                          <span>{lang === 'zh' ? '选择原有客户：' : 'Select existing client:'}</span>
                        </label>
                        {formClientId && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormClientId('');
                              setFormClientName('');
                              setFormClientPhone('');
                            }}
                            className="text-xs text-zinc-400 hover:text-rose-400 font-medium transition-colors cursor-pointer py-0.5 px-1.5"
                          >
                            {lang === 'zh' ? '清空重选' : 'Clear'}
                          </button>
                        )}
                      </div>

                      {savedClients.length > 0 ? (
                        <select
                          value={formClientId}
                          onChange={e => handlePickExistingClient(e.target.value)}
                          className="w-full min-h-[44px] bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 text-sm text-white focus:outline-none focus:border-gold transition-all cursor-pointer font-medium"
                        >
                          <option value="">{lang === 'zh' ? '-- 点击下拉挑选原有客户 --' : '-- Choose existing client --'}</option>
                          {savedClients.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ''} {c.birthDate ? `[${c.birthDate}]` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="py-2.5 text-center text-xs sm:text-sm text-zinc-500">
                          {lang === 'zh' ? '暂无原有客户记录，请点击上方“手动填写客户”。' : 'No existing client records yet. Enter details manually.'}
                        </div>
                      )}

                      {formClientId && (
                        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/50 px-3 py-2 rounded-xl">
                          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{lang === 'zh' ? `已关联原有客户：${formClientName}，下方资料可随时查看或微调` : `Linked to client: ${formClientName}`}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 客户姓名与电话输入 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between ml-0.5">
                        <label className="text-xs sm:text-sm font-bold text-zinc-300">
                          {lang === 'zh' ? '客户姓名 *' : 'Client Name *'}
                        </label>
                        {formClientId && (
                          <span className="text-xs text-gold font-bold">
                            {lang === 'zh' ? '✓ 档案已关联' : '✓ Linked'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={formClientName}
                        onChange={e => setFormClientName(e.target.value)}
                        placeholder={lang === 'zh' ? '输入客户姓名（如：陈先生）' : 'e.g. John Doe'}
                        className="min-h-[46px] px-3.5 bg-black border border-zinc-800 rounded-xl text-base text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:border-gold transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs sm:text-sm font-bold text-zinc-300 ml-0.5">
                        {lang === 'zh' ? '联系电话 / WhatsApp (选填)' : 'Phone / WhatsApp'}
                      </label>
                      <input
                        type="tel"
                        value={formClientPhone}
                        onChange={e => setFormClientPhone(e.target.value)}
                        placeholder={lang === 'zh' ? '例如：012-345 6789' : 'e.g. +60123456789'}
                        className="min-h-[46px] px-3.5 bg-black border border-zinc-800 rounded-xl text-base text-white font-medium placeholder:text-zinc-600 focus:outline-none focus:border-gold transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. 预约日期与时间 */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-300">
                    <CalendarDays className="w-4 h-4 text-gold" />
                    <span>{lang === 'zh' ? '预约日期与时段' : 'Date & Time'}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Date picker */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between ml-0.5">
                        <label className="text-xs sm:text-sm font-bold text-zinc-300">
                          {lang === 'zh' ? '哪天来 (日期) *' : 'Booking Date *'}
                        </label>
                        {formDate && (
                          <span className="text-xs font-bold text-gold">
                            {getWeekdayLabel(formDate, lang)}
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={e => setFormDate(e.target.value)}
                        className="min-h-[46px] px-3.5 bg-black border border-zinc-800 rounded-xl text-base text-white font-medium focus:outline-none focus:border-gold transition-all cursor-pointer [color-scheme:dark]"
                      />
                    </div>

                    {/* Time picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs sm:text-sm font-bold text-zinc-300 ml-0.5">
                        {lang === 'zh' ? '几点来 (时间)' : 'Booking Time'}
                      </label>
                      <input
                        type="time"
                        value={formTime}
                        onChange={e => setFormTime(e.target.value)}
                        className="min-h-[46px] px-3.5 bg-black border border-zinc-800 rounded-xl text-base text-white font-medium focus:outline-none focus:border-gold transition-all cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Quick time pills below */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
                    <span className="text-xs font-bold text-zinc-400 mr-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gold" />
                      <span>{lang === 'zh' ? '常用时段：' : 'Quick time:'}</span>
                    </span>
                    {['10:00', '11:30', '14:00', '15:30', '17:00', '20:00'].map(t => {
                      const isSelected = formTime === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormTime(t)}
                          className={`min-h-[34px] text-xs sm:text-sm px-3 py-1 rounded-xl font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-gold text-zinc-950 border-gold shadow-sm'
                              : 'bg-black border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. 咨询项目 */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-300">
                      <Tag className="w-4 h-4 text-gold" />
                      <span>{lang === 'zh' ? '咨询项目' : 'Consultation Services'}</span>
                    </div>
                    <span className="text-xs font-bold text-gold">
                      {lang === 'zh' ? `已选 ${formServices.length} 项` : `${formServices.length} selected`}
                    </span>
                  </div>

                  {/* 6 Preset service cards in 3 columns on sm, 2 on mobile */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {PRESET_SERVICES.map(svc => {
                      const isSelected = formServices.includes(svc.zh);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.zh)}
                          className={`min-h-[46px] px-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight ${
                            isSelected
                              ? 'bg-gold/15 text-gold border-gold ring-1 ring-gold/40 shadow-sm'
                              : 'bg-black border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-gold shrink-0" />}
                          <span className="truncate">{lang === 'zh' ? svc.zh : svc.en}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* If '其他' is selected, allow user to input the custom consultation item */}
                  {formServices.includes('其他') && (
                    <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-black border border-gold/40 shadow-inner animate-in fade-in duration-150">
                      <label className="text-xs sm:text-sm font-bold text-gold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-gold" />
                        <span>{lang === 'zh' ? '请填写客户要的项目名称 *' : 'Specify Custom Consultation Item *'}</span>
                      </label>
                      <input
                        type="text"
                        value={formCustomService}
                        onChange={e => setFormCustomService(e.target.value)}
                        placeholder={lang === 'zh' ? '输入客户要做的具体项目（例如：化太岁法事、起名择日、安胎祈福等）' : 'e.g. Custom ritual, Naming, Cleansing...'}
                        className="min-h-[44px] px-3.5 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold transition-all"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="text-xs sm:text-sm font-bold text-zinc-300 ml-0.5 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gold" />
                      <span>{lang === 'zh' ? '具体要求、法事交代与备忘 (选填)' : 'Notes & Instructions (Optional)'}</span>
                    </label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder={lang === 'zh' 
                        ? '写上客户交代的具体事宜（例如：补财库全套、带两尊佛牌来加持、同行2人、提醒备红烛金纸等）...' 
                        : 'Write down details of what they want to do or any notes...'}
                      className="bg-black border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold focus:outline-none resize-none leading-relaxed transition-all"
                    />
                  </div>
                </div>

                {/* 4. 状态（仅编辑已有预约时显示） */}
                {editingId && (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-300">
                      {lang === 'zh' ? '当前预约状态：' : 'Booking Status:'}
                    </span>
                    <div className="flex items-center gap-2">
                      {(['Pending', 'Completed', 'Canceled'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFormStatus(st)}
                          className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                            formStatus === st
                              ? st === 'Completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                                : st === 'Canceled'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                              : 'bg-black border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {st === 'Pending' ? (lang === 'zh' ? '待赴约' : 'Pending')
                           : st === 'Completed' ? (lang === 'zh' ? '已完成' : 'Completed')
                           : (lang === 'zh' ? '已取消' : 'Canceled')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. 底部操作栏 */}
              <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-6 py-2.5 bg-gold text-zinc-950 hover:brightness-110 rounded-xl text-xs sm:text-sm font-black transition-all shadow-lg shadow-gold/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId 
                    ? (lang === 'zh' ? '保存修改' : 'Save Changes') 
                    : (lang === 'zh' ? '确认保存预约' : 'Confirm Booking')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
