import React, { useState, useMemo, useEffect } from 'react';
import { Solar, Lunar, EightChar, DaYun, LiuNian, LiuYue } from 'lunar-javascript';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus,
  Hash,
  Star,
  Search,
  Phone,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft, 
  Clock,
  History,
  Zap,
  Info,
  User,
  Settings,
  Share2,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2,
  LayoutGrid,
  Mountain,
  Sparkles,
  HeartPulse,
  Link,
  ShieldQuestion,
  Crown,
  CloudLightning,
  Trophy,
  Home,
  Skull,
  Shield,
  Menu,
  ClipboardList,
  BookOpen,
  CalendarDays,
  Database,
  Bell,
  Loader2
} from 'lucide-react';
import * as Astronomy from 'astronomy-engine';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { SavedClient, CaseItem, NoteItem, AppointmentItem, BackupData, AppLanguage } from './types';
import { COUNTRY_CODES, parsePhoneNumber, combinePhoneNumber, buildWhatsAppUrl } from './utils/phoneUtils';
import PendingCasesView from './components/PendingCasesView';
import NotesView from './components/NotesView';
import BackupView from './components/BackupView';
import AppointmentsView from './components/AppointmentsView';
import SettingsView from './components/SettingsView';
import LanguageToggle from './components/LanguageToggle';
import NotificationModal from './components/NotificationModal';
import PdfShareModal from './components/PdfShareModal';

// --- Types ---
interface BaziData {
  solar: Solar;
  lunar: Lunar;
  eightChar: EightChar;
  yun: any;
  gender: number;
  dayGan: string;
}

// --- Utilities ---
function calculateWesternAge(birthDateStr: string) {
  if (!birthDateStr) return 0;
  const year = parseInt(birthDateStr.split('-')[0]);
  const now = new Date();
  return now.getFullYear() - year;
}

const getYearAge = calculateWesternAge;

function getRootDigit(val: string | number): number {
  let s = String(val).replace(/[^0-9]/g, "");
  if (!s) return 0;
  let sum = s.split("").reduce((acc, d) => acc + parseInt(d), 0);
  while (sum > 9) {
    sum = String(sum).split("").reduce((acc, d) => acc + parseInt(d), 0);
  }
  return sum;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SHI_SHEN_MAP: Record<string, string> = {
  '甲甲': '比肩', '甲乙': '劫财', '甲丙': '食神', '甲丁': '伤官', '甲戊': '偏财', '甲己': '正财', '甲庚': '七杀', '甲辛': '正官', '甲壬': '偏印', '甲癸': '正印',
  '乙甲': '劫财', '乙乙': '比肩', '乙丙': '伤官', '乙丁': '食神', '乙戊': '正财', '乙己': '偏财', '乙庚': '正官', '乙辛': '七杀', '乙壬': '正印', '乙癸': '偏印',
  '丙甲': '偏印', '丙乙': '正印', '丙丙': '比肩', '丙丁': '劫财', '丙戊': '食神', '丙己': '伤官', '丙庚': '偏财', '丙辛': '正财', '丙壬': '七杀', '丙癸': '正官',
  '丁甲': '正印', '丁乙': '偏印', '丁丙': '劫财', '丁丁': '比肩', '丁戊': '伤官', '丁己': '食神', '丁庚': '正财', '丁辛': '偏财', '丁壬': '正官', '丁癸': '七杀',
  '戊甲': '七杀', '戊乙': '正官', '戊丙': '偏印', '戊丁': '正印', '戊戊': '比肩', '戊己': '劫财', '戊庚': '食神', '戊辛': '伤官', '戊壬': '偏财', '戊癸': '正财',
  '己甲': '正官', '己乙': '七杀', '己丙': '正印', '己丁': '偏印', '己戊': '劫财', '己己': '比肩', '己庚': '伤官', '己辛': '食神', '己壬': '正财', '己癸': '偏财',
  '庚甲': '偏财', '庚乙': '正财', '庚丙': '七杀', '庚丁': '正官', '庚戊': '偏印', '庚己': '正印', '庚庚': '比肩', '庚辛': '劫财', '庚壬': '食神', '庚癸': '伤官',
  '辛甲': '正财', '辛乙': '偏财', '辛丙': '正官', '辛丁': '七杀', '辛戊': '正印', '辛己': '偏印', '辛庚': '劫财', '辛辛': '比肩', '辛壬': '伤官', '辛癸': '食神',
  '壬甲': '食神', '壬乙': '伤官', '壬丙': '偏财', '壬丁': '正财', '壬戊': '七杀', '壬己': '正官', '壬庚': '偏印', '壬辛': '正印', '壬壬': '比肩', '壬癸': '劫财',
  '癸甲': '伤官', '癸乙': '食神', '癸丙': '正财', '癸丁': '偏财', '癸戊': '正官', '癸己': '七杀', '癸庚': '正印', '癸辛': '偏印', '癸壬': '劫财', '癸癸': '比肩',
};

const ZODIAC_SIGNS = [
  { name: '白羊座', symbol: '♈︎', eng: 'Aries' },
  { name: '金牛座', symbol: '♉︎', eng: 'Taurus' },
  { name: '双子座', symbol: '♊︎', eng: 'Gemini' },
  { name: '巨蟹座', symbol: '♋︎', eng: 'Cancer' },
  { name: '狮子座', symbol: '♌︎', eng: 'Leo' },
  { name: '处女座', symbol: '♍︎', eng: 'Virgo' },
  { name: '天秤座', symbol: '♎︎', eng: 'Libra' },
  { name: '天蝎座', symbol: '♏︎', eng: 'Scorpio' },
  { name: '射手座', symbol: '♐︎', eng: 'Sagittarius' },
  { name: '摩羯座', symbol: '♑︎', eng: 'Capricorn' },
  { name: '水瓶座', symbol: '♒︎', eng: 'Aquarius' },
  { name: '双鱼座', symbol: '♓︎', eng: 'Pisces' },
];

const WESTERN_PLANETS = [
  { id: 'Sun', name: '太阳', symbol: '☉' },
  { id: 'Moon', name: '月亮', symbol: '☽' },
  { id: 'Mercury', name: '水星', symbol: '☿' },
  { id: 'Venus', name: '金星', symbol: '♀' },
  { id: 'Mars', name: '火星', symbol: '♂' },
  { id: 'Jupiter', name: '木星', symbol: '♃' },
  { id: 'Saturn', name: '土星', symbol: '♄' },
  { id: 'Uranus', name: '天王星', symbol: '♅' },
  { id: 'Neptune', name: '海王星', symbol: '♆' },
  { id: 'Pluto', name: '冥王星', symbol: '♇' },
];

const THAI_DESTINY_SYMBOLS = [
  { id: 0, name: "เจดีย์", meaning: "Chedi (Pagoda)", desc: "Peace, success in small things, merit. 成功、平静、功德。", icon: "Mountain", color: "text-emerald-400" },
  { id: 1, name: "นาคราช", meaning: "Nakkarat (Naga)", desc: "Power, influence, hidden wealth. 权利、影响力、意外之财。", icon: "Zap", color: "text-blue-400" },
  { id: 2, name: "แม่มด", meaning: "Mae Mod (Sorceress)", desc: "Mystery, charm, hidden dangers. 神秘、魅力、隐藏的危险。", icon: "Sparkles", color: "text-purple-400" },
  { id: 3, name: "พ่อหมอ", meaning: "Pho Mo (Old Doctor)", desc: "Wisdom, healing, good advice. 智慧、治愈、良言良计。", icon: "HeartPulse", color: "text-rose-400" },
  { id: 4, name: "คนต้องขอคา", meaning: "Khon Tong Kho Ka (Prisoner)", desc: "Restrictions, legal issues, feeling trapped. 束缚、法律纠纷、感到困顿。", icon: "Link", color: "text-zinc-600" },
  { id: 5, name: "เทวดาขี่เต่า", meaning: "Thevada Khi Tao (Angel on Turtle)", desc: "Slow progress but steady success. 慢速但稳定的进步、长寿。", icon: "ShieldQuestion", color: "text-amber-400" },
  { id: 6, name: "ฉัตรทอง", meaning: "Chat Thong (Golden Umbrella)", desc: "Great success, fame, prosperity. 极大的成功、名誉、繁荣。", icon: "Crown", color: "text-gold" },
  { id: 7, name: "ราหู", meaning: "Rahu", desc: "Obstacles, enemies, sudden changes. 障碍、敌人、突如其来的变化。", icon: "CloudLightning", color: "text-red-500" },
  { id: 8, name: "ปราสาท", meaning: "Prasat (Palace)", desc: "High status, successful ventures. 高地位、成功的投资、显赫。", icon: "Trophy", color: "text-gold/80" },
  { id: 9, name: "เรือนหลวง", meaning: "Ruean Luang (Royal House)", desc: "Family stability, properties, honor. 家庭稳定、地产、荣誉。", icon: "Home", color: "text-indigo-400" },
  { id: 10, name: "คนคอขาด", meaning: "Khon Kho Khat (Beheaded person)", desc: "Danger, accidents, big risks. 危险、意外、巨大风险。", icon: "Skull", color: "text-red-700 font-bold" },
  { id: 11, name: "ฉัตรเงิน", meaning: "Chat Ngoen (Silver Umbrella)", desc: "Status, success, good protection. 地位、成功、良好的庇护。", icon: "Shield", color: "text-zinc-300" },
];

const PLANET_MAP: Record<number, string> = {
  1: '太阳',
  2: '月亮',
  3: '火星',
  4: '水星',
  5: '木星',
  6: '金星',
  7: '土星',
  8: '天王星',
  9: '海王星'
};

const ZHI_HIDE_GAN: Record<string, string[]> = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'], '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'], '午': ['丁', '己'], '未': ['己', '丁', '乙'], '申': ['庚', '壬', '戊'],
  '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
};

const getShiShenFromGans = (dayGan: string, otherGan: string) => SHI_SHEN_MAP[dayGan + otherGan] || '';

const getShiShenFromZhi = (dayGan: string, zhi: string) => {
  const hides = ZHI_HIDE_GAN[zhi] || [];
  return hides.map(h => SHI_SHEN_MAP[dayGan + h] || '');
};

const getBaziColorClass = (char: string) => {
  const mapping: Record<string, string> = {
    '甲': 'text-emerald-500', '乙': 'text-emerald-500', '寅': 'text-emerald-500', '卯': 'text-emerald-500',
    '丙': 'text-rose-600', '丁': 'text-rose-600', '巳': 'text-rose-600', '午': 'text-rose-600',
    '戊': 'text-amber-700', '己': 'text-amber-700', '辰': 'text-amber-700', '戌': 'text-amber-700', '丑': 'text-amber-700', '未': 'text-amber-700',
    '庚': 'text-yellow-600', '辛': 'text-yellow-600', '申': 'text-yellow-600', '酉': 'text-yellow-600',
    '壬': 'text-sky-500', '癸': 'text-sky-500', '亥': 'text-sky-500', '子': 'text-sky-500',
  };
  return mapping[char] || 'text-zinc-100';
};

const getShiShenShort = (full: string) => {
  const mapping: Record<string, string> = {
    '正官': '官', '七杀': '杀', '正财': '财', '偏财': '才',
    '正印': '印', '偏印': '枭', '食神': '食', '伤官': '伤',
    '比肩': '比', '劫财': '劫', '日主': '元'
  };
  return mapping[full] || full;
};

