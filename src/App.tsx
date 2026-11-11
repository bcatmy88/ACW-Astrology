import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Loader2,
  FileText,
  Check,
  Orbit,
  Compass,
  ChevronDown,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import * as Astronomy from 'astronomy-engine';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { SavedClient, CaseItem, NoteItem, AppointmentItem, BackupData, AppLanguage } from './types';
import { COUNTRY_CODES, parsePhoneNumber, combinePhoneNumber, buildWhatsAppUrl } from './utils/phoneUtils';
import { calculatePillarShenSha, type BaziPillarsContext, type ShenShaItem } from './utils/baziShenSha';
import { 
  calculateTransitPlanets, 
  calculateTransitToNatalAspects, 
  type TransitPlanet, 
  type TransitAspect 
} from './utils/astrologyTransits';
import { calculateSixPillarsTips, type SixPillarsResult } from './utils/baziSixPillars';
import { computeAstrologyMultiChart, type MultiChartResult } from './utils/astrologyMultiCharts';
import PendingCasesView from './components/PendingCasesView';
import NotesView from './components/NotesView';
import BackupView from './components/BackupView';
import AppointmentsView from './components/AppointmentsView';
import SettingsView from './components/SettingsView';
import LanguageToggle from './components/LanguageToggle';
import NotificationModal from './components/NotificationModal';
import PdfShareModal from './components/PdfShareModal';
import LuopanView from './components/LuopanView';

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

// Realtime LiuYue (流月) helper with solar term day awareness (立冬, 大雪, etc.)
const getRealtimeLiuYue = (nowDate: Date = new Date()): string => {
  try {
    const solar = Solar.fromDate(nowDate);
    const lunar = solar.getLunar();
    // wholeDay = true ensures on the day of the solar term (e.g. 立冬), it transitions to the new month
    const currentJie = lunar.getPrevJie(true).getName();
    const sectionalNames = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
    const yueIdx = sectionalNames.indexOf(currentJie);
    const safeIdx = yueIdx >= 0 ? yueIdx : 0;
    
    const yearGan = lunar.getEightChar().getYear().substring(0, 1);
    const monthStartGanMap: Record<string, string> = {
      '甲': '丙', '己': '丙',
      '乙': '戊', '庚': '戊',
      '丙': '庚', '辛': '庚',
      '丁': '壬', '壬': '壬',
      '戊': '甲', '癸': '甲'
    };
    const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const zhis = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
    
    const startGan = monthStartGanMap[yearGan] || '丙';
    const startGanIdx = gans.indexOf(startGan);
    
    const gan = gans[(startGanIdx + safeIdx) % 10];
    const zhi = zhis[safeIdx % 12];
    return `${gan}${zhi}`;
  } catch {
    return '己亥';
  }
};

const ZODIAC_SIGNS = [
  { name: '白羊座', symbol: '♈︎', eng: 'Aries', short: '羊', color: '#f87171' },
  { name: '金牛座', symbol: '♉︎', eng: 'Taurus', short: '牛', color: '#fbbf24' },
  { name: '双子座', symbol: '♊︎', eng: 'Gemini', short: '双', color: '#2dd4bf' },
  { name: '巨蟹座', symbol: '♋︎', eng: 'Cancer', short: '蟹', color: '#60a5fa' },
  { name: '狮子座', symbol: '♌︎', eng: 'Leo', short: '狮', color: '#f87171' },
  { name: '处女座', symbol: '♍︎', eng: 'Virgo', short: '处', color: '#fbbf24' },
  { name: '天秤座', symbol: '♎︎', eng: 'Libra', short: '秤', color: '#2dd4bf' },
  { name: '天蝎座', symbol: '♏︎', eng: 'Scorpio', short: '蝎', color: '#60a5fa' },
  { name: '射手座', symbol: '♐︎', eng: 'Sagittarius', short: '射', color: '#f87171' },
  { name: '摩羯座', symbol: '♑︎', eng: 'Capricorn', short: '摩', color: '#fbbf24' },
  { name: '水瓶座', symbol: '♒︎', eng: 'Aquarius', short: '瓶', color: '#2dd4bf' },
  { name: '双鱼座', symbol: '♓︎', eng: 'Pisces', short: '鱼', color: '#60a5fa' },
];

const ASTROLOGY_HOUSE_MEANINGS: Record<number, string> = {
  1: '外在',
  2: '正财',
  3: '沟通',
  4: '家庭',
  5: '恋爱',
  6: '工作',
  7: '伴侣',
  8: '偏财',
  9: '教育',
  10: '事业',
  11: '社交',
  12: '潜意识',
};

const PLANET_SHORT_CHARS: Record<string, string> = {
  'Sun': '日',
  'Moon': '月',
  'Mercury': '水',
  'Venus': '金',
  'Mars': '火',
  'Jupiter': '木',
  'Saturn': '土',
  'Uranus': '天',
  'Neptune': '海',
  'Pluto': '冥',
  '太阳': '日',
  '月亮': '月',
  '水星': '水',
  '金星': '金',
  '火星': '火',
  '木星': '木',
  '土星': '土',
  '天王星': '天',
  '海王星': '海',
  '冥王星': '冥',
};

const PLANET_CHART_COLORS: Record<string, string> = {
  'Sun': '#fb923c',     // 太阳 orange
  'Moon': '#60a5fa',    // 月亮 blue
  'Mercury': '#34d399', // 水星 mint green
  'Venus': '#fde047',   // 金星 amber
  'Mars': '#f87171',    // 火星 coral red
  'Jupiter': '#fb923c', // 木星 terracotta
  'Saturn': '#d97706',  // 土星 warm amber
  'Uranus': '#22d3ee',  // 天王星 cyan
  'Neptune': '#818cf8', // 海王星 periwinkle
  'Pluto': '#c084fc',   // 冥王星 violet
};

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

const ZODIAC_RULERS: Record<string, { id: string; name: string; symbol: string }> = {
  'Aries': { id: 'Mars', name: '火星', symbol: '♂' },
  'Taurus': { id: 'Venus', name: '金星', symbol: '♀' },
  'Gemini': { id: 'Mercury', name: '水星', symbol: '☿' },
  'Cancer': { id: 'Moon', name: '月亮', symbol: '☽' },
  'Leo': { id: 'Sun', name: '太阳', symbol: '☉' },
  'Virgo': { id: 'Mercury', name: '水星', symbol: '☿' },
  'Libra': { id: 'Venus', name: '金星', symbol: '♀' },
  'Scorpio': { id: 'Pluto', name: '冥王星', symbol: '♇' },
  'Sagittarius': { id: 'Jupiter', name: '木星', symbol: '♃' },
  'Capricorn': { id: 'Saturn', name: '土星', symbol: '♄' },
  'Aquarius': { id: 'Uranus', name: '天王星', symbol: '♅' },
  'Pisces': { id: 'Neptune', name: '海王星', symbol: '♆' },
};

export const ASTRO_CHART_CATEGORIES = [
  {
    category: '个人星盘',
    description: '核心个性与即时天象',
    charts: ['本命盘', '天象盘']
  },
  {
    category: '预测类星盘',
    description: '运势推演与流年流月',
    charts: ['行运盘', '次限盘', '三限盘', '太阳弧推运盘', '法达盘']
  },
  {
    category: '反照盘类',
    description: '岁运周期与回归盘',
    charts: ['太阳反照盘', '月亮反照盘', '太阳反照比较盘', '月亮反照比较盘']
  },
  {
    category: '合盘类',
    description: '双人关系与互动形态',
    charts: ['比较盘', '组合盘', '时空中点盘', '马克思盘']
  },
  {
    category: '合盘类预测',
    description: '双人关系动态推演',
    charts: [
      '次限比较盘',
      '三限比较盘',
      '比较次限盘',
      '比较三限盘',
      '组合次限盘',
      '组合三限盘',
      '时空次限盘',
      '时空三限盘',
      '马克思次限盘',
      '马克思三限盘'
    ]
  },
  {
    category: '特别星盘',
    description: '天文节点与日月交食',
    charts: ['二分二至盘', '日月蚀盘']
  }
];

export const ALL_ASTRO_CHARTS: string[] = ASTRO_CHART_CATEGORIES.flatMap(c => c.charts);

interface DonutSlice {
  label: string;
  count: number;
  color: string;
}

