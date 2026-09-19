import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Menu, 
  User, 
  FileText, 
  Trash2, 
  ChevronRight, 
  ExternalLink, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import type { SavedClient, CaseItem, CaseStatus, AppLanguage, AppointmentItem } from '../types';
import LanguageToggle from './LanguageToggle';

interface PendingCasesViewProps {
  cases: CaseItem[];
  savedClients: SavedClient[];
  onSaveCase: (caseItem: CaseItem) => void;
  onDeleteCase: (caseId: string) => void;
  onOpenMenu: () => void;
  onInspectClientBazi?: (client: SavedClient) => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
  appointments?: AppointmentItem[];
  onSaveAppointment?: (appointment: AppointmentItem) => void;
  onNavigateToAppointments?: (date?: string) => void;
}

const STATUS_CONFIG: Record<CaseStatus, { 
  labelZh: string;
  labelEn: string;
  badgeColor: string; 
  bgColor: string; 
  borderColor: string;
  dotColor: string;
}> = {
  Reviewing: {
    labelZh: '审核中',
    labelEn: 'Reviewing',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    bgColor: 'hover:border-amber-500/40',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-400'
  },
  Executing: {
    labelZh: '进行中',
    labelEn: 'Executing',
    badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    bgColor: 'hover:border-sky-500/40',
    borderColor: 'border-sky-500/30',
    dotColor: 'bg-sky-400'
  },
  Settled: {
    labelZh: '已圆满',
    labelEn: 'Settled',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    bgColor: 'hover:border-emerald-500/40',
    borderColor: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400'
  },
  Canceled: {
    labelZh: '已取消',
    labelEn: 'Canceled',
    badgeColor: 'text-zinc-400 bg-zinc-800 border-zinc-700',
    bgColor: 'hover:border-zinc-700',
    borderColor: 'border-zinc-800',
    dotColor: 'bg-zinc-500'
  }
};