function DestinyCard({ client, onReplace }: { client: SavedClient, onReplace: () => void }) {
  const profile = useMemo(() => {
    try {
      const [y, m, d] = client.birthDate.split('-').map(Number);
      const [hh, mm] = client.birthTime.split(':').map(Number);
      const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
      const lunar = solar.getLunar();
      const eightChar = lunar.getEightChar();
      const genderNum = client.gender === 'male' ? 1 : 0;
      
      // 1. Numerology
      const yearRoot = getRootDigit(y);
      const monthRoot = getRootDigit(m);
      const dayRoot = getRootDigit(d);
      const coreRoot = getRootDigit(yearRoot + monthRoot + dayRoot);
      const essenceRoot = getRootDigit(hh);

      // 2. Astrology (Simplified for card)
      const dateUTC = new Date(Date.UTC(y, m - 1, d, hh - 8, mm)); // Default +8
      const timeAstronomy = Astronomy.MakeTime(dateUTC);
      const sunLon = Astronomy.SunPosition(timeAstronomy).elon;
      const sunSign = ZODIAC_SIGNS[Math.floor(sunLon / 30)];
      
      // 3. Thai 12 Houses
      const age = calculateWesternAge(client.birthDate);
      const count = age === 0 ? 1 : age;
      let houseIndex = 0;
      if (genderNum === 1) {
        houseIndex = (12 - (count - 1) % 12) % 12;
      } else {
        houseIndex = (count - 1) % 12;
      }
      const thaiSymbol = THAI_DESTINY_SYMBOLS[houseIndex];

      return {
        eightChar,
        dayGan: eightChar.getDayGan(),
        numerology: { core: coreRoot, essence: essenceRoot },
        astrology: { sunSign },
        thaiSymbol,
        age
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [client]);

  if (!profile) return null;

  const { eightChar, dayGan, numerology, astrology, thaiSymbol, age } = profile;
  const baziChars = [
    { label: '年', gan: eightChar.getYearGan(), zhi: eightChar.getYearZhi() },
    { label: '月', gan: eightChar.getMonthGan(), zhi: eightChar.getMonthZhi() },
    { label: '日', gan: eightChar.getDayGan(), zhi: eightChar.getDayZhi() },
    { label: '时', gan: eightChar.getTimeGan(), zhi: eightChar.getTimeZhi() },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col group h-full">
      <div className="bg-zinc-800/80 p-4 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-950 border border-gold/30 flex items-center justify-center text-gold font-black shadow-lg">
            {client.name[0]}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-white uppercase">{client.name}</span>
            <span className="text-[10px] text-gold font-bold">{age} 岁 | {client.gender === 'male' ? '乾造' : '坤造'}</span>
          </div>
        </div>
        <button onClick={onReplace} className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors">
          <History className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* BAZI STACK */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-3 h-3" /> 八字命元 (Bazi)
          </span>
          <div className="grid grid-cols-4 gap-1">
            {baziChars.reverse().map((char, idx) => (
              <div key={idx} className="bg-zinc-950 border border-zinc-800 p-2 rounded-xl flex flex-col items-center gap-1">
                <span className="text-[8px] font-black text-zinc-600 uppercase">{char.label}</span>
                <span className={cn("text-lg font-black leading-none", getBaziColorClass(char.gan))}>{char.gan}</span>
                <span className={cn("text-lg font-black leading-none", getBaziColorClass(char.zhi))}>{char.zhi}</span>
              </div>
            ))}
          </div>
        </div>

        {/* NUMEROLOGY & ASTROLOGY ROW */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Hash className="w-3 h-3" /> 数字学 (Numbers)
            </span>
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-white uppercase mb-1">主性格</span>
                <span className="text-xl font-black text-gold leading-none">{numerology.core}</span>
              </div>
              <div className="w-[1px] h-8 bg-zinc-800" />
               <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-white uppercase mb-1">潜意识</span>
                <span className="text-xl font-black text-zinc-400 leading-none">{numerology.essence}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Star className="w-3 h-3" /> 西洋占星 (Zodiac)
            </span>
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl flex items-center justify-center gap-3">
              <span className="text-3xl leading-none text-white italic font-serif" style={{ filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.4))' }}>
                {astrology.sunSign.symbol}
              </span>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-zinc-200 uppercase">{astrology.sunSign.name}</span>
                <span className="text-[8px] font-bold text-zinc-500 uppercase">{astrology.sunSign.eng}</span>
              </div>
            </div>
          </div>
        </div>

        {/* THAI HOUSES */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <LayoutGrid className="w-3 h-3" /> 十二命宫巡环 (Thai Houses)
          </span>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg")}>
              {(() => {
                const icons: Record<string, any> = {
                  Mountain, Zap, Sparkles, HeartPulse, Link, ShieldQuestion, Crown, CloudLightning, Trophy, Home, Skull, Shield
                };
                const IconComp = icons[thaiSymbol.icon] || Star;
                return <IconComp className={cn("w-6 h-6", thaiSymbol.color)} />;
              })()}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">{thaiSymbol.name}</span>
                <span className="text-[10px] font-bold text-gold uppercase">{thaiSymbol.meaning}</span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium leading-tight mt-1 line-clamp-2">{thaiSymbol.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---
export default function App() {
  const [view, setView] = useState<'list' | 'form' | 'analyze' | 'cases' | 'notes' | 'backup' | 'appointments' | 'settings'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  // Profile avatar and name for Notes view
  const [profileAvatar, setProfileAvatar] = useState<string>(() => {
    return localStorage.getItem('archan_wang_profile_avatar') || '';
  });
  const [profileName, setProfileName] = useState<string>(() => {
    return localStorage.getItem('archan_wang_profile_name') || 'Archan Wang';
  });

  const handleSaveProfileAvatar = (avatar: string) => {
    setProfileAvatar(avatar);
    if (avatar) {
      localStorage.setItem('archan_wang_profile_avatar', avatar);
    } else {
      localStorage.removeItem('archan_wang_profile_avatar');
    }
  };

  const handleSaveProfileName = (name: string) => {
    setProfileName(name);
    localStorage.setItem('archan_wang_profile_name', name);
  };

  // Custom Logo for Destiny PDF Reports and Sharing
  const [reportLogo, setReportLogo] = useState<string>(() => {
    try {
      return localStorage.getItem('destiny_report_logo') || '';
    } catch {
      return '';
    }
  });

  const handleSaveReportLogo = (logo: string) => {
    setReportLogo(logo);
    try {
      if (logo) {
        localStorage.setItem('destiny_report_logo', logo);
      } else {
        localStorage.removeItem('destiny_report_logo');
      }
    } catch (e) {
      console.error('Failed to persist report logo', e);
    }
  };

  const [birthDate, setBirthDate] = useState('1990-05-20');
  const [birthTime, setBirthTime] = useState('10:30');
  const [timezone, setTimezone] = useState(8);
  const [latitude, setLatitude] = useState(3.1390); // Default KL
  const [longitude, setLongitude] = useState(101.6869); // Default KL
  const [gender, setGender] = useState(1); // 1 for Male, 0 for Female
  const [selectedDaYunIndex, setSelectedDaYunIndex] = useState(1);
  const [selectedNianYear, setSelectedNianYear] = useState(new Date().getFullYear());
  const [selectedYueIndex, setSelectedYueIndex] = useState(new Date().getMonth());
  const [selectedRiIndex, setSelectedRiIndex] = useState(new Date().getDate() - 1);

  // Client info state
  const [clientName, setClientName] = useState('');
  const [clientCountryCode, setClientCountryCode] = useState('+60');
  const [clientPhone, setClientPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'bazi' | 'numerology' | 'western' | 'houses'>('bazi');
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [mainUserId, setMainUserId] = useState<string | null>(null);
  const [currentAnalysisClientId, setCurrentAnalysisClientId] = useState<string | null>(null);
  const [showMainUserPicker, setShowMainUserPicker] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Today's unfinished appointments + active cases
  const todayUnfinishedCount = useMemo(() => {
    const apts = appointments.filter(a => a.status === 'Pending' && a.date === todayStr).length;
    const cs = cases.filter(c => c.status === 'Reviewing' || c.status === 'Executing').length;
    return apts + cs;
  }, [appointments, cases, todayStr]);

  const [lang, setLangState] = useState<AppLanguage>(() => {
    const savedLang = localStorage.getItem('archan_wang_lang');
    return (savedLang === 'en' || savedLang === 'zh') ? savedLang : 'zh';
  });

  const [sharingClient, setSharingClient] = useState<SavedClient | null>(null);

  // Dynamic Profile Generation States (On-Demand Computing & Memory Optimization)
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  const [profileProgress, setProfileProgress] = useState(0);
  const [profileStepText, setProfileStepText] = useState('');
  const [targetLoadingClient, setTargetLoadingClient] = useState<SavedClient | null>(null);

  const handleSetLang = (newLang: AppLanguage) => {
    setLangState(newLang);
    localStorage.setItem('archan_wang_lang', newLang);
  };

  // Load clients, cases, notes, appointments from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('archan_wang_clients');
    const mainId = localStorage.getItem('archan_wang_main_user_id');
    const savedCases = localStorage.getItem('archan_wang_cases');
    const savedNotes = localStorage.getItem('archan_wang_notes');
    const savedAppointments = localStorage.getItem('archan_wang_appointments');

    if (saved) {
      try {
        setSavedClients(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing clients", e);
      }
    }
    if (mainId) setMainUserId(mainId);

    if (savedCases) {
      try {
        setCases(JSON.parse(savedCases));
      } catch (e) {
        console.error("Error parsing cases", e);
      }
    }

    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Error parsing notes", e);
      }
    }

    if (savedAppointments) {
      try {
        const parsedApts = JSON.parse(savedAppointments);
        setAppointments(parsedApts);
      } catch (e) {
        console.error("Error parsing appointments", e);
      }
    }
  }, []);

  const saveToLocalStorage = (updatedClients: SavedClient[]) => {
    localStorage.setItem('archan_wang_clients', JSON.stringify(updatedClients));
    setSavedClients(updatedClients);
  };

  const handleSaveCase = (caseItem: CaseItem) => {
    setCases(prev => {
      const exists = prev.some(c => c.id === caseItem.id);
      const updated = exists 
        ? prev.map(c => c.id === caseItem.id ? caseItem : c)
        : [caseItem, ...prev];
      localStorage.setItem('archan_wang_cases', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCase = (caseId: string) => {
    setCases(prev => {
      const updated = prev.filter(c => c.id !== caseId);
      localStorage.setItem('archan_wang_cases', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveNote = (noteItem: NoteItem) => {
    setNotes(prev => {
      const exists = prev.some(n => n.id === noteItem.id);
      const updated = exists
        ? prev.map(n => n.id === noteItem.id ? noteItem : n)
        : [noteItem, ...prev];
      localStorage.setItem('archan_wang_notes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => {
      const updated = prev.filter(n => n.id !== noteId);
      localStorage.setItem('archan_wang_notes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveAppointment = (aptItem: AppointmentItem) => {
    setAppointments(prev => {
      const exists = prev.some(a => a.id === aptItem.id);
      const updated = exists
        ? prev.map(a => a.id === aptItem.id ? aptItem : a)
        : [aptItem, ...prev];
      localStorage.setItem('archan_wang_appointments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteAppointment = (aptId: string) => {
    setAppointments(prev => {
      const updated = prev.filter(a => a.id !== aptId);
      localStorage.setItem('archan_wang_appointments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRestoreData = (backup: BackupData, mode: 'overwrite' | 'merge') => {
    if (mode === 'overwrite') {
      const newClients = backup.clients || [];
      const newCases = backup.cases || [];
      const newNotes = backup.notes || [];
      const newAppointments = backup.appointments || [];
      const newMainId = backup.mainUserId || null;

      setSavedClients(newClients);
      setCases(newCases);
      setNotes(newNotes);
      setAppointments(newAppointments);
      setMainUserId(newMainId);

      localStorage.setItem('archan_wang_clients', JSON.stringify(newClients));
      localStorage.setItem('archan_wang_cases', JSON.stringify(newCases));
      localStorage.setItem('archan_wang_notes', JSON.stringify(newNotes));
      localStorage.setItem('archan_wang_appointments', JSON.stringify(newAppointments));
      if (newMainId) {
        localStorage.setItem('archan_wang_main_user_id', newMainId);
      } else {
        localStorage.removeItem('archan_wang_main_user_id');
      }
    } else {
      setSavedClients(prevClients => {
        const clientMap = new Map<string, SavedClient>();
        prevClients.forEach(c => clientMap.set(c.id, c));
        (backup.clients || []).forEach(c => clientMap.set(c.id, c));
        const merged = Array.from(clientMap.values());
        localStorage.setItem('archan_wang_clients', JSON.stringify(merged));
        return merged;
      });

      setCases(prevCases => {
        const caseMap = new Map<string, CaseItem>();
        prevCases.forEach(c => caseMap.set(c.id, c));
        (backup.cases || []).forEach(c => caseMap.set(c.id, c));
        const merged = Array.from(caseMap.values());
        localStorage.setItem('archan_wang_cases', JSON.stringify(merged));
        return merged;
      });

      setNotes(prevNotes => {
        const noteMap = new Map<string, NoteItem>();
        prevNotes.forEach(n => noteMap.set(n.id, n));
        (backup.notes || []).forEach(n => noteMap.set(n.id, n));
        const merged = Array.from(noteMap.values());
        localStorage.setItem('archan_wang_notes', JSON.stringify(merged));
        return merged;
      });

      setAppointments(prevApts => {
        const aptMap = new Map<string, AppointmentItem>();
        prevApts.forEach(a => aptMap.set(a.id, a));
        (backup.appointments || []).forEach(a => aptMap.set(a.id, a));
        const merged = Array.from(aptMap.values());
        localStorage.setItem('archan_wang_appointments', JSON.stringify(merged));
        return merged;
      });
    }
  };

  const handleClearAllData = () => {
    setSavedClients([]);
    setCases([]);
    setNotes([]);
    setAppointments([]);
    setMainUserId(null);
    localStorage.removeItem('archan_wang_clients');
    localStorage.removeItem('archan_wang_cases');
    localStorage.removeItem('archan_wang_notes');
    localStorage.removeItem('archan_wang_appointments');
    localStorage.removeItem('archan_wang_main_user_id');
  };

  const setAsMainUser = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMainUserId(id);
    localStorage.setItem('archan_wang_main_user_id', id);
  };

  const handleSaveAndAnalyze = async () => {
    if (!clientName || !clientPhone) {
      alert("请填写姓名和电话 (Name and Phone are compulsory)");
      return;
    }

    setIsSaving(true);
    const formattedPhone = combinePhoneNumber(clientCountryCode, clientPhone);
    let targetClient: SavedClient;
    
    if (editingClientId) {
      // Update existing client
      const updated = savedClients.map(c => {
        if (c.id === editingClientId) {
          const u = {
            ...c,
            name: clientName,
            phone: formattedPhone,
            birthDate: birthDate,
            birthTime: birthTime,
            latitude: latitude,
            longitude: longitude,
            gender: gender === 1 ? 'male' : 'female' as 'male' | 'female',
          };
          targetClient = u;
          return u;
        }
        return c;
      });
      saveToLocalStorage(updated);
    } else {
      // Create new client
      const newClient: SavedClient = {
        id: crypto.randomUUID(),
        name: clientName,
        phone: formattedPhone,
        birthDate: birthDate,
        birthTime: birthTime,
        latitude: latitude,
        longitude: longitude,
        gender: gender === 1 ? 'male' : 'female',
        createdAt: Date.now(),
      };
      targetClient = newClient;
      const updated = [newClient, ...savedClients];
      saveToLocalStorage(updated);
    }

    setIsSaving(false);
    setEditingClientId(null);

    // On-demand destiny generation with loading bar to avoid phone lag
    setIsGeneratingProfile(true);
    setTargetLoadingClient(targetClient!);
    setProfileProgress(15);
    setProfileStepText(lang === 'zh' ? '正在建立档案并初始化排盘引擎...' : 'Initializing destiny engine...');

    await new Promise(r => setTimeout(r, 280));
    setProfileProgress(45);
    setProfileStepText(lang === 'zh' ? '正在推算八字原局、四柱神煞与大运...' : 'Computing Bazi pillars & Dayun...');

    await new Promise(r => setTimeout(r, 320));
    setProfileProgress(75);
    setProfileStepText(lang === 'zh' ? '正在解算数字学矩阵与流年流月...' : 'Calculating Numerology & yearly cycles...');

    await new Promise(r => setTimeout(r, 320));
    setProfileProgress(92);
    setProfileStepText(lang === 'zh' ? '正在解算西洋占星星历与行星相位...' : 'Computing Western astrological chart...');

    await new Promise(r => setTimeout(r, 280));
    setProfileProgress(100);
    setProfileStepText(lang === 'zh' ? '命盘档案生成完成！' : 'Destiny profile generated!');

    await new Promise(r => setTimeout(r, 300));
    setCurrentAnalysisClientId(targetClient!.id);
    setView('analyze');
    setIsGeneratingProfile(false);
    setTargetLoadingClient(null);
  };

  const deleteClient = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedClients.filter(c => c.id !== id);
    saveToLocalStorage(updated);
  };

  const loadClient = async (client: SavedClient) => {
    // On-demand async destiny profile loading with progress bar (saves memory & prevents mobile lag)
    setIsGeneratingProfile(true);
    setTargetLoadingClient(client);
    setProfileProgress(15);
    setProfileStepText(lang === 'zh' ? '正在读取档案并初始化排盘引擎...' : 'Reading client record & initializing...');

    await new Promise(r => setTimeout(r, 280));
    setProfileProgress(42);
    setProfileStepText(lang === 'zh' ? '正在推算八字原局、四柱神煞与大运...' : 'Computing Bazi pillars, shensha & Dayun...');

    await new Promise(r => setTimeout(r, 320));
    setProfileProgress(72);
    setProfileStepText(lang === 'zh' ? '正在生成数字学矩阵与流年运势...' : 'Calculating Numerology matrix & yearly energy...');

    await new Promise(r => setTimeout(r, 320));
    setProfileProgress(92);
    setProfileStepText(lang === 'zh' ? '正在解算西洋占星星历与行星相位...' : 'Resolving Western astrological ephemeris & aspects...');

    // Apply values on-demand with country code parsing
    const parsedPhone = parsePhoneNumber(client.phone, '+60');
    setClientName(client.name);
    setClientCountryCode(parsedPhone.countryCode);
    setClientPhone(parsedPhone.nationalNumber);
    setBirthDate(client.birthDate);
    setBirthTime(client.birthTime);
    setLatitude(client.latitude || 3.1390);
    setLongitude(client.longitude || 101.6869);
    setGender(client.gender === 'male' ? 1 : 0);
    setEditingClientId(null);
    setCurrentAnalysisClientId(client.id);

    await new Promise(r => setTimeout(r, 280));
    setProfileProgress(100);
    setProfileStepText(lang === 'zh' ? '命盘档案生成完成！' : 'Profile generated successfully!');

    await new Promise(r => setTimeout(r, 300));
    setView('analyze');
    setIsGeneratingProfile(false);
    setTargetLoadingClient(null);
  };

  const editClient = (client: SavedClient, e: React.MouseEvent) => {
    e.stopPropagation();
    const parsedPhone = parsePhoneNumber(client.phone, '+60');
    setClientName(client.name);
    setClientCountryCode(parsedPhone.countryCode);
    setClientPhone(parsedPhone.nationalNumber);
    setBirthDate(client.birthDate);
    setBirthTime(client.birthTime);
    setLatitude(client.latitude || 3.1390);
    setLongitude(client.longitude || 101.6869);
    setGender(client.gender === 'male' ? 1 : 0);
    setEditingClientId(client.id);
    setView('form');
  };

  const resetForm = () => {
    setClientName('');
    setClientCountryCode('+60');
    setClientPhone('');
    setBirthDate('1990-05-20');
    setBirthTime('10:30');
    setLatitude(3.1390);
    setLongitude(101.6869);
    setGender(1);
    setEditingClientId(null);
    setView('form');
  };

  const filteredClients = savedClients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  // --- Western Astrology Calculation ---
  const westernData = useMemo(() => {
    try {
    const [y, m, d] = birthDate.split('-').map(Number);
    const [hh, mm] = birthTime.split(':').map(Number);
    
    // Construct UTC date correctly independent of local browser time
    // date = inputTime - timezoneOffset
    const date = new Date(Date.UTC(y, m - 1, d, hh - timezone, mm));
    const time = Astronomy.MakeTime(date);

    const planets = WESTERN_PLANETS.map(p => {
      let lon = 0;
      let isRetrograde = false;
      
      if (p.id === 'Sun') {
        lon = Astronomy.SunPosition(time).elon;
      } else if (p.id === 'Moon') {
        lon = Astronomy.EclipticGeoMoon(time).lon;
      } else {
        const body = (Astronomy.Body as any)[p.id];
        const vec = Astronomy.GeoVector(body, time, true);
        const ecl = Astronomy.Ecliptic(vec);
        lon = ecl.elon;
        
        // Calculate velocity for retrograde check (1 hour later)
        const timeLater = Astronomy.MakeTime(new Date(date.getTime() + 60 * 60 * 1000));
        const vecLater = Astronomy.GeoVector(body, timeLater, true);
        const eclLater = Astronomy.Ecliptic(vecLater);
        
        let diff = eclLater.elon - ecl.elon;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        isRetrograde = diff < 0;
      }
      
      const signIdx = Math.floor(lon / 30);
      const degInSign = lon % 30;
      return { 
        ...p, 
        longitude: lon, 
        signIndex: signIdx, 
        degree: degInSign,
        sign: ZODIAC_SIGNS[signIdx],
        isRetrograde
      };
    });

      // Calculate True Obliquity
      const tilt = Astronomy.e_tilt(time);
      const obl = tilt.tobl * (Math.PI / 180.0);

      // Calculate Ascendant and Midheaven
      const lst = (Astronomy.SiderealTime(time) + longitude / 15.0) % 24; // in hours
      const ramc = (lst * 15.0 * Math.PI) / 180.0;
      const latRad = (latitude * Math.PI) / 180.0;
      
      // MC = Right Ascension of Midheaven on Ecliptic
      let mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(obl));
      mc = (mc * 180.0) / Math.PI;
      mc = (mc + 360) % 360;

      // Ascendant formula
      let asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(obl) + Math.tan(latRad) * Math.sin(obl)));
      asc = (asc * 180.0) / Math.PI;
      asc = (asc + 360) % 360;
      
      const dsc = (asc + 180) % 360;
      const ic = (mc + 180) % 360;
      
      const ascSignIdx = Math.floor(asc / 30);
      const ascDeg = asc % 30;
      const mcSignIdx = Math.floor(mc / 30);
      const mcDeg = mc % 30;
      const icSignIdx = Math.floor(ic / 30);
      const dscSignIdx = Math.floor(dsc / 30);

      // Houses (Whole Sign System - starting from sign of Ascendant)
      const houses = [...Array(12)].map((_, i) => {
        const signIdx = (ascSignIdx + i) % 12;
        return {
          number: i + 1,
          sign: ZODIAC_SIGNS[signIdx],
          startLongitude: signIdx * 30
        };
      });

      // Assign planets to houses
      const planetsWithHouses = planets.map(p => {
        const houseNum = ((p.signIndex - ascSignIdx + 12) % 12) + 1;
        return { ...p, house: houseNum };
      });

      return { 
        planets: planetsWithHouses, 
        asc, ascSign: ZODIAC_SIGNS[ascSignIdx], ascDeg,
        mc, mcSign: ZODIAC_SIGNS[mcSignIdx], mcDeg,
        ic, icSign: ZODIAC_SIGNS[icSignIdx],
        dsc, dscSign: ZODIAC_SIGNS[dscSignIdx],
        houses 
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [birthDate, birthTime, latitude, longitude]);

  const aspects = useMemo(() => {
    if (!westernData) return [];
    const points = [
      ...westernData.planets.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, longitude: p.longitude })),
      { id: 'ASC', name: '上升', symbol: 'ASC', longitude: westernData.asc },
      { id: 'MC', name: '中天', symbol: 'MC', longitude: westernData.mc },
    ];

    const results = [];
    const ASPECT_TYPES = [
      { name: '合相', symbol: '☌', angle: 0, orb: 8, color: 'text-gold' },
      { name: '对分', symbol: '☍', angle: 180, orb: 8, color: 'text-rose-500' },
      { name: '三分', symbol: '△', angle: 120, orb: 8, color: 'text-emerald-500' },
      { name: '四分', symbol: '□', angle: 90, orb: 8, color: 'text-orange-500' },
      { name: '六分', symbol: '⚹', angle: 60, orb: 6, color: 'text-sky-500' },
    ];

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const p1 = points[i];
        const p2 = points[j];
        const diff = Math.abs(p1.longitude - p2.longitude);
        const dist = Math.min(diff, 360 - diff);

        for (const aspect of ASPECT_TYPES) {
          if (Math.abs(dist - aspect.angle) <= aspect.orb) {
            results.push({
              p1, p2, aspect,
              diff: dist
            });
          }
        }
      }
    }
    return results;
  }, [westernData]);

  // --- Core Data Calculation ---
  const data = useMemo<BaziData | null>(() => {
    try {
      const [y, m, d] = birthDate.split('-').map(Number);
      const [hh, mm] = birthTime.split(':').map(Number);
      const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
      const lunar = solar.getLunar();
      const eightChar = lunar.getEightChar();
      const yun = eightChar.getYun(gender);
      return { solar, lunar, eightChar, yun, gender, dayGan: eightChar.getDayGan() };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [birthDate, birthTime, gender]);

  if (!data) return null;

  const { solar, lunar, eightChar, yun } = data;
  const daYunList = yun.getDaYun();
  const currentDaYun = daYunList[selectedDaYunIndex] || daYunList[1];
  const liuNianList = currentDaYun.getLiuNian();
  const currentLiuNian = liuNianList.find((ln: LiuNian) => ln.getYear() === selectedNianYear) || liuNianList[0];
  const liuYueList = currentLiuNian.getLiuYue();
  const currentLiuYue = liuYueList[selectedYueIndex] || liuYueList[0];
  
  // Calculate LiuRi (Days) correctly using Bazi sectional month boundaries (solar terms)
  const liuRiList = useMemo(() => {
    try {
      const year = currentLiuNian.getYear();
      const sectionalNames = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
      
      const findTerm = (y: number, name: string) => {
        const monthMap: Record<string, number> = { '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7, '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 12, '小寒': 1 };
        const m = monthMap[name];
        if (!m) return null;
        // Sectional terms usually fall between 4-8. Search a bit around.
        for (let d = 1; d <= 15; d++) {
          const s = Solar.fromYmd(y, m, d);
          if (s.getLunar().getJieQi() === name) return s;
        }
        return null;
      };

      const startTerm = sectionalNames[selectedYueIndex];
      const endTerm = (selectedYueIndex === 11) ? '立春' : sectionalNames[selectedYueIndex + 1];
      const endYear = (selectedYueIndex === 11) ? year + 1 : year;

      let startSolar = findTerm(year, startTerm);
      let endSolar = findTerm(endYear, endTerm);

      // Fallbacks if terms not found (extremely rare)
      if (!startSolar) startSolar = Solar.fromYmd(year, (selectedYueIndex + 1) % 12 + 1, 4);
      if (!endSolar) endSolar = Solar.fromYmd(endYear, (selectedYueIndex + 2) % 12 + 1, 4);

      const list = [];
      let curr = startSolar;
      const limit = 35; // A Bazi month is roughly 30 days
      let count = 0;
      
      while (curr.getJulianDay() < endSolar.getJulianDay() && count < limit) {
        const l = curr.getLunar();
        list.push({
          getDay: () => curr.getDay(),
          getGanZhi: () => l.getEightChar().getDay(),
          getLunarDay: () => l.getDayInChinese() // This returns "初一", "初二" etc. correctly
        });
        curr = curr.next(1);
        count++;
      }
      return list;
    } catch (e) {
      console.error("LiuRi Calculation Error:", e);
      return [{ getDay: () => 1, getGanZhi: () => "甲子", getLunarDay: () => "初一" }];
    }
  }, [currentLiuNian, selectedYueIndex]);

  const currentLiuRi = liuRiList[selectedRiIndex] || liuRiList[0];


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-gold/30 px-4 sm:px-8 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
      <div className="max-w-[800px] mx-auto flex flex-col gap-4">
        
        {/* SIDEBAR NAVIGATION */}
        <AnimatePresence>
          {isSideMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSideMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
              />
              <motion.div 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-[280px] bg-zinc-950 border-r border-zinc-900 z-[101] shadow-2xl p-6 flex flex-col gap-6"
                style={{ paddingTop: 'max(1.5rem, calc(env(safe-area-inset-top, 0px) + 1rem))', paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h1 className="text-base font-bold text-white tracking-wide leading-none">
                      {lang === 'zh' ? '阿赞旺命理' : 'ACW Destiny'}
                    </h1>
                    <span className="text-[10px] text-gold font-bold tracking-[0.2em] uppercase mt-1">ACW Destiny System</span>
                  </div>
                  <button 
                    onClick={() => setIsSideMenuOpen(false)} 
                    className="w-9 h-9 flex items-center justify-center hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-zinc-900/60 border border-zinc-900 rounded-xl">
                  <span className="text-xs font-semibold text-zinc-400">
                    {lang === 'zh' ? '系统语言' : 'Language'}
                  </span>
                  <LanguageToggle lang={lang} onToggle={handleSetLang} />
                </div>
                
                <nav className="flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      setView('list');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'list' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-5 h-5" />
                      <span>{lang === 'zh' ? '档案' : 'Archives'}</span>
                    </div>
                    {savedClients.length > 0 && (
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        view === 'list' ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-900 text-gold border border-gold/30"
                      )}>
                        {savedClients.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      setView('appointments');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'appointments' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5" />
                      <span>{lang === 'zh' ? '预约' : 'Appointments'}</span>
                    </div>
                    {appointments.length > 0 && (
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        view === 'appointments' ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-900 text-gold border border-gold/30"
                      )}>
                        {appointments.length}
                      </span>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      setView('cases');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'cases' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="w-5 h-5" />
                      <span>{lang === 'zh' ? '个案' : 'Cases'}</span>
                    </div>
                    {cases.length > 0 && (
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        view === 'cases' ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-900 text-gold border border-gold/30"
                      )}>
                        {cases.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      setView('notes');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'notes' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5" />
                      <span>{lang === 'zh' ? '笔记' : 'Notes'}</span>
                    </div>
                    {notes.length > 0 && (
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        view === 'notes' ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-900 text-gold border border-gold/30"
                      )}>
                        {notes.length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => {
                      setView('backup');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'backup' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <Database className="w-5 h-5" />
                    <span>{lang === 'zh' ? '备份' : 'Backup'}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setView('settings');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'settings' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <Settings className="w-5 h-5" />
                    <span>{lang === 'zh' ? '设置' : 'Settings'}</span>
                  </button>

                  {/* 待办提醒 placed at the very bottom of the sidebar menu */}
                  <button 
                    onClick={() => {
                      setIsSideMenuOpen(false);
                      setIsNotificationOpen(true);
                    }}
                    className="flex items-center justify-between p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500/50 mt-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-gold" />
                      <span>{lang === 'zh' ? '待办提醒' : 'Notifications'}</span>
                    </div>
                    {todayUnfinishedCount > 0 && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 border border-amber-400 shadow-sm animate-pulse">
                        {todayUnfinishedCount}
                      </span>
                    )}
                  </button>
                </nav>

                <div className="mt-auto pt-6 border-t border-zinc-900">
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4 pl-4 text-center">ARCHAN WANG 阿赞旺</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* VIEW 1: CLIENT LIST (FRONT PAGE) */}
        {view === 'list' && (
          <div className="flex flex-col gap-4 relative">
            <header 
              className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-12 pb-2.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between mb-2 shadow-lg"
              style={{ paddingTop: 'max(3rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))' }}
            >
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setIsSideMenuOpen(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95 shrink-0"
                  title="菜单 (Menu)"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-wide leading-none">
                    {lang === 'zh' ? '阿赞旺命理' : 'ACW Destiny'}
                  </h1>
                  <span className="text-xs text-gold font-bold px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30">
                    {savedClients.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Bell Icon Notification Button: Larger, Gold & Eye-catching for Archives only */}
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500/20 to-yellow-600/10 hover:from-amber-500/30 hover:to-yellow-500/20 border border-gold/60 hover:border-gold text-gold hover:text-yellow-300 transition-all active:scale-95 shrink-0 flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(234,179,8,0.22)] group"
                  title={lang === 'zh' ? `待办提醒（今日 ${todayUnfinishedCount} 项待办）` : `Notifications (${todayUnfinishedCount} pending)`}
                >
                  <Bell className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
                  {todayUnfinishedCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-400 text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-md animate-pulse">
                      {todayUnfinishedCount}
                    </span>
                  )}
                </button>

                <LanguageToggle lang={lang} onToggle={handleSetLang} />
              </div>
            </header>

            {/* MAIN USER DASHBOARD */}
            {(() => {
              const mainUser = savedClients.find(c => c.id === mainUserId);
              if (!mainUser) {
                return (
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-[320px] bg-zinc-900/40 border border-zinc-800 border-dashed p-4 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                        <User className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-zinc-400">尚未设置个人主页</p>
                      
                      <button 
                        onClick={() => setShowMainUserPicker(true)}
                        className="px-4 py-2 bg-gold/10 hover:bg-gold text-gold hover:text-zinc-950 rounded-lg text-xs font-black uppercase tracking-widest transition-all mt-1 w-full"
                      >
                        从已有档案选择
                      </button>
                    </div>

                    {/* PIKER MODAL */}
                    {showMainUserPicker && (
                      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
                          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                            <h3 className="font-bold text-white">选择个人档案</h3>
                            <button onClick={() => setShowMainUserPicker(false)} className="p-1 hover:bg-zinc-800 rounded-lg">
                              <ChevronLeft className="w-5 h-5 text-zinc-500" />
                            </button>
                          </div>
                          <div className="max-h-[60vh] overflow-y-auto p-2 flex flex-col gap-1">
                            {savedClients.length === 0 ? (
                              <div className="p-8 text-center text-zinc-500 text-sm italic">暂无档案，请先添加。</div>
                            ) : (
                              savedClients.map(client => (
                                <button
                                  key={client.id}
                                  onClick={() => {
                                    setAsMainUser(client.id);
                                    setShowMainUserPicker(false);
                                  }}
                                  className="flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                                >
                                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-gold transition-colors">
                                    <User className="w-5 h-5" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{client.name}</span>
                                    <span className="text-[10px] text-zinc-500">{client.birthDate}</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Calculate Bazi for Main User
              const [y, m, d] = mainUser.birthDate.split('-').map(Number);
              const [hh, mm] = mainUser.birthTime.split(':').map(Number);
              const mSolar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
              const mLunar = mSolar.getLunar();
              const mEightChar = mLunar.getEightChar();
              const mBazi = [mEightChar.getTime(), mEightChar.getDay(), mEightChar.getMonth(), mEightChar.getYear()];

              // Current Bazi
              const nowSolar = Solar.fromDate(new Date());
              const nowLunar = nowSolar.getLunar();
              const nowEightChar = nowLunar.getEightChar();
              const currentBazi = [
                { label: '流年', bazi: nowEightChar.getYear() },
                { label: '流月', bazi: nowEightChar.getMonth() },
                { label: '流日', bazi: nowEightChar.getDay() }
              ];

              // Numerology Calculation for Main User
              const yRoot = getRootDigit(y);
              const mRoot = getRootDigit(m);
              const dRoot = getRootDigit(d);
              const coreNumber = getRootDigit(yRoot + mRoot + dRoot);
              
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth() + 1;
              const currentDay = new Date().getDate();

              const numYear = getRootDigit(coreNumber + getRootDigit(currentYear));
              const numMonth = getRootDigit(coreNumber + getRootDigit(currentYear) + getRootDigit(currentMonth));
              const numDay = getRootDigit(coreNumber + getRootDigit(currentYear) + getRootDigit(currentMonth) + getRootDigit(currentDay));

              return (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[440px] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-4 rounded-2xl shadow-xl flex flex-col gap-3.5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                    <Sparkles className="w-16 h-16 text-gold" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                        <User className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                           <h2 className="text-base font-bold text-white tracking-tight">{mainUser.name}</h2>
                           <Crown className="w-4 h-4 text-gold" />
                        </div>
                        <p className="text-xs font-medium text-zinc-400">{mainUser.birthDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => setMainUserId(null)} 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                        title="取消设置"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          loadClient(mainUser);
                        }}
                        className="px-3.5 py-2 bg-gold/15 hover:bg-gold text-gold hover:text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all min-h-[36px] flex items-center justify-center border border-gold/40 active:scale-95 cursor-pointer"
                      >
                        分析档案
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {/* Bazi Preview */}
                    <div className="bg-zinc-950/40 border border-zinc-800/60 p-2 sm:p-3 rounded-xl flex flex-col gap-2">
                       <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                         <LayoutGrid className="w-3.5 h-3.5 text-gold" /> 本命
                       </span>
                       <div className="grid grid-cols-4 items-center">
                         {mBazi.map((pair, i) => {
                           const labels = ['时柱', '日柱', '月柱', '年柱'];
                           return (
                             <div key={i} className="flex flex-col items-center">
                               <div className="flex flex-col items-center leading-none mb-1">
                                 <span className={cn("text-base sm:text-lg font-serif font-bold", getBaziColorClass(pair[0]))}>{pair[0]}</span>
                                 <span className={cn("text-base sm:text-lg font-serif font-bold", getBaziColorClass(pair[1]))}>{pair[1]}</span>
                               </div>
                               <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap tracking-tight">{labels[i]}</span>
                             </div>
                           );
                         })}
                       </div>
                    </div>

                    {/* Current Energy */}
                    <div className="bg-zinc-950/40 border border-zinc-800/60 p-2 sm:p-3 rounded-xl flex flex-col gap-2">
                       <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                         <Zap className="w-3.5 h-3.5 text-gold" /> 流日
                       </span>
                       <div className="grid grid-cols-3 items-center">
                         {currentBazi.map((item: any, i: number) => (
                           <div key={i} className="flex flex-col items-center">
                             <div className="flex flex-col items-center leading-none mb-1">
                               <span className={cn("text-base sm:text-lg font-serif font-bold", getBaziColorClass(item.bazi[0]))}>{item.bazi[0]}</span>
                               <span className={cn("text-base sm:text-lg font-serif font-bold", getBaziColorClass(item.bazi[1]))}>{item.bazi[1]}</span>
                             </div>
                             <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap tracking-tight">{item.label}</span>
                           </div>
                         ))}
                       </div>
                    </div>

                    {/* Numerology Daily */}
                    <div className="bg-zinc-950/40 border border-zinc-800/60 p-2 sm:p-3 rounded-xl flex flex-col gap-2">
                       <span className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                         <Hash className="w-3.5 h-3.5 text-gold" /> 数字
                       </span>
                        <div className="grid grid-cols-4 items-center">
                          <div className="flex flex-col items-center">
                            <div className="h-[32px] sm:h-[36px] flex items-center justify-center mb-1 leading-none text-center">
                              <span className="text-base sm:text-lg font-black text-white">{coreNumber}</span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap tracking-tight">核心</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="h-[32px] sm:h-[36px] flex items-center justify-center mb-1 leading-none text-center">
                              <span className="text-base sm:text-lg font-black text-white">{numYear}</span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap tracking-tight">流年</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="h-[32px] sm:h-[36px] flex items-center justify-center mb-1 leading-none text-center">
                              <span className="text-base sm:text-lg font-black text-white">{numMonth}</span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap tracking-tight">流月</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="h-[32px] sm:h-[36px] flex items-center justify-center mb-1 leading-none text-center">
                              <span className="text-base sm:text-lg font-black text-white">{numDay}</span>
                            </div>
                            <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap tracking-tight">流日</span>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
              <input 
                type="text"
                placeholder="搜索姓名或电话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-base text-white placeholder:text-zinc-500 focus:border-gold focus:ring-0 transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">档案列表 ({filteredClients.length})</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2.5">
                {filteredClients.map((client) => (
                  <div 
                    key={client.id}
                    className="group bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-2 transition-all shadow-sm"
                  >
                    <button 
                      onClick={() => loadClient(client)}
                      className="flex items-center gap-3.5 flex-1 min-w-0 text-left active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-full bg-zinc-800/90 border border-zinc-700/50 flex items-center justify-center text-zinc-400 group-hover:text-gold transition-colors shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="text-base font-bold text-white mb-1 leading-snug truncate w-full">{client.name}</span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs font-medium text-zinc-400">
                          <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />{client.phone}</span>
                          <span className="flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />{client.birthDate}</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {client.phone && (
                        <a
                          href={buildWhatsAppUrl(client.phone, `您好 ${client.name}，我是王大师命理馆。`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-400 hover:text-[#25D366] hover:bg-emerald-500/10 rounded-xl transition-all active:scale-95 cursor-pointer"
                          title="WhatsApp 联系客户"
                        >
                          <Phone className="w-4 h-4 text-emerald-400" />
                        </a>
                      )}
                      <button 
                        onClick={(e) => editClient(client, e)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-400 hover:text-gold hover:bg-zinc-800/80 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="编辑 (Edit)"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => deleteClient(client.id, e)}
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="删除 (Delete)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => loadClient(client)}
                        className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-gold hover:bg-zinc-800/60 rounded-xl active:scale-90 transition-all cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {filteredClients.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-zinc-600 gap-3">
                    <History className="w-10 h-10 opacity-20" />
                    <p className="text-xs font-bold">暂无匹配档案</p>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={resetForm}
              className="fixed w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-amber-500 to-gold rounded-full shadow-2xl flex items-center justify-center text-zinc-950 hover:opacity-95 hover:scale-105 active:scale-95 transition-all z-50 border-4 border-zinc-950 cursor-pointer"
              style={{ bottom: 'max(2rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))', right: 'max(1.5rem, calc(env(safe-area-inset-right, 0px) + 1rem))' }}
              title="新增客户档案"
            >
              <Plus className="w-8 h-8 text-zinc-950" />
            </button>
          </div>
        )}

        {/* VIEW 2: ADD NEW CLIENT FORM */}
        {view === 'form' && (
          <div className="flex flex-col gap-4">
            <header 
              className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-3 sm:px-8 pt-10 sm:pt-12 pb-2.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between mb-2 shadow-lg"
              style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setView('list')}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {editingClientId 
                    ? (lang === 'zh' ? "修改档案" : "Edit Client") 
                    : (lang === 'zh' ? "添加档案" : "New Client")}
                </h2>
              </div>

              <LanguageToggle lang={lang} onToggle={handleSetLang} />
            </header>

            <div className="bg-zinc-900 border border-zinc-800 p-5 sm:p-6 rounded-2xl shadow-2xl flex flex-col gap-6 mb-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">客户姓名 (Name)*</label>
                  <input 
                    type="text" 
                    placeholder="请输入姓名"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-base text-white focus:border-gold focus:ring-0 transition-all font-bold"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">
                    {lang === 'zh' ? '联系电话 (Phone)*' : 'Phone Number*'}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={clientCountryCode}
                      onChange={(e) => setClientCountryCode(e.target.value)}
                      className="bg-black border border-zinc-800 rounded-xl px-2.5 sm:px-3 py-3.5 text-xs sm:text-sm text-gold font-bold focus:border-gold focus:ring-0 transition-all cursor-pointer shrink-0 max-w-[135px] sm:max-w-[155px]"
                    >
                      {COUNTRY_CODES.map((item) => (
                        <option key={item.code} value={item.code} className="bg-zinc-950 text-white">
                          {item.flag} {item.code} ({lang === 'zh' ? item.nameZh : item.nameEn})
                        </option>
                      ))}
                    </select>
                    <input 
                      type="tel" 
                      placeholder={lang === 'zh' ? "输入电话（如 012-345 6789）" : "e.g. 123456789"}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="flex-1 min-w-0 bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-base text-white focus:border-gold focus:ring-0 transition-all font-bold"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">出生日期 (Date)*</label>
                  <input 
                    type="date" 
                    value={birthDate} 
                    onChange={(e) => setBirthDate(e.target.value)} 
                    className="bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-base text-white focus:border-gold focus:ring-0 transition-all cursor-pointer font-bold" 
                  />
                </div>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex flex-col gap-2 shrink-0">
                      <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">时间 (Time)</label>
                      <input 
                        type="time" 
                        value={birthTime} 
                        onChange={(e) => setBirthTime(e.target.value)} 
                        className="w-32 sm:w-36 bg-black border border-zinc-800 rounded-xl px-2.5 sm:px-3.5 py-3.5 text-sm sm:text-base text-white focus:border-gold focus:ring-0 transition-all cursor-pointer font-bold" 
                      />
                    </div>
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                       <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">时区 (Timezone)</label>
                       <input 
                         type="number" 
                         value={timezone} 
                         onChange={(e) => setTimezone(Number(e.target.value))} 
                         placeholder="+8"
                         className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-sm sm:text-base text-white focus:border-gold focus:ring-0 transition-all font-bold" 
                       />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">性别 (Gender)</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(Number(e.target.value))} 
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-base text-zinc-200 focus:border-gold focus:ring-0 transition-all cursor-pointer font-bold"
                    >
                      <option value={1}>乾造 (男)</option>
                      <option value={0}>坤造 (女)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">纬度 (Latitude)</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={latitude} 
                      onChange={(e) => setLatitude(Number(e.target.value))} 
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-base text-white focus:border-gold focus:ring-0 transition-all font-bold" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">经度 (Longitude)</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={longitude} 
                      onChange={(e) => setLongitude(Number(e.target.value))} 
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-3.5 text-base text-white focus:border-gold focus:ring-0 transition-all font-bold"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSaveAndAnalyze}
                  disabled={isSaving}
                  className={cn(
                    "w-full py-4 min-h-[50px] rounded-xl text-base font-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 cursor-pointer",
                    isSaving ? "bg-zinc-800 text-zinc-600" : "bg-gold text-zinc-950 hover:opacity-90"
                  )}
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? "正在保存..." : (editingClientId ? "保存修改" : "创建并开始分析")}
                </button>
              </div>
            </div>
          )}

        {/* VIEW 3: ANALYSIS VIEW (THE BAZI GRID) */}
        {view === 'analyze' && (
          <div className="flex flex-col gap-4">
            <header 
              className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-3 sm:px-8 pt-10 sm:pt-12 pb-2.5 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between gap-1.5 sm:gap-2 mb-2 shadow-lg"
              style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
            >
              <button 
                onClick={() => {
                  setCurrentAnalysisClientId(null);
                  setView('list');
                }}
                className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-1 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="whitespace-nowrap">{lang === 'zh' ? '返回' : 'Back'}</span>
                <span className="hidden sm:inline whitespace-nowrap">{lang === 'zh' ? '列表' : ''}</span>
              </button>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink min-w-0 flex-nowrap">
                <div className="flex items-center gap-1 sm:gap-1.5 bg-zinc-900 border border-zinc-800 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl h-9 sm:h-10 shrink min-w-0 max-w-[140px] min-[380px]:max-w-[180px] sm:max-w-[280px] md:max-w-[360px] flex-nowrap overflow-hidden">
                  <User className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span 
                    className="font-bold text-white truncate whitespace-nowrap"
                    style={{
                      fontSize: clientName.length > 18 
                        ? 'clamp(9.5px, 2.2vw, 10.5px)' 
                        : clientName.length > 12 
                        ? 'clamp(10.5px, 2.4vw, 11.5px)' 
                        : clientName.length > 7 
                        ? 'clamp(11.5px, 2.6vw, 12.5px)' 
                        : 'clamp(12px, 2.8vw, 14px)'
                    }}
                    title={clientName}
                  >
                    {clientName}
                  </span>
                  <span className="text-[10px] sm:text-xs text-zinc-400 font-medium shrink-0 whitespace-nowrap">({gender === 1 ? (lang === 'zh' ? '男' : 'M') : (lang === 'zh' ? '女' : 'F')})</span>
                  {currentAnalysisClientId && (
                    <button 
                      onClick={() => setAsMainUser(currentAnalysisClientId)}
                      className={cn(
                        "p-0.5 sm:p-1 rounded-lg transition-all cursor-pointer shrink-0",
                        mainUserId === currentAnalysisClientId ? "text-gold" : "text-zinc-500 hover:text-gold"
                      )}
                      title={lang === 'zh' ? "设为本人" : "Set Main User"}
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const targetClient = savedClients.find(c => c.id === currentAnalysisClientId) || {
                      id: currentAnalysisClientId || 'temp',
                      name: clientName,
                      phone: clientPhone || '',
                      birthDate,
                      birthTime,
                      gender: gender === 1 ? 'male' : 'female',
                      createdAt: Date.now()
                    };
                    setSharingClient(targetClient);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-gold hover:from-amber-400 hover:to-yellow-400 text-zinc-950 rounded-xl flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
                  title={lang === 'zh' ? '分享 PDF 档案' : 'Share PDF Report'}
                >
                  <Share2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>

                <LanguageToggle lang={lang} onToggle={handleSetLang} />
              </div>
            </header>

            {/* Summary Information Table */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-zinc-900/60 border border-zinc-800 p-3.5 sm:p-5 rounded-2xl shadow-lg">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-normal uppercase truncate">姓名 (Name)</span>
                <span 
                  className="font-bold text-white truncate whitespace-nowrap"
                  style={{
                    fontSize: clientName.length > 16 
                      ? '12px' 
                      : clientName.length > 10 
                      ? '13px' 
                      : '15px'
                  }}
                  title={clientName}
                >
                  {clientName}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-normal uppercase truncate">岁数 (Age)</span>
                <span className="text-sm sm:text-base font-bold text-gold">{calculateWesternAge(birthDate)} 岁</span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-normal uppercase truncate">生日日期 (阳历 Solar)</span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-200 leading-snug break-words">{solar.toYmd()} {birthTime}</span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-normal uppercase truncate">生日日期 (农历 Lunar)</span>
                <span className="text-xs sm:text-sm font-semibold text-zinc-200 leading-snug break-words">{lunar.toString()} ({lunar.getYearInGanZhi()}年)</span>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 shadow-inner">
              <button 
                onClick={() => setActiveTab('bazi')}
                className={cn(
                  "min-h-[44px] py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'bazi' ? "bg-gold text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <Zap className="w-4 h-4" />
                八字
              </button>
              <button 
                onClick={() => setActiveTab('numerology')}
                className={cn(
                  "min-h-[44px] py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'numerology' ? "bg-gold text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <Hash className="w-4 h-4" />
                数字学
              </button>
              <button 
                onClick={() => setActiveTab('western')}
                className={cn(
                  "min-h-[44px] py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'western' ? "bg-gold text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <Star className="w-4 h-4" />
                占星
              </button>
              <button 
                onClick={() => setActiveTab('houses')}
                className={cn(
                  "min-h-[44px] py-2.5 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'houses' ? "bg-gold text-zinc-950 shadow-lg" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                十二命宫
              </button>
            </div>

            {activeTab === 'bazi' ? (
              <div className="flex flex-col gap-4">
                {/* 1. ORIGINAL BAZI CHART (Standard Natal) */}
                <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
                  {/* Row 1: Headers */}
                  <div className="flex bg-zinc-800 border-b border-zinc-700 h-10 sm:h-12">
                    <div className="w-12 sm:w-16 flex items-center justify-center text-xs font-bold border-r border-zinc-700 text-zinc-400 whitespace-nowrap">日期</div>
                    {["时柱", "日柱", "月柱", "年柱", "大运", "流年"].map((label, idx) => (
                      <div key={idx} className="flex-1 flex items-center justify-center text-xs font-bold border-r border-zinc-700 last:border-r-0 whitespace-nowrap">{label}</div>
                    ))}
                  </div>

                  {/* Row 2: Age/Year */}
                  <div className="flex bg-zinc-800/40 border-b border-zinc-700 h-12 sm:h-14">
                    <div className="w-12 sm:w-16 flex items-center justify-center text-[10px] font-bold border-r border-zinc-700 leading-tight text-zinc-500">歳<br />年</div>
                    <div className="flex-[4] flex items-center justify-center border-r border-zinc-700 text-center px-1"></div>
                    <div className="flex-1 flex items-center justify-center border-r border-zinc-700 text-center leading-tight">
                      <div className="text-[11px] font-bold text-white">{currentDaYun.getStartAge()}歳<br />{currentDaYun.getStartYear()}</div>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-center leading-tight">
                      <div className="text-[11px] font-bold text-white">{currentLiuNian.getYear() - solar.getYear() + 1}歳<br />{currentLiuNian.getYear()}</div>
                    </div>
                  </div>

                  {/* Row 3: Stems (天干) */}
                  <div className="flex bg-zinc-950 border-b border-zinc-800">
                    <div className="w-12 sm:w-16 flex items-center justify-center text-xs font-bold bg-zinc-900 border-r border-zinc-800">天干</div>
                    {[
                      { label: "时", gan: (eightChar as any).getHour ? (eightChar as any).getHour().substring(0,1) : eightChar.getTime().substring(0,1), ss: eightChar.getTimeShiShenGan() },
                      { label: "日", gan: eightChar.getDayGan(), ss: "日主", isDayMaster: true },
                      { label: "月", gan: eightChar.getMonthGan(), ss: eightChar.getMonthShiShenGan() },
                      { label: "年", gan: eightChar.getYearGan(), ss: eightChar.getYearShiShenGan() },
                      { gan: currentDaYun.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentDaYun.getGanZhi().substring(0,1)) },
                      { gan: currentLiuNian.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentLiuNian.getGanZhi().substring(0,1)) },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex items-center justify-center relative py-4 sm:py-6 border-r border-zinc-800 last:border-r-0">
                        <span className={cn("text-2xl sm:text-4xl font-serif font-bold", getBaziColorClass(item.gan))}>{item.gan}</span>
                        <div className="absolute top-1 right-1 flex flex-col items-center">
                          <span className="text-[11px] font-bold text-zinc-400">{getShiShenShort(item.ss)}</span>
                          {item.isDayMaster && <span className="text-[10px] sm:text-[11px] font-bold text-gold mt-0.5">{gender === 1 ? "男" : "女"}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Row 4: Branches (地支) */}
                  <div className="flex bg-zinc-900/50 border-b border-zinc-800">
                    <div className="w-12 sm:w-16 flex items-center justify-center text-xs font-bold bg-zinc-900 border-r border-zinc-800">地支</div>
                    {[
                      { label: "时", zhi: (eightChar as any).getHour ? (eightChar as any).getHour().substring(1,2) : eightChar.getTime().substring(1,2), sss: eightChar.getTimeShiShenZhi() },
                      { label: "日", zhi: eightChar.getDayZhi(), sss: eightChar.getDayShiShenZhi() },
                      { label: "月", zhi: eightChar.getMonthZhi(), sss: eightChar.getMonthShiShenZhi() },
                      { label: "年", zhi: eightChar.getYearZhi(), sss: eightChar.getYearShiShenZhi() },
                      { zhi: currentDaYun.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentDaYun.getGanZhi().substring(1,2)) },
                      { zhi: currentLiuNian.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentLiuNian.getGanZhi().substring(1,2)) },
                    ].map((item, idx) => (
                      <div key={idx} className="flex-1 flex items-center justify-center relative py-4 sm:py-6 border-r border-zinc-800 last:border-r-0">
                        <span className={cn("text-2xl sm:text-4xl font-serif font-bold", getBaziColorClass(item.zhi))}>{item.zhi}</span>
                        <div className="absolute top-1 right-1 flex flex-col items-end">
                          {item.sss.map((s, i) => <span key={i} className="text-[10px] sm:text-[11px] font-bold text-zinc-500 leading-tight">{getShiShenShort(s)}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Row: 藏干 (Hidden Stems) */}
                  <div className="flex bg-zinc-950/20 border-b border-zinc-800">
                    <div className="w-12 sm:w-16 flex items-center justify-center text-xs font-bold bg-zinc-900 border-r border-zinc-800">藏干</div>
                    {[
                      { zhi: (eightChar as any).getHour ? (eightChar as any).getHour().substring(1,2) : eightChar.getTime().substring(1,2) },
                      { zhi: eightChar.getDayZhi() },
                      { zhi: eightChar.getMonthZhi() },
                      { zhi: eightChar.getYearZhi() },
                      { zhi: currentDaYun.getGanZhi().substring(1,2) },
                      { zhi: currentLiuNian.getGanZhi().substring(1,2) },
                    ].map((item, idx) => {
                      const hides = idx < 4 ? (ZHI_HIDE_GAN[item.zhi] || []) : [];
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-center py-2 sm:py-3 border-r border-zinc-800 last:border-r-0 leading-tight">
                          {hides.map((h, i) => {
                            const ss = SHI_SHEN_MAP[data.dayGan + h] || '';
                            return (
                              <div key={i} className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold">
                                <span className={getBaziColorClass(h)}>{h}</span>
                                <span className="text-zinc-500">({ss})</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Extra Rows: 星运, 自坐, 空亡 */}
                  {[
                    { label: "星运", items: [eightChar.getTimeDiShi(), eightChar.getDayDiShi(), eightChar.getMonthDiShi(), eightChar.getYearDiShi(), "胎", "死"] },
                    { label: "自坐", items: [eightChar.getTimeNaYin(), eightChar.getDayNaYin(), eightChar.getMonthNaYin(), eightChar.getYearNaYin(), "海中金", "剑锋金"] },
                    { label: "空亡", items: [eightChar.getTimeXunKong(), eightChar.getDayXunKong(), eightChar.getMonthXunKong(), eightChar.getYearXunKong(), "申酉", "寅卯"] },
                  ].map((row, rowIdx) => (
                    <div key={rowIdx} className={cn("flex border-b border-zinc-800 bg-zinc-900/30", rowIdx === 2 && "border-b-0")}>
                      <div className="w-12 sm:w-16 flex items-center justify-center text-xs font-bold bg-zinc-900 border-r border-zinc-800">{row.label}</div>
                      {row.items.map((val, colIdx) => {
                        if (colIdx >= 6) return null;
                        return (
                          <div key={colIdx} className="flex-1 flex items-center justify-center py-1 sm:py-2 px-1 text-[10px] sm:text-[11px] text-zinc-400 border-r border-zinc-800 last:border-r-0 text-center">
                            {val}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Secondary Info Bar */}
                <div className="bg-zinc-800 px-3 py-1.5 rounded text-[10px] sm:text-xs flex items-center justify-between font-medium">
                  <div>出生后{yun.getStartYear()}年{yun.getStartMonth()}月开始行大运, 每交大运年{yun.getStartMonth()}月起运(西曆)</div>
                </div>

                {/* SELECTOR GRID (Da Yun & Liu Nian) */}
                <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded shadow-lg overflow-hidden mb-4">
                  
                  {/* Section 1: Da Yun Selector */}
                  <div className="flex flex-col p-1.5">
                    <div className="flex items-center gap-1.5 mb-1 px-0.5">
                        <span className="text-xs text-zinc-100 font-bold uppercase tracking-wider">大運</span>
                        <span className="text-[9px] text-zinc-500 font-bold">起運: {yun.getStartYear()}年{yun.getStartMonth()}月</span>
                    </div>
                    
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 px-0.5">
                        <div className="flex flex-col rounded border border-zinc-800 bg-zinc-950/30 overflow-hidden">
                          <div className="bg-zinc-800/80 text-[10px] font-bold text-white text-center py-1 border-b border-zinc-800 leading-tight">
                              1-{(daYunList[1]?.getStartAge() || 10) - 1}
                          </div>
                          <div className="flex-1 flex flex-col items-center justify-center p-0.5 leading-none">
                              <div className="text-[10px] font-serif font-bold text-zinc-500">小</div>
                              <div className="text-[10px] font-serif font-bold text-zinc-500">運</div>
                          </div>
                        </div>

                        {daYunList.slice(1).map((dy, idx) => {
                          const isActive = selectedDaYunIndex === idx + 1;
                          const gan = dy.getGanZhi().substring(0,1);
                          const zhi = dy.getGanZhi().substring(1,2);
                          return (
                            <button 
                              key={idx}
                              id={`dayun-btn-${idx}`}
                              onClick={() => setSelectedDaYunIndex(idx + 1)}
                              className={cn(
                                "flex flex-col rounded border transition-all cursor-pointer overflow-hidden",
                                isActive ? "bg-gold/10 border-gold ring-1 ring-gold/50" : "bg-zinc-950/40 border-zinc-800"
                              )}
                            >
                              <div className={cn("text-[8px] sm:text-[10px] font-bold text-center py-1 border-b leading-tight transition-colors", isActive ? "bg-gold/20 text-white border-gold/30" : "bg-zinc-800/50 text-white border-zinc-800")}>
                                {dy.getStartAge()}<br className="sm:hidden" />歳
                              </div>
                              <div className="flex flex-col items-center py-0.5 leading-none gap-0">
                                <span className={cn("text-base font-serif font-bold", getBaziColorClass(gan))}>{gan}</span>
                                <span className={cn("text-base font-serif font-bold", getBaziColorClass(zhi))}>{zhi}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="h-px bg-zinc-800/30 w-full" />

                  {/* Section 2: Liu Nian Selector */}
                  <div className="flex flex-col p-1.5">
                    <div className="flex items-center gap-1.5 mb-1 px-0.5">
                        <span className="text-xs text-zinc-100 font-bold uppercase tracking-wider">流年</span>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 px-0.5">
                        {liuNianList.map((ln, idx) => {
                          const isActive = selectedNianYear === ln.getYear();
                          const gan = ln.getGanZhi().substring(0,1);
                          const zhi = ln.getGanZhi().substring(1,2);
                          return (
                            <button 
                              key={idx}
                              id={`liunian-btn-${idx}`}
                              onClick={() => {
                                setSelectedNianYear(ln.getYear());
                                setSelectedYueIndex(0);
                                setSelectedRiIndex(0);
                              }}
                              className={cn(
                                "flex flex-col rounded border transition-all cursor-pointer overflow-hidden",
                                isActive ? "bg-gold/10 border-gold ring-1 ring-gold/50" : "bg-zinc-950/40 border-zinc-800"
                              )}
                            >
                              <div className={cn("text-[10px] font-bold text-center py-1 border-b leading-none transition-colors", isActive ? "bg-gold/20 text-white border-gold/30" : "bg-zinc-800/50 text-white border-zinc-800")}>
                                {ln.getYear()}
                              </div>
                              <div className="flex flex-col items-center py-0.5 leading-none gap-0">
                                <span className={cn("text-lg font-serif font-bold", getBaziColorClass(gan))}>{gan}</span>
                                <span className={cn("text-lg font-serif font-bold", getBaziColorClass(zhi))}>{zhi}</span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* 3. CONSOLIDATED CHART & SELECTOR (The Request: Stick together, unify scrolling) */}
                <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded shadow-lg overflow-hidden mb-6">
                  
                  {/* CHART PART */}
                  <div className="flex flex-col">
                    {/* Row 1: Headers */}
                    <div className="flex bg-zinc-800 border-b border-zinc-700 h-10 sm:h-12">
                      <div className="w-10 shrink-0 flex items-center justify-center text-[10px] font-black border-r border-zinc-700 text-zinc-400 uppercase whitespace-nowrap">日期</div>
                      {["时柱", "日柱", "月柱", "年柱", "大运", "流年", "流月", "流日"].map((label, idx) => (
                        <div key={idx} className="flex-1 flex items-center justify-center text-[10px] font-black border-r border-zinc-700 last:border-r-0 text-zinc-300 uppercase whitespace-nowrap">{label}</div>
                      ))}
                    </div>

                    {/* Row 2: Age/Year */}
                    <div className="flex bg-zinc-950 border-b border-zinc-800 h-12 sm:h-14">
                      <div className="w-10 shrink-0 flex items-center justify-center text-[10px] font-bold border-r border-zinc-800 leading-tight whitespace-pre-wrap text-zinc-500 uppercase">岁\n年</div>
                      {[
                        { val: "*" }, { val: "*" }, { val: "*" }, { val: "*" },
                        { val: `${Math.floor(currentDaYun.getStartAge())}岁\n${currentDaYun.getStartYear()}年` },
                        { val: `${currentLiuNian.getYear() - solar.getYear() + 1}岁\n${currentLiuNian.getYear()}年` },
                        { val: `${currentLiuYue.getIndex() + 1}月` },
                        { val: `${(currentLiuRi as any).getLunarDay ? (currentLiuRi as any).getLunarDay() : ''}\n${currentLiuRi.getDay()}日` },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex items-center justify-center border-r border-zinc-800 text-center leading-tight last:border-r-0">
                          <div className="text-[10px] font-bold text-white whitespace-pre-wrap">{(item as any).val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Row 3: Stems */}
                    <div className="flex bg-zinc-950 border-b border-zinc-900">
                      <div className="w-10 shrink-0 flex items-center justify-center text-[10px] font-bold bg-zinc-900 border-r border-zinc-800 uppercase">天干</div>
                      {[
                        { gan: (eightChar as any).getHour ? (eightChar as any).getHour().substring(0,1) : eightChar.getTime().substring(0,1), ss: eightChar.getTimeShiShenGan() },
                        { gan: eightChar.getDayGan(), ss: "元男" },
                        { gan: eightChar.getMonthGan(), ss: eightChar.getMonthShiShenGan() },
                        { gan: eightChar.getYearGan(), ss: eightChar.getYearShiShenGan() },
                        { gan: currentDaYun.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentDaYun.getGanZhi().substring(0,1)) },
                        { gan: currentLiuNian.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentLiuNian.getGanZhi().substring(0,1)) },
                        { gan: currentLiuYue.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentLiuYue.getGanZhi().substring(0,1)) },
                        { gan: currentLiuRi.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentLiuRi.getGanZhi().substring(0,1)) },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex items-center justify-center relative py-3 border-r border-zinc-800 last:border-r-0">
                          <span className={cn("text-xl sm:text-2xl font-serif font-bold", getBaziColorClass(item.gan))}>{item.gan}</span>
                          <div className="absolute top-0.5 right-0.5 flex flex-col items-center">
                            <span className="text-[8px] sm:text-[9px] font-bold text-zinc-400 leading-none">{getShiShenShort(item.ss)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Row 4: Branches */}
                    <div className="flex bg-zinc-900/50 border-b border-zinc-800">
                      <div className="w-10 shrink-0 flex items-center justify-center text-[10px] font-bold bg-zinc-900 border-r border-zinc-800 uppercase">地支</div>
                      {[
                        { zhi: (eightChar as any).getHour ? (eightChar as any).getHour().substring(1,2) : eightChar.getTime().substring(1,2), sss: eightChar.getTimeShiShenZhi() },
                        { zhi: eightChar.getDayZhi(), sss: eightChar.getDayShiShenZhi() },
                        { zhi: eightChar.getMonthZhi(), sss: eightChar.getMonthShiShenZhi() },
                        { zhi: eightChar.getYearZhi(), sss: eightChar.getYearShiShenZhi() },
                        { zhi: currentDaYun.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentDaYun.getGanZhi().substring(1,2)) },
                        { zhi: currentLiuNian.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentLiuNian.getGanZhi().substring(1,2)) },
                        { zhi: currentLiuYue.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentLiuYue.getGanZhi().substring(1,2)) },
                        { zhi: currentLiuRi.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentLiuRi.getGanZhi().substring(1,2)) },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex items-center justify-center relative py-3 border-r border-zinc-800 last:border-r-0">
                          <span className={cn("text-xl sm:text-2xl font-serif font-bold", getBaziColorClass(item.zhi))}>{item.zhi}</span>
                          <div className="absolute top-0.5 right-0.5 flex flex-col items-end">
                            {item.sss.map((s, i) => <span key={i} className="text-[8px] sm:text-[9px] font-bold text-zinc-500 leading-none">{getShiShenShort(s)}</span>)}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* SELECTOR PART (STUCK BELOW) */}
                  <div className="w-full">
                    <table className="w-full border-collapse table-fixed">
                      <tbody>
                        {/* 流月 Row */}
                        <tr className="bg-zinc-800/80">
                          <td className="w-10 shrink-0 p-2 text-xs font-black text-white border-r border-zinc-700 text-center bg-zinc-900 uppercase">流月</td>
                          {['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'].map((term, idx) => {
                            const isActive = selectedYueIndex === idx;
                            const ly = liuYueList[idx];
                            const gan = ly?.getGanZhi().substring(0,1);
                            const zhi = ly?.getGanZhi().substring(1,2);
                            return (
                              <td 
                                key={idx} 
                                onClick={() => { setSelectedYueIndex(idx); setSelectedRiIndex(0); }}
                                className={cn(
                                  "p-1 border-r border-zinc-800 text-center cursor-pointer transition-colors",
                                  isActive ? "bg-zinc-600 shadow-inner" : "hover:bg-zinc-800/20"
                                )}
                              >
                                <div className="flex flex-col items-center">
                                  <span className={cn("text-[9px] sm:text-[10px] font-bold", isActive ? "text-white" : "text-zinc-500")}>
                                    {term}
                                  </span>
                                  <div className="flex flex-col items-center justify-center leading-none mt-1">
                                    <span className={cn("text-base sm:text-lg font-serif font-black", isActive ? "text-white" : getBaziColorClass(gan))}>{gan}</span>
                                    <span className={cn("text-base sm:text-lg font-serif font-black", isActive ? "text-white" : getBaziColorClass(zhi))}>{zhi}</span>
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                        
                        {/* 流日 Row - Shared Scroll Container for Date & Pillar */}
                        <tr className="bg-zinc-950 border-t border-zinc-800">
                          <td className="w-10 p-2 text-xs font-black text-white border-r border-zinc-800 text-center bg-zinc-900 uppercase">流日</td>
                          <td colSpan={12} className="p-0 border-r border-zinc-800">
                            {/* Unified Scrollable Container */}
                            <div className="flex overflow-x-auto custom-scrollbar-grey w-full scrollbar-gutter-stable">
                                {liuRiList.map((lr, idx) => {
                                  const isActive = selectedRiIndex === idx;
                                  const gan = lr.getGanZhi().substring(0,1);
                                  const zhi = lr.getGanZhi().substring(1,2);
                                  const lunarDayName = lr.getLunarDay();

                                  return (
                                    <div 
                                      key={idx} 
                                      onClick={() => setSelectedRiIndex(idx)}
                                      className={cn(
                                        "min-w-[48px] sm:min-w-[60px] border-r border-zinc-800 cursor-pointer transition-colors shrink-0 flex flex-col items-center py-3",
                                        isActive ? "bg-zinc-600 shadow-inner" : "hover:bg-zinc-800/30"
                                      )}
                                    >
                                      <span className={cn("text-[10px] font-black mb-1.5", isActive ? "text-white" : "text-zinc-600")}>{lunarDayName}</span>
                                      <div className="flex flex-col items-center leading-tight">
                                        <span className={cn("text-xl font-serif font-black", isActive ? "text-white" : getBaziColorClass(gan))}>{gan}</span>
                                        <span className={cn("text-xl font-serif font-black", isActive ? "text-white" : getBaziColorClass(zhi))}>{zhi}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                </div>
            ) : activeTab === 'numerology' ? (

              <div className="flex flex-col gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                  <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Hash className="w-4 h-4 text-white" />
                      数字学 NUMEROLOGY
                    </h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {[
                        { label: '年份', value: birthDate.split('-')[0] || '0', color: 'text-gold' },
                        { label: '月份', value: birthDate.split('-')[1] || '0', color: 'text-gold' },
                        { label: '日期', value: birthDate.split('-')[2] || '0', color: 'text-gold' },
                        { label: '核心数', value: '?', color: 'text-gold' }
                      ].map((item, i) => (
                        <div key={i} className="bg-black/40 border border-zinc-800 p-2 rounded-lg flex flex-col items-center">
                          <span className="text-[10px] text-white font-bold uppercase tracking-tighter mb-1">{item.label}</span>
                          <span className={cn("text-xl font-black", item.color)}>{item.value === '?' ? getRootDigit(birthDate) : item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
                      <table className="w-full border-collapse border border-zinc-800">
                        <thead>
                          <tr className="bg-zinc-800/80">
                            <th className="p-3 border border-zinc-700 text-xs font-black text-white sticky left-0 bg-zinc-800 z-10 min-w-16">类别</th>
                            {[...Array(12)].map((_, i) => (
                              <th key={i} className="p-3 border border-zinc-700 text-xs font-black text-white min-w-10">{i + 1}月</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const coreVal = getRootDigit(birthDate);
                            const currentYear = new Date().getFullYear();
                            
                            const yearVal = (birthDate.split('-')[0] || '').replace(/[^0-9]/g, '');
                            const monthVal = (birthDate.split('-')[1] || '').replace(/[^0-9]/g, '');
                            const dayVal = (birthDate.split('-')[2] || '').replace(/[^0-9]/g, '');
                            const hourOnly = (birthTime.split(':')[0] || '0').replace(/[^0-9]/g, '');
                            
                            const yrRoot = getRootDigit(yearVal);
                            const moRoot = getRootDigit(monthVal);
                            const daRoot = getRootDigit(dayVal);
                            const hrRoot = getRootDigit(hourOnly);

                            let wlth = yrRoot - 1;
                            if (wlth <= 0) wlth = 9;

                            const baseValues = [
                              coreVal, hrRoot, hrRoot, moRoot, daRoot, wlth, 
                              getRootDigit(coreVal + 2), 
                              getRootDigit(daRoot + hrRoot), 
                              getRootDigit(hrRoot + moRoot)
                            ];

                            const matrixRows = [
                              { label: '核心', base: coreVal },
                              { label: '本质', base: hrRoot },
                              { label: '智慧', base: hrRoot },
                              { label: '事业', base: moRoot },
                              { label: '情感', base: daRoot },
                              { label: '财富', base: wlth },
                              { label: '贵人', base: getRootDigit(coreVal + 2) },
                              { label: '挑战', base: getRootDigit(daRoot + hrRoot) },
                              { label: '因果', base: getRootDigit(hrRoot + moRoot) },
                              { label: '流年', type: 'year' },
                              { label: '流月', type: 'month' },
                            ];

                            return matrixRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-zinc-800/30">
                                <td className="p-3 border border-zinc-800 text-xs font-bold text-white sticky left-0 bg-zinc-900/95 z-10">{row.label}</td>
                                {[...Array(12)].map((_, mIdx) => {
                                  const monthNum = mIdx + 1;
                                  const monthlyFlowVal = getRootDigit(coreVal.toString() + currentYear.toString() + monthNum.toString());
                                  const matchesBase = baseValues.includes(monthlyFlowVal);
                                  
                                  let val = 0;
                                  let isMatched = false;

                                  if (row.type === 'year') {
                                    val = getRootDigit(coreVal.toString() + currentYear.toString());
                                  } else if (row.type === 'month') {
                                    val = monthlyFlowVal;
                                    isMatched = matchesBase;
                                  } else {
                                    val = row.base || 0;
                                    isMatched = val === monthlyFlowVal;
                                  }
                                  
                                  return (
                                    <td key={mIdx} className="p-1 border border-zinc-800 text-center">
                                      <div className={cn(
                                        "inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300",
                                        isMatched ? "border-2 border-green-500/50 bg-green-500/10 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : ""
                                      )}>
                                        <span className={cn(
                                          "text-base font-black",
                                          isMatched ? "text-green-500" : (row.type === 'month' ? "text-gold" : "text-white/40")
                                        )}>
                                          {val}
                                        </span>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="py-2 text-left text-xs font-black text-white uppercase tracking-widest">项目</th>
                          <th className="py-2 text-right text-xs font-black text-white uppercase tracking-widest">计算公式</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {(() => {
                            const yearVal = (birthDate.split('-')[0] || '').replace(/[^0-9]/g, '');
                            const monthVal = (birthDate.split('-')[1] || '').replace(/[^0-9]/g, '');
                            const dayVal = (birthDate.split('-')[2] || '').replace(/[^0-9]/g, '');
                            const hourOnly = (birthTime.split(':')[0] || '0').replace(/[^0-9]/g, '');
                            
                            const yearRoot = getRootDigit(yearVal);
                            const monthRoot = getRootDigit(monthVal);
                            const dayRoot = getRootDigit(dayVal);
                            const hourRoot = getRootDigit(hourOnly);

                            // Wealth special: (Root(Year) - 1). 
                            let wealthResult = yearRoot - 1;
                            if (wealthResult <= 0) wealthResult = 9; 

                            const calculations = [
                              { id: 1, label: '核心', formula: '年 + 月 + 日', root: getRootDigit(yearRoot + monthRoot + dayRoot) },
                              { id: 2, label: '本质', formula: `出生时 (${hourOnly}时)`, root: hourRoot },
                              { id: 3, label: '智慧', formula: `出生时 (${hourOnly}时)`, root: hourRoot },
                              { id: 4, label: '事业', formula: '出生月份', root: monthRoot },
                              { id: 5, label: '情感', formula: '出生日', root: dayRoot },
                              { id: 6, label: '财富', formula: '出生年份根数 - 1', root: wealthResult },
                              { id: 7, label: '贵人', formula: '年 + 月 + 日 + 2', root: getRootDigit(yearRoot + monthRoot + dayRoot + 2) },
                              { id: 8, label: '挑战', formula: '出生日 + 出生时', root: getRootDigit(dayRoot + hourRoot) },
                              { id: 9, label: '因果', formula: '出生时 + 出生月', root: getRootDigit(hourRoot + monthRoot) },
                            ];

                            return calculations.map((row) => (
                              <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors">
                                <td className="py-3 text-sm font-bold text-white">
                                  {row.label}
                                </td>
                                <td className="py-3 text-right text-[11px] font-mono text-gold whitespace-nowrap">
                                  {row.formula} = <span className="text-gold font-black text-xl mx-1">{row.root}</span>
                                  <span className="text-white font-black text-xs">({PLANET_MAP[row.root]})</span>
                                </td>
                              </tr>
                            ));
                        })()}
                      </tbody>
                    </table>

                    <div className="mt-6 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">计算备注 (Notes)</p>
                      <ul className="text-xs text-zinc-500 space-y-1 list-disc pl-4">
                        <li>所有计算结果均采用“归元数”法则 (1-9)</li>
                        <li>财富（Wealth）计算：若年份根数为 1，则减 1 归为 9</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'western' ? (
              // WESTERN ASTROLOGY TAB
              <div className="flex flex-col gap-4">
                {westernData && (
                  <>
                    {/* Visual Chart */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                           <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" />
                           <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        </svg>
                      </div>

                      <div className="relative w-72 h-72 sm:w-96 sm:h-96">
                         {/* Circle Background */}
                         <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
                            <defs>
                               <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feGaussianBlur stdDeviation="3" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                               </filter>
                            </defs>
                            
                            {/* Standard orientation: ASC on the left (180 deg) */}
                            {(() => {
                               const offset = westernData.asc - 180;
                               
                               return (
                                  <>
                                     {/* 1. OUTER RINGS */}
                                     {/* Zodiac Outer Border */}
                                     <circle cx="200" cy="200" r="200" className="stroke-zinc-700 fill-none" strokeWidth="1.5" />
                                     {/* Zodiac Inner Border / House Outer Border */}
                                     <circle cx="200" cy="200" r="160" className="stroke-zinc-800 fill-zinc-950/60" strokeWidth="1" />
                                     {/* House Inner Border / Planet Area Outer Border */}
                                     <circle cx="200" cy="200" r="125" className="stroke-zinc-800 fill-black/40" strokeWidth="1" />
                                     {/* Central Circle */}
                                     <circle cx="200" cy="200" r="35" className="stroke-zinc-800 fill-zinc-950/80" strokeWidth="1" />

                                     {/* 2. ZODIAC SIGNS RING (160-200) */}
                                     {ZODIAC_SIGNS.map((sign, i) => {
                                        const startAngle = i * 30 - offset;
                                        const endAngle = (i + 1) * 30 - offset;
                                        const midAngle = startAngle + 15;
                                        
                                        // Colors based on element - MORE VIBRANT
                                        const elementColors: Record<string, string> = {
                                           'Aries': 'fill-rose-500/30 stroke-rose-400/40',
                                           'Leo': 'fill-rose-500/30 stroke-rose-400/40',
                                           'Sagittarius': 'fill-rose-500/30 stroke-rose-400/40',
                                           'Taurus': 'fill-emerald-500/30 stroke-emerald-400/40',
                                           'Virgo': 'fill-emerald-500/30 stroke-emerald-400/40',
                                           'Capricorn': 'fill-emerald-500/30 stroke-emerald-400/40',
                                           'Gemini': 'fill-amber-500/30 stroke-amber-400/40',
                                           'Libra': 'fill-amber-500/30 stroke-amber-400/40',
                                           'Aquarius': 'fill-amber-500/30 stroke-amber-400/40',
                                           'Cancer': 'fill-sky-500/30 stroke-sky-400/40',
                                           'Scorpio': 'fill-sky-500/30 stroke-sky-400/40',
                                           'Pisces': 'fill-sky-500/30 stroke-sky-400/40',
                                        };
                                        const colorClass = elementColors[sign.eng] || 'fill-zinc-800/30';

                                        // SVG Path for slice
                                        const x1 = 200 + 160 * Math.cos(startAngle * Math.PI / 180);
                                        const y1 = 200 + 160 * Math.sin(startAngle * Math.PI / 180);
                                        const x2 = 200 + 200 * Math.cos(startAngle * Math.PI / 180);
                                        const y2 = 200 + 200 * Math.sin(startAngle * Math.PI / 180);
                                        const x3 = 200 + 200 * Math.cos(endAngle * Math.PI / 180);
                                        const y3 = 200 + 200 * Math.sin(endAngle * Math.PI / 180);
                                        const x4 = 200 + 160 * Math.cos(endAngle * Math.PI / 180);
                                        const y4 = 200 + 160 * Math.sin(endAngle * Math.PI / 180);

                                        const path = `M ${x1} ${y1} L ${x2} ${y2} A 200 200 0 0 1 ${x3} ${y3} L ${x4} ${y4} A 160 160 0 0 0 ${x1} ${y1}`;

                                        // Symbol positioning in center of ring
                                        const sx = 200 + 180 * Math.cos(midAngle * Math.PI / 180);
                                        const sy = 200 + 180 * Math.sin(midAngle * Math.PI / 180);

                                        return (
                                           <g key={i}>
                                              <path d={path} className={colorClass} strokeWidth="1" />
                                              <text 
                                                 x={sx} y={sy} 
                                                 className={cn("font-serif text-2xl font-medium", colorClass.replace('fill-', 'fill-').split(' ')[0])}
                                                 fill="white"
                                                 textAnchor="middle" dominantBaseline="middle"
                                                 style={{ textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>
                                                 {sign.symbol}
                                              </text>
                                           </g>
                                        );
                                     })}

                                     {/* 3. HOUSES RING (130-160) */}
                                     {westernData.houses.map((h, i) => {
                                        const houseStartSign = ZODIAC_SIGNS.findIndex(s => s.eng === h.sign.eng);
                                        const angle = (houseStartSign * 30) - offset;
                                        
                                        // House lines radiating inward to common central area or center
                                        const x1 = 200 + 130 * Math.cos(angle * Math.PI / 180);
                                        const y1 = 200 + 130 * Math.sin(angle * Math.PI / 180);
                                        const x2 = 200 + 160 * Math.cos(angle * Math.PI / 180);
                                        const y2 = 200 + 160 * Math.sin(angle * Math.PI / 180);
                                        
                                        // House numbers in the ring
                                        const midAngle = angle + 15;
                                        const nx = 200 + 145 * Math.cos(midAngle * Math.PI / 180);
                                        const ny = 200 + 145 * Math.sin(midAngle * Math.PI / 180);

                                        return (
                                           <g key={i}>
                                              <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-zinc-800" strokeWidth="1" />
                                              <text 
                                                x={nx} y={ny} 
                                                className="fill-zinc-600 text-[9px] font-black" 
                                                textAnchor="middle" dominantBaseline="middle">
                                                {h.number}
                                              </text>
                                           </g>
                                        );
                                     })}

                                     {/* 4. ASPECT LINES (Inner Area < 125) */}
                                     {aspects.map((asp, idx) => {
                                        const r = 125;
                                        const x1 = 200 + r * Math.cos((asp.p1.longitude - offset) * Math.PI / 180);
                                        const y1 = 200 + r * Math.sin((asp.p1.longitude - offset) * Math.PI / 180);
                                        const x2 = 200 + r * Math.cos((asp.p2.longitude - offset) * Math.PI / 180);
                                        const y2 = 200 + r * Math.sin((asp.p2.longitude - offset) * Math.PI / 180);
                                        
                                        const isHard = asp.aspect.angle === 90 || asp.aspect.angle === 180;
                                        const strokeClass = asp.aspect.color.replace('text-', 'stroke-');
                                        
                                        return (
                                           <line 
                                              key={idx}
                                              x1={x1} y1={y1} x2={x2} y2={y2}
                                              className={cn(isHard ? "opacity-70" : "opacity-40", strokeClass)} 
                                              strokeWidth={isHard ? "2" : "1.2"}
                                              strokeDasharray={asp.aspect.angle === 90 ? "4 2" : "none"}
                                           />
                                        );
                                     })}

                                     {/* 5. PLANETS (Area 130) */}
                                      {(() => {
                                         const positionedPlanets = [...westernData.planets].sort((a, b) => a.longitude - b.longitude);
                                         const labels: { x: number, y: number, symbol: string, id: string, angle: number, isRetrograde: boolean }[] = [];
                                         
                                         positionedPlanets.forEach((p, idx) => {
                                            const baseAngle = (p.longitude - offset) * Math.PI / 180;
                                            let r = 115;
                                            
                                            // Neighbor avoidance
                                            if (idx > 0) {
                                               const prev = positionedPlanets[idx - 1];
                                               if (p.longitude - prev.longitude < 8) {
                                                   r = idx % 2 === 0 ? 115 : 95;
                                               }
                                            }
                                            
                                            const x = 200 + r * Math.cos(baseAngle);
                                            const y = 200 + r * Math.sin(baseAngle);
                                            labels.push({ x, y, symbol: p.symbol, id: p.id, angle: baseAngle, isRetrograde: p.isRetrograde || false });
                                         });

                                         return labels.map((p, i) => (
                                            <g key={i}>
                                               {/* Line from perimeter to planet symbol */}
                                               <line 
                                                 x1={200 + 130 * Math.cos(p.angle)} 
                                                 y1={200 + 130 * Math.sin(p.angle)}
                                                 x2={p.x} y2={p.y}
                                                 className="stroke-zinc-800" strokeWidth="0.5" />
                                               
                                               <circle cx={p.x} cy={p.y} r="2" className="fill-gold" />
                                               <g transform={`translate(${p.x}, ${p.y - 12})`}>
                                                   <text 
                                                     className="fill-white font-serif text-xl" 
                                                     textAnchor="middle" dominantBaseline="middle"
                                                     style={{ textShadow: '0 0 5px rgba(0,0,0,0.8)' }}
                                                     filter="url(#glow)">
                                                     {p.symbol}
                                                   </text>
                                                   {p.isRetrograde && (
                                                       <text 
                                                         x="8" y="4"
                                                         className="fill-rose-500 text-[10px] font-black" 
                                                         textAnchor="start">
                                                         R
                                                       </text>
                                                   )}
                                               </g>
                                            </g>
                                         ));
                                      })()}

                                     {/* 6. MAIN ANGLES (ASC, DSC, MC, IC) */}
                                     {/* ASC line is horizontal 180 to center */}
                                     <line 
                                       x1={200 - 130} y1={200} x2={200 - 190} y2={200} 
                                       className="stroke-emerald-500" strokeWidth="2" />
                                     <text x={200 - 195} y={200} className="fill-emerald-400 text-[10px] font-black" textAnchor="end" dominantBaseline="middle">ASC</text>
                                     
                                     {/* DSC line is horizontal 0 to center */}
                                     <line 
                                       x1={200 + 130} y1={200} x2={200 + 190} y2={200} 
                                       className="stroke-rose-500" strokeWidth="2" />
                                     <text x={200 + 195} y={200} className="fill-rose-400 text-[10px] font-black" textAnchor="start" dominantBaseline="middle">DSC</text>

                                     {/* MC Line */}
                                     {(() => {
                                        const mcAngle = (westernData.mc - offset) * Math.PI / 180;
                                        return (
                                          <>
                                            <line 
                                              x1={200 + 130 * Math.cos(mcAngle)} y1={200 + 130 * Math.sin(mcAngle)}
                                              x2={200 + 190 * Math.cos(mcAngle)} y2={200 + 190 * Math.sin(mcAngle)}
                                              className="stroke-amber-500" strokeWidth="2" />
                                            <text 
                                              x={200 + 195 * Math.cos(mcAngle)} y={200 + 195 * Math.sin(mcAngle)} 
                                              className="fill-amber-400 text-[10px] font-black" 
                                              textAnchor="middle" dominantBaseline="middle">MC</text>
                                          </>
                                        );
                                     })()}

                                     {/* IC Line */}
                                     {(() => {
                                        const icAngle = (westernData.ic - offset) * Math.PI / 180;
                                        return (
                                          <>
                                            <line 
                                              x1={200 + 130 * Math.cos(icAngle)} y1={200 + 130 * Math.sin(icAngle)}
                                              x2={200 + 190 * Math.cos(icAngle)} y2={200 + 190 * Math.sin(icAngle)}
                                              className="stroke-sky-500" strokeWidth="2" />
                                            <text 
                                              x={200 + 195 * Math.cos(icAngle)} y={200 + 195 * Math.sin(icAngle)} 
                                              className="fill-sky-400 text-[10px] font-black" 
                                              textAnchor="middle" dominantBaseline="middle">IC</text>
                                          </>
                                        );
                                     })()}
                                  </>
                               );
                            })()}
                         </svg>
                      </div>

                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold w-full px-2">
                         <div className="flex flex-col items-center p-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-emerald-400">
                            <span className="text-[8px] text-emerald-600 uppercase font-black mb-1">上升 ASC</span>
                            <span>{westernData.ascSign.name} {Math.floor(westernData.ascDeg)}°</span>
                         </div>
                         <div className="flex flex-col items-center p-2 bg-amber-950/20 border border-amber-900/40 rounded-lg text-amber-400">
                            <span className="text-[8px] text-amber-600 uppercase font-black mb-1">中天 MC</span>
                            <span>{westernData.mcSign.name} {Math.floor(westernData.mcDeg)}°</span>
                         </div>
                         <div className="flex flex-col items-center p-2 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-400">
                            <span className="text-[8px] text-rose-600 uppercase font-black mb-1">下降 DSC</span>
                            <span>{westernData.dscSign.name}</span>
                         </div>
                         <div className="flex flex-col items-center p-2 bg-sky-950/20 border border-sky-900/40 rounded-lg text-sky-400">
                            <span className="text-[8px] text-sky-600 uppercase font-black mb-1">天底 IC</span>
                            <span>{westernData.icSign.name}</span>
                         </div>
                      </div>
                    </div>

                    {/* Aspects Section */}
                    {aspects.length > 0 && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                         <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700 flex items-center justify-between">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">相位分析 (Aspects)</span>
                            <span className="text-[9px] font-bold text-zinc-500">共 {aspects.length} 个主要相位</span>
                         </div>
                         <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto custom-scrollbar">
                            {aspects.map((asp, idx) => (
                               <div key={idx} className="bg-black/30 border border-zinc-800/50 p-2 rounded-lg flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                     <span className="text-[11px] font-black text-white">{asp.p1.symbol} {asp.p1.name}</span>
                                     <span className={cn("text-base font-bold", asp.aspect.color)}>{asp.aspect.symbol}</span>
                                     <span className="text-[11px] font-black text-white">{asp.p2.name} {asp.p2.symbol}</span>
                                  </div>
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[8px] font-bold text-zinc-500">{asp.aspect.name}</span>
                                    <span className="text-[8px] font-mono text-zinc-600">Err: {Math.abs(asp.diff - asp.aspect.angle).toFixed(1)}°</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                    )}

                    {/* Planets Table */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                       <div className="bg-zinc-800 px-4 py-2 border-b border-zinc-700">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">行星位置 (Planet Positions)</span>
                       </div>
                       <table className="w-full border-collapse">
                          <thead>
                             <tr className="bg-zinc-900/50 text-[10px] text-zinc-500 font-bold border-b border-zinc-800 text-white">
                                <th className="p-2 text-left">行星</th>
                                <th className="p-2 text-left">落入星座</th>
                                <th className="p-2 text-left">度数</th>
                                <th className="p-2 text-center">宫位</th>
                             </tr>
                          </thead>
                          <tbody>
                             {westernData.planets.map((p, i) => (
                                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                   <td className="p-2 whitespace-nowrap">
                                      <div className="flex items-center gap-2 flex-nowrap">
                                         <span className="text-xl text-gold pb-1 shrink-0">{p.symbol}</span>
                                         <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
                                            <span className="text-sm font-bold text-white whitespace-nowrap">{p.name}</span>
                                            {p.isRetrograde && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/80 font-black uppercase shrink-0 whitespace-nowrap leading-none">Retrograde 逆行</span>}
                                         </div>
                                      </div>
                                   </td>
                                   <td className="p-2 text-xs font-medium text-zinc-300">
                                      {p.sign.name} <span className="text-zinc-500">({p.sign.eng})</span>
                                   </td>
                                   <td className="p-2 text-xs font-mono text-zinc-400">
                                      {Math.floor(p.degree)}° {Math.floor((p.degree % 1) * 60)}'
                                   </td>
                                   <td className="p-2 text-center">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-[10px] font-black text-gold">
                                         {p.house}
                                      </span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === 'houses' ? (
              <div className="flex flex-col gap-4">
                {(() => {
                   const age = getYearAge(birthDate);
                   // Thai astrology often considers the current year as age + 1 (Year of Life)
                   // But since user wants consistency, we will use the same age value for count.
                   const count = age === 0 ? 1 : age; 
                   
                   let targetIndex = 0;
                   if (gender === 1) { // Male: Anti-clockwise starting from bottom middle (index 0)
                      targetIndex = (12 - (count - 1) % 12) % 12;
                   } else { // Female: Clockwise starting from bottom middle (index 0)
                      targetIndex = (count - 1) % 12;
                   }
                   
                   const activeIcon = THAI_DESTINY_SYMBOLS[targetIndex];
                   
                   return (
                     <>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
                              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                                 <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                 <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
                                 <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" />
                              </svg>
                           </div>

                           <div className="relative z-10 flex flex-col items-center">
                              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">泰式命宫巡环</h3>
                              <p className="text-xs text-zinc-500 font-bold">性别: {gender === 1 ? "男 (乾)" : "女 (坤)"} | 当前岁数: <span className="text-gold">{age}</span> 岁</p>
                           </div>

                           {/* The Wheel */}
                           <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                              <div className="absolute inset-0 border-2 border-zinc-800/50 rounded-full" />
                              <div className="absolute inset-4 border border-zinc-700/30 rounded-full" />
                              
                              {/* Central Indicator */}
                              <div className="z-20 w-32 h-32 rounded-full bg-zinc-950 border-4 border-gold/30 flex flex-col items-center justify-center text-center p-4 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                                 {(() => {
                                    const icons: Record<string, any> = {
                                      Mountain, Zap, Sparkles, HeartPulse, Link, ShieldQuestion, Crown, CloudLightning, Trophy, Home, Skull, Shield
                                    };
                                    const IconComp = icons[activeIcon.icon] || Star;
                                    return <IconComp className={cn("w-10 h-10 mb-2", activeIcon.color)} />;
                                 })()}
                                 <span className="text-xs font-black text-white">{activeIcon.name}</span>
                                 <span className="text-[9px] font-bold text-gold/80">{activeIcon.meaning}</span>
                              </div>

                              {/* Decorative Clock in center background */}
                              <div className="absolute inset-0 opacity-10 pointer-events-none p-8">
                                 <svg viewBox="0 0 100 100" className="w-full h-full rotate-90">
                                    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" />
                                    {[...Array(12)].map((_, i) => (
                                       <line key={i} x1="50" y1="2" x2="50" y2="8" transform={`rotate(${i * 30} 50 50)`} stroke="currentColor" strokeWidth="1" />
                                    ))}
                                 </svg>
                              </div>

                              {/* Symbols around the wheel */}
                              {THAI_DESTINY_SYMBOLS.map((sym, i) => {
                                 const angle = 90 + i * 30; // Start 6 o'clock (Chedi)
                                 const rad = 42; // Corrected radius for % positioning
                                 const x = 50 + rad * Math.cos(angle * Math.PI / 180);
                                 const y = 50 + rad * Math.sin(angle * Math.PI / 180);
                                 
                                 const isActive = targetIndex === i;
                                 const icons: Record<string, any> = {
                                    Mountain, Zap, Sparkles, HeartPulse, Link, ShieldQuestion, Crown, CloudLightning, Trophy, Home, Skull, Shield
                                 };
                                 const IconComp = icons[sym.icon] || Star;

                                 return (
                                    <div 
                                      key={i}
                                      className="absolute transition-all duration-700"
                                      style={{ 
                                        left: `${x}%`, 
                                        top: `${y}%`,
                                        transform: 'translate(-50%, -50%)'
                                      }}
                                    >
                                       <div className={cn(
                                          "flex flex-col items-center gap-1 group",
                                          isActive ? "scale-125 z-10" : "opacity-60 grayscale-[0.2]"
                                       )}>
                                          <div className={cn(
                                             "w-10 h-10 rounded-full bg-zinc-900 border flex items-center justify-center transition-all",
                                             isActive ? "border-gold shadow-[0_0_20px_rgba(212,175,55,0.6)] bg-gold/20 scale-110" : "border-zinc-800"
                                          )}>
                                             <IconComp className={cn("w-5 h-5", isActive ? sym.color : "text-zinc-500")} />
                                          </div>
                                          <span className={cn(
                                            "text-[8px] font-black whitespace-nowrap px-1 rounded bg-black/40",
                                            isActive ? "text-gold" : "text-zinc-500"
                                          )}>
                                             {sym.name}
                                          </span>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>

                           {/* Arrows Indicator */}
                           <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest text-zinc-600 border-t border-zinc-800/50 pt-4 w-full justify-center">
                              <div className={cn("flex items-center gap-1.5", gender === 0 && "text-gold")}>
                                 <ChevronLeft className="w-3 h-3" /> หญิง (女) 顺时针
                              </div>
                              <div className={cn("flex items-center gap-1.5", gender === 1 && "text-gold")}>
                                 ชาย (男) 逆时针 <ChevronRight className="w-3 h-3" />
                              </div>
                           </div>
                        </div>

                        {/* Meaning Table */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl mt-4">
                           <div className="bg-zinc-800/80 px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
                              <h3 className="text-xs font-black text-white uppercase tracking-widest">命宫象征含义 (Symbol Meanings)</h3>
                              <Info className="w-3.5 h-3.5 text-zinc-500" />
                           </div>
                           <div className="p-0">
                              <table className="w-full text-left border-collapse">
                                 <thead className="bg-black/20">
                                    <tr className="border-b border-zinc-800">
                                       <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest w-24">象征</th>
                                       <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest">详情解释</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-zinc-800/50">
                                    {THAI_DESTINY_SYMBOLS.map((sym, idx) => (
                                       <tr key={idx} className={cn(
                                          "hover:bg-zinc-800/30 transition-colors",
                                          targetIndex === idx && "bg-gold/5"
                                       )}>
                                          <td className="p-3 flex items-center gap-3">
                                             <div className="w-8 h-8 flex-shrink-0 bg-zinc-800/40 rounded-lg flex items-center justify-center border border-zinc-700/50">
                                                {(() => {
                                                   const icons: Record<string, any> = {
                                                     Mountain, Zap, Sparkles, HeartPulse, Link, ShieldQuestion, Crown, CloudLightning, Trophy, Home, Skull, Shield
                                                   };
                                                   const IconComp = icons[sym.icon] || Star;
                                                   return <IconComp className={cn("w-5 h-5", sym.color)} />;
                                                })()}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className={cn("text-xs font-black", targetIndex === idx ? "text-gold" : "text-zinc-200")}>{sym.name}</span>
                                                <span className="text-[9px] font-bold text-zinc-500">{sym.meaning}</span>
                                             </div>
                                          </td>
                                          <td className="p-3 text-xs text-zinc-400 font-medium leading-relaxed">
                                             {sym.desc}
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </>
                   );
                })()}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* VIEW: APPOINTMENTS */}
      {view === 'appointments' && (
        <AppointmentsView
          appointments={appointments}
          savedClients={savedClients}
          onSaveAppointment={handleSaveAppointment}
          onDeleteAppointment={handleDeleteAppointment}
          onOpenMenu={() => setIsSideMenuOpen(true)}
          onInspectClientBazi={(client) => loadClient(client)}
          lang={lang}
          onToggleLang={handleSetLang}
          cases={cases}
          onSaveCase={handleSaveCase}
          onNavigateToCases={() => setView('cases')}
        />
      )}

      {/* VIEW: PENDING CASES */}
      {view === 'cases' && (
        <PendingCasesView
          cases={cases}
          savedClients={savedClients}
          onSaveCase={handleSaveCase}
          onDeleteCase={handleDeleteCase}
          onOpenMenu={() => setIsSideMenuOpen(true)}
          onInspectClientBazi={(client) => loadClient(client)}
          lang={lang}
          onToggleLang={handleSetLang}
          appointments={appointments}
          onSaveAppointment={handleSaveAppointment}
          onNavigateToAppointments={(date) => setView('appointments')}
        />
      )}

      {/* VIEW: NOTES */}
      {view === 'notes' && (
        <NotesView
          notes={notes}
          onSaveNote={handleSaveNote}
          onDeleteNote={handleDeleteNote}
          onOpenMenu={() => setIsSideMenuOpen(true)}
          lang={lang}
          onToggleLang={handleSetLang}
          profileAvatar={profileAvatar}
          profileName={profileName}
        />
      )}

      {/* VIEW: DATA BACKUP */}
      {view === 'backup' && (
        <BackupView
          savedClients={savedClients}
          cases={cases}
          notes={notes}
          appointments={appointments}
          mainUserId={mainUserId}
          onRestoreData={handleRestoreData}
          onClearAllData={handleClearAllData}
          onOpenMenu={() => setIsSideMenuOpen(true)}
          lang={lang}
          onToggleLang={handleSetLang}
        />
      )}

      {/* VIEW: SETTINGS */}
      {view === 'settings' && (
        <SettingsView
          onOpenMenu={() => setIsSideMenuOpen(true)}
          lang={lang}
          onToggleLang={handleSetLang}
          appointments={appointments}
          profileAvatar={profileAvatar}
          onSaveProfileAvatar={handleSaveProfileAvatar}
          profileName={profileName}
          onSaveProfileName={handleSaveProfileName}
          onNavigateToNotes={() => setView('notes')}
          reportLogo={reportLogo}
          onSaveReportLogo={handleSaveReportLogo}
        />
      )}

      {/* GLOBAL NOTIFICATION MODAL */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        initialDate={todayStr}
        appointments={appointments}
        cases={cases}
        savedClients={savedClients}
        onSaveAppointment={handleSaveAppointment}
        onSaveCase={handleSaveCase}
        onNavigateToAppointments={(date) => {
          setView('appointments');
        }}
        onNavigateToCases={() => setView('cases')}
        onInspectClientBazi={(client) => loadClient(client)}
        lang={lang}
      />

      {/* DESTINY PDF SHARING MODAL */}
      {sharingClient && (
        <PdfShareModal
          client={sharingClient}
          onClose={() => setSharingClient(null)}
          lang={lang}
          reportLogo={reportLogo}
        />
      )}

      {/* DYNAMIC ON-DEMAND PROFILE GENERATION LOADING BAR */}
      {isGeneratingProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-150 text-center">
            {/* Glowing Golden Icon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Loader2 className="w-7 h-7 text-gold animate-spin" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-gold/20 blur-md -z-10 animate-pulse" />
            </div>

            <div className="flex flex-col gap-1 items-center">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-[11px] font-bold">
                <Sparkles className="w-3 h-3" />
                <span>{lang === 'zh' ? '按需生成命盘' : 'On-Demand Generation'}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide mt-1">
                {targetLoadingClient?.name ? (
                  <span>{lang === 'zh' ? `正在生成【${targetLoadingClient.name}】命盘` : `Generating profile for ${targetLoadingClient.name}`}</span>
                ) : (
                  <span>{lang === 'zh' ? '正在生成专属命盘' : 'Generating Destiny Profile'}</span>
                )}
              </h3>
              <p className="text-xs text-gold font-medium min-h-[18px]">
                {profileStepText || (lang === 'zh' ? '正在渲染排盘数据...' : 'Calculating destiny data...')}
              </p>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-700/80 p-[1px]">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-300 ease-out shadow-sm"
                  style={{ width: `${Math.max(10, profileProgress)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-0.5">
                <span className="text-zinc-400">{lang === 'zh' ? '排盘引擎就绪' : 'Engine Ready'}</span>
                <span className="text-gold font-bold">{profileProgress}%</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-left w-full">
              <span className="text-gold font-bold">{lang === 'zh' ? '提示：' : 'Note: '}</span>
              <span>
                {lang === 'zh' 
                  ? '采用实时按需计算，大幅释放手机后台内存占用，杜绝卡顿并提升运行速度。'
                  : 'Computing on-demand to minimize device memory footprint and eliminate lag.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