function MiniDonutChart({
  title,
  data,
}: {
  title: string;
  data: DonutSlice[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const size = 68;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-2">
      <div className="text-[11px] font-bold text-zinc-300 tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1">
        <span className="text-gold font-bold">{title}</span>
        <span className="text-[10px] font-mono text-zinc-500">共 {total} 星</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0 w-[68px] h-[68px]">
          <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#27272a"
              strokeWidth={strokeWidth}
            />
            {total > 0 &&
              data.map((item, idx) => {
                if (item.count === 0) return null;
                const sliceLen = (item.count / total) * circumference;
                const strokeDasharray = `${sliceLen} ${circumference}`;
                const strokeDashoffset = -accumulated;
                accumulated += sliceLen;
                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold text-zinc-300 font-mono">
              {total}星
            </span>
          </div>
        </div>

        <div className={cn(
          "flex-1",
          data.length === 4 
            ? "grid grid-cols-2 gap-x-2 gap-y-1.5" 
            : "flex flex-col justify-center gap-1.5"
        )}>
          {data.map((item, idx) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] leading-tight whitespace-nowrap">
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-zinc-300 font-medium">{item.label}</span>
                <span className="text-gold font-bold font-mono text-xs ml-1">{item.count}</span>
                <span className="text-zinc-500 font-mono text-[9px]">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const BAZI_STEMS_BRANCHES = new Set([
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'
]);

const getBaziColorClass = (char: string) => {
  const mapping: Record<string, string> = {
    // 木 (Wood) - 真实生机苍翠松绿
    '甲': 'text-emerald-500', '乙': 'text-emerald-500', '寅': 'text-emerald-500', '卯': 'text-emerald-500',
    // 火 (Fire) - 真实纯正朱砂赤红 (纯正大火红，拒绝偏粉偏玫)
    '丙': 'text-red-500', '丁': 'text-red-500', '巳': 'text-red-500', '午': 'text-red-500',
    // 土 (Earth) - 真实沉稳厚土赭黄 (陶土赭褐，真实厚重)
    '戊': 'text-amber-600', '己': 'text-amber-600', '辰': 'text-amber-600', '戌': 'text-amber-600', '丑': 'text-amber-600', '未': 'text-amber-600',
    // 金 (Metal) - 明显耀眼真金色 (明亮纯金黄，醒目清晰)
    '庚': 'text-yellow-400', '辛': 'text-yellow-400', '申': 'text-yellow-400', '酉': 'text-yellow-400',
    // 水 (Water) - 采用五行能量水字颜色 #38bdf8
    '壬': 'text-[#38bdf8]', '癸': 'text-[#38bdf8]', '亥': 'text-[#38bdf8]', '子': 'text-[#38bdf8]',
  };
  return mapping[char] || 'text-zinc-100';
};

function renderHighlightedTip(tip: string) {
  return (
    <span>
      {tip.split('').map((char, cIdx) => {
        if (BAZI_STEMS_BRANCHES.has(char)) {
          return (
            <span
              key={cIdx}
              className={cn("font-serif font-black", getBaziColorClass(char))}
            >
              {char}
            </span>
          );
        }
        return (
          <span key={cIdx} className="text-white">
            {char}
          </span>
        );
      })}
    </span>
  );
}

const THAI_DESTINY_SYMBOLS = [
  { id: 0, name: "เจดีย์", meaning: "Chedi (Pagoda)", desc: "Peace, success in small things, merit. 成功、平静、功德。", icon: "Mountain", color: "text-emerald-400", image: "/assets/thai_houses/house_0.png" },
  { id: 1, name: "นาคราช", meaning: "Nakkarat (Naga)", desc: "Power, influence, hidden wealth. 权利、影响力、意外之财。", icon: "Zap", color: "text-blue-400", image: "/assets/thai_houses/house_1.png" },
  { id: 2, name: "แม่มด", meaning: "Mae Mod (Sorceress)", desc: "Mystery, charm, hidden dangers. 神秘、魅力、隐藏的危险。", icon: "Sparkles", color: "text-purple-400", image: "/assets/thai_houses/house_2.png" },
  { id: 3, name: "พ่อหมอ", meaning: "Pho Mo (Old Doctor)", desc: "Wisdom, healing, good advice. 智慧、治愈、良言良计。", icon: "HeartPulse", color: "text-rose-400", image: "/assets/thai_houses/house_3.png" },
  { id: 4, name: "คนต้องขอคา", meaning: "Khon Tong Kho Ka (Prisoner)", desc: "Restrictions, legal issues, feeling trapped. 束缚、法律纠纷、感到困顿。", icon: "Link", color: "text-zinc-600", image: "/assets/thai_houses/house_4.png" },
  { id: 5, name: "เทวดาขี่เต่า", meaning: "Thevada Khi Tao (Angel on Turtle)", desc: "Slow progress but steady success. 慢速但稳定的进步、长寿。", icon: "ShieldQuestion", color: "text-amber-400", image: "/assets/thai_houses/house_5.png" },
  { id: 6, name: "ฉัตรทอง", meaning: "Chat Thong (Golden Umbrella)", desc: "Great success, fame, prosperity. 极大的成功、名誉、繁荣。", icon: "Crown", color: "text-gold", image: "/assets/thai_houses/house_6.png" },
  { id: 7, name: "ราหู", meaning: "Rahu", desc: "Obstacles, enemies, sudden changes. 障碍、敌人、突如其来的变化。", icon: "CloudLightning", color: "text-red-500", image: "/assets/thai_houses/house_7.png" },
  { id: 8, name: "ปราสาท", meaning: "Prasat (Palace)", desc: "High status, successful ventures. 高地位、成功的投资、显赫。", icon: "Trophy", color: "text-gold/80", image: "/assets/thai_houses/house_8.png" },
  { id: 9, name: "เรือนหลวง", meaning: "Ruean Luang (Royal House)", desc: "Family stability, properties, honor. 家庭稳定、地产、荣誉。", icon: "Home", color: "text-indigo-400", image: "/assets/thai_houses/house_9.png" },
  { id: 10, name: "คนคอขาด", meaning: "Khon Kho Khat (Beheaded person)", desc: "Danger, accidents, big risks. 危险、意外、巨大风险。", icon: "Skull", color: "text-red-700 font-bold", image: "/assets/thai_houses/house_10.png" },
  { id: 11, name: "ฉัตรเงิน", meaning: "Chat Ngoen (Silver Umbrella)", desc: "Status, success, good protection. 地位、成功、良好的庇护。", icon: "Shield", color: "text-zinc-300", image: "/assets/thai_houses/house_11.png" },
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
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-gold/30 flex flex-col items-center justify-center shadow-lg shrink-0">
              <span className="text-[8px] font-bold text-zinc-500 leading-none">第</span>
              <span className="text-base font-black text-gold leading-none my-0.5">{thaiSymbol.id + 1}</span>
              <span className="text-[8px] font-bold text-zinc-500 leading-none">宫</span>
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
  const [view, setView] = useState<'list' | 'form' | 'analyze' | 'cases' | 'notes' | 'backup' | 'appointments' | 'settings' | 'luopan'>('list');
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
  const [selectedNianYear, setSelectedNianYear] = useState(() => new Date().getFullYear());
  const [numerologyYear, setNumerologyYear] = useState(() => new Date().getFullYear());
  const [selectedYueIndex, setSelectedYueIndex] = useState(() => {
    try {
      const now = Solar.fromDate(new Date());
      const prevJie = now.getLunar().getPrevJie(true).getName();
      const names = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
      const idx = names.indexOf(prevJie);
      return idx >= 0 ? idx : 0;
    } catch {
      return 0;
    }
  });
  const [selectedRiIndex, setSelectedRiIndex] = useState(() => {
    try {
      const today = new Date();
      const nowSolar = Solar.fromDate(today);
      const prevJie = nowSolar.getLunar().getPrevJie(true).getName();
      const names = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
      const yueIdx = names.indexOf(prevJie);
      const safeYue = yueIdx >= 0 ? yueIdx : 0;
      const monthMap: Record<string, number> = { '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7, '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 12, '小寒': 1 };
      const m = monthMap[names[safeYue]];
      const startYear = (safeYue === 11) ? nowSolar.getYear() + 1 : nowSolar.getYear();
      let startSolar = null;
      if (m) {
        for (let d = 1; d <= 15; d++) {
          const s = Solar.fromYmd(startYear, m, d);
          if (s.getLunar().getJieQi() === names[safeYue]) {
            startSolar = s;
            break;
          }
        }
      }
      if (!startSolar) {
        startSolar = Solar.fromYmd(startYear, (safeYue + 1) % 12 + 1, 4);
      }
      const todayOnly = Solar.fromYmd(nowSolar.getYear(), nowSolar.getMonth(), nowSolar.getDay());
      return Math.max(0, Math.min(31, todayOnly.subtract(startSolar)));
    } catch {
      return 0;
    }
  });

  // Transits State (Astrology Tab)
  const [selectedAstroChart, setSelectedAstroChart] = useState<string>('本命盘');
  const [isAstroChartDrawerOpen, setIsAstroChartDrawerOpen] = useState(false);
  const astroChartScrollRef = useRef<HTMLDivElement>(null);

  const handleSelectAstroChart = useCallback((chart: string) => {
    setSelectedAstroChart(chart);
    if (chart === '行运盘') {
      setIsTransitsMode(true);
    } else {
      setIsTransitsMode(false);
    }
    setTimeout(() => {
      const el = document.getElementById(`astro-chart-pill-${chart}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 50);
  }, []);

  const [isTransitsMode, setIsTransitsMode] = useState(false);
  const [transitDate, setTransitDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [transitTime, setTransitTime] = useState('12:00');
  const [selectedHouseIndex, setSelectedHouseIndex] = useState<number | null>(null);

  // Zoom & Pinch & Pan state for Astrological Chart Wheel
  const [chartZoomScale, setChartZoomScale] = useState<number>(1);
  const [chartPanOffset, setChartPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const touchStartCenterRef = useRef<{ x: number; y: number } | null>(null);
  const touchStartPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const singleTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingMouseRef = useRef<boolean>(false);
  const mouseStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

  const clampPan = (val: number, scale: number) => {
    const limit = Math.max(30, (scale - 1) * 160 + 50);
    return Math.max(-limit, Math.min(limit, val));
  };

  const handleChartTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = chartZoomScale;
      touchStartCenterRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      touchStartPanRef.current = { ...chartPanOffset };
      singleTouchStartRef.current = null;
    } else if (e.touches.length === 1 && chartZoomScale > 1.05) {
      singleTouchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchStartPanRef.current = { ...chartPanOffset };
    }
  };

  const handleChartTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null && touchStartCenterRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      const nextScale = Math.min(Math.max(touchStartScaleRef.current * factor, 0.75), 3.0);
      setChartZoomScale(nextScale);

      // Pan offset tracking via midpoint movement
      const currentCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      const dx = currentCenter.x - touchStartCenterRef.current.x;
      const dy = currentCenter.y - touchStartCenterRef.current.y;
      setChartPanOffset({
        x: clampPan(touchStartPanRef.current.x + dx, nextScale),
        y: clampPan(touchStartPanRef.current.y + dy, nextScale),
      });
    } else if (e.touches.length === 1 && singleTouchStartRef.current && chartZoomScale > 1.05) {
      const dx = e.touches[0].clientX - singleTouchStartRef.current.x;
      const dy = e.touches[0].clientY - singleTouchStartRef.current.y;
      setChartPanOffset({
        x: clampPan(touchStartPanRef.current.x + dx, chartZoomScale),
        y: clampPan(touchStartPanRef.current.y + dy, chartZoomScale),
      });
    }
  };

  const handleChartTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = null;
      touchStartCenterRef.current = null;
    }
    if (e.touches.length === 0) {
      singleTouchStartRef.current = null;
    }
  };

  const handleChartMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (chartZoomScale > 1.05) {
      isDraggingMouseRef.current = true;
      mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
      touchStartPanRef.current = { ...chartPanOffset };
    }
  };

  const handleChartMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingMouseRef.current && chartZoomScale > 1.05) {
      const dx = e.clientX - mouseStartPosRef.current.x;
      const dy = e.clientY - mouseStartPosRef.current.y;
      setChartPanOffset({
        x: clampPan(touchStartPanRef.current.x + dx, chartZoomScale),
        y: clampPan(touchStartPanRef.current.y + dy, chartZoomScale),
      });
    }
  };

  const handleChartMouseUp = () => {
    isDraggingMouseRef.current = false;
  };

  const handleChartDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      if (chartZoomScale !== 1 || chartPanOffset.x !== 0 || chartPanOffset.y !== 0) {
        setChartZoomScale(1);
        setChartPanOffset({ x: 0, y: 0 });
      } else {
        setChartZoomScale(1.6);
      }
    }
    lastTapTimeRef.current = now;
  };

  const handleResetChartZoom = () => {
    setChartZoomScale(1);
    setChartPanOffset({ x: 0, y: 0 });
  };

  // Multi-chart Interactive Parameters (推运、反照、合盘参数)
  const [astroTargetDate, setAstroTargetDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [astroTargetTime, setAstroTargetTime] = useState('12:00');
  const [partnerClientId, setPartnerClientId] = useState<string>('');
  const [partnerCustomBirthDate, setPartnerCustomBirthDate] = useState('1995-06-15');
  const [partnerCustomBirthTime, setPartnerCustomBirthTime] = useState('12:00');
  const [partnerCustomName, setPartnerCustomName] = useState('合盘对象');
  const [astroIngressType, setAstroIngressType] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');

  // Client info state
  const [clientName, setClientName] = useState('');
  const [clientCountryCode, setClientCountryCode] = useState('+60');
  const [clientPhone, setClientPhone] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [notesSaveFeedback, setNotesSaveFeedback] = useState(false);
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
            gender: (gender === 1 ? 'male' : 'female') as 'male' | 'female',
            notes: clientNotes.trim() ? clientNotes.trim() : undefined,
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
        notes: clientNotes.trim() ? clientNotes.trim() : undefined,
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
    setClientNotes(client.notes || '');
    setBirthDate(client.birthDate);
    setBirthTime(client.birthTime);
    setLatitude(client.latitude || 3.1390);
    setLongitude(client.longitude || 101.6869);
    setGender(client.gender === 'male' ? 1 : 0);
    setEditingClientId(null);
    setCurrentAnalysisClientId(client.id);
    setNumerologyYear(new Date().getFullYear());
    try {
      const nowToday = new Date();
      const nowSolar = Solar.fromDate(nowToday);
      const prevJie = nowSolar.getLunar().getPrevJie(true).getName();
      const sectionalNames = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
      const yueIdx = sectionalNames.indexOf(prevJie);
      setSelectedNianYear(nowToday.getFullYear());
      setSelectedYueIndex(yueIdx >= 0 ? yueIdx : 0);
    } catch (e) {
      console.error(e);
    }

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
    setClientNotes(client.notes || '');
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
    setClientNotes('');
    setBirthDate('1990-05-20');
    setBirthTime('10:30');
    setLatitude(3.1390);
    setLongitude(101.6869);
    setGender(1);
    setEditingClientId(null);
    setView('form');
  };

  const handleQuickSaveNotes = () => {
    if (!currentAnalysisClientId) return;
    const trimmed = clientNotes.trim();
    const updated = savedClients.map(c => {
      if (c.id === currentAnalysisClientId) {
        return { ...c, notes: trimmed ? trimmed : undefined };
      }
      return c;
    });
    saveToLocalStorage(updated);
    setNotesSaveFeedback(true);
    setTimeout(() => setNotesSaveFeedback(false), 2000);
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
        asc, ascSign: ZODIAC_SIGNS[ascSignIdx], ascDeg, ascSignIdx,
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
      { name: '合相', shortName: '合', symbol: '☌', angle: 0, orb: 8, color: 'text-gold' },
      { name: '对分', shortName: '冲', symbol: '☍', angle: 180, orb: 8, color: 'text-rose-500' },
      { name: '三分', shortName: '拱', symbol: '△', angle: 120, orb: 8, color: 'text-emerald-500' },
      { name: '四分', shortName: '刑', symbol: '□', angle: 90, orb: 8, color: 'text-orange-500' },
      { name: '六分', shortName: '六合', symbol: '⚹', angle: 60, orb: 6, color: 'text-sky-500' },
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

  // Partner info for Synastry & Composite Charts
  const currentPartnerInfo = useMemo(() => {
    if (partnerClientId) {
      const found = savedClients.find(c => c.id === partnerClientId);
      if (found) {
        return {
          name: found.name,
          birthDate: found.birthDate,
          birthTime: found.birthTime,
          timezone: found.timezone ?? timezone,
          latitude: found.latitude ?? latitude,
          longitude: found.longitude ?? longitude
        };
      }
    }
    return {
      name: partnerCustomName || '合盘对象',
      birthDate: partnerCustomBirthDate || '1995-06-15',
      birthTime: partnerCustomBirthTime || '12:00',
      timezone,
      latitude,
      longitude
    };
  }, [partnerClientId, savedClients, partnerCustomName, partnerCustomBirthDate, partnerCustomBirthTime, timezone, latitude, longitude]);

  // Comprehensive Multi-Chart Astronomical Calculation Engine
  const currentAstroChart = useMemo<MultiChartResult | null>(() => {
    try {
      return computeAstrologyMultiChart({
        chartType: selectedAstroChart,
        birthDate,
        birthTime,
        timezone,
        latitude,
        longitude,
        targetDate: selectedAstroChart === '行运盘' ? transitDate : astroTargetDate,
        targetTime: selectedAstroChart === '行运盘' ? transitTime : astroTargetTime,
        partnerBirthDate: currentPartnerInfo.birthDate,
        partnerBirthTime: currentPartnerInfo.birthTime,
        partnerTimezone: currentPartnerInfo.timezone,
        partnerLatitude: currentPartnerInfo.latitude,
        partnerLongitude: currentPartnerInfo.longitude,
        partnerName: currentPartnerInfo.name,
        ingressType: astroIngressType
      });
    } catch (e) {
      console.error('Multi-chart calculation error:', e);
      return null;
    }
  }, [
    selectedAstroChart,
    birthDate,
    birthTime,
    timezone,
    latitude,
    longitude,
    transitDate,
    transitTime,
    astroTargetDate,
    astroTargetTime,
    currentPartnerInfo,
    astroIngressType
  ]);

  // Transits Planetary Positions
  const transitPlanets = useMemo<TransitPlanet[]>(() => {
    if (!westernData) return [];
    return calculateTransitPlanets(transitDate, transitTime, timezone, westernData.ascSignIdx);
  }, [transitDate, transitTime, timezone, westernData]);

  // Transits to Natal Aspects
  const transitAspects = useMemo<TransitAspect[]>(() => {
    if (!westernData || transitPlanets.length === 0) return [];
    const natalPoints = [
      ...westernData.planets.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, longitude: p.longitude })),
      { id: 'ASC', name: '上升', symbol: 'ASC', longitude: westernData.asc },
      { id: 'MC', name: '中天', symbol: 'MC', longitude: westernData.mc },
    ];
    return calculateTransitToNatalAspects(transitPlanets, natalPoints);
  }, [westernData, transitPlanets]);

  // Natal Astrological Energy Distribution (阴阳, 四大元素, 三大性质)
  const astrologyDistribution = useMemo(() => {
    if (!westernData) return null;
    let yangCount = 0;
    let yinCount = 0;
    let fireCount = 0;
    let earthCount = 0;
    let airCount = 0;
    let waterCount = 0;
    let cardinalCount = 0;
    let fixedCount = 0;
    let mutableCount = 0;

    westernData.planets.forEach(p => {
      const s = p.signIndex;
      // 阴阳
      if (s % 2 === 0) yangCount++;
      else yinCount++;

      // 四大元素
      const elem = s % 4;
      if (elem === 0) fireCount++;
      else if (elem === 1) earthCount++;
      else if (elem === 2) airCount++;
      else if (elem === 3) waterCount++;

      // 三大性质
      const mod = s % 3;
      if (mod === 0) cardinalCount++;
      else if (mod === 1) fixedCount++;
      else if (mod === 2) mutableCount++;
    });

    return {
      polarity: [
        { label: '阳性', count: yangCount, color: '#f59e0b' },
        { label: '阴性', count: yinCount, color: '#38bdf8' },
      ],
      elements: [
        { label: '火象', count: fireCount, color: '#ef4444' },
        { label: '土象', count: earthCount, color: '#eab308' },
        { label: '风象', count: airCount, color: '#06b6d4' },
        { label: '水象', count: waterCount, color: '#3b82f6' },
      ],
      modalities: [
        { label: '启动', count: cardinalCount, color: '#f97316' },
        { label: '固定', count: fixedCount, color: '#a855f7' },
        { label: '变动', count: mutableCount, color: '#10b981' },
      ],
    };
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
  const currentDaYun = (daYunList[selectedDaYunIndex] !== undefined)
    ? daYunList[selectedDaYunIndex]
    : (daYunList[1] || daYunList[0]);
  const liuNianList = currentDaYun.getLiuNian();
  const currentLiuNian = liuNianList.find((ln: LiuNian) => ln.getYear() === selectedNianYear) || liuNianList[0];
  const liuYueList = currentLiuNian.getLiuYue();
  const currentLiuYue = liuYueList[selectedYueIndex] || liuYueList[0];

  // XiaoYun for the currently selected year (in childhood or DaYun)
  const currentXiaoYun = useMemo(() => {
    if (!currentDaYun || !currentLiuNian) return null;
    const xyList = currentDaYun.getXiaoYun ? currentDaYun.getXiaoYun() : [];
    return xyList.find((xy: any) => xy.getYear() === currentLiuNian.getYear()) || xyList[0] || null;
  }, [currentDaYun, currentLiuNian]);

  // Effective GanZhi for DaYun / XiaoYun column
  const effectiveDaYunGanZhi = useMemo(() => {
    if (selectedDaYunIndex === 0 && currentXiaoYun) {
      return currentXiaoYun.getGanZhi();
    }
    const gz = currentDaYun?.getGanZhi ? currentDaYun.getGanZhi() : '';
    if (!gz && currentXiaoYun) {
      return currentXiaoYun.getGanZhi();
    }
    return gz;
  }, [selectedDaYunIndex, currentDaYun, currentXiaoYun]);

  const daYunGan = effectiveDaYunGanZhi ? effectiveDaYunGanZhi.substring(0, 1) : '';
  const daYunZhi = effectiveDaYunGanZhi ? effectiveDaYunGanZhi.substring(1, 2) : '';
  
  // 细盘六柱提示 (Six Pillars Deep Analysis: 年、月、日、时、大运、流年 + 流月)
  const sixPillarsTips = useMemo<SixPillarsResult | null>(() => {
    if (!data) return null;
    const { eightChar } = data;
    const suiGan = currentLiuNian ? currentLiuNian.getGanZhi().substring(0, 1) : '';
    const suiZhi = currentLiuNian ? currentLiuNian.getGanZhi().substring(1, 2) : '';
    const yueGan = currentLiuYue ? currentLiuYue.getGanZhi().substring(0, 1) : '';
    const yueZhi = currentLiuYue ? currentLiuYue.getGanZhi().substring(1, 2) : '';

    return calculateSixPillarsTips(
      {
        year: { gan: eightChar.getYearGan(), zhi: eightChar.getYearZhi() },
        month: { gan: eightChar.getMonthGan(), zhi: eightChar.getMonthZhi() },
        day: { gan: eightChar.getDayGan(), zhi: eightChar.getDayZhi() },
        hour: { gan: eightChar.getTimeGan(), zhi: eightChar.getTimeZhi() },
        yun: { gan: daYunGan, zhi: daYunZhi },
        sui: { gan: suiGan, zhi: suiZhi },
      },
      yueGan && yueZhi ? { gan: yueGan, zhi: yueZhi } : undefined
    );
  }, [data, daYunGan, daYunZhi, currentLiuNian, currentLiuYue, selectedYueIndex]);

  // Calculate LiuRi (Days) correctly using Bazi sectional month boundaries (solar terms)
  const liuRiList = useMemo(() => {
    try {
      const year = currentLiuNian.getYear();
      const sectionalNames = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
      
      const findTerm = (y: number, name: string) => {
        const monthMap: Record<string, number> = { '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7, '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 12, '小寒': 1 };
        const m = monthMap[name];
        if (!m) return null;
        for (let d = 1; d <= 15; d++) {
          const s = Solar.fromYmd(y, m, d);
          if (s.getLunar().getJieQi() === name) return s;
        }
        return null;
      };

      const safeYueIndex = Math.max(0, Math.min(11, selectedYueIndex ?? 0));
      const startTerm = sectionalNames[safeYueIndex] || '立春';
      const endTerm = (safeYueIndex === 11) ? '立春' : (sectionalNames[safeYueIndex + 1] || '立春');
      // For month 11 (小寒), both start (小寒) and end (立春) are in the next Gregorian year (year + 1).
      // For month 10 (大雪), start (大雪) is in year, and end (小寒) is in the next Gregorian year (year + 1).
      const startYear = (safeYueIndex === 11) ? year + 1 : year;
      const endYear = (safeYueIndex >= 10) ? year + 1 : year;

      let startSolar = findTerm(startYear, startTerm);
      let endSolar = findTerm(endYear, endTerm);

      // Fallbacks if terms not found (extremely rare)
      if (!startSolar) {
        const m = (safeYueIndex + 1) % 12 + 1;
        startSolar = Solar.fromYmd(startYear, m, 4);
      }
      if (!endSolar) {
        const m = (safeYueIndex + 2) % 12 + 1;
        endSolar = Solar.fromYmd(endYear, m, 4);
      }

      if (startSolar.getJulianDay() >= endSolar.getJulianDay()) {
        endSolar = startSolar.next(30);
      }

      const list = [];
      let curr = startSolar;
      const limit = 35; // A Bazi month is roughly 30 days
      let count = 0;
      
      while (curr.getJulianDay() < endSolar.getJulianDay() && count < limit) {
        const l = curr.getLunar();
        list.push({
          getDay: () => curr.getDay(),
          getGanZhi: () => l.getEightChar().getDay(),
          getLunarDay: () => l.getDayInChinese(),
          getDateStr: () => curr.toYmd()
        });
        curr = curr.next(1);
        count++;
      }

      if (list.length > 0) {
        return list;
      }

      // Safe fallback if loop didn't produce items
      let fallbackCurr = startSolar;
      for (let i = 0; i < 30; i++) {
        const l = fallbackCurr.getLunar();
        list.push({
          getDay: () => fallbackCurr.getDay(),
          getGanZhi: () => l.getEightChar().getDay(),
          getLunarDay: () => l.getDayInChinese(),
          getDateStr: () => fallbackCurr.toYmd()
        });
        fallbackCurr = fallbackCurr.next(1);
      }
      return list;
    } catch (e) {
      console.error("LiuRi Calculation Error:", e);
      return [{ getDay: () => 1, getGanZhi: () => "甲子", getLunarDay: () => "初一", getDateStr: () => "" }];
    }
  }, [currentLiuNian, selectedYueIndex]);

  const defaultLiuRi = {
    getDay: () => 1,
    getGanZhi: () => "甲子",
    getLunarDay: () => "初一",
    getDateStr: () => ""
  };

  const currentLiuRi = (liuRiList && liuRiList.length > 0)
    ? (liuRiList[selectedRiIndex] || liuRiList[0] || defaultLiuRi)
    : defaultLiuRi;

  // Auto-sync Bazi to today's year, month, and day
  const syncBaziToToday = useCallback((overrideData?: BaziData | null) => {
    const targetData = overrideData || data;
    if (!targetData) return;

    try {
      const today = new Date();
      const nowSolar = Solar.fromDate(today);
      const currentYear = nowSolar.getYear();
      const dyList = targetData.yun.getDaYun();

      // 1. Locate which DaYun contains today's year
      let targetDaYunIdx = 1;
      let found = false;
      for (let i = 0; i < dyList.length; i++) {
        const dy = dyList[i];
        if (currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear()) {
          targetDaYunIdx = i;
          found = true;
          break;
        }
      }
      if (!found) {
        if (dyList[1] && currentYear < dyList[1].getStartYear()) {
          targetDaYunIdx = 0;
        } else if (dyList.length > 0) {
          targetDaYunIdx = Math.max(0, dyList.length - 1);
        }
      }

      setSelectedDaYunIndex(targetDaYunIdx);
      setSelectedNianYear(currentYear);

      // 2. Locate current Bazi month index (0 to 11 based on 24 solar terms, with wholeDay = true for term day)
      const prevJie = nowSolar.getLunar().getPrevJie(true).getName();
      const sectionalNames = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
      const yueIdx = sectionalNames.indexOf(prevJie);
      const targetYueIdx = yueIdx >= 0 ? yueIdx : 0;
      setSelectedYueIndex(targetYueIdx);

      // 3. Locate day index in that month
      const findTerm = (y: number, name: string) => {
        const monthMap: Record<string, number> = { '立春': 2, '惊蛰': 3, '清明': 4, '立夏': 5, '芒种': 6, '小暑': 7, '立秋': 8, '白露': 9, '寒露': 10, '立冬': 11, '大雪': 12, '小寒': 1 };
        const m = monthMap[name];
        if (!m) return null;
        for (let day = 1; day <= 15; day++) {
          const s = Solar.fromYmd(y, m, day);
          if (s.getLunar().getJieQi() === name) return s;
        }
        return null;
      };

      const startYear = (targetYueIdx === 11) ? currentYear + 1 : currentYear;
      let startSolar = findTerm(startYear, sectionalNames[targetYueIdx]);
      if (!startSolar) {
        const m = (targetYueIdx + 1) % 12 + 1;
        startSolar = Solar.fromYmd(startYear, m, 4);
      }

      const todayDateOnly = Solar.fromYmd(nowSolar.getYear(), nowSolar.getMonth(), nowSolar.getDay());
      const dayDiff = todayDateOnly.subtract(startSolar);
      const targetRiIdx = Math.max(0, Math.min(31, dayDiff));
      setSelectedRiIndex(targetRiIdx);
    } catch (err) {
      console.error('Failed to sync Bazi to today:', err);
    }
  }, [data]);

  // Synchronize to current year/month/day on tab switch or client switch
  const lastSyncedKeyRef = useRef<string>('');

  useEffect(() => {
    if (activeTab === 'bazi' && data) {
      const key = `${currentAnalysisClientId || 'default'}_${birthDate}_${birthTime}_${gender}_${activeTab}`;
      if (lastSyncedKeyRef.current !== key) {
        lastSyncedKeyRef.current = key;
        syncBaziToToday(data);
      }
    } else if (activeTab !== 'bazi') {
      lastSyncedKeyRef.current = '';
    }
  }, [activeTab, currentAnalysisClientId, birthDate, birthTime, gender, data, syncBaziToToday]);

  // Auto-scroll the active LiuRi item into view
  useEffect(() => {
    const el = document.getElementById(`liuri-item-${selectedRiIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [selectedRiIndex, selectedYueIndex]);

  const { elementsCount, taiYuan, mingGong, shenGong } = useMemo(() => {
    if (!eightChar) {
      return {
        elementsCount: { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 } as Record<string, number>,
        taiYuan: '',
        mingGong: '',
        shenGong: ''
      };
    }
    const counts: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    const allChars = [
      eightChar.getYearGan(), eightChar.getYearZhi(),
      eightChar.getMonthGan(), eightChar.getMonthZhi(),
      eightChar.getDayGan(), eightChar.getDayZhi(),
      eightChar.getTimeGan(), eightChar.getTimeZhi()
    ];
    const charToElem: Record<string, string> = {
      '甲': '木', '乙': '木', '寅': '木', '卯': '木',
      '丙': '火', '丁': '火', '巳': '火', '午': '火',
      '戊': '土', '己': '土', '辰': '土', '戌': '土', '丑': '土', '未': '土',
      '庚': '金', '辛': '金', '申': '金', '酉': '金',
      '壬': '水', '癸': '水', '亥': '水', '子': '水'
    };
    allChars.forEach(c => {
      const el = charToElem[c];
      if (el && counts[el] !== undefined) counts[el]++;
    });

    return {
      elementsCount: counts,
      taiYuan: eightChar.getTaiYuan(),
      mingGong: eightChar.getMingGong(),
      shenGong: eightChar.getShenGong()
    };
  }, [eightChar]);


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
                      setView('luopan');
                      setIsSideMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-xl transition-all font-bold text-sm min-h-[46px] cursor-pointer",
                      view === 'luopan' ? "bg-gold text-zinc-950 shadow-md" : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Compass className="w-5 h-5" />
                      <span>{lang === 'zh' ? '罗盘' : 'Luopan'}</span>
                    </div>
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
                        type="button"
                        onClick={() => setShowMainUserPicker(true)}
                        className="w-full mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:brightness-110 active:scale-[0.98] text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <User className="w-4 h-4 text-zinc-950 shrink-0" />
                        <span>从已有档案选择</span>
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
                { label: '流月', bazi: getRealtimeLiuYue(new Date()) },
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
                        {client.notes && (
                          <div className="mt-1.5 text-[11px] text-zinc-300 bg-zinc-950/70 border border-zinc-800/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 max-w-full truncate">
                            <FileText className="w-3 h-3 text-gold shrink-0" />
                            <span className="truncate">{client.notes}</span>
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
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

                <div className="flex flex-col gap-2">
                  <label className="text-xs sm:text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-gold" />
                    {lang === 'zh' ? '档案备注 / 问事记录 (Notes)' : 'Client Notes & Remarks'}
                  </label>
                  <textarea 
                    rows={3}
                    value={clientNotes} 
                    onChange={(e) => setClientNotes(e.target.value)} 
                    placeholder={lang === 'zh' ? "在此记录客户问事重点、注意事项、特别叮嘱或开运方案..." : "Record client consultation points, reminders, special notes..."}
                    className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-gold focus:ring-0 transition-all font-sans resize-y min-h-[80px]" 
                  />
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
                      latitude,
                      longitude,
                      notes: clientNotes,
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
                <span className="text-xs sm:text-sm font-semibold text-zinc-200 leading-snug whitespace-nowrap truncate block">{solar.toYmd()} {birthTime}</span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-normal uppercase truncate">生日日期 (农历 Lunar)</span>
                {(() => {
                  const lunarStr = `${lunar.toString()} (${lunar.getYearInGanZhi()}年)`;
                  const len = lunarStr.length;
                  // Dynamic responsive font sizing so it shrinks to fit on one line strictly
                  const fontSize = len > 17 
                    ? 'clamp(8.5px, 2.2vw, 11px)' 
                    : len > 14 
                    ? 'clamp(9.5px, 2.5vw, 12px)' 
                    : 'clamp(10.5px, 2.8vw, 13px)';
                  return (
                    <span 
                      className="font-semibold text-zinc-200 whitespace-nowrap truncate tracking-tight block leading-snug"
                      style={{ fontSize }}
                      title={lunarStr}
                    >
                      {lunarStr}
                    </span>
                  );
                })()}
              </div>

              {/* 档案备注 / 问事记录 数据区域 */}
              <div className="col-span-2 flex flex-col gap-1.5 pt-2.5 mt-0.5 border-t border-zinc-800/80 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-gold shrink-0" />
                    {lang === 'zh' ? '档案备注 / 问事记录' : 'Notes & Remarks'}
                  </span>
                  {currentAnalysisClientId && (
                    <button
                      type="button"
                      onClick={handleQuickSaveNotes}
                      className={cn(
                        "text-[10px] sm:text-xs flex items-center gap-1 px-2.5 py-0.5 rounded-lg border transition-all active:scale-95 cursor-pointer font-bold",
                        notesSaveFeedback 
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                          : "bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-300 hover:text-white border-zinc-700/60 shadow-sm"
                      )}
                    >
                      {notesSaveFeedback ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{lang === 'zh' ? '已保存' : 'Saved'}</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 text-gold" />
                          <span>{lang === 'zh' ? '保存备注' : 'Save'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  onBlur={() => {
                    if (currentAnalysisClientId) {
                      handleQuickSaveNotes();
                    }
                  }}
                  placeholder={lang === 'zh' ? "在此记录该客户的问事重点、注意事项、开运建议等..." : "Record client notes, reminders, advice..."}
                  rows={2}
                  className="w-full bg-black/50 border border-zinc-800/80 rounded-xl p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-gold focus:ring-0 resize-y min-h-[52px] transition-all font-sans leading-relaxed shadow-inner"
                />
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 shadow-inner">
              <button 
                onClick={() => {
                  setActiveTab('bazi');
                  syncBaziToToday();
                }}
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
                    {["时柱", "日柱", "月柱", "年柱", selectedDaYunIndex === 0 ? "小运" : "大运", "流年"].map((label, idx) => (
                      <div key={idx} className="flex-1 flex items-center justify-center text-xs font-bold border-r border-zinc-700 last:border-r-0 whitespace-nowrap">{label}</div>
                    ))}
                  </div>

                  {/* Row 2: Age/Year */}
                  <div className="flex bg-zinc-800/40 border-b border-zinc-700 h-12 sm:h-14">
                    <div className="w-12 sm:w-16 flex items-center justify-center text-[10px] font-bold border-r border-zinc-700 leading-tight text-zinc-500">歳<br />年</div>
                    <div className="flex-[4] flex items-center justify-center border-r border-zinc-700 text-center px-1"></div>
                    <div className="flex-1 flex items-center justify-center border-r border-zinc-700 text-center leading-tight">
                      <div className="text-[11px] font-bold text-white whitespace-pre-wrap">
                        {selectedDaYunIndex === 0 
                          ? `${currentLiuNian.getAge()}岁\n小运` 
                          : `${currentDaYun.getStartAge()}歳\n${currentDaYun.getStartYear()}`
                        }
                      </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center text-center leading-tight">
                      <div className="text-[11px] font-bold text-white whitespace-pre-wrap">{currentLiuNian.getYear() - solar.getYear() + 1}岁<br />{currentLiuNian.getYear()}</div>
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
                      { gan: daYunGan, ss: daYunGan ? getShiShenFromGans(data.dayGan, daYunGan) : '' },
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
                      { zhi: daYunZhi, sss: daYunZhi ? getShiShenFromZhi(data.dayGan, daYunZhi) : [] },
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
                      { zhi: daYunZhi },
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

                  {/* Extra Rows: 星运, 自坐, 空亡, 神煞 */}
                  {[
                    { label: "星运", items: [eightChar.getTimeDiShi(), eightChar.getDayDiShi(), eightChar.getMonthDiShi(), eightChar.getYearDiShi(), "胎", "死"] },
                    { label: "自坐", items: [eightChar.getTimeNaYin(), eightChar.getDayNaYin(), eightChar.getMonthNaYin(), eightChar.getYearNaYin(), "海中金", "剑锋金"] },
                    { label: "空亡", items: [eightChar.getTimeXunKong(), eightChar.getDayXunKong(), eightChar.getMonthXunKong(), eightChar.getYearXunKong(), "申酉", "寅卯"] },
                  ].map((row, rowIdx) => (
                    <div key={rowIdx} className="flex border-b border-zinc-800 bg-zinc-900/30">
                      <div className="w-12 sm:w-16 shrink-0 flex items-center justify-center text-xs font-bold bg-zinc-900 border-r border-zinc-800">{row.label}</div>
                      {row.items.map((val, colIdx) => {
                        if (colIdx >= 6) return null;
                        return (
                          <div key={colIdx} className="flex-1 min-w-0 w-0 flex items-center justify-center py-1 sm:py-2 px-1 text-[10px] sm:text-[11px] text-zinc-400 border-r border-zinc-800 last:border-r-0 text-center">
                            {val}
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* 神煞 Row - Directly underneath 空亡 with all symbolic stars */}
                  {(() => {
                    const baziCtx: BaziPillarsContext = {
                      year: { gan: eightChar.getYearGan(), zhi: eightChar.getYearZhi() },
                      month: { gan: eightChar.getMonthGan(), zhi: eightChar.getMonthZhi() },
                      day: { gan: eightChar.getDayGan(), zhi: eightChar.getDayZhi() },
                      hour: { 
                        gan: (eightChar as any).getHour ? (eightChar as any).getHour().substring(0, 1) : eightChar.getTime().substring(0, 1), 
                        zhi: (eightChar as any).getHour ? (eightChar as any).getHour().substring(1, 2) : eightChar.getTime().substring(1, 2)
                      },
                      gender
                    };

                    const hourShenSha = calculatePillarShenSha(baziCtx.hour, 'hour', baziCtx);
                    const dayShenSha = calculatePillarShenSha(baziCtx.day, 'day', baziCtx);
                    const monthShenSha = calculatePillarShenSha(baziCtx.month, 'month', baziCtx);
                    const yearShenSha = calculatePillarShenSha(baziCtx.year, 'year', baziCtx);
                    const daYunShenSha = calculatePillarShenSha({ gan: daYunGan, zhi: daYunZhi }, 'dayun', baziCtx);
                    const liuNianShenSha = calculatePillarShenSha({ 
                        gan: currentLiuNian.getGanZhi().substring(0, 1), 
                        zhi: currentLiuNian.getGanZhi().substring(1, 2) 
                    }, 'liunian', baziCtx);

                    const pillarShenShaList = [hourShenSha, dayShenSha, monthShenSha, yearShenSha, daYunShenSha, liuNianShenSha];

                    return (
                      <div className="flex border-b border-zinc-800 bg-zinc-900/30">
                        <div className="w-12 sm:w-16 shrink-0 flex items-center justify-center text-xs font-bold bg-zinc-900 border-r border-zinc-800">
                          神煞
                        </div>
                        {pillarShenShaList.map((shenShaList, colIdx) => (
                          <div key={colIdx} className="flex-1 min-w-0 w-0 flex flex-col items-center justify-start py-2 px-0.5 sm:px-1 border-r border-zinc-800 last:border-r-0 text-center overflow-hidden">
                            {shenShaList.length > 0 ? (
                              <div className="w-full flex flex-col items-center gap-1">
                                {shenShaList.map((ss, i) => {
                                  const len = ss.name.length;
                                  return (
                                    <span
                                      key={i}
                                      title={ss.desc}
                                      className={cn(
                                        "block w-full whitespace-nowrap font-bold text-amber-300 hover:text-gold transition-colors cursor-help",
                                        len >= 4 
                                          ? "text-[8.5px] sm:text-[9.5px] tracking-tighter leading-tight" 
                                          : len === 3 
                                            ? "text-[9.5px] sm:text-[10.5px] tracking-tight leading-tight" 
                                            : "text-[11px] sm:text-xs leading-tight"
                                      )}
                                    >
                                      {ss.name}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600">-</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 五行能量与胎元命宫身宫 */}
                <div className="bg-zinc-900/70 border border-zinc-800 p-2.5 sm:p-3 rounded-xl shadow-md flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-xs font-black text-gold">五行能量</span>
                    <div className="flex items-center gap-1.5 sm:gap-2.5 text-[10px] sm:text-xs">
                      <span className="text-zinc-400">胎元: <b className="text-gold font-bold">{taiYuan}</b></span>
                      <span className="text-zinc-700">|</span>
                      <span className="text-zinc-400">命宫: <b className="text-gold font-bold">{mingGong}</b></span>
                      <span className="text-zinc-700">|</span>
                      <span className="text-zinc-400">身宫: <b className="text-gold font-bold">{shenGong}</b></span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {(['木', '火', '土', '金', '水'] as const).map((el) => {
                      const count = elementsCount[el] || 0;
                      const config = {
                        '木': { text: '#34d399', bar: '#10b981' },
                        '火': { text: '#f87171', bar: '#ef4444' },
                        '土': { text: '#fbbf24', bar: '#f59e0b' },
                        '金': { text: '#fde047', bar: '#d4af37' },
                        '水': { text: '#38bdf8', bar: '#0ea5e9' },
                      }[el];
                      const percent = Math.min(100, Math.round((count / 8) * 100));
                      return (
                        <div 
                          key={el} 
                          className="p-1 sm:p-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex flex-col items-center justify-between gap-1 shadow-sm"
                        >
                          <div className="flex items-center justify-center gap-1 font-bold">
                            <span className="text-xs sm:text-sm font-bold" style={{ color: config.text }}>{el}</span>
                            <span className="text-white font-mono text-xs font-bold">{count}</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300" 
                              style={{ width: `${percent}%`, backgroundColor: config.bar }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary Info Bar */}
                <div className="bg-zinc-800 px-3 py-1.5 rounded text-[10px] sm:text-xs flex items-center justify-between font-medium">
                  <div>出生后{yun.getStartYear()}年{yun.getStartMonth()}月开始行大运, 每交大运年{yun.getStartMonth()}月起运(西曆)</div>
                </div>

                {/* SELECTOR GRID (Da Yun & Liu Nian) */}
                <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded shadow-lg overflow-hidden mb-4">
                  
                  {/* Section 1: Da Yun Selector */}
                  <div className="flex flex-col p-1.5">
                    <div className="flex items-center justify-between gap-1.5 mb-1 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-100 font-bold uppercase tracking-wider">大運</span>
                        <span className="text-[9px] text-zinc-500 font-bold">起運: {yun.getStartYear()}年{yun.getStartMonth()}月</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => syncBaziToToday()}
                        className="text-[10px] text-gold hover:text-amber-300 font-bold px-2 py-0.5 rounded bg-gold/10 hover:bg-gold/20 border border-gold/30 transition-all flex items-center gap-1 cursor-pointer"
                        title="自动直接选择从今年今月今日开始看"
                      >
                        <span>📅</span>
                        <span>回到今天</span>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 px-0.5">
                        {/* 小运 (童运/起运前) Button */}
                        {daYunList[0] && (
                          <button 
                            type="button"
                            id="dayun-btn-0"
                            onClick={() => {
                              setSelectedDaYunIndex(0);
                              const ln0 = daYunList[0].getLiuNian();
                              if (ln0 && ln0.length > 0) {
                                const inChildhood = ln0.some(ln => ln.getYear() === selectedNianYear);
                                if (!inChildhood) {
                                  setSelectedNianYear(ln0[0].getYear());
                                  setSelectedYueIndex(0);
                                  setSelectedRiIndex(0);
                                }
                              }
                            }}
                            className={cn(
                              "flex flex-col rounded border transition-all cursor-pointer overflow-hidden",
                              selectedDaYunIndex === 0 
                                ? "bg-gold/10 border-gold ring-1 ring-gold/50" 
                                : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"
                            )}
                          >
                            <div className={cn(
                              "text-[8px] sm:text-[10px] font-bold text-center py-1 border-b leading-tight transition-colors", 
                              selectedDaYunIndex === 0 ? "bg-gold/20 text-white border-gold/30" : "bg-zinc-800/50 text-white border-zinc-800"
                            )}>
                              {daYunList[0].getStartAge()}-{daYunList[0].getEndAge()}<br className="sm:hidden" />歳
                            </div>
                            <div className="flex-1 flex flex-col items-center justify-center p-0.5 leading-none">
                              <div className={cn("text-[11px] sm:text-xs font-serif font-bold", selectedDaYunIndex === 0 ? "text-gold" : "text-zinc-400")}>小</div>
                              <div className={cn("text-[11px] sm:text-xs font-serif font-bold", selectedDaYunIndex === 0 ? "text-gold" : "text-zinc-400")}>運</div>
                            </div>
                          </button>
                        )}

                        {daYunList.slice(1).map((dy, idx) => {
                          const dyIdx = idx + 1;
                          const isActive = selectedDaYunIndex === dyIdx;
                          const gan = dy.getGanZhi().substring(0,1);
                          const zhi = dy.getGanZhi().substring(1,2);
                          return (
                            <button 
                              key={idx}
                              type="button"
                              id={`dayun-btn-${dyIdx}`}
                              onClick={() => {
                                setSelectedDaYunIndex(dyIdx);
                                const lns = dy.getLiuNian();
                                if (lns && lns.length > 0) {
                                  const inRange = lns.some(ln => ln.getYear() === selectedNianYear);
                                  if (!inRange) {
                                    setSelectedNianYear(lns[0].getYear());
                                    setSelectedYueIndex(0);
                                    setSelectedRiIndex(0);
                                  }
                                }
                              }}
                              className={cn(
                                "flex flex-col rounded border transition-all cursor-pointer overflow-hidden",
                                isActive ? "bg-gold/10 border-gold ring-1 ring-gold/50" : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"
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
                    <div className="flex items-center justify-between gap-1.5 mb-1 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-100 font-bold uppercase tracking-wider">
                          {selectedDaYunIndex === 0 ? "流年 (小运)" : "流年"}
                        </span>
                        {selectedDaYunIndex === 0 && (
                          <span className="text-[9px] text-amber-400 font-bold">起运前童运逐年推算</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        当前: <b className="text-gold font-bold">{selectedNianYear}年</b>
                      </span>
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 px-0.5">
                        {liuNianList.map((ln, idx) => {
                          const isActive = selectedNianYear === ln.getYear();
                          const gan = ln.getGanZhi().substring(0,1);
                          const zhi = ln.getGanZhi().substring(1,2);

                          // If in XiaoYun, get the childhood XiaoYun GanZhi for this year
                          const xyObj = (selectedDaYunIndex === 0 && daYunList[0]?.getXiaoYun)
                            ? daYunList[0].getXiaoYun().find((x: any) => x.getYear() === ln.getYear())
                            : null;
                          const xyGanZhi = xyObj ? xyObj.getGanZhi() : '';

                          return (
                            <button 
                              key={idx}
                              type="button"
                              id={`liunian-btn-${idx}`}
                              onClick={() => {
                                setSelectedNianYear(ln.getYear());
                                setSelectedYueIndex(0);
                                setSelectedRiIndex(0);
                              }}
                              className={cn(
                                "flex flex-col rounded border transition-all cursor-pointer overflow-hidden",
                                isActive ? "bg-gold/10 border-gold ring-1 ring-gold/50" : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700"
                              )}
                            >
                              <div className={cn("text-[10px] font-bold text-center py-1 border-b leading-none transition-colors", isActive ? "bg-gold/20 text-white border-gold/30" : "bg-zinc-800/50 text-white border-zinc-800")}>
                                {ln.getYear()}
                              </div>
                              <div className="flex flex-col items-center py-0.5 leading-none gap-0">
                                <span className={cn("text-lg font-serif font-bold", getBaziColorClass(gan))}>{gan}</span>
                                <span className={cn("text-lg font-serif font-bold", getBaziColorClass(zhi))}>{zhi}</span>
                              </div>
                              {xyGanZhi && (
                                <div className={cn("text-[8px] py-0.5 text-center font-mono border-t border-zinc-800/60 leading-none", isActive ? "text-amber-200 bg-gold/10" : "text-zinc-500")}>
                                  小运{xyGanZhi}
                                </div>
                              )}
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
                      {["时柱", "日柱", "月柱", "年柱", selectedDaYunIndex === 0 ? "小运" : "大运", "流年", "流月", "流日"].map((label, idx) => (
                        <div key={idx} className="flex-1 flex items-center justify-center text-[10px] font-black border-r border-zinc-700 last:border-r-0 text-zinc-300 uppercase whitespace-nowrap">{label}</div>
                      ))}
                    </div>

                    {/* Row 2: Age/Year */}
                    <div className="flex bg-zinc-950 border-b border-zinc-800 h-12 sm:h-14">
                      <div className="w-10 shrink-0 flex items-center justify-center text-[10px] font-bold border-r border-zinc-800 leading-tight whitespace-pre-wrap text-zinc-500 uppercase">岁\n年</div>
                      {[
                        { val: "*" }, { val: "*" }, { val: "*" }, { val: "*" },
                        { val: selectedDaYunIndex === 0 ? `${currentLiuNian.getAge()}岁\n小运` : `${Math.floor(currentDaYun.getStartAge())}岁\n${currentDaYun.getStartYear()}年` },
                        { val: `${currentLiuNian.getYear() - solar.getYear() + 1}岁\n${currentLiuNian.getYear()}年` },
                        { val: `${currentLiuYue.getIndex() + 1}月` },
                        { val: `${(currentLiuRi as any)?.getLunarDay ? (currentLiuRi as any).getLunarDay() : ''}\n${(currentLiuRi as any)?.getDay ? (currentLiuRi as any).getDay() : 1}日` },
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
                        { gan: daYunGan, ss: daYunGan ? getShiShenFromGans(data.dayGan, daYunGan) : '' },
                        { gan: currentLiuNian.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentLiuNian.getGanZhi().substring(0,1)) },
                        { gan: currentLiuYue.getGanZhi().substring(0,1), ss: getShiShenFromGans(data.dayGan, currentLiuYue.getGanZhi().substring(0,1)) },
                        { gan: (currentLiuRi as any)?.getGanZhi ? (currentLiuRi as any).getGanZhi().substring(0,1) : '甲', ss: getShiShenFromGans(data.dayGan, (currentLiuRi as any)?.getGanZhi ? (currentLiuRi as any).getGanZhi().substring(0,1) : '甲') },
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
                        { zhi: daYunZhi, sss: daYunZhi ? getShiShenFromZhi(data.dayGan, daYunZhi) : [] },
                        { zhi: currentLiuNian.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentLiuNian.getGanZhi().substring(1,2)) },
                        { zhi: currentLiuYue.getGanZhi().substring(1,2), sss: getShiShenFromZhi(data.dayGan, currentLiuYue.getGanZhi().substring(1,2)) },
                        { zhi: (currentLiuRi as any)?.getGanZhi ? (currentLiuRi as any).getGanZhi().substring(1,2) : '子', sss: getShiShenFromZhi(data.dayGan, (currentLiuRi as any)?.getGanZhi ? (currentLiuRi as any).getGanZhi().substring(1,2) : '子') },
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
                                  isActive 
                                    ? "bg-zinc-700/60 shadow-inner" 
                                    : "hover:bg-zinc-800/20"
                                )}
                              >
                                <div className="flex flex-col items-center">
                                  <span className={cn("text-[9px] sm:text-[10px] font-bold", isActive ? "text-white" : "text-zinc-500")}>
                                    {term}
                                  </span>
                                  <div className="flex flex-col items-center justify-center leading-none mt-1">
                                    <span className={cn("text-base sm:text-lg font-serif font-black", getBaziColorClass(gan))}>{gan}</span>
                                    <span className={cn("text-base sm:text-lg font-serif font-black", getBaziColorClass(zhi))}>{zhi}</span>
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
                                  if (!lr) return null;
                                  const isActive = selectedRiIndex === idx;
                                  const gan = lr.getGanZhi ? lr.getGanZhi().substring(0,1) : '';
                                  const zhi = lr.getGanZhi ? lr.getGanZhi().substring(1,2) : '';
                                  const lunarDayName = lr.getLunarDay ? lr.getLunarDay() : '';

                                  return (
                                    <div 
                                      key={idx} 
                                      id={`liuri-item-${idx}`}
                                      onClick={() => setSelectedRiIndex(idx)}
                                      className={cn(
                                        "min-w-[48px] sm:min-w-[60px] border-r border-zinc-800 cursor-pointer transition-colors shrink-0 flex flex-col items-center py-3",
                                        isActive 
                                          ? "bg-zinc-700/60 shadow-inner" 
                                          : "hover:bg-zinc-800/30"
                                      )}
                                    >
                                      <span className={cn("text-[10px] font-bold mb-1.5", isActive ? "text-white" : "text-zinc-600")}>{lunarDayName}</span>
                                      <div className="flex flex-col items-center leading-tight">
                                        <span className={cn("text-xl font-serif font-black", getBaziColorClass(gan))}>{gan}</span>
                                        <span className={cn("text-xl font-serif font-black", getBaziColorClass(zhi))}>{zhi}</span>
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

                  {/* 细盘六柱提示 (Six Pillars Deep Analysis) - Connected directly to the column above */}
                  {sixPillarsTips && (
                    <div className="border-t border-zinc-700 bg-zinc-900">
                      <div className="bg-zinc-800 px-3.5 py-2 border-b border-zinc-700 flex items-center justify-between">
                        <h3 className="text-xs sm:text-sm font-black text-white tracking-widest flex items-center gap-1.5">
                          <span>【細盤六柱提示】</span>
                        </h3>
                        {currentLiuYue && (
                          <span className="text-[10px] sm:text-[11px] font-bold text-gold bg-gold/10 border border-gold/30 px-2 py-0.5 rounded flex items-center gap-1">
                            <span>流月:</span>
                            <span className="font-serif text-white">{currentLiuYue.getGanZhi()}</span>
                            <span className="text-zinc-400 font-normal">
                              ({['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'][selectedYueIndex] || ''})
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                          <tbody>
                            {/* Row 1: 天干 */}
                            <tr className="border-b border-zinc-800 bg-zinc-900/40">
                              <td className="w-12 sm:w-16 bg-zinc-900 text-white font-bold text-xs sm:text-sm text-center py-2 px-1 border-r border-zinc-800 select-none shrink-0 whitespace-nowrap">
                                天干
                              </td>
                              <td className="py-2 px-3 text-xs sm:text-sm font-medium leading-relaxed bg-zinc-950/20">
                                {sixPillarsTips.tianGan.length > 0 ? (
                                  sixPillarsTips.tianGan.map((item, idx) => (
                                    <span key={idx} className="mr-2 inline-block">
                                      {renderHighlightedTip(item.endsWith(';') ? item : item + ';')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-500">—</span>
                                )}
                              </td>
                            </tr>

                            {/* Row 2: 地支 */}
                            <tr className="border-b border-zinc-800 bg-zinc-900/40">
                              <td className="w-12 sm:w-16 bg-zinc-900 text-white font-bold text-xs sm:text-sm text-center py-2 px-1 border-r border-zinc-800 select-none shrink-0 whitespace-nowrap">
                                地支
                              </td>
                              <td className="py-2 px-3 text-xs sm:text-sm font-medium leading-relaxed bg-zinc-950/40">
                                {sixPillarsTips.diZhi.length > 0 ? (
                                  sixPillarsTips.diZhi.map((item, idx) => (
                                    <span key={idx} className="mr-2 inline-block">
                                      {renderHighlightedTip(item.endsWith(';') ? item : item + ';')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-500">—</span>
                                )}
                              </td>
                            </tr>

                            {/* Row 3: 整柱 */}
                            <tr className="border-b border-zinc-800 bg-zinc-900/40">
                              <td className="w-12 sm:w-16 bg-zinc-900 text-white font-bold text-xs sm:text-sm text-center py-2 px-1 border-r border-zinc-800 select-none shrink-0 whitespace-nowrap">
                                整柱
                              </td>
                              <td className="py-2 px-3 text-xs sm:text-sm font-medium leading-relaxed bg-zinc-950/20">
                                {sixPillarsTips.zhengZhu.length > 0 ? (
                                  sixPillarsTips.zhengZhu.map((item, idx) => (
                                    <span key={idx} className="mr-2 inline-block">
                                      {renderHighlightedTip(item.endsWith(';') ? item : item + ';')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-500">—</span>
                                )}
                              </td>
                            </tr>

                            {/* Row 4: 流月 */}
                            <tr className="border-b border-zinc-800 bg-zinc-900/40">
                              <td className="w-12 sm:w-16 bg-zinc-900 text-white font-bold text-xs sm:text-sm text-center py-2 px-1 border-r border-zinc-800 select-none shrink-0 whitespace-nowrap">
                                流月
                              </td>
                              <td className="py-2 px-3 text-xs sm:text-sm font-medium leading-relaxed bg-zinc-950/40">
                                {sixPillarsTips.liuYue.length > 0 ? (
                                  sixPillarsTips.liuYue.map((item, idx) => (
                                    <span key={idx} className="mr-2 inline-block">
                                      {renderHighlightedTip(item.endsWith(';') ? item : item + ';')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-500">—</span>
                                )}
                              </td>
                            </tr>

                            {/* Row 5: 更多 */}
                            <tr className="bg-zinc-900/40">
                              <td className="w-12 sm:w-16 bg-zinc-900 text-white font-bold text-xs sm:text-sm text-center py-2 px-1 border-r border-zinc-800 select-none shrink-0 whitespace-nowrap">
                                更多
                              </td>
                              <td className="py-2 px-3 text-xs sm:text-sm font-medium leading-relaxed bg-zinc-950/20">
                                {sixPillarsTips.more.length > 0 ? (
                                  sixPillarsTips.more.map((item, idx) => (
                                    <span key={idx} className="mr-2 inline-block">
                                      {renderHighlightedTip(item.endsWith(';') ? item : item + ';')}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-zinc-500">—</span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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

                    {/* 2-Year Monthly Forecast Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase tracking-wider">流月走势 (2年数据)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-bold border border-gold/30">
                          {numerologyYear}年 ~ {numerologyYear + 1}年
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="hidden sm:inline text-[10px] text-zinc-500 mr-1">👉 向右滑动查看明年12个月</span>
                        <button
                          type="button"
                          onClick={() => setNumerologyYear(prev => prev - 1)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-[10px] border border-zinc-700 transition-colors cursor-pointer"
                          title="查看前一年"
                        >
                          ◀ {numerologyYear - 1}年
                        </button>
                        {numerologyYear !== new Date().getFullYear() && (
                          <button
                            type="button"
                            onClick={() => setNumerologyYear(new Date().getFullYear())}
                            className="px-2 py-1 rounded bg-gold/10 hover:bg-gold/20 text-gold font-bold text-[10px] border border-gold/30 transition-colors cursor-pointer"
                            title="重置为当前年份"
                          >
                            今年
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNumerologyYear(prev => prev + 1)}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-[10px] border border-zinc-700 transition-colors cursor-pointer"
                          title="查看后一年"
                        >
                          {numerologyYear + 1}年 ▶
                        </button>
                      </div>
                    </div>

                    <div className="mb-8 overflow-x-auto pb-4 custom-scrollbar">
                      <table className="border-collapse border border-zinc-800 mx-auto min-w-full">
                        <tbody>
                          {/* Row 1: Header (类别 + Year 1 Months 1-12 + Merged Next Year Divider + Year 2 Months 1-12) */}
                          <tr className="bg-zinc-800 text-center border-b border-zinc-700">
                            <th className="py-2 px-3 border border-zinc-700 text-xs font-bold text-zinc-200 sticky left-0 bg-zinc-800 z-20 w-16 min-w-16 whitespace-nowrap text-center">
                              类别
                            </th>
                            {/* Year 1: Months 1 - 12 */}
                            {[...Array(12)].map((_, i) => (
                              <th key={`y1-m-${i}`} className="py-2 px-1 border border-zinc-700 text-xs font-medium text-zinc-300 w-9 sm:w-10 min-w-[36px] sm:min-w-[40px] whitespace-nowrap text-center">
                                {i + 1}月
                              </th>
                            ))}
                            {/* Merged Next Year Divider: spans from 类别 row down through all 11 rows to 流月 (12 rows total!) */}
                            <th
                              rowSpan={12}
                              className="py-4 px-1 border border-zinc-700 bg-zinc-900 text-center w-7 min-w-7 max-w-7 whitespace-nowrap align-middle select-none"
                            >
                              <div className="flex flex-col items-center justify-center h-full">
                                <span
                                  style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                                  className="text-xs font-mono font-bold text-amber-400 tracking-widest inline-block"
                                >
                                  {numerologyYear + 1}年
                                </span>
                              </div>
                            </th>
                            {/* Year 2: Months 1 - 12 */}
                            {[...Array(12)].map((_, i) => (
                              <th key={`y2-m-${i}`} className="py-2 px-1 border border-zinc-700 text-xs font-medium text-amber-200/90 w-9 sm:w-10 min-w-[36px] sm:min-w-[40px] whitespace-nowrap text-center bg-zinc-800/60">
                                {i + 1}月
                              </th>
                            ))}
                          </tr>

                          {(() => {
                            const coreVal = getRootDigit(birthDate);
                            const year1 = numerologyYear;
                            const year2 = numerologyYear + 1;
                            
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
                              <tr key={idx} className="hover:bg-zinc-800/20">
                                <td className="py-1.5 px-3 border border-zinc-800 text-xs font-bold text-zinc-200 sticky left-0 bg-zinc-900 z-10 text-center whitespace-nowrap">
                                  {row.label}
                                </td>
                                
                                {/* Year 1 Months 1-12 */}
                                {[...Array(12)].map((_, mIdx) => {
                                  const monthNum = mIdx + 1;
                                  const monthlyFlowVal = getRootDigit(coreVal.toString() + year1.toString() + monthNum.toString());
                                  const matchesBase = baseValues.includes(monthlyFlowVal);
                                  
                                  let val = 0;
                                  let isMatched = false;

                                  if (row.type === 'year') {
                                    val = getRootDigit(coreVal.toString() + year1.toString());
                                  } else if (row.type === 'month') {
                                    val = monthlyFlowVal;
                                    isMatched = matchesBase;
                                  } else {
                                    val = row.base || 0;
                                    isMatched = val === monthlyFlowVal;
                                  }
                                  
                                  return (
                                    <td key={`y1-${mIdx}`} className="p-1 border border-zinc-800 text-center whitespace-nowrap">
                                      <div className={cn(
                                        "w-7 h-7 mx-auto flex items-center justify-center rounded-full font-mono text-sm font-semibold transition-colors",
                                        isMatched 
                                          ? "border-2 border-green-500 bg-green-500/15 text-green-400 font-bold shadow-[0_0_6px_rgba(34,197,94,0.3)]" 
                                          : (row.type === 'month' ? "text-gold font-bold" : "text-zinc-400")
                                      )}>
                                        {val}
                                      </div>
                                    </td>
                                  );
                                })}

                                {/* Next Year Divider Cell is omitted because rowSpan={12} in the top row spans across all 11 matrix rows! */}

                                {/* Year 2 Months 1-12 */}
                                {[...Array(12)].map((_, mIdx) => {
                                  const monthNum = mIdx + 1;
                                  const monthlyFlowVal = getRootDigit(coreVal.toString() + year2.toString() + monthNum.toString());
                                  const matchesBase = baseValues.includes(monthlyFlowVal);
                                  
                                  let val = 0;
                                  let isMatched = false;

                                  if (row.type === 'year') {
                                    val = getRootDigit(coreVal.toString() + year2.toString());
                                  } else if (row.type === 'month') {
                                    val = monthlyFlowVal;
                                    isMatched = matchesBase;
                                  } else {
                                    val = row.base || 0;
                                    isMatched = val === monthlyFlowVal;
                                  }
                                  
                                  return (
                                    <td key={`y2-${mIdx}`} className="p-1 border border-zinc-800 text-center whitespace-nowrap bg-zinc-900/20">
                                      <div className={cn(
                                        "w-7 h-7 mx-auto flex items-center justify-center rounded-full font-mono text-sm font-semibold transition-colors",
                                        isMatched 
                                          ? "border-2 border-green-500 bg-green-500/15 text-green-400 font-bold shadow-[0_0_6px_rgba(34,197,94,0.3)]" 
                                          : (row.type === 'month' ? "text-amber-300 font-bold" : "text-zinc-400")
                                      )}>
                                        {val}
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
                    {/* Slide-from-right Chart Filter Drawer */}
                    <AnimatePresence>
                      {isAstroChartDrawerOpen && (
                        <>
                          {/* Backdrop */}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsAstroChartDrawerOpen(false)}
                            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100]"
                          />

                          {/* Slide-over Drawer */}
                          <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                            className="fixed top-0 right-0 bottom-0 w-[330px] sm:w-[400px] max-w-[88vw] bg-zinc-900 border-l border-zinc-800 z-[101] flex flex-col shadow-2xl text-zinc-100"
                          >
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-800 bg-zinc-950/80">
                              <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-amber-400" />
                                <h3 className="text-sm font-bold text-zinc-100">星盘类型全览</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-amber-400 font-mono">共27种</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsAstroChartDrawerOpen(false)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
                              {ASTRO_CHART_CATEGORIES.map((cat) => (
                                <div key={cat.category} className="space-y-2">
                                  <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm shadow-amber-500/50" />
                                      <span className="text-xs font-bold text-amber-400 tracking-wide">{cat.category}</span>
                                      <span className="text-[10px] text-zinc-500 hidden sm:inline">· {cat.description}</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono px-1.5 py-0.5 rounded bg-zinc-800/80">{cat.charts.length}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {cat.charts.map((chart) => {
                                      const isSelected = selectedAstroChart === chart;
                                      return (
                                        <button
                                          key={chart}
                                          type="button"
                                          onClick={() => {
                                            handleSelectAstroChart(chart);
                                            setIsAstroChartDrawerOpen(false);
                                          }}
                                          className={cn(
                                            "px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between border cursor-pointer",
                                            isSelected
                                              ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-zinc-950 font-black border-amber-400 shadow-md shadow-amber-500/20"
                                              : "bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/50 hover:border-zinc-600"
                                          )}
                                        >
                                          <span className="truncate">{chart}</span>
                                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1 text-zinc-950 stroke-[3]" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
                              <div className="truncate mr-2">
                                当前选中: <strong className="text-amber-400 font-bold">{selectedAstroChart}</strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsAstroChartDrawerOpen(false)}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-105 text-zinc-950 text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
                              >
                                完成
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Visual Chart Section: Full-Width, Borderless, Pinch-to-Zoom enabled */}
                    <div className="w-full flex flex-col gap-2 items-center justify-center relative px-0 mx-0">
                      
                      {/* Compact Horizontally Scrollable Chart-Type Filter Bar */}
                      <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-1 shadow-md flex items-center gap-1.5 shrink-0">
                        <div 
                          ref={astroChartScrollRef}
                          className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 px-0.5 scroll-smooth"
                        >
                          {ALL_ASTRO_CHARTS.map((chart) => {
                            const isSelected = selectedAstroChart === chart;
                            return (
                              <button
                                key={chart}
                                id={`astro-chart-pill-${chart}`}
                                type="button"
                                onClick={() => handleSelectAstroChart(chart)}
                                className={cn(
                                  "px-3 py-1 rounded-full text-xs whitespace-nowrap shrink-0 transition-all cursor-pointer font-bold",
                                  isSelected
                                    ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-zinc-950 font-black shadow-sm shadow-amber-500/30"
                                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80"
                                )}
                              >
                                {chart}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (astroChartScrollRef.current) {
                              astroChartScrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
                            }
                          }}
                          title="向后滑动"
                          className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="h-5 w-[1px] bg-zinc-800/90 shrink-0" />

                        <button
                          type="button"
                          onClick={() => setIsAstroChartDrawerOpen(true)}
                          title="展开全部星盘分类"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 text-xs"
                        >
                          <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                          <ChevronDown className="w-3 h-3 text-zinc-400" />
                        </button>
                      </div>

                      {/* Single-Row Compact Parameter Setting Bar (在 本命盘 和 法达盘 没用到时完全隐藏) */}
                      {currentAstroChart && selectedAstroChart !== '本命盘' && selectedAstroChart !== '法达盘' && (
                        <div className="w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-2 text-[11px] whitespace-nowrap bg-zinc-950/70 border border-zinc-800/70 rounded-lg shrink-0">
                          {/* Predictive / Return / Sky / Eclipse Target Date Controls */}
                          {(currentAstroChart.category === '预测类星盘' || currentAstroChart.category === '反照盘类' || selectedAstroChart === '天象盘' || selectedAstroChart === '日月蚀盘') && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-zinc-400 font-medium shrink-0">日期:</span>
                              <input
                                type="date"
                                value={selectedAstroChart === '行运盘' ? transitDate : astroTargetDate}
                                onChange={(e) => {
                                  if (selectedAstroChart === '行运盘') setTransitDate(e.target.value);
                                  else setAstroTargetDate(e.target.value);
                                }}
                                className="px-1.5 py-0.5 bg-black/90 border border-zinc-700/80 rounded text-[11px] text-white font-mono shrink-0 focus:outline-none focus:border-amber-400"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const today = new Date();
                                  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                  if (selectedAstroChart === '行运盘') setTransitDate(ymd);
                                  else setAstroTargetDate(ymd);
                                }}
                                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium shrink-0"
                              >
                                今天
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = new Date(selectedAstroChart === '行运盘' ? transitDate : astroTargetDate);
                                  cur.setFullYear(cur.getFullYear() - 1);
                                  const ymd = cur.toISOString().split('T')[0];
                                  if (selectedAstroChart === '行运盘') setTransitDate(ymd);
                                  else setAstroTargetDate(ymd);
                                }}
                                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-medium shrink-0"
                              >
                                -1年
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = new Date(selectedAstroChart === '行运盘' ? transitDate : astroTargetDate);
                                  cur.setFullYear(cur.getFullYear() + 1);
                                  const ymd = cur.toISOString().split('T')[0];
                                  if (selectedAstroChart === '行运盘') setTransitDate(ymd);
                                  else setAstroTargetDate(ymd);
                                }}
                                className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950 text-[10px] font-bold shrink-0"
                              >
                                +1年
                              </button>
                            </div>
                          )}

                          {/* Partner Picker for Synastry & Composite */}
                          {(currentAstroChart.category === '合盘类' || currentAstroChart.category === '合盘类预测') && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-zinc-400 font-medium shrink-0">合盘:</span>
                              {savedClients.length > 0 && (
                                <select
                                  value={partnerClientId}
                                  onChange={(e) => setPartnerClientId(e.target.value)}
                                  className="px-1.5 py-0.5 bg-black/90 border border-zinc-700/80 rounded text-[11px] text-white shrink-0 focus:outline-none focus:border-amber-400 max-w-[110px] truncate"
                                >
                                  <option value="">--客户--</option>
                                  {savedClients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              )}
                              {!partnerClientId && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="对象姓名"
                                    value={partnerCustomName}
                                    onChange={(e) => setPartnerCustomName(e.target.value)}
                                    className="w-16 px-1.5 py-0.5 bg-black/90 border border-zinc-700/80 rounded text-[11px] text-white shrink-0 focus:outline-none focus:border-amber-400"
                                  />
                                  <input
                                    type="date"
                                    value={partnerCustomBirthDate}
                                    onChange={(e) => setPartnerCustomBirthDate(e.target.value)}
                                    className="px-1.5 py-0.5 bg-black/90 border border-zinc-700/80 rounded text-[11px] text-white font-mono shrink-0 focus:outline-none focus:border-amber-400"
                                  />
                                </>
                              )}
                              {currentAstroChart.category === '合盘类预测' && (
                                <>
                                  <span className="text-zinc-400 font-medium shrink-0 ml-1">推运:</span>
                                  <input
                                    type="date"
                                    value={astroTargetDate}
                                    onChange={(e) => setAstroTargetDate(e.target.value)}
                                    className="px-1.5 py-0.5 bg-black/90 border border-zinc-700/80 rounded text-[11px] text-white font-mono shrink-0 focus:outline-none focus:border-amber-400"
                                  />
                                </>
                              )}
                            </div>
                          )}

                          {/* Ingress Selector */}
                          {selectedAstroChart === '二分二至盘' && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-zinc-400 font-medium shrink-0">节气:</span>
                              {(['spring', 'summer', 'autumn', 'winter'] as const).map((type) => {
                                const shortNames = { spring: '春分', summer: '夏至', autumn: '秋分', winter: '冬至' };
                                const isActive = astroIngressType === type;
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => setAstroIngressType(type)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer",
                                      isActive
                                        ? "bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950 font-black"
                                        : "bg-zinc-800 text-zinc-300"
                                    )}
                                  >
                                    {shortNames[type]}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Reset to Natal button */}
                          <button
                            type="button"
                            onClick={() => handleSelectAstroChart('本命盘')}
                            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-white text-[10px] font-medium shrink-0 ml-auto transition-colors cursor-pointer"
                          >
                            重置本命
                          </button>
                        </div>
                      )}

                      {/* Astrological Chart Wheel: Restored Frame with Pinch-to-Zoom & Pan */}
                      <div 
                        className="relative w-full max-w-[380px] min-[420px]:max-w-[430px] sm:max-w-[490px] md:max-w-[540px] aspect-square mx-auto overflow-hidden rounded-2xl select-none touch-none cursor-grab active:cursor-grabbing border border-zinc-900/60 bg-zinc-950/40"
                        onTouchStart={handleChartTouchStart}
                        onTouchMove={handleChartTouchMove}
                        onTouchEnd={handleChartTouchEnd}
                        onTouchCancel={handleChartTouchEnd}
                        onMouseDown={handleChartMouseDown}
                        onMouseMove={handleChartMouseMove}
                        onMouseUp={handleChartMouseUp}
                        onMouseLeave={handleChartMouseUp}
                        onDoubleClick={handleChartDoubleTap}
                      >
                        {/* Floating Zoom Tools */}
                        <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/85 backdrop-blur-md border border-zinc-800/90 rounded-lg p-0.5 shadow-lg">
                          <button
                            type="button"
                            onClick={() => setChartZoomScale(s => Math.min(s + 0.25, 3.0))}
                            title="放大星盘"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartZoomScale(s => Math.max(s - 0.25, 0.75))}
                            title="缩小星盘"
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          {(chartZoomScale !== 1 || chartPanOffset.x !== 0 || chartPanOffset.y !== 0) && (
                            <button
                              type="button"
                              onClick={handleResetChartZoom}
                              title="重置缩放与位置"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                              1x
                            </button>
                          )}
                        </div>

                        {/* Scaled & Panned SVG Canvas: Smooth 60fps movement clipped cleanly inside the frame */}
                        <div 
                          className="w-full h-full flex items-center justify-center will-change-transform"
                          style={{ 
                            transform: `translate(${chartPanOffset.x}px, ${chartPanOffset.y}px) scale(${chartZoomScale})`, 
                            transformOrigin: 'center center',
                            transition: isDraggingMouseRef.current || touchStartDistRef.current || singleTouchStartRef.current ? 'none' : 'transform 120ms ease-out'
                          }}
                        >
                         {/* Circle Background */}
                          <svg viewBox={(Boolean(currentAstroChart?.isDualWheel && currentAstroChart?.secondary) || isTransitsMode) ? "-45 -45 490 490" : "0 0 400 400"} className="w-full h-full overflow-visible">
                            <defs>
                               <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feGaussianBlur stdDeviation="3" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                               </filter>
                               <linearGradient id="goldOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#fbbf24" />
                                  <stop offset="50%" stopColor="#f59e0b" />
                                  <stop offset="100%" stopColor="#ea580c" />
                               </linearGradient>
                            </defs>
                            
                            {/* Standard orientation: ASC on the left (180 deg) */}
                            {(() => {
                               const activePrimary = currentAstroChart?.primary || westernData;
                               const isDual = Boolean(currentAstroChart?.isDualWheel && currentAstroChart?.secondary);
                               const activeSecondary = currentAstroChart?.secondary;
                               const offset = activePrimary.asc - 180;
                               
                               return (
                                  <>
                                     {/* 1. SOLID PURE BLACK BASE & CONCENTRIC GUIDES */}
                                     <circle cx="200" cy="200" r="200" fill="#040508" stroke="#272a38" strokeWidth="1.5" />
                                     {/* Outer Zodiac Divider Ring */}
                                     <circle cx="200" cy="200" r="162" fill="#07080f" stroke="#222634" strokeWidth="1" />
                                     {/* House Numbers Ring */}
                                     <circle cx="200" cy="200" r="130" fill="#030407" stroke="#1d212d" strokeWidth="1" />
                                     {/* Center Hub */}
                                     <circle cx="200" cy="200" r="20" fill="#080912" stroke="#272b3b" strokeWidth="1" />

                                     {/* OUTER RING & PLANETS (Dual Wheel Mode for Synastry, Progressions, Returns, Transits) */}
                                     {isDual && activeSecondary ? (
                                       <>
                                         <circle cx="200" cy="200" r="236" className="stroke-amber-500/40 fill-amber-950/10" strokeWidth="1.2" strokeDasharray="3 3" />
                                         <circle cx="200" cy="200" r="202" className="stroke-amber-500/70 fill-none" strokeWidth="1" />
                                         {activeSecondary.planets.map((sp, i) => {
                                           const sAngle = (sp.longitude - offset) * Math.PI / 180;
                                           const sx = 200 + 220 * Math.cos(sAngle);
                                           const sy = 200 + 220 * Math.sin(sAngle);
                                           const tick1X = 200 + 202 * Math.cos(sAngle);
                                           const tick1Y = 200 + 202 * Math.sin(sAngle);
                                           const tick2X = 200 + 208 * Math.cos(sAngle);
                                           const tick2Y = 200 + 208 * Math.sin(sAngle);
                                           const spShort = PLANET_SHORT_CHARS[sp.id] || sp.name[0];

                                           return (
                                             <g key={i}>
                                               <line x1={tick1X} y1={tick1Y} x2={tick2X} y2={tick2Y} className="stroke-amber-400" strokeWidth="1.5" />
                                               <circle cx={sx} cy={sy} r="11" className="fill-zinc-950 stroke-amber-400/80" strokeWidth="1.2" />
                                               <text 
                                                 x={sx} y={sy} 
                                                 className="fill-amber-300 font-sans text-[10px] font-black select-none" 
                                                 textAnchor="middle" dominantBaseline="central"
                                               >
                                                 <tspan className="font-serif">{sp.symbol}</tspan>
                                                 <tspan className="text-[8px] font-bold" dx="0.5">{spShort}</tspan>
                                               </text>
                                               {sp.isRetrograde && (
                                                 <text 
                                                   x={sx + 7} y={sy - 6} 
                                                   className="fill-rose-400 text-[8px] font-black" 
                                                   textAnchor="start"
                                                 >
                                                   R
                                                 </text>
                                               )}
                                             </g>
                                           );
                                         })}
                                       </>
                                     ) : isTransitsMode && (
                                       <>
                                         <circle cx="200" cy="200" r="236" className="stroke-cyan-500/40 fill-cyan-950/10" strokeWidth="1.2" strokeDasharray="3 3" />
                                         <circle cx="200" cy="200" r="202" className="stroke-cyan-500/70 fill-none" strokeWidth="1" />
                                         {transitPlanets.map((tp, i) => {
                                           const tAngle = (tp.longitude - offset) * Math.PI / 180;
                                           const tx = 200 + 220 * Math.cos(tAngle);
                                           const ty = 200 + 220 * Math.sin(tAngle);
                                           const tick1X = 200 + 202 * Math.cos(tAngle);
                                           const tick1Y = 200 + 202 * Math.sin(tAngle);
                                           const tick2X = 200 + 208 * Math.cos(tAngle);
                                           const tick2Y = 200 + 208 * Math.sin(tAngle);
                                           const tpShort = PLANET_SHORT_CHARS[tp.name] || tp.name[0];

                                           return (
                                             <g key={i}>
                                               <line x1={tick1X} y1={tick1Y} x2={tick2X} y2={tick2Y} className="stroke-cyan-400" strokeWidth="1.5" />
                                               <circle cx={tx} cy={ty} r="11" className="fill-zinc-950 stroke-cyan-400/80" strokeWidth="1.2" />
                                               <text 
                                                 x={tx} y={ty} 
                                                 className="fill-cyan-300 font-sans text-[10px] font-black select-none" 
                                                 textAnchor="middle" dominantBaseline="central"
                                               >
                                                 <tspan className="font-serif">{tp.symbol}</tspan>
                                                 <tspan className="text-[8px] font-bold" dx="0.5">{tpShort}</tspan>
                                               </text>
                                               {tp.isRetrograde && (
                                                 <text 
                                                   x={tx + 7} y={ty - 6} 
                                                   className="fill-rose-400 text-[8px] font-black" 
                                                   textAnchor="start"
                                                 >
                                                   R
                                                 </text>
                                               )}
                                             </g>
                                           );
                                         })}
                                       </>
                                     )}

                                     {/* 2. ZODIAC SIGNS RING (162 - 200) - Symbol + First Chinese Character */}
                                     {ZODIAC_SIGNS.map((sign, i) => {
                                        const startAngle = i * 30 - offset;
                                        const endAngle = (i + 1) * 30 - offset;
                                        const midAngle = startAngle + 15;

                                        // Boundary radial tick lines separating 12 signs
                                        const lx1 = 200 + 162 * Math.cos(startAngle * Math.PI / 180);
                                        const ly1 = 200 + 162 * Math.sin(startAngle * Math.PI / 180);
                                        const lx2 = 200 + 200 * Math.cos(startAngle * Math.PI / 180);
                                        const ly2 = 200 + 200 * Math.sin(startAngle * Math.PI / 180);

                                        // Symbol + Chinese char position
                                        const sx = 200 + 181 * Math.cos(midAngle * Math.PI / 180);
                                        const sy = 200 + 181 * Math.sin(midAngle * Math.PI / 180);

                                        return (
                                           <g key={i}>
                                              <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#222634" strokeWidth="1" />
                                              <text 
                                                 x={sx} y={sy} 
                                                 textAnchor="middle" dominantBaseline="central"
                                                 className="select-none font-bold"
                                              >
                                                 <tspan fill={sign.color} className="font-serif text-[13px] font-bold">{sign.symbol}</tspan>
                                                 <tspan fill={sign.color} className="text-[11px] font-black" dx="2">{sign.short}</tspan>
                                              </text>
                                           </g>
                                        );
                                     })}

                                     {/* 3. HOUSES RING (130 - 162) - Dividing Lines and House Numbers */}
                                     {activePrimary.houses.map((h, i) => {
                                        const houseStartSign = ZODIAC_SIGNS.findIndex(s => s.eng === h.sign.eng);
                                        const angle = (houseStartSign * 30) - offset;
                                        
                                        // House divider lines from inner radius 130 to 162
                                        const x1 = 200 + 130 * Math.cos(angle * Math.PI / 180);
                                        const y1 = 200 + 130 * Math.sin(angle * Math.PI / 180);
                                        const x2 = 200 + 162 * Math.cos(angle * Math.PI / 180);
                                        const y2 = 200 + 162 * Math.sin(angle * Math.PI / 180);

                                        // Faint radial spoke into center
                                        const spokeX = 200 + 20 * Math.cos(angle * Math.PI / 180);
                                        const spokeY = 200 + 20 * Math.sin(angle * Math.PI / 180);
                                        
                                        // House number position in ring
                                        const midAngle = angle + 15;
                                        const nx = 200 + 146 * Math.cos(midAngle * Math.PI / 180);
                                        const ny = 200 + 146 * Math.sin(midAngle * Math.PI / 180);

                                        return (
                                           <g key={i}>
                                              <line x1={spokeX} y1={spokeY} x2={x1} y2={y1} stroke="#171923" strokeWidth="0.75" />
                                              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#222634" strokeWidth="1" />
                                              <text 
                                                x={nx} y={ny} 
                                                className="fill-zinc-500 text-[10px] font-mono font-black select-none" 
                                                textAnchor="middle" dominantBaseline="central">
                                                {h.number}
                                              </text>
                                           </g>
                                        );
                                     })}

                                     {/* 4. ASPECT LINES (Inner Area < 130) */}
                                     {(() => {
                                       const activeAspectList = currentAstroChart?.aspects || [];
                                       if (activeAspectList.length > 0) {
                                         return activeAspectList.slice(0, 20).map((asp, idx) => {
                                           const r = 130;
                                           const x1 = 200 + r * Math.cos((asp.planet1.longitude - offset) * Math.PI / 180);
                                           const y1 = 200 + r * Math.sin((asp.planet1.longitude - offset) * Math.PI / 180);
                                           const x2 = 200 + r * Math.cos((asp.planet2.longitude - offset) * Math.PI / 180);
                                           const y2 = 200 + r * Math.sin((asp.planet2.longitude - offset) * Math.PI / 180);

                                           let strokeColor = '#38bdf8';
                                           let strokeDasharray = 'none';
                                           let strokeWidth = 1.3;
                                           let strokeOpacity = 0.7;

                                           if (asp.aspect.angle === 90) {
                                             strokeColor = '#ef4444';
                                             strokeDasharray = '4 3';
                                             strokeWidth = 1.6;
                                             strokeOpacity = 0.85;
                                           } else if (asp.aspect.angle === 180) {
                                             strokeColor = '#f43f5e';
                                             strokeDasharray = 'none';
                                             strokeWidth = 1.8;
                                             strokeOpacity = 0.9;
                                           } else if (asp.aspect.angle === 120) {
                                             strokeColor = '#38bdf8';
                                             strokeDasharray = 'none';
                                             strokeWidth = 1.6;
                                             strokeOpacity = 0.85;
                                           } else if (asp.aspect.angle === 60) {
                                             strokeColor = '#2dd4bf';
                                             strokeDasharray = '2 2';
                                             strokeWidth = 1.3;
                                             strokeOpacity = 0.8;
                                           } else if (asp.aspect.angle === 0) {
                                             strokeColor = '#fbbf24';
                                             strokeDasharray = 'none';
                                             strokeWidth = 1.8;
                                             strokeOpacity = 0.9;
                                           }

                                           return (
                                             <line 
                                               key={idx}
                                               x1={x1} y1={y1} x2={x2} y2={y2}
                                               stroke={strokeColor}
                                               strokeOpacity={strokeOpacity}
                                               strokeWidth={strokeWidth}
                                               strokeDasharray={strokeDasharray}
                                             />
                                           );
                                         });
                                       }

                                       if (isTransitsMode) {
                                         return transitAspects.slice(0, 18).map((asp, idx) => {
                                           const r = 130;
                                           const x1 = 200 + r * Math.cos((asp.transitPlanet.longitude - offset) * Math.PI / 180);
                                           const y1 = 200 + r * Math.sin((asp.transitPlanet.longitude - offset) * Math.PI / 180);
                                           const x2 = 200 + r * Math.cos((asp.natalPlanet.longitude - offset) * Math.PI / 180);
                                           const y2 = 200 + r * Math.sin((asp.natalPlanet.longitude - offset) * Math.PI / 180);
                                           return (
                                             <line 
                                               key={idx}
                                               x1={x1} y1={y1} x2={x2} y2={y2}
                                               stroke="#38bdf8"
                                               strokeOpacity={0.7}
                                               strokeWidth={1.3}
                                             />
                                           );
                                         });
                                       }

                                       return aspects.map((asp, idx) => {
                                         const r = 130;
                                         const x1 = 200 + r * Math.cos((asp.p1.longitude - offset) * Math.PI / 180);
                                         const y1 = 200 + r * Math.sin((asp.p1.longitude - offset) * Math.PI / 180);
                                         const x2 = 200 + r * Math.cos((asp.p2.longitude - offset) * Math.PI / 180);
                                         const y2 = 200 + r * Math.sin((asp.p2.longitude - offset) * Math.PI / 180);
                                         return (
                                           <line 
                                             key={idx}
                                             x1={x1} y1={y1} x2={x2} y2={y2}
                                             stroke="#38bdf8"
                                             strokeOpacity={0.7}
                                             strokeWidth={1.3}
                                           />
                                         );
                                       });
                                     })()}

                                     {/* 5. PRIMARY PLANETS - Symbol + Chinese Character */}
                                     {(() => {
                                         const positionedPlanets = [...activePrimary.planets].sort((a, b) => a.longitude - b.longitude);
                                         const labels: { x: number, y: number, symbol: string, id: string, name: string, angle: number, isRetrograde: boolean }[] = [];
                                         
                                         positionedPlanets.forEach((p, idx) => {
                                            const baseAngle = (p.longitude - offset) * Math.PI / 180;
                                            let r = 108;
                                            
                                            if (idx > 0) {
                                               const prev = positionedPlanets[idx - 1];
                                               const diffDeg = Math.abs(p.longitude - prev.longitude);
                                               if (diffDeg < 9 || (360 - diffDeg) < 9) {
                                                   r = idx % 2 === 0 ? 112 : 88;
                                               }
                                            }
                                            
                                            const x = 200 + r * Math.cos(baseAngle);
                                            const y = 200 + r * Math.sin(baseAngle);
                                            labels.push({ x, y, symbol: p.symbol, id: p.id, name: p.name, angle: baseAngle, isRetrograde: p.isRetrograde || false });
                                         });

                                         return labels.map((p, i) => {
                                            const pColor = PLANET_CHART_COLORS[p.id] || '#fbbf24';
                                            const pShort = PLANET_SHORT_CHARS[p.id] || p.name[0];
                                            const dotX = 200 + 130 * Math.cos(p.angle);
                                            const dotY = 200 + 130 * Math.sin(p.angle);

                                            return (
                                               <g key={i}>
                                                  <line 
                                                    x1={dotX} 
                                                    y1={dotY}
                                                    x2={p.x} y2={p.y}
                                                    stroke={pColor} strokeWidth="0.6" opacity="0.45" />
                                                  <circle cx={dotX} cy={dotY} r="1.8" fill={pColor} />
                                                  <g transform={`translate(${p.x}, ${p.y})`}>
                                                      <text 
                                                        x="0" y="0"
                                                        textAnchor="middle" dominantBaseline="central"
                                                        className="select-none font-bold"
                                                        style={{ textShadow: '0 0 6px rgba(0,0,0,0.9)' }}
                                                      >
                                                        <tspan fill={pColor} className="font-serif text-[13px] font-bold">{p.symbol}</tspan>
                                                        <tspan fill={pColor} className="text-[10px] font-black" dx="1.5">{pShort}</tspan>
                                                        {p.isRetrograde && (
                                                          <tspan className="fill-rose-500 text-[8px] font-black" dx="1">
                                                            R
                                                          </tspan>
                                                        )}
                                                      </text>
                                                  </g>
                                               </g>
                                            );
                                         });
                                      })()}

                                     {/* 6. MAIN ANGLES (ASC, DSC, MC, IC) */}
                                     {/* ASC - DSC Horizontal Axis Line */}
                                     <line 
                                       x1={200 - 130} y1={200} x2={200 - 198} y2={200} 
                                       stroke="#f87171" strokeWidth="2" />
                                     <circle cx={200 - 130} cy={200} r="2.5" fill="#f87171" />
                                     <text x={200 - 195} y={200} fill="#f87171" className="text-xs font-black select-none" textAnchor="end" dominantBaseline="central">升</text>
                                     
                                     <line 
                                       x1={200 + 130} y1={200} x2={200 + 198} y2={200} 
                                       stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.75" />
                                     <text x={200 + 195} y={200} fill="#f43f5e" className="text-[10px] font-bold select-none" textAnchor="start" dominantBaseline="central">降</text>

                                     {/* MC Line */}
                                     {(() => {
                                        const mcAngle = (activePrimary.mc - offset) * Math.PI / 180;
                                        const mx1 = 200 + 130 * Math.cos(mcAngle);
                                        const my1 = 200 + 130 * Math.sin(mcAngle);
                                        const mx2 = 200 + 198 * Math.cos(mcAngle);
                                        const my2 = 200 + 198 * Math.sin(mcAngle);
                                        return (
                                          <>
                                            <line 
                                              x1={mx1} y1={my1} x2={mx2} y2={my2}
                                              stroke="#38bdf8" strokeWidth="2" />
                                            <circle cx={mx1} cy={my1} r="2.5" fill="#38bdf8" />
                                            <text 
                                              x={200 + 195 * Math.cos(mcAngle)} y={200 + 195 * Math.sin(mcAngle)} 
                                              fill="#38bdf8" className="text-xs font-black select-none" 
                                              textAnchor="middle" dominantBaseline="central">顶</text>
                                          </>
                                        );
                                     })()}

                                     {/* IC Line */}
                                     {(() => {
                                        const icAngle = (activePrimary.ic - offset) * Math.PI / 180;
                                        return (
                                          <>
                                            <line 
                                              x1={200 + 130 * Math.cos(icAngle)} y1={200 + 130 * Math.sin(icAngle)}
                                              x2={200 + 198 * Math.cos(icAngle)} y2={200 + 198 * Math.sin(icAngle)}
                                              stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.75" />
                                            <text 
                                              x={200 + 195 * Math.cos(icAngle)} y={200 + 195 * Math.sin(icAngle)} 
                                              fill="#818cf8" className="text-[10px] font-bold select-none" 
                                              textAnchor="middle" dominantBaseline="central">底</text>
                                          </>
                                        );
                                     })()}
                                  </>
                               );
                            })()}
                          </svg>
                        </div>
                      </div>

                      {/* Aspect Lines Visual Legend (相位连线图例) */}
                      <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap mt-3 pt-2 pb-0.5 border-t border-zinc-800/80 text-[10px] sm:text-[11px] font-bold w-full">
                        <div className="flex items-center gap-1 text-sky-400">
                          <span className="w-3.5 h-0.5 bg-sky-400 inline-block rounded"></span>
                          <span>拱 120° (蓝实)</span>
                        </div>
                        <div className="flex items-center gap-1 text-rose-500">
                          <span className="w-3.5 h-0.5 bg-rose-500 inline-block rounded"></span>
                          <span>冲 180° (红实)</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-400">
                          <span className="w-3.5 border-b-2 border-dashed border-red-400 inline-block"></span>
                          <span>刑 90° (红虚)</span>
                        </div>
                        <div className="flex items-center gap-1 text-teal-300">
                          <span className="w-3.5 border-b-2 border-dotted border-teal-300 inline-block"></span>
                          <span>六合 60° (青虚)</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-300">
                          <span className="w-3.5 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 inline-block rounded"></span>
                          <span>合 0° (金实)</span>
                        </div>
                      </div>

                      {/* 4 Angles: ASC, MC, DSC, IC */}
                      {(() => {
                        const activePrimary = currentAstroChart?.primary || westernData;
                        return (
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold w-full px-1">
                             <div className="flex flex-col items-center p-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-emerald-400">
                                <div className="flex items-center gap-1.5 mb-1">
                                   <span className="text-[9px] text-emerald-500 uppercase font-black">上升 ASC</span>
                                   <span className="text-[10px] text-amber-400 font-bold">外界印象</span>
                                </div>
                                <span className="text-zinc-100 font-bold">{activePrimary.ascSign.name} {Math.floor(activePrimary.ascDeg)}°</span>
                             </div>
                             <div className="flex flex-col items-center p-2 bg-amber-950/20 border border-amber-900/40 rounded-lg text-amber-400">
                                <div className="flex items-center gap-1.5 mb-1">
                                   <span className="text-[9px] text-amber-500 uppercase font-black">中天 MC</span>
                                   <span className="text-[10px] text-amber-400 font-bold">人生目标</span>
                                </div>
                                <span className="text-zinc-100 font-bold">{activePrimary.mcSign.name} {Math.floor(activePrimary.mcDeg)}°</span>
                             </div>
                             <div className="flex flex-col items-center p-2 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-400">
                                <div className="flex items-center gap-1.5 mb-1">
                                   <span className="text-[9px] text-rose-500 uppercase font-black">下降 DSC</span>
                                   <span className="text-[10px] text-amber-400 font-bold">吸引伴侣</span>
                                </div>
                                <span className="text-zinc-100 font-bold">{activePrimary.dscSign.name}</span>
                             </div>
                             <div className="flex flex-col items-center p-2 bg-sky-950/20 border border-sky-900/40 rounded-lg text-sky-400">
                                <div className="flex items-center gap-1.5 mb-1">
                                   <span className="text-[9px] text-sky-500 uppercase font-black">天底 IC</span>
                                   <span className="text-[10px] text-amber-400 font-bold">成长环境</span>
                                </div>
                                <span className="text-zinc-100 font-bold">{activePrimary.icSign.name}</span>
                             </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Section: Primary Planets Table (本命/推运/比较主盘) */}
                    {(() => {
                      const activePrimary = currentAstroChart?.primary || westernData;
                      const isDual = Boolean(currentAstroChart?.isDualWheel && currentAstroChart?.secondary);
                      const activeSecondary = currentAstroChart?.secondary;

                      return (
                        <>
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="bg-zinc-800/90 px-3.5 py-2.5 border-b border-zinc-700/80 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                                <span className="text-xs font-black text-zinc-200 uppercase tracking-wider">
                                  {activePrimary.label || currentAstroChart?.chartTitle || '行星位置'}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-zinc-400 font-mono">
                                {activePrimary.dateFormatted || activePrimary.timeFormatted ? `${activePrimary.dateFormatted} ${activePrimary.timeFormatted}` : `共 ${activePrimary.planets.length} 颗星体`}
                              </span>
                            </div>
                            <div className="w-full">
                              <table className="w-full border-collapse text-left table-fixed">
                                <thead>
                                  <tr className="bg-zinc-950/60 text-[10px] sm:text-[11px] text-zinc-400 font-bold border-b border-zinc-800">
                                    <th className="py-2 px-1.5 sm:px-3 text-left w-[28%]">行星</th>
                                    <th className="py-2 px-1 sm:px-2 text-left w-[24%]">星座</th>
                                    <th className="py-2 px-1 sm:px-2 text-left w-[20%]">度数</th>
                                    <th className="py-2 px-1 sm:px-2 text-center w-[28%]">宫位</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activePrimary.planets.map((p, i) => (
                                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                      <td className="py-1.5 px-1.5 sm:px-3">
                                        <div className="flex items-center gap-1 sm:gap-1.5">
                                          <span className="text-base sm:text-lg text-amber-400 shrink-0 select-none font-serif">{p.symbol}</span>
                                          <span className="text-xs sm:text-sm font-bold text-white truncate">{p.name}</span>
                                          {p.isRetrograde && (
                                            <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold tracking-tight shrink-0">
                                              逆
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-1 sm:px-2">
                                        <div className="flex items-baseline gap-1 truncate">
                                          <span className="text-[11px] sm:text-xs font-bold text-zinc-200">{p.sign.name}</span>
                                          <span className="hidden min-[400px]:inline text-[9px] text-zinc-500 font-sans">({p.sign.eng})</span>
                                        </div>
                                      </td>
                                      <td className="py-1.5 px-1 sm:px-2 text-[10px] sm:text-xs font-mono font-medium text-amber-200/90 whitespace-nowrap">
                                        {Math.floor(p.degree)}°{String(Math.floor((p.degree % 1) * 60)).padStart(2, '0')}'
                                      </td>
                                      <td className="py-1.5 px-1 sm:px-2 text-center">
                                        {p.house ? (
                                          <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5">
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 border border-amber-500/30 text-[10px] sm:text-xs font-bold text-amber-400 shrink-0">
                                              {p.house}宫
                                            </span>
                                            <span className="text-[10px] sm:text-xs font-bold text-amber-300/80 shrink-0">
                                              {ASTROLOGY_HOUSE_MEANINGS[p.house]}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-zinc-500 text-xs">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Section: Secondary / Outer Planets Table (When Dual Wheel Active) */}
                          {isDual && activeSecondary && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                              <div className="bg-zinc-800/90 px-3.5 py-2.5 border-b border-zinc-700/80 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                                    {activeSecondary.label || '外圈星体位置'}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 font-mono">
                                  {activeSecondary.dateFormatted} {activeSecondary.timeFormatted}
                                </span>
                              </div>
                              <div className="w-full">
                                <table className="w-full border-collapse text-left table-fixed">
                                  <thead>
                                    <tr className="bg-zinc-950/60 text-[10px] sm:text-[11px] text-zinc-400 font-bold border-b border-zinc-800">
                                      <th className="py-2 px-1.5 sm:px-3 text-left w-[28%]">外圈行星</th>
                                      <th className="py-2 px-1 sm:px-2 text-left w-[24%]">星座</th>
                                      <th className="py-2 px-1 sm:px-2 text-left w-[20%]">度数</th>
                                      <th className="py-2 px-1 sm:px-2 text-center w-[28%]">相对落宫</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeSecondary.planets.map((sp, idx) => (
                                      <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                                        <td className="py-1.5 px-1.5 sm:px-3">
                                          <div className="flex items-center gap-1 sm:gap-1.5">
                                            <span className="text-base sm:text-lg text-cyan-400 shrink-0 select-none font-serif">{sp.symbol}</span>
                                            <span className="text-xs sm:text-sm font-bold text-white truncate">{sp.name}</span>
                                            {sp.isRetrograde && (
                                              <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/80 font-bold tracking-tight shrink-0">
                                                逆
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-1.5 px-1 sm:px-2">
                                          <span className="text-[11px] sm:text-xs font-bold text-zinc-200 truncate">{sp.sign.name}</span>
                                        </td>
                                        <td className="py-1.5 px-1 sm:px-2 text-[10px] sm:text-xs font-mono font-medium text-amber-200/90 whitespace-nowrap">
                                          {Math.floor(sp.degree)}°{String(Math.floor((sp.degree % 1) * 60)).padStart(2, '0')}'
                                        </td>
                                        <td className="py-1.5 px-1 sm:px-2 text-center">
                                          {sp.house ? (
                                            <div className="inline-flex items-center justify-center gap-1 sm:gap-1.5">
                                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 border border-cyan-500/40 text-[10px] sm:text-xs font-bold text-cyan-300 shrink-0">
                                                {sp.house}宫
                                              </span>
                                              <span className="text-[10px] sm:text-xs font-bold text-cyan-200/80 shrink-0">
                                                {ASTROLOGY_HOUSE_MEANINGS[sp.house]}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-zinc-500 text-xs">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Section: Aspects Analysis (Current Multi-Chart Aspects or Natal/Transit fallback) */}
                    {(() => {
                      const activeAspectList = currentAstroChart?.aspects || [];
                      if (activeAspectList.length > 0) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="bg-zinc-800/90 px-3.5 py-2.5 border-b border-zinc-700/80 flex items-center justify-between">
                              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                                关键相位分析 (Aspects)
                              </span>
                              <span className="text-[10px] font-bold text-zinc-500">
                                共 {activeAspectList.length} 个主要相位
                              </span>
                            </div>
                            <div className="p-2 sm:p-2.5 grid grid-cols-2 gap-1.5 sm:gap-2 max-h-80 overflow-y-auto custom-scrollbar">
                              {activeAspectList.map((asp, idx) => (
                                <div 
                                  key={idx} 
                                  className="bg-black/50 border border-zinc-800/80 p-2 rounded-lg flex flex-col gap-0.5 hover:border-zinc-700 transition-colors"
                                >
                                  <div className="flex items-center justify-between min-w-0">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-100 truncate">
                                      {asp.planet1.symbol} {asp.planet1.name}
                                    </span>
                                    <span className={cn("text-[9px] font-black mx-0.5 shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800 leading-none", asp.aspect.color)}>
                                      <span>{asp.aspect.symbol}</span>
                                      <span>{asp.aspect.shortName || asp.aspect.name}</span>
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-zinc-100 truncate text-right">
                                      {asp.planet2.name} {asp.planet2.symbol}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] text-zinc-400 pt-0.5 border-t border-zinc-900">
                                    <span className="text-zinc-300 font-medium truncate">{asp.aspect.name}</span>
                                    <span className="font-mono text-zinc-500 shrink-0">容 {asp.orb.toFixed(1)}°</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      if (isTransitsMode && transitAspects.length > 0) {
                        return (
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="bg-zinc-800/90 px-3.5 py-2 border-b border-zinc-700/80 flex items-center justify-between">
                              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                                流年关键相位 (Transit Aspects)
                              </span>
                              <span className="text-[9px] font-bold text-zinc-500">
                                共 {transitAspects.length} 个主要相位
                              </span>
                            </div>
                            <div className="p-2.5 grid grid-cols-2 gap-1.5 sm:gap-2 max-h-72 overflow-y-auto custom-scrollbar">
                              {transitAspects.map((asp, idx) => (
                                <div key={idx} className="bg-black/40 border border-zinc-800/60 px-2 py-1.5 rounded-lg flex flex-col gap-0.5">
                                  <div className="flex items-center justify-between min-w-0">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300 whitespace-nowrap">T.{asp.transitPlanet.name}</span>
                                    <span className={cn("text-[9px] font-black mx-1 shrink-0 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-zinc-950 border border-zinc-800 leading-none", asp.aspect.color)}>
                                      <span className="text-[10px]">{asp.aspect.symbol}</span>
                                      <span className="text-[9px]">{asp.aspect.shortName || asp.aspect.name}</span>
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 whitespace-nowrap">N.{asp.natalPlanet.name}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[9px] text-zinc-400 pt-0.5">
                                    <span className="font-medium text-zinc-300">{asp.aspect.name}</span>
                                    <span className="font-mono text-zinc-500">容 {asp.orb}°</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })()}

                    {/* Section: 十二宫位与守护星分布 (Houses & Guardians) - Dynamically calculated from active primary */}
                    {(() => {
                      const activePrimary = currentAstroChart?.primary || westernData;
                      return (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                          <div className="bg-zinc-800 px-3.5 py-2.5 border-b border-zinc-700 flex items-center justify-between gap-1 overflow-hidden">
                            <span className="text-xs font-black text-amber-400 uppercase tracking-wider whitespace-nowrap">
                              十二宫位与守护星 <span className="hidden min-[420px]:inline text-zinc-400 font-normal text-[10px]">(Houses & Guardians)</span>
                            </span>
                            <span className="text-[10px] font-medium text-zinc-400 whitespace-nowrap shrink-0">
                              共12宫 · 空宫显守护与飞宫
                            </span>
                          </div>
                          <div className="p-2.5 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {activePrimary.houses.map((h) => {
                              const inHousePlanets = activePrimary.planets.filter(p => p.house === h.number);
                              const isEmpty = inHousePlanets.length === 0;
                              const ruler = ZODIAC_RULERS[h.sign.eng] || { id: '', name: '', symbol: '' };
                              const rulerPlanet = activePrimary.planets.find(p => p.id === ruler.id);
                              const rulerFlyHouse = rulerPlanet ? rulerPlanet.house : null;

                              return (
                                <div
                                  key={h.number}
                                  className={cn(
                                    "px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all duration-200",
                                    isEmpty 
                                      ? "border-red-500/60 bg-gradient-to-r from-red-950/30 via-zinc-950/90 to-zinc-950/90 shadow-[0_0_10px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30" 
                                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 shadow-sm"
                                  )}
                                >
                                  {/* Left: House Badge + House Meaning + Constellation - All on one line */}
                                  <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                                    <span className={cn(
                                      "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0",
                                      isEmpty 
                                        ? "bg-red-500/20 text-red-300 border border-red-500/40" 
                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    )}>
                                      第{h.number}宫
                                    </span>
                                    <span className="text-xs font-bold text-white tracking-wide">
                                      {ASTROLOGY_HOUSE_MEANINGS[h.number]}
                                    </span>
                                    <span className="text-[11px] font-medium text-zinc-400">
                                      {h.sign.symbol}{h.sign.name.replace('座', '')}
                                    </span>
                                  </div>

                                  {/* Right: Resident planets or Empty House Guardian - All on one line */}
                                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap overflow-x-auto no-scrollbar">
                                    {isEmpty ? (
                                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-white font-bold text-[9px] tracking-wide shrink-0 shadow-sm">
                                          空宫
                                        </span>
                                        <span className="text-[11px] font-medium text-red-200 whitespace-nowrap flex items-center gap-1">
                                          <span className="text-zinc-400 text-[10px]">守护</span>
                                          <span className="font-bold text-red-300">{ruler.symbol}{ruler.name}</span>
                                        </span>
                                        {rulerFlyHouse && (
                                          <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50 whitespace-nowrap">
                                            飞{rulerFlyHouse}宫
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 whitespace-nowrap">
                                        {inHousePlanets.map((p) => (
                                          <span
                                            key={p.id}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700/70 text-[11px] font-bold text-zinc-200 whitespace-nowrap shadow-sm"
                                          >
                                            <span className="text-amber-400 font-bold text-xs leading-none">{p.symbol}</span>
                                            <span>{p.name}</span>
                                            {p.isRetrograde && (
                                              <span className="text-[8px] text-rose-400 font-bold">逆</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Section: 星盘能量分布 (Three Distribution Pie/Donut Charts) */}
                    {astrologyDistribution && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
                        <div className="bg-zinc-800/90 px-3.5 py-2 border-b border-zinc-700/80 flex items-center justify-between">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            星盘能量分布 (Energy Distribution)
                          </span>
                          <span className="text-[9px] font-bold text-zinc-500">
                            阴阳 · 元素 · 性质
                          </span>
                        </div>
                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <MiniDonutChart title="阴阳分布" data={astrologyDistribution.polarity} />
                          <MiniDonutChart title="四大元素" data={astrologyDistribution.elements} />
                          <MiniDonutChart title="三大性质" data={astrologyDistribution.modalities} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : activeTab === 'houses' ? (
              <div className="flex flex-col gap-4">
                {(() => {
                   const age = getYearAge(birthDate);
                   const count = age === 0 ? 1 : age; 
                   
                   let targetIndex = 0;
                   if (gender === 1) { // Male: Anti-clockwise starting from bottom middle (index 0)
                      targetIndex = (12 - (count - 1) % 12) % 12;
                   } else { // Female: Clockwise starting from bottom middle (index 0)
                      targetIndex = (count - 1) % 12;
                   }
                   
                   const displayIndex = selectedHouseIndex !== null ? selectedHouseIndex : targetIndex;
                   const activeIcon = THAI_DESTINY_SYMBOLS[displayIndex];
                   
                   return (
                     <>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col items-center gap-3 relative overflow-hidden">
                           <div className="relative z-10 flex flex-col items-center text-center">
                              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-0.5">泰式命宫巡环</h3>
                              <p className="text-xs text-zinc-500 font-bold">性别: {gender === 1 ? "男 (乾)" : "女 (坤)"} | 当前岁数: <span className="text-gold">{age}</span> 岁</p>
                           </div>

                           {/* Interactive Radial Radar Wheel with Authentic Cropped Artwork Icons */}
                           <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96 flex items-center justify-center mx-auto my-1 select-none">
                              {/* Background Astrological Guide Rings & Crosshairs */}
                              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 360 360">
                                 <circle cx="180" cy="180" r="170" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
                                 <circle cx="180" cy="180" r="135" fill="none" stroke="#27272a" strokeWidth="1.5" opacity="0.6" />
                                 <circle cx="180" cy="180" r="95" fill="none" stroke="#27272a" strokeWidth="1" opacity="0.35" />
                                 <line x1="180" y1="20" x2="180" y2="340" stroke="#27272a" strokeWidth="1" opacity="0.4" />
                                 <line x1="20" y1="180" x2="340" y2="180" stroke="#27272a" strokeWidth="1" opacity="0.4" />
                                 <line x1="67" y1="67" x2="293" y2="293" stroke="#27272a" strokeWidth="0.75" opacity="0.25" />
                                 <line x1="67" y1="293" x2="293" y2="67" stroke="#27272a" strokeWidth="0.75" opacity="0.25" />
                              </svg>

                              {/* Center Focus Disk */}
                              <div 
                                className="absolute z-30 rounded-full border-2 border-gold/70 bg-zinc-950/95 shadow-[0_0_35px_rgba(212,175,55,0.3)] flex flex-col items-center justify-center p-2 text-center w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44"
                                style={{
                                  left: '50%',
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                 <img 
                                   src={activeIcon.image} 
                                   alt={activeIcon.name} 
                                   className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                                 />
                                 <span className="text-sm sm:text-base md:text-lg font-black text-white leading-tight mt-1.5 truncate max-w-full">
                                   {activeIcon.name}
                                 </span>
                                 <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-gold leading-tight mt-0.5 px-1 truncate max-w-full">
                                   {activeIcon.meaning}
                                 </span>
                              </div>

                              {/* 12 Circular Outer Nodes with Cropped Authentic Figures */}
                              {THAI_DESTINY_SYMBOLS.map((sym, idx) => {
                                 const angleDeg = 90 + idx * 30; // 0=90° (เจดีย์ at bottom), 1=120° (นาคราช)...
                                 const rad = (angleDeg * Math.PI) / 180;
                                 const R_pct = 37.5;
                                 const leftPct = 50 + R_pct * Math.cos(rad);
                                 const topPct = 50 + R_pct * Math.sin(rad);
                                 const isTarget = idx === targetIndex;
                                 const isSelected = idx === displayIndex;

                                 return (
                                   <button
                                     key={sym.id}
                                     type="button"
                                     onClick={() => setSelectedHouseIndex(idx === selectedHouseIndex ? null : idx)}
                                     style={{
                                       position: 'absolute',
                                       left: `${leftPct}%`,
                                       top: `${topPct}%`,
                                       transform: 'translate(-50%, -50%)',
                                       zIndex: isSelected ? 25 : 15
                                     }}
                                     className="flex flex-col items-center justify-center text-center cursor-pointer group focus:outline-none"
                                   >
                                     <div 
                                       className={cn(
                                         "w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center p-1",
                                         isSelected
                                           ? "border-2 border-gold bg-gold/25 shadow-[0_0_20px_rgba(212,175,55,0.85)] scale-110"
                                           : isTarget
                                             ? "border border-amber-500/80 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                             : "border border-zinc-800 bg-zinc-950/80 hover:border-zinc-600 hover:bg-zinc-900/90"
                                       )}
                                     >
                                       <img 
                                         src={sym.image} 
                                         alt={sym.name} 
                                         className={cn(
                                           "w-full h-full object-contain",
                                           isSelected ? "drop-shadow-[0_0_6px_rgba(212,175,55,0.7)]" : "opacity-80 group-hover:opacity-100"
                                         )}
                                       />
                                     </div>

                                     <span 
                                       className={cn(
                                         "text-[8px] sm:text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded border whitespace-nowrap leading-none",
                                         isSelected
                                           ? "border-gold/60 bg-zinc-950 text-gold font-black shadow-md scale-105"
                                           : isTarget
                                             ? "border-amber-500/40 bg-zinc-950/90 text-amber-300"
                                             : "border-zinc-800/80 bg-zinc-950/70 text-zinc-400 group-hover:text-zinc-200"
                                       )}
                                     >
                                       {sym.name}
                                     </span>
                                   </button>
                                 );
                              })}
                           </div>

                           {/* Active House Summary Card - Single Clean Row */}
                           <div className="w-full bg-zinc-950/90 border border-gold/30 rounded-xl px-3.5 py-2.5 shadow-lg">
                              <div className="flex items-center justify-between gap-2 w-full">
                                 <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-bold text-gold shrink-0">
                                       {selectedHouseIndex !== null && selectedHouseIndex !== targetIndex ? `查看第 ${activeIcon.id + 1} 宫` : `当前第 ${targetIndex + 1} 宫`}
                                    </span>
                                    <span className="text-sm font-black text-white shrink-0">
                                       {activeIcon.name}
                                    </span>
                                    <span className="text-xs text-zinc-400 font-medium truncate">
                                       ({activeIcon.meaning.split('(')[0].trim()})
                                    </span>
                                 </div>
                                 {selectedHouseIndex !== null && selectedHouseIndex !== targetIndex && (
                                   <button
                                     type="button"
                                     onClick={() => setSelectedHouseIndex(null)}
                                     className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30 cursor-pointer"
                                   >
                                     返回第 {targetIndex + 1} 宫
                                   </button>
                                 )}
                              </div>
                           </div>

                           {/* Direction Guidance */}
                           <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest text-zinc-600 border-t border-zinc-800/50 pt-2.5 w-full justify-center">
                              <div className={cn("flex items-center gap-1.5", gender === 0 && "text-gold font-bold")}>
                                 <ChevronLeft className="w-3.5 h-3.5" /> หญิง (女) 顺时针
                              </div>
                              <div className={cn("flex items-center gap-1.5", gender === 1 && "text-gold font-bold")}>
                                 ชาย (男) 逆时针 <ChevronRight className="w-3.5 h-3.5" />
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
                                       <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest w-28 sm:w-36">宫位与名称</th>
                                       <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest">详情解释</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-zinc-800/50">
                                    {THAI_DESTINY_SYMBOLS.map((sym, idx) => (
                                       <tr 
                                         key={idx} 
                                         onClick={() => setSelectedHouseIndex(idx === selectedHouseIndex ? null : idx)}
                                         className={cn(
                                           "hover:bg-zinc-800/30 transition-colors cursor-pointer",
                                           displayIndex === idx && "bg-gold/10"
                                         )}
                                       >
                                          <td className="p-3 flex items-center gap-2.5">
                                             <div className={cn(
                                                "w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center font-black text-xs border p-0.5",
                                                displayIndex === idx 
                                                  ? "bg-gold text-zinc-950 border-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                                                  : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                                             )}>
                                                <img src={sym.image} alt={sym.name} className="w-full h-full object-contain" />
                                             </div>
                                             <div className="flex flex-col">
                                                <span className={cn("text-xs font-black", displayIndex === idx ? "text-gold" : "text-zinc-200")}>{sym.name}</span>
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

      {/* VIEW: LUOPAN (风水罗盘) */}
      {view === 'luopan' && (
        <LuopanView
          onOpenMenu={() => setIsSideMenuOpen(true)}
          lang={lang}
          onToggleLang={handleSetLang}
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

            <div className="flex flex-col gap-1.5 items-center w-full">
              <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold whitespace-nowrap shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="whitespace-nowrap shrink-0 leading-none">{lang === 'zh' ? '按需生成命盘' : 'On-Demand Generation'}</span>
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