export default function PendingCasesView({
  cases,
  savedClients,
  onSaveCase,
  onDeleteCase,
  onOpenMenu,
  onInspectClientBazi,
  lang = 'zh',
  onToggleLang,
  appointments = [],
  onSaveAppointment,
  onNavigateToAppointments
}: PendingCasesViewProps) {
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | CaseStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor modal state
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields for create/edit
  const [formClientId, setFormClientId] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<CaseStatus>('Reviewing');
  
  // Client selection picker in modal
  const [isChoosingClient, setIsChoosingClient] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Map clients for quick lookup
  const clientMap = useMemo(() => {
    const map = new Map<string, SavedClient>();
    savedClients.forEach(c => map.set(c.id, c));
    return map;
  }, [savedClients]);

  // Filtered cases list
  const filteredCases = useMemo(() => {
    return cases.filter(item => {
      if (activeStatusFilter !== 'ALL' && item.status !== activeStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const client = clientMap.get(item.clientId);
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchDesc = item.description.toLowerCase().includes(query);
        const matchClient = client?.name.toLowerCase().includes(query) || client?.phone.includes(query);
        return matchTitle || matchDesc || matchClient;
      }
      return true;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cases, activeStatusFilter, searchQuery, clientMap]);

  // Counts by status
  const counts = useMemo(() => {
    return {
      all: cases.length,
      reviewing: cases.filter(c => c.status === 'Reviewing').length,
      executing: cases.filter(c => c.status === 'Executing').length,
      settled: cases.filter(c => c.status === 'Settled').length,
      canceled: cases.filter(c => c.status === 'Canceled').length,
    };
  }, [cases]);

  // Open editor for new case
  const handleOpenNewCase = () => {
    const defaultClient = savedClients[0]?.id || '';
    setFormClientId(defaultClient);
    setFormTitle('');
    setFormDescription('');
    setFormStatus('Reviewing');
    setSelectedCase(null);
    setIsEditing(true);
    setIsChoosingClient(false);
  };

  // Open editor for existing case
  const handleOpenCase = (item: CaseItem) => {
    setSelectedCase(item);
    setFormClientId(item.clientId);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormStatus(item.status);
    setIsEditing(true);
    setIsChoosingClient(false);
  };

  // Submit case form
  const handleSave = () => {
    if (!formClientId) {
      alert("请选人");
      return;
    }
    const client = clientMap.get(formClientId);
    const resolvedTitle = formTitle.trim() || `${client?.name || '客户'} 案`;

    const now = Date.now();
    const caseToSave: CaseItem = {
      id: selectedCase ? selectedCase.id : crypto.randomUUID(),
      title: resolvedTitle,
      clientId: formClientId,
      description: formDescription,
      status: formStatus,
      createdAt: selectedCase ? selectedCase.createdAt : now,
      updatedAt: now
    };

    onSaveCase(caseToSave);
    setIsEditing(false);
    setSelectedCase(null);
  };

  // Delete case confirmation
  const handleDelete = (id: string) => {
    if (confirm("删此案？")) {
      onDeleteCase(id);
      setIsEditing(false);
      setSelectedCase(null);
    }
  };

  // Filtered clients for the picker
  const filteredPickerClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return savedClients;
    const q = clientSearchQuery.toLowerCase();
    return savedClients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [savedClients, clientSearchQuery]);

  const selectedClient = clientMap.get(formClientId);

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
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
              {lang === 'zh' ? '个案' : 'Cases'}
            </h1>
            <span className="text-[10px] text-gold font-bold px-1.5 py-0.5 rounded bg-gold/10 border border-gold/30">
              {cases.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
          <button 
            onClick={handleOpenNewCase}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg text-xs transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '新个案' : 'New'}</span>
          </button>
        </div>
      </header>

      {/* FILTER TABS & SEARCH */}
      <div className="flex flex-col gap-2.5">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5">
          <button
            onClick={() => setActiveStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 border shrink-0 ${
              activeStatusFilter === 'ALL'
                ? 'bg-zinc-100 text-zinc-950 border-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            <span>{lang === 'zh' ? '全部' : 'All'}</span>
            <span className="text-[10px] opacity-70 px-1 rounded bg-black/10">{counts.all}</span>
          </button>

          {(['Reviewing', 'Executing', 'Settled', 'Canceled'] as CaseStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const isActive = activeStatusFilter === status;
            const count = status === 'Reviewing' ? counts.reviewing :
                          status === 'Executing' ? counts.executing :
                          status === 'Settled' ? counts.settled : counts.canceled;
            return (
              <button
                key={status}
                onClick={() => setActiveStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 border shrink-0 ${
                  isActive
                    ? `${cfg.badgeColor} shadow-sm`
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                <span>{lang === 'zh' ? cfg.labelZh : cfg.labelEn}</span>
                <span className="text-[10px] opacity-70 px-1 rounded bg-black/10">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'zh' ? '搜个案' : 'Search cases...'}
            className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold/40"
          />
        </div>
      </div>

      {/* CASES LIST */}
      <div className="flex flex-col gap-2 min-h-[300px]">
        {filteredCases.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
            <Layers className="w-6 h-6 text-zinc-600" />
            <p className="text-xs text-zinc-500">{lang === 'zh' ? '暂无个案' : 'No records'}</p>
            {cases.length === 0 && (
              <button
                onClick={handleOpenNewCase}
                className="mt-1 px-3 py-1 bg-gold/10 hover:bg-gold text-gold hover:text-zinc-950 font-bold rounded text-xs transition-all border border-gold/30"
              >
                {lang === 'zh' ? '新个案' : 'New Case'}
              </button>
            )}
          </div>
        ) : (
          filteredCases.map(item => {
            const client = clientMap.get(item.clientId);
            const cfg = STATUS_CONFIG[item.status];

            return (
              <div
                key={item.id}
                onClick={() => handleOpenCase(item)}
                className={`group bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 active:scale-[0.99] shadow-sm hover:shadow-md ${cfg.bgColor}`}
              >
                {/* Left: Client Avatar + Name & Category */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-zinc-950 border border-gold/30 flex items-center justify-center text-gold font-bold text-xs shrink-0 shadow-inner group-hover:border-gold/60 transition-colors">
                    {client?.name ? client.name[0] : <User className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col min-w-0 gap-1">
                    {/* 1. 个案的人名字 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white group-hover:text-gold transition-colors truncate">
                        {client?.name || (lang === 'zh' ? '未知客户' : 'Client')}
                      </span>
                      {client?.gender && (
                        <span className="text-[10px] text-zinc-400 font-medium px-1 rounded bg-zinc-800/80 border border-zinc-700/50">
                          {client.gender === 'male' ? (lang === 'zh' ? '乾造' : 'M') : (lang === 'zh' ? '坤造' : 'F')}
                        </span>
                      )}
                    </div>

                    {/* 2. 个案种类与详情预览 */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {/* 个案种类 */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gold/10 border border-gold/25 text-gold text-[11px] font-semibold">
                        <Sparkles className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[220px]">
                          {item.title || (lang === 'zh' ? '常规个案' : 'General')}
                        </span>
                      </span>

                      {item.description && (
                        <span className="text-[11px] text-zinc-500 truncate max-w-[150px] sm:max-w-[240px]">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: 3. 目前状态 + Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 whitespace-nowrap shadow-sm ${cfg.badgeColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                    <span>{lang === 'zh' ? cfg.labelZh : cfg.labelEn}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CASE DETAIL & EDIT MODAL (POPUP) */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[88vh]">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
              <h2 className="text-xs sm:text-sm font-bold text-white">
                {selectedCase ? '改个案' : '新个案'}
              </h2>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedCase(null);
                  setIsChoosingClient(false);
                }}
                className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 overflow-y-auto flex flex-col gap-3">
              
              {/* 1. CLIENT CARD */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gold flex items-center gap-1">
                    <User className="w-3 h-3" />
                    关联人
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsChoosingClient(!isChoosingClient)}
                    className="text-[10px] font-bold text-gold hover:underline"
                  >
                    {isChoosingClient ? '收起' : '选客户'}
                  </button>
                </div>

                {/* Display Current Selected Client */}
                {selectedClient ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-zinc-950 border border-gold/40 flex items-center justify-center text-gold font-bold text-xs shrink-0">
                        {selectedClient.name[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{selectedClient.name}</span>
                          <span className="text-[10px] text-zinc-400">
                            ({selectedClient.gender === 'male' ? '乾' : '坤'})
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 truncate">
                          {selectedClient.birthDate} • {selectedClient.phone || '无电话'}
                        </span>
                      </div>
                    </div>

                    {onInspectClientBazi && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          onInspectClientBazi(selectedClient);
                        }}
                        className="px-2 py-1 bg-zinc-800 hover:bg-gold hover:text-zinc-950 text-zinc-300 font-semibold text-[10px] rounded transition-all flex items-center gap-1 shrink-0 border border-zinc-700"
                      >
                        <span>看八字</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-2.5 rounded-xl text-center text-zinc-500 text-[10px]">
                    未选人
                  </div>
                )}

                {/* Client Picker Dropdown */}
                {isChoosingClient && (
                  <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl p-2 flex flex-col gap-1.5 shadow-xl max-h-48 overflow-hidden">
                    <div className="relative">
                      <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        placeholder="搜客户"
                        className="w-full pl-7 pr-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-gold/50"
                      />
                    </div>

                    <div className="overflow-y-auto max-h-36 flex flex-col gap-1 pr-0.5">
                      {filteredPickerClients.length === 0 ? (
                        <div className="text-center py-4 text-[10px] text-zinc-500">
                          无档案
                        </div>
                      ) : (
                        filteredPickerClients.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setFormClientId(c.id);
                              setIsChoosingClient(false);
                            }}
                            className={`p-1.5 rounded-lg flex items-center justify-between text-left transition-all text-xs ${
                              formClientId === c.id 
                                ? 'bg-gold/20 border border-gold/40 text-gold' 
                                : 'hover:bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-[10px] text-zinc-500">{c.phone || c.birthDate}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CASE CATEGORY / TITLE */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-300">
                    {lang === 'zh' ? '种类' : 'Category'}
                  </label>
                  <span className="text-[10px] text-zinc-500">
                    {lang === 'zh' ? '点选或自填' : 'Preset or custom'}
                  </span>
                </div>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={lang === 'zh' ? '例如：补财库、祈福法事、事业转运...' : 'e.g. Ritual, Fortune, Harmony...'}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50"
                />
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  {(lang === 'zh' 
                    ? ['补财库', '祈福法事', '事业转运', '斩烂桃花', '姻缘和合', '化太岁', '健康祛疾', '风水指点', '综合排盘'] 
                    : ['Wealth Ritual', 'Blessing', 'Career Boost', 'Romance Harmony', 'Protection', 'Health', 'Feng Shui', 'Consultation']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormTitle(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                        formTitle === preset
                          ? 'bg-gold/20 text-gold border-gold/50 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. CASE STATUS SELECTOR */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-300">
                  状态
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Reviewing', 'Executing', 'Settled', 'Canceled'] as CaseStatus[]).map((status) => {
                    const isSelected = formStatus === status;
                    const cfg = STATUS_CONFIG[status];

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormStatus(status)}
                        className={`py-1.5 px-1 rounded-lg font-semibold text-[11px] flex items-center justify-center gap-1 border transition-all ${
                          isSelected
                            ? `${cfg.badgeColor} ring-1 ring-gold/40`
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                        <span>{lang === 'zh' ? cfg.labelZh : cfg.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. CASE DESCRIPTION */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-300 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {lang === 'zh' ? '详情' : 'Description'}
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="写详情"
                  className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-gold/50 leading-relaxed resize-none"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-2">
              {selectedCase ? (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedCase.id)}
                  className="px-2.5 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>删除</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedCase(null);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-gold hover:bg-yellow-400 text-zinc-950 font-bold rounded-lg text-xs transition-all shadow-sm active:scale-95"
                >
                  保存
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
