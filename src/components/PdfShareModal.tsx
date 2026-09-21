import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Download, 
  Loader2, 
  Sparkles, 
  Star, 
  Hash, 
  Zap, 
  Mountain, 
  HeartPulse, 
  Link, 
  ShieldQuestion, 
  Crown, 
  CloudLightning, 
  Trophy, 
  Home, 
  Skull, 
  Shield, 
  Calendar,
  CheckCircle2,
  Compass,
  Globe,
  ExternalLink,
  MessageCircle,
  Share2,
  FileText,
  Eye,
  ArrowLeft
} from 'lucide-react';
import { Solar, Lunar } from 'lunar-javascript';
import * as Astronomy from 'astronomy-engine';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import type { SavedClient, AppLanguage } from '../types';

interface PdfShareModalProps {
  client: SavedClient;
  onClose: () => void;
  lang?: AppLanguage;
  reportLogo?: string;
}

// 数字学根数求和 (1-9)
function getRootDigit(num: number | string): number {
  let val = 0;
  if (typeof num === 'string') {
    val = num.split('').reduce((acc, char) => {
      const parsed = parseInt(char, 10);
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);
  } else {
    val = Math.abs(num);
  }
  while (val > 9) {
    val = val.toString().split('').reduce((acc, char) => acc + parseInt(char, 10), 0);
  }
  return val === 0 ? 9 : val;
}

const ZODIAC_SIGNS = [
  { name: '白羊座', eng: 'Aries', symbol: '♈︎' },
  { name: '金牛座', eng: 'Taurus', symbol: '♉︎' },
  { name: '双子座', eng: 'Gemini', symbol: '♊︎' },
  { name: '巨蟹座', eng: 'Cancer', symbol: '♋︎' },
  { name: '狮子座', eng: 'Leo', symbol: '♌︎' },
  { name: '处女座', eng: 'Virgo', symbol: '♍︎' },
  { name: '天秤座', eng: 'Libra', symbol: '♎︎' },
  { name: '天蝎座', eng: 'Scorpio', symbol: '♏︎' },
  { name: '射手座', eng: 'Sagittarius', symbol: '♐︎' },
  { name: '摩羯座', eng: 'Capricorn', symbol: '♑︎' },
  { name: '水瓶座', eng: 'Aquarius', symbol: '♒︎' },
  { name: '双鱼座', eng: 'Pisces', symbol: '♓︎' },
];

const WESTERN_PLANETS = [
  { id: 'Sun', name: '太阳', symbol: '☉', color: '#f59e0b' },
  { id: 'Moon', name: '月亮', symbol: '☽', color: '#38bdf8' },
  { id: 'Mercury', name: '水星', symbol: '☿', color: '#a78bfa' },
  { id: 'Venus', name: '金星', symbol: '♀', color: '#ec4899' },
  { id: 'Mars', name: '火星', symbol: '♂', color: '#ef4444' },
  { id: 'Jupiter', name: '木星', symbol: '♃', color: '#eab308' },
  { id: 'Saturn', name: '土星', symbol: '♄', color: '#d97706' },
  { id: 'Uranus', name: '天王星', symbol: '♅', color: '#06b6d4' },
  { id: 'Neptune', name: '海王星', symbol: '♆', color: '#6366f1' },
  { id: 'Pluto', name: '冥王星', symbol: '♇', color: '#8b5cf6' },
];

// 泰式十二神煞 (包含泰文、英文、中文、图标及颜色)
const THAI_DESTINY_SYMBOLS = [
  { id: 0, thai: "เจดีย์", eng: "Chedi (Pagoda)", name: "佛塔", desc: "福德安泰", icon: Mountain, color: "text-emerald-400", hex: "#34d399" },
  { id: 1, thai: "นาคราช", eng: "Nakkarat (Naga)", name: "龙王", desc: "权势聚财", icon: Zap, color: "text-blue-400", hex: "#60a5fa" },
  { id: 2, thai: "แม่มด", eng: "Mae Mod (Sorceress)", name: "女巫", desc: "灵感魅力", icon: Sparkles, color: "text-purple-400", hex: "#c084fc" },
  { id: 3, thai: "พ่อหมอ", eng: "Pho Mo (Old Doctor)", name: "神医", desc: "贵人智慧", icon: HeartPulse, color: "text-rose-400", hex: "#fb7185" },
  { id: 4, thai: "คนต้องขอดา", eng: "Khon Tong Kho Ka", name: "枷锁", desc: "韬晦自立", icon: Link, color: "text-zinc-500", hex: "#71717a" },
  { id: 5, thai: "เทวดาขี่เต่า", eng: "Thevada Khi Tao", name: "仙人", desc: "稳健长青", icon: ShieldQuestion, color: "text-amber-400", hex: "#fbbf24" },
  { id: 6, thai: "ฉัตรทอง", eng: "Chat Thong", name: "金伞", desc: "名盛显荣", icon: Crown, color: "text-[#d4af37]", hex: "#d4af37" },
  { id: 7, thai: "ราหู", eng: "Rahu", name: "罗睺", desc: "破局变迁", icon: CloudLightning, color: "text-rose-500", hex: "#f43f5e" },
  { id: 8, thai: "ปราสาท", eng: "Prasat (Palace)", name: "城堡", desc: "晋升立业", icon: Trophy, color: "text-amber-300", hex: "#fcd34d" },
  { id: 9, thai: "เรือนหลวง", eng: "Ruean Luang", name: "皇家府第", desc: "荣禄安康", icon: Home, color: "text-indigo-400", hex: "#818cf8" },
  { id: 10, thai: "คนคอขาด", eng: "Khon Kho Khat", name: "断颈", desc: "慎行避险", icon: Skull, color: "text-red-500", hex: "#ef4444" },
  { id: 11, thai: "ฉัตรเงิน", eng: "Chat Ngoen", name: "银伞", desc: "天神护持", icon: Shield, color: "text-zinc-300", hex: "#d4d4d8" },
];

// 数字学 NUMEROLOGY 矩阵渲染组件 (匹配用户需求：字体与宽度自动响应，防换行压缩)
function NumerologyMatrixView({
  birthYear,
  birthMonth,
  birthDay,
  coreVal,
  currentYear,
  matrixRows,
  baseValues,
  numDimensions,
  isPdf = false
}: {
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  coreVal: number;
  currentYear: number;
  matrixRows: Array<{ label: string; base?: number; type?: 'year' | 'month' }>;
  baseValues: number[];
  numDimensions: Array<{ label: string; val: number; planet: string }>;
  isPdf?: boolean;
}) {
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const nianVal = getRootDigit(coreVal.toString() + currentYear.toString());

  return (
    <div 
      style={{ backgroundColor: '#11131a', borderColor: '#272935' }}
      className={`border rounded-xl ${isPdf ? 'p-3' : 'p-3 sm:p-4'} flex flex-col gap-2.5 shadow-md`}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <Hash className="w-3.5 h-3.5 text-[#d4af37]" />
        <h3 className="text-xs font-black text-white tracking-wide">
          数字学 NUMEROLOGY
        </h3>
      </div>

      {/* 4 个数据卡片：年份 / 月份 / 日期 / 核心数 */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <div 
          style={{ backgroundColor: '#090a0f', borderColor: '#222533' }} 
          className="border rounded-lg p-1.5 sm:p-2 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">年份</span>
          <span className="text-sm sm:text-base md:text-lg font-black text-[#d4af37] font-mono leading-tight mt-0.5 truncate">{birthYear}</span>
        </div>
        <div 
          style={{ backgroundColor: '#090a0f', borderColor: '#222533' }} 
          className="border rounded-lg p-1.5 sm:p-2 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">月份</span>
          <span className="text-sm sm:text-base md:text-lg font-black text-[#d4af37] font-mono leading-tight mt-0.5 truncate">{birthMonth}</span>
        </div>
        <div 
          style={{ backgroundColor: '#090a0f', borderColor: '#222533' }} 
          className="border rounded-lg p-1.5 sm:p-2 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">日期</span>
          <span className="text-sm sm:text-base md:text-lg font-black text-[#d4af37] font-mono leading-tight mt-0.5 truncate">{birthDay}</span>
        </div>
        <div 
          style={{ backgroundColor: '#090a0f', borderColor: '#222533' }} 
          className="border rounded-lg p-1.5 sm:p-2 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap">核心数</span>
          <span className="text-sm sm:text-base md:text-lg font-black text-[#d4af37] font-mono leading-tight mt-0.5 truncate">{coreVal}</span>
        </div>
      </div>

      {/* 12 个月流月走势矩阵表格：带有手机端防挤压及字体平滑自适应 */}
      <div 
        style={{ backgroundColor: '#090a0f', borderColor: '#222533' }}
        className="border rounded-lg overflow-x-auto custom-scrollbar"
      >
        <table className={`w-full text-center border-collapse ${isPdf ? 'table-fixed' : 'min-w-[360px] sm:min-w-full'}`}>
          <thead>
            <tr style={{ backgroundColor: '#181a24', borderBottom: '1px solid #272a38' }}>
              <th className="py-1 px-1 sm:px-1.5 text-[8px] min-[380px]:text-[9px] sm:text-[10px] font-bold text-zinc-400 text-left w-10 sm:w-14 whitespace-nowrap">类别</th>
              {months.map(m => (
                <th key={m} className="py-1 px-0.5 text-[8px] min-[380px]:text-[9px] sm:text-[10px] font-bold text-zinc-300 whitespace-nowrap">
                  {m}月
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-xs">
            {matrixRows.map((row, rIdx) => {
              const isYearRow = row.type === 'year';
              const isMonthRow = row.type === 'month';

              return (
                <tr key={rIdx} className="hover:bg-zinc-900/30 transition-colors">
                  <td className="py-1 px-1 sm:px-1.5 text-[8px] min-[380px]:text-[9px] sm:text-[10px] font-bold text-zinc-300 text-left whitespace-nowrap">
                    {row.label}
                  </td>
                  {months.map(m => {
                    const monthlyFlowVal = getRootDigit(coreVal.toString() + currentYear.toString() + m.toString());

                    let cellVal: number;
                    let isHighlighted = false;
                    let isGoldText = false;

                    if (isYearRow) {
                      cellVal = nianVal;
                    } else if (isMonthRow) {
                      cellVal = monthlyFlowVal;
                      isHighlighted = baseValues.includes(monthlyFlowVal);
                      if (!isHighlighted) {
                        isGoldText = true;
                      }
                    } else {
                      cellVal = row.base || 0;
                      isHighlighted = cellVal === monthlyFlowVal;
                    }

                    return (
                      <td key={m} className="py-1 px-0.5 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          {isHighlighted ? (
                            <div 
                              style={{
                                borderColor: 'rgba(34, 197, 94, 0.8)',
                                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ade80'
                              }}
                              className="w-4 h-4 min-[380px]:w-5 min-[380px]:h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-[8px] min-[380px]:text-[9px] sm:text-xs font-black font-mono shadow-sm leading-none"
                            >
                              {cellVal}
                            </div>
                          ) : (
                            <span 
                              style={{
                                color: isGoldText ? '#d4af37' : 'rgba(255, 255, 255, 0.38)'
                              }}
                              className={`text-[8px] min-[380px]:text-[9px] sm:text-xs font-mono leading-none ${isGoldText ? 'font-black' : 'font-semibold'}`}
                            >
                              {cellVal}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 数理指标：项目 · 号码 · 行星 */}
      <div className="flex flex-col gap-1.5 mt-0.5">
        <div className="flex items-center justify-between text-[11px] font-bold px-0.5">
          <span className="text-[#d4af37] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
            数理指标
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">项目 · 号码 · 行星</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5">
          {numDimensions.map((item, idx) => (
            <div 
              key={idx}
              style={{ backgroundColor: '#090a0f', borderColor: '#222533' }}
              className="border rounded-lg p-1.5 flex flex-col items-center justify-center text-center shadow-sm"
            >
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-bold whitespace-nowrap">{item.label}</span>
              <span className="text-sm sm:text-base font-black text-[#d4af37] font-mono leading-tight my-0.5">{item.val}</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-300 font-medium whitespace-nowrap">({item.planet})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 泰式命宫巡环渲染组件
function ThaiDestinyWheelView({
  client,
  age,
  thaiIndex,
  activeThaiSymbol,
  isPdf = false
}: {
  client: SavedClient;
  age: number;
  thaiIndex: number;
  activeThaiSymbol: typeof THAI_DESTINY_SYMBOLS[0];
  isPdf?: boolean;
}) {
  const isMale = client.gender === 'male';

  return (
    <div 
      style={{ backgroundColor: '#11131a', borderColor: '#272935' }}
      className={`border rounded-xl ${isPdf ? 'p-2.5' : 'p-3 sm:p-4'} flex flex-col gap-1.5 shadow-md`}
    >
      {/* 页眉 */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#d4af37]" />
          <h3 className="text-xs sm:text-sm font-black text-white tracking-wide">
            泰式命宫巡环
          </h3>
        </div>
        <div className="text-[10px] sm:text-xs text-zinc-300 font-bold">
          <span>性别: <span className="text-[#d4af37]">{isMale ? '男 (乾)' : '女 (坤)'}</span></span>
          <span className="mx-1.5 text-zinc-600">|</span>
          <span>当前岁数: <span className="text-[#d4af37]">{age} 岁</span></span>
        </div>
      </div>

      {/* 命盘圆环主体 */}
      <div className="relative w-full flex items-center justify-center my-0.5">
        <div 
          style={{ width: isPdf ? '280px' : '300px', height: isPdf ? '280px' : '300px' }}
          className="relative max-w-full"
        >
          {/* 背景刻度圆弧与十字线 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 360">
            <circle cx="180" cy="180" r="170" fill="none" stroke="#222533" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <circle cx="180" cy="180" r="135" fill="none" stroke="#272a38" strokeWidth="1.5" />
            <circle cx="180" cy="180" r="95" fill="none" stroke="#1f2230" strokeWidth="1" opacity="0.6" />

            <line x1="180" y1="20" x2="180" y2="340" stroke="#1f2230" strokeWidth="1" opacity="0.5" />
            <line x1="20" y1="180" x2="340" y2="180" stroke="#1f2230" strokeWidth="1" opacity="0.5" />
            <line x1="67" y1="67" x2="293" y2="293" stroke="#1c1f2b" strokeWidth="0.75" opacity="0.3" />
            <line x1="67" y1="293" x2="293" y2="67" stroke="#1c1f2b" strokeWidth="0.75" opacity="0.3" />
          </svg>

          {/* 12 个泰式命宫象征环绕排列 */}
          {THAI_DESTINY_SYMBOLS.map((sym, idx) => {
            const angleDeg = 90 + idx * 30; // 0=90° (底部 6点钟 เจดีย์), 1=120° (นาคราช)...
            const rad = (angleDeg * Math.PI) / 180;
            const R_pct = 37.5;
            const leftPct = 50 + R_pct * Math.cos(rad);
            const topPct = 50 + R_pct * Math.sin(rad);
            const isActive = idx === thaiIndex;
            const IconC = sym.icon;

            return (
              <div 
                key={sym.id}
                style={{
                  position: 'absolute',
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isActive ? 20 : 10
                }}
                className="flex flex-col items-center justify-center text-center cursor-default pointer-events-none"
              >
                {/* 徽标圆圈 */}
                <div 
                  style={{
                    backgroundColor: isActive ? 'rgba(250, 204, 21, 0.18)' : '#0f1118',
                    borderColor: isActive ? '#facc15' : '#272935',
                    boxShadow: isActive ? '0 0 16px rgba(250, 204, 21, 0.6)' : 'none'
                  }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all ${
                    isActive ? 'border-2 scale-110' : ''
                  }`}
                >
                  <IconC 
                    style={{ color: isActive ? '#facc15' : '#71717a' }}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4" 
                  />
                </div>

                {/* 泰文标签 */}
                <span 
                  style={{
                    color: isActive ? '#facc15' : '#71717a',
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.85)' : 'rgba(9, 10, 15, 0.7)',
                    borderColor: isActive ? 'rgba(250, 204, 21, 0.4)' : '#1e202a'
                  }}
                  className={`text-[7px] sm:text-[8px] font-bold mt-0.5 px-1 py-0.2 rounded border whitespace-nowrap leading-none ${
                    isActive ? 'font-black scale-105' : ''
                  }`}
                >
                  {sym.thai}
                </span>
              </div>
            );
          })}

          {/* 中心焦点圆盘 */}
          <div 
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '96px',
              height: '96px',
              backgroundColor: '#090a0f',
              borderColor: '#d4af37',
              boxShadow: '0 0 24px rgba(212, 175, 55, 0.28)'
            }}
            className="rounded-full border-2 flex flex-col items-center justify-center p-1.5 z-30 text-center"
          >
            {(() => {
              const ActiveIcon = activeThaiSymbol.icon;
              return (
                <ActiveIcon 
                  style={{ color: activeThaiSymbol.hex }}
                  className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-md" 
                />
              );
            })()}
            <span className="text-xs sm:text-sm font-black text-white leading-tight mt-1 truncate max-w-full">
              {activeThaiSymbol.thai}
            </span>
            <span className="text-[8px] sm:text-[9px] font-bold text-[#facc15] leading-tight mt-0.5 px-1 truncate max-w-full">
              {activeThaiSymbol.eng}
            </span>
          </div>
        </div>
      </div>

      {/* 顺逆时针导向指示条 */}
      <div className="flex items-center justify-center gap-8 sm:gap-12 pt-1 border-t border-zinc-800/80 text-[10px] sm:text-xs">
        <span 
          style={{ color: !isMale ? '#facc15' : '#52525b' }}
          className={`flex items-center gap-1 font-bold ${!isMale ? 'font-black drop-shadow-sm' : ''}`}
        >
          <span>&lt;</span>
          <span>หญิง (女) 顺时针</span>
        </span>
        <span 
          style={{ color: isMale ? '#facc15' : '#52525b' }}
          className={`flex items-center gap-1 font-bold ${isMale ? 'font-black drop-shadow-sm' : ''}`}
        >
          <span>ชาย (男) 逆时针</span>
          <span>&gt;</span>
        </span>
      </div>
    </div>
  );
}

// 西洋占星全息视图组件 (包含星盘轮盘、四角上升中天、10大行星位置表、完整相位分析)
function WesternAstrologyFullView({
  westernData,
  aspects,
  isPdf = false
}: {
  westernData: {
    planets: Array<{
      id: string;
      name: string;
      symbol: string;
      longitude: number;
      signIndex: number;
      degree: number;
      sign: { name: string; eng: string; symbol: string };
      isRetrograde: boolean;
      house: number;
    }>;
    asc: number;
    ascSign: { name: string; eng: string; symbol: string };
    ascDeg: number;
    mc: number;
    mcSign: { name: string; eng: string; symbol: string };
    mcDeg: number;
    dsc: number;
    dscSign: { name: string; eng: string; symbol: string };
    ic: number;
    icSign: { name: string; eng: string; symbol: string };
    houses: Array<{ number: number; sign: { name: string; eng: string; symbol: string } }>;
  };
  aspects: Array<{
    p1: { id: string; name: string; symbol: string; longitude: number };
    p2: { id: string; name: string; symbol: string; longitude: number };
    aspect: { name: string; symbol: string; angle: number; orb: number; color: string; textColor: string };
    diff: number;
    orbErr: number;
  }>;
  isPdf?: boolean;
}) {
  const offset = westernData.asc - 180;

  const elementFills: Record<string, string> = {
    'Aries': 'rgba(239, 68, 68, 0.25)',
    'Leo': 'rgba(239, 68, 68, 0.25)',
    'Sagittarius': 'rgba(239, 68, 68, 0.25)',
    'Taurus': 'rgba(16, 185, 129, 0.25)',
    'Virgo': 'rgba(16, 185, 129, 0.25)',
    'Capricorn': 'rgba(16, 185, 129, 0.25)',
    'Gemini': 'rgba(245, 158, 11, 0.25)',
    'Libra': 'rgba(245, 158, 11, 0.25)',
    'Aquarius': 'rgba(245, 158, 11, 0.25)',
    'Cancer': 'rgba(56, 189, 248, 0.25)',
    'Scorpio': 'rgba(56, 189, 248, 0.25)',
    'Pisces': 'rgba(56, 189, 248, 0.25)',
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 上半部分：左侧星盘与四角，右侧行星位置表 (在 PDF 下为两列并排，在移动端自适应) */}
      <div className={`grid ${isPdf ? 'grid-cols-2 gap-3' : 'grid-cols-1 lg:grid-cols-2 gap-3'}`}>
        
        {/* 左侧：星盘轮盘 + 4 轴角度 */}
        <div 
          style={{ backgroundColor: '#11131a', borderColor: '#272935' }}
          className="border rounded-xl p-3 flex flex-col items-center justify-start gap-2 shadow-md"
        >
          <div className="flex items-center justify-between w-full border-b border-zinc-800 pb-1.5 mb-1">
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
              <h3 className="text-xs font-black text-white tracking-wide">本命星盘</h3>
            </div>
            <span className="text-[10px] text-[#d4af37] font-bold">整宫制 (Whole Sign)</span>
          </div>

          {/* SVG 轮盘 */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-1">
            <svg viewBox="0 0 400 400" className="w-full h-full overflow-visible">
              <defs>
                <filter id="glow-pdf" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 1. 外同心圆环 */}
              <circle cx="200" cy="200" r="195" fill="none" stroke="#3f3f46" strokeWidth="1.5" />
              <circle cx="200" cy="200" r="160" fill="#090a0f" stroke="#27272a" strokeWidth="1" />
              <circle cx="200" cy="200" r="125" fill="#000000" stroke="#27272a" strokeWidth="1" />
              <circle cx="200" cy="200" r="32" fill="#0c0d14" stroke="#27272a" strokeWidth="1" />

              {/* 2. 十二星座扇区 (160-195) */}
              {ZODIAC_SIGNS.map((sign, i) => {
                const startAngle = i * 30 - offset;
                const endAngle = (i + 1) * 30 - offset;
                const midAngle = startAngle + 15;
                const fillCol = elementFills[sign.eng] || 'rgba(39, 39, 42, 0.3)';

                const x1 = 200 + 160 * Math.cos(startAngle * Math.PI / 180);
                const y1 = 200 + 160 * Math.sin(startAngle * Math.PI / 180);
                const x2 = 200 + 195 * Math.cos(startAngle * Math.PI / 180);
                const y2 = 200 + 195 * Math.sin(startAngle * Math.PI / 180);
                const x3 = 200 + 195 * Math.cos(endAngle * Math.PI / 180);
                const y3 = 200 + 195 * Math.sin(endAngle * Math.PI / 180);
                const x4 = 200 + 160 * Math.cos(endAngle * Math.PI / 180);
                const y4 = 200 + 160 * Math.sin(endAngle * Math.PI / 180);

                const path = `M ${x1} ${y1} L ${x2} ${y2} A 195 195 0 0 1 ${x3} ${y3} L ${x4} ${y4} A 160 160 0 0 0 ${x1} ${y1}`;
                const sx = 200 + 178 * Math.cos(midAngle * Math.PI / 180);
                const sy = 200 + 178 * Math.sin(midAngle * Math.PI / 180);

                return (
                  <g key={i}>
                    <path d={path} fill={fillCol} stroke="#27272a" strokeWidth="0.8" />
                    <text 
                      x={sx} 
                      y={sy} 
                      fill="#ffffff" 
                      fontSize="11" 
                      fontWeight="bold" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                    >
                      {sign.symbol}
                    </text>
                  </g>
                );
              })}

              {/* 3. 宫位划分线 (125-160) */}
              {westernData.houses.map((h, i) => {
                const houseStartSign = ZODIAC_SIGNS.findIndex(s => s.eng === h.sign.eng);
                const angle = (houseStartSign * 30) - offset;
                const x1 = 200 + 125 * Math.cos(angle * Math.PI / 180);
                const y1 = 200 + 125 * Math.sin(angle * Math.PI / 180);
                const x2 = 200 + 160 * Math.cos(angle * Math.PI / 180);
                const y2 = 200 + 160 * Math.sin(angle * Math.PI / 180);

                const midAngle = angle + 15;
                const nx = 200 + 142 * Math.cos(midAngle * Math.PI / 180);
                const ny = 200 + 142 * Math.sin(midAngle * Math.PI / 180);

                return (
                  <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3f3f46" strokeWidth="0.8" />
                    <text 
                      x={nx} 
                      y={ny} 
                      fill="#71717a" 
                      fontSize="8" 
                      fontWeight="black" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                    >
                      {h.number}
                    </text>
                  </g>
                );
              })}

              {/* 4. 相位连线 (内环 < 125) */}
              {aspects.map((asp, idx) => {
                const r = 125;
                const x1 = 200 + r * Math.cos((asp.p1.longitude - offset) * Math.PI / 180);
                const y1 = 200 + r * Math.sin((asp.p1.longitude - offset) * Math.PI / 180);
                const x2 = 200 + r * Math.cos((asp.p2.longitude - offset) * Math.PI / 180);
                const y2 = 200 + r * Math.sin((asp.p2.longitude - offset) * Math.PI / 180);

                const isSquare = asp.aspect.angle === 90;
                const isOpposition = asp.aspect.angle === 180;

                return (
                  <line 
                    key={idx}
                    x1={x1} 
                    y1={y1} 
                    x2={x2} 
                    y2={y2}
                    stroke={asp.aspect.color}
                    strokeWidth={isSquare || isOpposition ? '1.5' : '1'}
                    strokeDasharray={isSquare ? '3 2' : 'none'}
                    opacity={isSquare || isOpposition ? 0.75 : 0.45}
                  />
                );
              })}

              {/* 5. 行星分布标示 */}
              {(() => {
                const positionedPlanets = [...westernData.planets].sort((a, b) => a.longitude - b.longitude);
                const labels: Array<{ x: number; y: number; symbol: string; id: string; angle: number; isRetrograde: boolean }> = [];

                positionedPlanets.forEach((p, idx) => {
                  const baseAngle = (p.longitude - offset) * Math.PI / 180;
                  let r = 108;
                  if (idx > 0) {
                    const prev = positionedPlanets[idx - 1];
                    if (Math.abs(p.longitude - prev.longitude) < 8) {
                      r = idx % 2 === 0 ? 112 : 92;
                    }
                  }
                  const x = 200 + r * Math.cos(baseAngle);
                  const y = 200 + r * Math.sin(baseAngle);
                  labels.push({ x, y, symbol: p.symbol, id: p.id, angle: baseAngle, isRetrograde: p.isRetrograde });
                });

                return labels.map((p, i) => (
                  <g key={i}>
                    <line 
                      x1={200 + 125 * Math.cos(p.angle)} 
                      y1={200 + 125 * Math.sin(p.angle)}
                      x2={p.x} 
                      y2={p.y}
                      stroke="#52525b" 
                      strokeWidth="0.5" 
                    />
                    <circle cx={p.x} cy={p.y} r="1.8" fill="#d4af37" />
                    <g transform={`translate(${p.x}, ${p.y - 8})`}>
                      <text 
                        fill="#ffffff" 
                        fontSize="14" 
                        fontFamily="serif"
                        textAnchor="middle" 
                        dominantBaseline="middle"
                      >
                        {p.symbol}
                      </text>
                      {p.isRetrograde && (
                        <text 
                          x="6" 
                          y="3"
                          fill="#ef4444" 
                          fontSize="7" 
                          fontWeight="black" 
                          textAnchor="start"
                        >
                          R
                        </text>
                      )}
                    </g>
                  </g>
                ));
              })()}

              {/* 6. 四大轴线 (ASC, DSC, MC, IC) */}
              <line x1={200 - 125} y1={200} x2={200 - 188} y2={200} stroke="#10b981" strokeWidth="2" />
              <text x={200 - 192} y={200} fill="#34d399" fontSize="8" fontWeight="black" textAnchor="end" dominantBaseline="middle">ASC</text>

              <line x1={200 + 125} y1={200} x2={200 + 188} y2={200} stroke="#ef4444" strokeWidth="2" />
              <text x={200 + 192} y={200} fill="#f87171" fontSize="8" fontWeight="black" textAnchor="start" dominantBaseline="middle">DSC</text>

              {(() => {
                const mcAngle = (westernData.mc - offset) * Math.PI / 180;
                return (
                  <>
                    <line 
                      x1={200 + 125 * Math.cos(mcAngle)} 
                      y1={200 + 125 * Math.sin(mcAngle)}
                      x2={200 + 188 * Math.cos(mcAngle)} 
                      y2={200 + 188 * Math.sin(mcAngle)}
                      stroke="#f59e0b" 
                      strokeWidth="2" 
                    />
                    <text 
                      x={200 + 192 * Math.cos(mcAngle)} 
                      y={200 + 192 * Math.sin(mcAngle)} 
                      fill="#fbbf24" 
                      fontSize="8" 
                      fontWeight="black" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                    >
                      MC
                    </text>
                  </>
                );
              })()}

              {(() => {
                const icAngle = (westernData.ic - offset) * Math.PI / 180;
                return (
                  <>
                    <line 
                      x1={200 + 125 * Math.cos(icAngle)} 
                      y1={200 + 125 * Math.sin(icAngle)}
                      x2={200 + 188 * Math.cos(icAngle)} 
                      y2={200 + 188 * Math.sin(icAngle)}
                      stroke="#38bdf8" 
                      strokeWidth="2" 
                    />
                    <text 
                      x={200 + 192 * Math.cos(icAngle)} 
                      y={200 + 192 * Math.sin(icAngle)} 
                      fill="#38bdf8" 
                      fontSize="8" 
                      fontWeight="black" 
                      textAnchor="middle" 
                      dominantBaseline="middle"
                    >
                      IC
                    </text>
                  </>
                );
              })()}
            </svg>
          </div>

          {/* 4 轴角度小卡片 */}
          <div className="grid grid-cols-4 gap-1 w-full text-center text-[9px] font-bold mt-1">
            <div className="p-1 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 flex flex-col">
              <span className="text-[7.5px] text-emerald-500 uppercase font-black">上升 ASC</span>
              <span className="truncate">{westernData.ascSign.name} {Math.floor(westernData.ascDeg)}°</span>
            </div>
            <div className="p-1 rounded bg-amber-950/40 border border-amber-800/50 text-amber-400 flex flex-col">
              <span className="text-[7.5px] text-amber-500 uppercase font-black">中天 MC</span>
              <span className="truncate">{westernData.mcSign.name} {Math.floor(westernData.mcDeg)}°</span>
            </div>
            <div className="p-1 rounded bg-rose-950/40 border border-rose-800/50 text-rose-400 flex flex-col">
              <span className="text-[7.5px] text-rose-500 uppercase font-black">下降 DSC</span>
              <span className="truncate">{westernData.dscSign.name}</span>
            </div>
            <div className="p-1 rounded bg-sky-950/40 border border-sky-800/50 text-sky-400 flex flex-col">
              <span className="text-[7.5px] text-sky-500 uppercase font-black">天底 IC</span>
              <span className="truncate">{westernData.icSign.name}</span>
            </div>
          </div>
        </div>

        {/* 右侧：10 大行星位置数据表 */}
        <div 
          style={{ backgroundColor: '#11131a', borderColor: '#272935' }}
          className="border rounded-xl p-3 flex flex-col justify-start gap-2 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-[#d4af37]" />
              <h3 className="text-xs font-black text-white tracking-wide">行星位置 (Planets)</h3>
            </div>
            <span className="text-[10px] text-zinc-400">10大星体</span>
          </div>

          <div className="border border-zinc-800 rounded-lg overflow-x-auto no-scrollbar bg-black/40">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-zinc-900/90 text-[9px] text-zinc-400 font-bold border-b border-zinc-800 whitespace-nowrap">
                  <th className="py-1 px-2 whitespace-nowrap">行星</th>
                  <th className="py-1 px-1.5 whitespace-nowrap">落入星座</th>
                  <th className="py-1 px-1.5 whitespace-nowrap">度数</th>
                  <th className="py-1 px-1.5 text-center whitespace-nowrap">宫位</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-[10px]">
                {westernData.planets.map((p, i) => (
                  <tr key={i} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-1 px-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                        <span className="text-xs font-serif text-[#d4af37] shrink-0">{p.symbol}</span>
                        <span className="font-bold text-white whitespace-nowrap shrink-0">{p.name}</span>
                        {p.isRetrograde && (
                          <span className="text-[7.5px] px-1 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/80 font-black shrink-0 whitespace-nowrap leading-none inline-block">
                            逆行
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1 px-1.5 text-zinc-300 font-medium whitespace-nowrap">
                      {p.sign.name} <span className="text-zinc-500 text-[8.5px]">({p.sign.eng})</span>
                    </td>
                    <td className="py-1 px-1.5 font-mono text-zinc-300 whitespace-nowrap">
                      {Math.floor(p.degree)}° {Math.floor((p.degree % 1) * 60)}'
                    </td>
                    <td className="py-1 px-1.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-black text-[#d4af37]">
                        {p.house}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 下半部分：完整相位分析 (ASPECTS) - 全量展示，绝不截断或隐藏 */}
      <div 
        style={{ backgroundColor: '#11131a', borderColor: '#272935' }}
        className="border rounded-xl p-3 flex flex-col gap-2 shadow-md"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#d4af37]" />
            <h3 className="text-xs font-black text-white tracking-wide">
              相位分析 (ASPECTS)
            </h3>
          </div>
          <span className="text-[10px] text-[#d4af37] font-bold">
            共 {aspects.length} 个主要相位 (全量数据)
          </span>
        </div>

        {aspects.length === 0 ? (
          <div className="py-4 text-center text-xs text-zinc-500">无主要相位</div>
        ) : (
          <div className={`grid ${isPdf ? 'grid-cols-3 gap-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5'}`}>
            {aspects.map((asp, idx) => (
              <div 
                key={idx}
                style={{ backgroundColor: '#090a0f', borderColor: '#222533' }}
                className="border rounded-lg px-2 py-1 flex items-center justify-between shadow-sm text-[9.5px]"
              >
                <div className="flex items-center gap-1 font-bold text-white truncate">
                  <span className="text-[#d4af37] font-serif">{asp.p1.symbol}</span>
                  <span className="truncate">{asp.p1.name}</span>
                </div>

                <div className="flex items-center gap-1 mx-1 shrink-0">
                  <span style={{ color: asp.aspect.color }} className="font-bold">
                    {asp.aspect.symbol} {asp.aspect.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-bold text-white truncate">
                  <span className="truncate">{asp.p2.name}</span>
                  <span className="text-[#d4af37] font-serif">{asp.p2.symbol}</span>
                </div>

                <div className="text-[8px] font-mono text-zinc-500 shrink-0 ml-1">
                  Err:{asp.orbErr.toFixed(1)}°
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TWELVE_HOUSES_TITLES = [
  '命宫', '财帛', '兄弟', '田宅',
  '子女', '奴仆', '夫妻', '疾厄',
  '迁移', '官禄', '福德', '相貌'
];

const PLANET_MAP: Record<number, string> = {
  1: '太阳', 2: '月亮', 3: '火星', 4: '水星',
  5: '木星', 6: '金星', 7: '土星', 8: '天王', 9: '海王'
};

const NUMEROLOGY_TRAITS: Record<number, { title: string; keywords: string }> = {
  1: { title: '开拓数', keywords: '独立果敢' },
  2: { title: '沟通数', keywords: '温和共情' },
  3: { title: '行动数', keywords: '创意活力' },
  4: { title: '稳重数', keywords: '务实严谨' },
  5: { title: '变革数', keywords: '机动应变' },
  6: { title: '奉献数', keywords: '仁爱担当' },
  7: { title: '智慧数', keywords: '哲思敏锐' },
  8: { title: '实业数', keywords: '统御大局' },
  9: { title: '大爱数', keywords: '圆满升华' }
};

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
  '癸甲': '伤官', '癸乙': '食神', '癸丙': '正财', '癸丁': '偏财', '癸戊': '正官', '癸己': '七杀', '癸庚': '正印', '癸辛': '偏印', '癸壬': '劫财', '癸癸': '比肩'
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

const getShiShenShort = (ss: string) => {
  const map: Record<string, string> = {
    '比肩': '比', '劫财': '劫', '食神': '食', '伤官': '伤',
    '偏财': '才', '正财': '财', '七杀': '杀', '正官': '官',
    '偏印': '枭', '正印': '印', '日主': '主', '元男': '主', '元女': '主'
  };
  return map[ss] || ss.slice(0, 2);
};

const getBaziColorHex = (char: string) => {
  const mapping: Record<string, string> = {
    '甲': '#10b981', '乙': '#10b981', '寅': '#10b981', '卯': '#10b981',
    '丙': '#ef4444', '丁': '#ef4444', '巳': '#ef4444', '午': '#ef4444',
    '戊': '#f59e0b', '己': '#f59e0b', '辰': '#f59e0b', '戌': '#f59e0b', '丑': '#f59e0b', '未': '#f59e0b',
    '庚': '#d4af37', '辛': '#d4af37', '申': '#d4af37', '酉': '#d4af37',
    '壬': '#38bdf8', '癸': '#38bdf8', '亥': '#38bdf8', '子': '#38bdf8'
  };
  return mapping[char] || '#ffffff';
};

const JIE_QI_TERMS = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

export default function PdfShareModal({ client, onClose, reportLogo }: PdfShareModalProps) {
  const [activePreviewPage, setActivePreviewPage] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showDownloadSuccessModal, setShowDownloadSuccessModal] = useState(false);
  const [showFullscreenReader, setShowFullscreenReader] = useState(false);
  const [showWhatsAppHelpModal, setShowWhatsAppHelpModal] = useState(false);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);

  // Logo 优先顺序：外部传入 > 本地存储
  const currentLogo = reportLogo || localStorage.getItem('company_logo') || '';

  // 生成日期格式化 YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // 计算年龄
  const age = useMemo(() => {
    if (!client.birthDate) return 30;
    const [y, m, d] = client.birthDate.split('-').map(Number);
    const today = new Date();
    let calculatedAge = today.getFullYear() - y;
    const monthDiff = today.getMonth() + 1 - m;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
      calculatedAge--;
    }
    return Math.max(0, calculatedAge);
  }, [client.birthDate]);

  // 计算命盘全套核心数据
  const analysisData = useMemo(() => {
    try {
      const [y, m, d] = (client.birthDate || '1990-01-01').split('-').map(Number);
      const [hh, mm] = (client.birthTime || '12:00').split(':').map(Number);
      const genderNum = client.gender === 'male' ? 1 : 0;
      const currentYear = new Date().getFullYear();

      // 1. 八字核心排盘
      const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
      const lunar = solar.getLunar();
      const eightChar = lunar.getEightChar();
      const yun = eightChar.getYun(genderNum);

      const daYunList = yun.getDaYun();
      let currentDaYun = daYunList[1] || daYunList[0];
      for (const dy of daYunList) {
        if (currentYear >= dy.getStartYear() && currentYear <= dy.getEndYear()) {
          currentDaYun = dy;
          break;
        }
      }

      const liuNianList = currentDaYun.getLiuNian();
      let currentLiuNian = liuNianList[0];
      for (const ln of liuNianList) {
        if (ln.getYear() === currentYear) {
          currentLiuNian = ln;
          break;
        }
      }

      const liuYueList = currentLiuNian.getLiuYue();

      const formatPillar = (label: string, ageYear: string, gan: string, zhi: string, shiShen: string, naYin: string) => ({
        label,
        ageYear,
        gan,
        zhi,
        shiShen,
        naYin
      });

      const dayGan = eightChar.getDayGan();
      const pillars = [
        formatPillar('时柱', '归宿', eightChar.getTimeGan(), eightChar.getTimeZhi(), eightChar.getTimeShiShenGan(), eightChar.getTimeNaYin()),
        formatPillar('日柱', '日元', dayGan, eightChar.getDayZhi(), genderNum === 1 ? '元男' : '元女', eightChar.getDayNaYin()),
        formatPillar('月柱', '青年', eightChar.getMonthGan(), eightChar.getMonthZhi(), eightChar.getMonthShiShenGan(), eightChar.getMonthNaYin()),
        formatPillar('年柱', '祖辈', eightChar.getYearGan(), eightChar.getYearZhi(), eightChar.getYearShiShenGan(), eightChar.getYearNaYin()),
        formatPillar('大运', `${currentDaYun.getStartAge()}岁`, currentDaYun.getGanZhi().substring(0, 1), currentDaYun.getGanZhi().substring(1, 2), getShiShenFromGans(dayGan, currentDaYun.getGanZhi().substring(0, 1)), currentDaYun.getNaYin ? currentDaYun.getNaYin() : '长流水'),
        formatPillar('流年', `${currentYear}`, currentLiuNian.getGanZhi().substring(0, 1), currentLiuNian.getGanZhi().substring(1, 2), getShiShenFromGans(dayGan, currentLiuNian.getGanZhi().substring(0, 1)), currentLiuNian.getNaYin ? currentLiuNian.getNaYin() : '山头火'),
        formatPillar('流月', '当令', (liuYueList[0]?.getGanZhi() || '甲子').substring(0, 1), (liuYueList[0]?.getGanZhi() || '甲子').substring(1, 2), getShiShenFromGans(dayGan, (liuYueList[0]?.getGanZhi() || '甲子').substring(0, 1)), '壁上土')
      ];

      // 五行能量计算
      const elementsCount: Record<string, number> = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
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
        if (el && elementsCount[el] !== undefined) elementsCount[el]++;
      });

      // 2. 数字学核心数据
      const birthYearStr = (client.birthDate?.split('-')[0] || '1990').replace(/[^0-9]/g, '');
      const birthMonthStr = (client.birthDate?.split('-')[1] || '01').replace(/[^0-9]/g, '');
      const birthDayStr = (client.birthDate?.split('-')[2] || '01').replace(/[^0-9]/g, '');
      const hourOnly = (client.birthTime?.split(':')[0] || '12').replace(/[^0-9]/g, '');

      const yrRoot = getRootDigit(birthYearStr);
      const moRoot = getRootDigit(birthMonthStr);
      const daRoot = getRootDigit(birthDayStr);
      const hrRoot = getRootDigit(hourOnly);

      const coreRoot = getRootDigit(yrRoot + moRoot + daRoot);

      let wlth = yrRoot - 1;
      if (wlth <= 0) wlth = 9;

      const baseValues = [
        coreRoot, hrRoot, hrRoot, moRoot, daRoot, wlth,
        getRootDigit(coreRoot + 2),
        getRootDigit(daRoot + hrRoot),
        getRootDigit(hrRoot + moRoot)
      ];

      const numerologyMatrixRows = [
        { label: '核心', base: coreRoot },
        { label: '本质', base: hrRoot },
        { label: '智慧', base: hrRoot },
        { label: '事业', base: moRoot },
        { label: '情感', base: daRoot },
        { label: '财富', base: wlth },
        { label: '贵人', base: getRootDigit(coreRoot + 2) },
        { label: '挑战', base: getRootDigit(daRoot + hrRoot) },
        { label: '因果', base: getRootDigit(hrRoot + moRoot) },
        { label: '流年', type: 'year' as const },
        { label: '流月', type: 'month' as const },
      ];

      const traitInfo = NUMEROLOGY_TRAITS[coreRoot] || { title: '开拓数', keywords: '独立果敢' };

      const numDimensions = [
        { label: '核心', val: coreRoot, planet: PLANET_MAP[coreRoot] || '太阳' },
        { label: '本质', val: hrRoot, planet: PLANET_MAP[hrRoot] || '太阳' },
        { label: '智慧', val: hrRoot, planet: PLANET_MAP[hrRoot] || '太阳' },
        { label: '事业', val: moRoot, planet: PLANET_MAP[moRoot] || '水星' },
        { label: '情感', val: daRoot, planet: PLANET_MAP[daRoot] || '木星' },
        { label: '财富', val: wlth, planet: PLANET_MAP[wlth] || '土星' },
        { label: '贵人', val: getRootDigit(coreRoot + 2), planet: PLANET_MAP[getRootDigit(coreRoot + 2)] || '金星' },
        { label: '挑战', val: getRootDigit(daRoot + hrRoot), planet: PLANET_MAP[getRootDigit(daRoot + hrRoot)] || '天王' },
        { label: '因果', val: getRootDigit(hrRoot + moRoot), planet: PLANET_MAP[getRootDigit(hrRoot + moRoot)] || '海王' },
      ];

      const monthlyFlows = Array.from({ length: 12 }, (_, i) => {
        const mNum = i + 1;
        return getRootDigit(coreRoot.toString() + currentYear.toString() + mNum.toString());
      });

      // 3. 西洋占星全息数据 (10大行星、四角ASC/MC/DSC/IC、12宫位、完整相位分析)
      const dateLocal = new Date(y, m - 1, d, hh, mm, 0);
      const tzOffset = 8;
      const dateUTC = new Date(dateLocal.getTime() - tzOffset * 60 * 60 * 1000);
      const timeAstronomy = Astronomy.MakeTime(dateUTC);
      const latitude = 3.1390;
      const longitude = 101.6869;

      const planets = WESTERN_PLANETS.map(p => {
        let lon = 0;
        let isRetrograde = false;
        
        if (p.id === 'Sun') {
          lon = Astronomy.SunPosition(timeAstronomy).elon;
        } else if (p.id === 'Moon') {
          lon = Astronomy.EclipticGeoMoon(timeAstronomy).lon;
        } else {
          const body = (Astronomy.Body as any)[p.id];
          if (body) {
            const vec = Astronomy.GeoVector(body, timeAstronomy, true);
            const ecl = Astronomy.Ecliptic(vec);
            lon = ecl.elon;
            
            const timeLater = Astronomy.MakeTime(new Date(dateUTC.getTime() + 60 * 60 * 1000));
            const vecLater = Astronomy.GeoVector(body, timeLater, true);
            const eclLater = Astronomy.Ecliptic(vecLater);
            let diff = eclLater.elon - ecl.elon;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            isRetrograde = diff < 0;
          }
        }
        
        const signIdx = Math.floor(lon / 30) % 12;
        const degInSign = lon % 30;
        return { 
          ...p, 
          longitude: lon, 
          signIndex: signIdx, 
          degree: degInSign,
          sign: ZODIAC_SIGNS[signIdx] || ZODIAC_SIGNS[0],
          isRetrograde
        };
      });

      const tilt = Astronomy.e_tilt(timeAstronomy);
      const obl = tilt.tobl * (Math.PI / 180.0);
      const lst = (Astronomy.SiderealTime(timeAstronomy) + longitude / 15.0) % 24;
      const ramc = (lst * 15.0 * Math.PI) / 180.0;
      const latRad = (latitude * Math.PI) / 180.0;
      
      let mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(obl));
      mc = (mc * 180.0) / Math.PI;
      mc = (mc + 360) % 360;

      let asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(obl) + Math.tan(latRad) * Math.sin(obl)));
      asc = (asc * 180.0) / Math.PI;
      asc = (asc + 360) % 360;
      
      const dsc = (asc + 180) % 360;
      const ic = (mc + 180) % 360;
      const ascSignIdx = Math.floor(asc / 30) % 12;
      const mcSignIdx = Math.floor(mc / 30) % 12;
      const dscSignIdx = Math.floor(dsc / 30) % 12;
      const icSignIdx = Math.floor(ic / 30) % 12;

      const ascDeg = asc % 30;
      const mcDeg = mc % 30;

      // 12 宫位 (Whole Sign)
      const houses = Array.from({ length: 12 }, (_, i) => {
        const sIdx = (ascSignIdx + i) % 12;
        return {
          number: i + 1,
          sign: ZODIAC_SIGNS[sIdx] || ZODIAC_SIGNS[0]
        };
      });

      const planetsWithHouses = planets.map(p => {
        const houseNum = ((p.signIndex - ascSignIdx + 12) % 12) + 1;
        return { ...p, house: houseNum };
      });

      // 相位全量分析 (Aspects)
      const aspectPoints = [
        ...planetsWithHouses.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, longitude: p.longitude })),
        { id: 'ASC', name: '上升', symbol: 'ASC', longitude: asc },
        { id: 'MC', name: '中天', symbol: 'MC', longitude: mc }
      ];

      const ASPECT_TYPES = [
        { name: '合相', symbol: '☌', angle: 0, orb: 8, color: '#f59e0b', textColor: 'text-amber-400' },
        { name: '对分', symbol: '☍', angle: 180, orb: 8, color: '#ef4444', textColor: 'text-rose-500' },
        { name: '三分', symbol: '△', angle: 120, orb: 8, color: '#10b981', textColor: 'text-emerald-500' },
        { name: '四分', symbol: '□', angle: 90, orb: 8, color: '#f97316', textColor: 'text-orange-500' },
        { name: '六分', symbol: '⚹', angle: 60, orb: 6, color: '#38bdf8', textColor: 'text-sky-400' },
      ];

      const aspectsList: Array<{
        p1: typeof aspectPoints[0];
        p2: typeof aspectPoints[0];
        aspect: typeof ASPECT_TYPES[0];
        diff: number;
        orbErr: number;
      }> = [];

      for (let i = 0; i < aspectPoints.length; i++) {
        for (let j = i + 1; j < aspectPoints.length; j++) {
          const pt1 = aspectPoints[i];
          const pt2 = aspectPoints[j];
          let diff = Math.abs(pt1.longitude - pt2.longitude);
          const dist = Math.min(diff, 360 - diff);

          for (const asp of ASPECT_TYPES) {
            const err = Math.abs(dist - asp.angle);
            if (err <= asp.orb) {
              aspectsList.push({
                p1: pt1,
                p2: pt2,
                aspect: asp,
                diff: dist,
                orbErr: err
              });
              break;
            }
          }
        }
      }

      // 4. 十二命宫 & 泰式罗盘
      const count = age === 0 ? 1 : age;
      let thaiIndex = 0;
      if (genderNum === 1) {
        thaiIndex = (12 - (count - 1) % 12) % 12;
      } else {
        thaiIndex = (count - 1) % 12;
      }
      const activeThaiSymbol = THAI_DESTINY_SYMBOLS[thaiIndex] || THAI_DESTINY_SYMBOLS[0];

      return {
        currentYear,
        solarStr: `${y}.${m}.${d}`,
        lunarStr: `${lunar.getYearInGanZhi()}年`,
        dayGan: eightChar.getDayGan(),
        pillars,
        currentDaYun,
        currentLiuNian,
        daYunList: daYunList.slice(1, 9),
        liuNianList: liuNianList.slice(0, 10),
        liuYueList: liuYueList.slice(0, 12),
        elementsCount,
        taiYuan: eightChar.getTaiYuan(),
        mingGong: eightChar.getMingGong(),
        shenGong: eightChar.getShenGong(),
        birthYearStr,
        birthMonthStr,
        birthDayStr,
        coreVal: coreRoot,
        baseValues,
        numerologyMatrixRows,
        coreRoot,
        yrRoot,
        moRoot,
        daRoot,
        hrRoot,
        traitInfo,
        numDimensions,
        monthlyFlows,
        planets: planetsWithHouses,
        asc,
        ascSign: ZODIAC_SIGNS[ascSignIdx],
        ascDeg,
        mc,
        mcSign: ZODIAC_SIGNS[mcSignIdx],
        mcDeg,
        dsc,
        dscSign: ZODIAC_SIGNS[dscSignIdx],
        ic,
        icSign: ZODIAC_SIGNS[icSignIdx],
        houses,
        aspectsList,
        thaiIndex,
        activeThaiSymbol,
        genderNum
      };
    } catch (err) {
      console.error('Error calculating destiny data', err);
      return null;
    }
  }, [client, age]);

  // 生成完整 3 页 PDF 逻辑
  const handleGeneratePdf = async (): Promise<{ blob: Blob; file: File; objUrl: string } | null> => {
    if (!page1Ref.current || !page2Ref.current || !page3Ref.current) return null;
    setIsGenerating(true);
    setGenerationProgress(10);
    setGenerationStatusText('正在准备排版引擎与图表渲染...');

    try {
      await new Promise(r => setTimeout(r, 100));

      setGenerationProgress(25);
      setGenerationStatusText('正在渲染第 1 页：八字原局与流年排盘...');
      await new Promise(r => setTimeout(r, 40));
      const page1Canvas = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090a0f',
        logging: false,
        windowWidth: 794
      });

      setGenerationProgress(55);
      setGenerationStatusText('正在渲染第 2 页：数字学矩阵与命宫巡环...');
      await new Promise(r => setTimeout(r, 40));
      const page2Canvas = await html2canvas(page2Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090a0f',
        logging: false,
        windowWidth: 794
      });

      setGenerationProgress(80);
      setGenerationStatusText('正在渲染第 3 页：西洋占星全息星盘与相位...');
      await new Promise(r => setTimeout(r, 40));
      const page3Canvas = await html2canvas(page3Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#090a0f',
        logging: false,
        windowWidth: 794
      });

      setGenerationProgress(92);
      setGenerationStatusText('正在合成超高清 3 页 PDF 档案...');
      await new Promise(r => setTimeout(r, 40));

      const imgData1 = page1Canvas.toDataURL('image/jpeg', 0.95);
      const imgData2 = page2Canvas.toDataURL('image/jpeg', 0.95);
      const imgData3 = page3Canvas.toDataURL('image/jpeg', 0.95);

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Page 1: 八字流年
      doc.addImage(imgData1, 'JPEG', 0, 0, 210, 297);
      
      // Page 2: 数字命宫
      doc.addPage();
      doc.addImage(imgData2, 'JPEG', 0, 0, 210, 297);

      // Page 3: 西洋占星全息图 (星盘 + 行星 + 完整相位)
      doc.addPage();
      doc.addImage(imgData3, 'JPEG', 0, 0, 210, 297);

      setGenerationProgress(100);
      setGenerationStatusText('PDF 档案生成完成！');

      const blob = doc.output('blob');
      const filename = `${client.name}_命理档案.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      setPdfBlob(blob);
      setPdfFile(file);
      const objUrl = URL.createObjectURL(blob);
      setPdfUrl(objUrl);

      return { blob, file, objUrl };
    } catch (err) {
      console.error('PDF generation error', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    handleGeneratePdf();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, []);

  // 下载 PDF 操作并在下载完成后弹出后续操作询问窗口
  const handleDownloadPdf = async () => {
    let targetUrl = pdfUrl;
    let targetFile = pdfFile;

    if (!targetUrl || !targetFile) {
      const gen = await handleGeneratePdf();
      if (gen) {
        targetUrl = gen.objUrl;
        targetFile = gen.file;
      }
    }

    if (targetUrl) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = `${client.name}_命理档案.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 下载成功后弹出交互询问弹窗 (在本地打开 / 转发到 WhatsApp)
      setShowDownloadSuccessModal(true);
    }
  };

  // 在本地直接打开/预览 PDF (手机与电脑均能 100% 顺畅全屏预览与外部打开)
  const handleOpenLocalPdf = () => {
    setShowDownloadSuccessModal(false);
    setShowFullscreenReader(true);
  };

  // 直接转发到 WhatsApp (支持系统原生文件分享到 WhatsApp 并自选联系人)
  const handleShareToWhatsApp = async () => {
    let targetFile = pdfFile;
    let targetBlob = pdfBlob;

    if (!targetFile && targetBlob) {
      targetFile = new File([targetBlob], `${client.name}_命理档案.pdf`, { type: 'application/pdf' });
      setPdfFile(targetFile);
    }

    if (!targetFile) {
      const gen = await handleGeneratePdf();
      if (gen) {
        targetFile = gen.file;
        targetBlob = gen.blob;
      }
    }

    const shareTitle = `${client.name}_命理档案.pdf`;
    const shareText = `您好，这是【${client.name}】的命理全息档案 PDF 文件（包含八字原局与流年运势、数字命宫图、西洋占星星盘及完整相位分析）。`;

    // 移动端：若支持通过 Web Share API 发送文件，直接调起系统分享选择 WhatsApp 并发送真实 PDF 文件
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      targetFile &&
      navigator.canShare &&
      navigator.canShare({ files: [targetFile] })
    ) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [targetFile],
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // 用户在系统分享面板中取消
        console.warn('Navigator share error:', err);
      }
    }

    // 若当前浏览器或 PC 不支持直接从网页注入本地文件，则弹出明确的转发引导并打开 WhatsApp 供用户自选联系人
    setShowWhatsAppHelpModal(true);
  };

  if (!analysisData) return null;

  const elemColors: Record<string, { bg: string; text: string; bar: string }> = {
    '木': { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', bar: '#10b981' },
    '火': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', bar: '#ef4444' },
    '土': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', bar: '#f59e0b' },
    '金': { bg: 'rgba(212, 175, 55, 0.15)', text: '#fde047', bar: '#d4af37' },
    '水': { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', bar: '#0ea5e9' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 py-6 sm:py-8 overflow-y-auto">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl h-[82vh] sm:h-[86vh] max-h-[86vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 my-auto">
        
        {/* 顶部栏：响应式自适应字体，确保名字与标识不挤压、不折两行 */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
            <h2 
              className="font-black text-white tracking-wide truncate whitespace-nowrap shrink"
              style={{
                fontSize: client.name.length > 16 
                  ? 'clamp(11px, 2.5vw, 12px)' 
                  : client.name.length > 10 
                  ? 'clamp(12px, 3vw, 14px)' 
                  : 'clamp(14px, 3.5vw, 16px)'
              }}
              title={client.name}
            >
              {client.name}
            </h2>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded bg-zinc-800 text-gold border border-zinc-700 shrink-0 whitespace-nowrap">
              {age} 岁
            </span>
            <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 shrink-0 whitespace-nowrap">
              {client.gender === 'male' ? '乾造' : '坤造'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* 下载 PDF 按钮 */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-gold text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md hover:from-amber-400 hover:to-yellow-400 active:scale-95 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>生成中 ({generationProgress}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 PDF (3页)</span>
                </>
              )}
            </button>

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 页面切换器：3 页自由切换 */}
        <div className="px-3 sm:px-4 py-2 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setActivePreviewPage(1)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 whitespace-nowrap ${
                activePreviewPage === 1 ? 'bg-gold text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">第一页：</span><span>八字流年</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPage(2)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 whitespace-nowrap ${
                activePreviewPage === 2 ? 'bg-gold text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">第二页：</span><span>数字命宫</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewPage(3)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-1 whitespace-nowrap ${
                activePreviewPage === 3 ? 'bg-gold text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">第三页：</span><span>西洋占星</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono hidden sm:block shrink-0 px-2">
            PAGE {activePreviewPage} / 3
          </div>
        </div>

        {/* 预览展示区域 */}
        <div className="relative flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-zinc-950">
          {/* PDF 生成中全屏遮罩及进度条 (Loading Bar) */}
          {isGenerating && (
            <div className="absolute inset-0 z-30 bg-zinc-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                {/* 发光旋转图标 */}
                <div className="relative">
                  <div className="w-13 h-13 rounded-2xl bg-gold/15 border border-gold/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
                    <Loader2 className="w-6.5 h-6.5 text-gold animate-spin" />
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-gold/20 blur-md -z-10 animate-pulse" />
                </div>

                <div className="flex flex-col gap-1 items-center">
                  <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                    正在生成 3 页高清 PDF 档案
                  </h3>
                  <p className="text-xs text-gold font-medium min-h-[18px]">
                    {generationStatusText || '正在渲染排版数据...'}
                  </p>
                </div>

                {/* 动态进度条 */}
                <div className="w-full flex flex-col gap-1.5">
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-700/80 p-[1px]">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-300 ease-out shadow-sm"
                      style={{ width: `${Math.max(8, generationProgress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-0.5">
                    <span className="text-zinc-400">正在排版渲染</span>
                    <span className="text-gold font-bold">{generationProgress}%</span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2 text-left w-full">
                  <span className="text-gold font-bold">提示：</span>
                  <span>包含八字运势、数字命宫与西洋占星 3 张全息高清图表，手机端正在高速计算与排版，请稍候...</span>
                </div>
              </div>
            </div>
          )}

          <div className="max-w-2xl mx-auto bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            {activePreviewPage === 1 ? (
              /* 第一页：八字原局 + 当前流年排盘 */
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* 标头 */}
                <div className="border-b border-gold/30 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">命理档案</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">
                      第一页
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2 text-xs min-w-0">
                    <span 
                      className="text-gold font-bold truncate whitespace-nowrap"
                      style={{
                        fontSize: client.name.length > 14 ? '11px' : '12px',
                        maxWidth: '140px'
                      }}
                      title={client.name}
                    >
                      {client.name}
                    </span>
                    <span className="text-zinc-400 font-mono shrink-0 whitespace-nowrap">{analysisData.currentYear}年</span>
                    <span className="text-zinc-500 text-[10px] font-mono shrink-0 whitespace-nowrap">({todayStr})</span>
                  </div>
                </div>

                {/* 基本信息条 */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-black/40 border border-zinc-800 rounded-lg text-center text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500">公历</span>
                    <div className="text-white font-mono font-bold">{analysisData.solarStr}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500">农历</span>
                    <div className="text-gold font-bold">{analysisData.lunarStr}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500">日主</span>
                    <div className="text-white font-black">{analysisData.dayGan}</div>
                  </div>
                </div>

                {/* 核心：原局四柱 + 大运 + 流年 + 流月 粘贴排盘 */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black/40 shadow-md">
                  <div className="px-3.5 py-2 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-black text-gold">八字排盘</span>
                    <span className="text-[10px] text-zinc-400 font-bold">当前流年</span>
                  </div>

                  <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-[10px] font-bold bg-zinc-900/60">
                    {analysisData.pillars.map((p, i) => (
                      <div key={i} className="py-2 border-r border-zinc-800 last:border-r-0 text-zinc-400">
                        {p.label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-[9px] font-mono text-zinc-400 bg-zinc-950/60">
                    {analysisData.pillars.map((p, i) => (
                      <div key={i} className="py-1.5 border-r border-zinc-800 last:border-r-0">
                        {p.ageYear}
                      </div>
                    ))}
                  </div>

                  {/* 天干 */}
                  <div className="grid grid-cols-7 border-b border-zinc-800 text-center bg-zinc-900/40">
                    {analysisData.pillars.map((p, i) => (
                      <div key={i} className="py-3.5 border-r border-zinc-800 last:border-r-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-serif font-black" style={{ color: getBaziColorHex(p.gan) }}>
                          {p.gan}
                        </span>
                        <span className="text-[9px] text-zinc-300 font-bold mt-1.5 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60">
                          {getShiShenShort(p.shiShen)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* 地支 */}
                  <div className="grid grid-cols-7 border-b border-zinc-800 text-center bg-zinc-950/70">
                    {analysisData.pillars.map((p, i) => (
                      <div key={i} className="py-3.5 border-r border-zinc-800 last:border-r-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-serif font-black" style={{ color: getBaziColorHex(p.zhi) }}>
                          {p.zhi}
                        </span>
                        <div className="flex gap-1 mt-1.5">
                          {getShiShenFromZhi(analysisData.dayGan, p.zhi).slice(0, 2).map((s, idx) => (
                            <span key={idx} className="text-[8px] text-zinc-400 font-bold px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                              {getShiShenShort(s)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 纳音 */}
                  <div className="grid grid-cols-7 text-center text-[9px] text-zinc-400 bg-zinc-900/50">
                    {analysisData.pillars.map((p, i) => (
                      <div key={i} className="py-1.5 border-r border-zinc-800 last:border-r-0 font-mono">
                        {p.naYin}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 大运流年详细走势 */}
                <div className="border border-zinc-800 rounded-xl p-3 bg-black/40 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gold">大运流年</span>
                    <span className="text-[10px] text-zinc-400">{analysisData.currentYear}年走势</span>
                  </div>

                  {/* 大运列表 */}
                  <div className="grid grid-cols-8 gap-1.5 text-center">
                    {analysisData.daYunList.map((dy, idx) => {
                      const isActive = dy.getStartYear() === analysisData.currentDaYun.getStartYear();
                      const gan = dy.getGanZhi().substring(0, 1);
                      const zhi = dy.getGanZhi().substring(1, 2);
                      return (
                        <div 
                          key={idx} 
                          className={`p-1.5 py-2 rounded-lg border flex flex-col items-center ${
                            isActive ? 'bg-gold/20 border-gold text-gold' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <span className="text-[8px] font-mono">{dy.getStartAge()}岁</span>
                          <span className="text-sm font-bold font-serif my-0.5" style={{ color: getBaziColorHex(gan) }}>
                            {gan}{zhi}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-500">{dy.getStartYear()}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 流年列表 */}
                  <div className="grid grid-cols-10 gap-1 text-center">
                    {analysisData.liuNianList.map((ln, idx) => {
                      const isCurrent = ln.getYear() === analysisData.currentYear;
                      const gan = ln.getGanZhi().substring(0, 1);
                      const zhi = ln.getGanZhi().substring(1, 2);
                      return (
                        <div 
                          key={idx}
                          className={`p-1 py-1.5 rounded border flex flex-col items-center ${
                            isCurrent ? 'bg-gold/25 border-gold shadow-sm' : 'bg-zinc-900/40 border-zinc-800'
                          }`}
                        >
                          <span className={`text-[8px] font-mono ${isCurrent ? 'text-white font-bold' : 'text-zinc-500'}`}>
                            {ln.getYear()}
                          </span>
                          <span className="text-xs font-bold font-serif" style={{ color: getBaziColorHex(gan) }}>
                            {gan}{zhi}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* 流月节气 */}
                  <div className="grid grid-cols-12 gap-0.5 text-center">
                    {analysisData.liuYueList.map((ly, idx) => {
                      const gan = ly.getGanZhi().substring(0, 1);
                      const zhi = ly.getGanZhi().substring(1, 2);
                      return (
                        <div key={idx} className="p-1 rounded bg-zinc-950 border border-zinc-800/80 flex flex-col items-center">
                          <span className="text-[7px] text-zinc-500">{JIE_QI_TERMS[idx]}</span>
                          <span className="text-[10px] font-bold font-serif" style={{ color: getBaziColorHex(gan) }}>
                            {gan}{zhi}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 五行能量分布 */}
                <div className="border border-zinc-800 rounded-xl p-3 bg-black/40 flex flex-col gap-2">
                  <span className="text-xs font-black text-gold">五行能量</span>
                  <div className="grid grid-cols-5 gap-2.5">
                    {Object.entries(analysisData.elementsCount).map(([el, count]) => {
                      const style = elemColors[el] || { bg: '#222', text: '#fff', bar: '#888' };
                      const percent = Math.min(100, Math.round((Number(count) / 8) * 100));
                      return (
                        <div key={el} className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-black">
                            <span style={{ color: style.text }}>{el}</span>
                            <span className="text-zinc-300 font-mono text-xs">{count}</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: style.bar }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 胎元 命宫 身宫 */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1">
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                      胎元: <span className="text-gold font-bold">{analysisData.taiYuan}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                      命宫: <span className="text-gold font-bold">{analysisData.mingGong}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                      身宫: <span className="text-gold font-bold">{analysisData.shenGong}</span>
                    </div>
                  </div>
                </div>

                {/* 页面底部信息条 */}
                <div style={{ borderColor: 'rgba(212,175,55,0.3)' }} className="border-t border-zinc-800 pt-3 mt-1 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-bold">命理档案</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-[11px] text-zinc-400 font-mono">生成日期: {todayStr}</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 font-bold">PAGE 1 OF 3</span>
                </div>
              </div>
            ) : activePreviewPage === 2 ? (
              /* 第二页：数字学矩阵 + 泰式十二命宫巡环 */
              <div className="flex flex-col gap-4">
                {/* 标头 */}
                <div className="border-b border-gold/30 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">命理档案</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">
                      第二页
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2 text-xs min-w-0">
                    <span 
                      className="text-gold font-bold truncate whitespace-nowrap"
                      style={{
                        fontSize: client.name.length > 14 ? '11px' : '12px',
                        maxWidth: '140px'
                      }}
                      title={client.name}
                    >
                      {client.name}
                    </span>
                    <span className="text-zinc-400 font-mono shrink-0 whitespace-nowrap">{analysisData.currentYear}年</span>
                    <span className="text-zinc-500 text-[10px] font-mono shrink-0 whitespace-nowrap">({todayStr})</span>
                  </div>
                </div>

                {/* 1. 数字学 NUMEROLOGY */}
                <NumerologyMatrixView
                  birthYear={analysisData.birthYearStr}
                  birthMonth={analysisData.birthMonthStr}
                  birthDay={analysisData.birthDayStr}
                  coreVal={analysisData.coreVal}
                  currentYear={analysisData.currentYear}
                  matrixRows={analysisData.numerologyMatrixRows}
                  baseValues={analysisData.baseValues}
                  numDimensions={analysisData.numDimensions}
                  isPdf={false}
                />

                {/* 2. 泰式命宫巡环 THAI DESTINY WHEEL */}
                <ThaiDestinyWheelView
                  client={client}
                  age={age}
                  thaiIndex={analysisData.thaiIndex}
                  activeThaiSymbol={analysisData.activeThaiSymbol}
                  isPdf={false}
                />

                {/* 页面底部信息条 */}
                <div style={{ borderColor: 'rgba(212,175,55,0.3)' }} className="border-t border-zinc-800 pt-3 mt-1 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-bold">命理档案</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-[11px] text-zinc-400 font-mono">生成日期: {todayStr}</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 font-bold">PAGE 2 OF 3</span>
                </div>
              </div>
            ) : (
              /* 第三页：西洋占星全息图 (星盘 + 4轴角度 + 10大行星 + 完整相位分析) */
              <div className="flex flex-col gap-4">
                {/* 标头 */}
                <div className="border-b border-gold/30 pb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">命理档案</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">
                      第三页
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2 text-xs min-w-0">
                    <span 
                      className="text-gold font-bold truncate whitespace-nowrap"
                      style={{
                        fontSize: client.name.length > 14 ? '11px' : '12px',
                        maxWidth: '140px'
                      }}
                      title={client.name}
                    >
                      {client.name}
                    </span>
                    <span className="text-zinc-400 font-mono shrink-0 whitespace-nowrap">{analysisData.currentYear}年</span>
                    <span className="text-zinc-500 text-[10px] font-mono shrink-0 whitespace-nowrap">({todayStr})</span>
                  </div>
                </div>

                <WesternAstrologyFullView
                  westernData={analysisData}
                  aspects={analysisData.aspectsList}
                  isPdf={false}
                />

                {/* 页面底部信息条 */}
                <div style={{ borderColor: 'rgba(212,175,55,0.3)' }} className="border-t border-zinc-800 pt-3 mt-1 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-bold">命理档案</span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-[11px] text-zinc-400 font-mono">生成日期: {todayStr}</span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 font-bold">PAGE 3 OF 3</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部信息栏 */}
        <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400 font-mono">
            {activePreviewPage === 1 ? '八字流年' : activePreviewPage === 2 ? '数字命宫' : '西洋占星'} (PAGE {activePreviewPage}/3)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>

      {/* =========================================================================
          下载成功后续操作弹出窗口 (在本地打开文件 / 转发到 WhatsApp)
          ========================================================================= */}
      {showDownloadSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-700/90 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 relative">
            <button
              type="button"
              onClick={() => setShowDownloadSuccessModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="pr-6">
                <h3 className="text-base font-black text-white tracking-wide">PDF 档案下载成功！</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  已成功保存至您的本地设备
                </p>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 flex flex-col gap-2">
              <div className="flex justify-between items-center text-zinc-400">
                <span>文件名称</span>
                <span className="text-gold font-mono font-medium truncate max-w-[220px]" title={`${client.name}_命理档案.pdf`}>
                  {client.name}_命理档案.pdf
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>档案对象</span>
                <span className="text-white font-bold">{client.name} ({client.gender === 'male' ? '乾造' : '坤造'} · {age}岁)</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>生成日期</span>
                <span className="text-zinc-200 font-mono">{todayStr}</span>
              </div>
              {client.phone && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span>联系电话</span>
                  <span className="text-zinc-200 font-mono">{client.phone}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {/* 选项 1：在本地打开文件 */}
              <button
                type="button"
                onClick={handleOpenLocalPdf}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-gold/70 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-gold" />
                <span>在本地打开文件 (查看 PDF)</span>
              </button>

              {/* 选项 2：直接转发到 WhatsApp */}
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-98 cursor-pointer"
              >
                <MessageCircle className="w-4.5 h-4.5 text-zinc-950 fill-zinc-950" />
                <span>直接转发到 WhatsApp</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowDownloadSuccessModal(false)}
              className="w-full py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors text-center cursor-pointer"
            >
              完成并关闭
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          WhatsApp 转发指引弹窗 (在不支持 Web Share 文件注入的浏览器下引导转发)
          ========================================================================= */}
      {showWhatsAppHelpModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-700/90 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 relative text-left">
            <button
              type="button"
              onClick={() => setShowWhatsAppHelpModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/40 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-[#25D366]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-wide">转发 PDF 档案到 WhatsApp</h3>
                <p className="text-xs text-zinc-400 mt-0.5">选择联系人发送完整 PDF 报告</p>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-300 flex flex-col gap-2.5">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                <span>PDF 档案已保存为 <strong className="text-gold font-mono">{client.name}_命理档案.pdf</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                <span>点击下方按钮直接打开 WhatsApp，<strong>自由选择您想要发送的好友或群聊</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                <span>在 WhatsApp 输入框旁点击 <strong>📎（附件 / 文档）</strong>，选择刚刚保存的 PDF 文件直接发送</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <a
                href="https://api.whatsapp.com/send"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsAppHelpModal(false)}
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-98 cursor-pointer text-center"
              >
                <MessageCircle className="w-4.5 h-4.5 text-zinc-950 fill-zinc-950" />
                <span>打开 WhatsApp (自选联系人发送)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowWhatsAppHelpModal(false)}
                className="w-full py-2 text-xs text-zinc-400 hover:text-white transition-colors text-center cursor-pointer"
              >
                我知道了，返回
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          手机/全平台内置全屏高清 PDF 阅读器 (解决手机打开无反应问题)
          ========================================================================= */}
      {showFullscreenReader && (
        <div className="fixed inset-0 z-[85] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
          {/* 阅读器顶栏 */}
          <div className="px-3 sm:px-6 py-3 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setShowFullscreenReader(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回</span>
              </button>
              <div className="truncate">
                <h3 className="text-sm sm:text-base font-black text-white truncate">
                  {client.name} · 命理全息档案
                </h3>
                <span className="text-[10px] sm:text-xs text-gold font-mono">
                  PAGE {activePreviewPage} / 3 · {todayStr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* 直接转发 WhatsApp */}
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                title="直接转发到 WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-zinc-950" />
                <span className="hidden sm:inline">转发 WhatsApp</span>
              </button>

              {/* 保存/下载 PDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gold hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                title="下载 PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">下载 PDF</span>
              </button>

              {/* 关闭全屏 */}
              <button
                type="button"
                onClick={() => setShowFullscreenReader(false)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 阅读器 3 页切换标签 */}
          <div className="px-3 sm:px-6 py-2 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-center shrink-0">
            <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full max-w-md">
              <button
                type="button"
                onClick={() => setActivePreviewPage(1)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  activePreviewPage === 1 ? 'bg-gold text-zinc-950 shadow font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                1. 八字流年
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewPage(2)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  activePreviewPage === 2 ? 'bg-gold text-zinc-950 shadow font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                2. 数字命宫
              </button>
              <button
                type="button"
                onClick={() => setActivePreviewPage(3)}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  activePreviewPage === 3 ? 'bg-gold text-zinc-950 shadow font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                3. 西洋占星
              </button>
            </div>
          </div>

          {/* 阅读器主视区 */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 bg-zinc-950 flex flex-col items-center">
            <div className="w-full max-w-4xl bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl">
              {activePreviewPage === 1 ? (
                <div className="flex flex-col gap-4">
                  {/* 第一页头部 */}
                  <div className="border-b border-gold/30 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white">命理档案</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">第一页</span>
                    </div>
                    <div className="text-right text-xs text-gold font-mono">{client.name} · 八字排盘</div>
                  </div>

                  {/* 四柱排盘表格 */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {analysisData.pillars.map((p, idx) => (
                      <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                        <div className="text-[11px] text-zinc-400 font-bold mb-1">{p.label}柱</div>
                        <div className="text-xs text-gold font-medium mb-1">{p.shiShen}</div>
                        <div className="text-lg font-black text-white" style={{ color: getBaziColorHex(p.gan) }}>{p.gan}</div>
                        <div className="text-lg font-black text-white" style={{ color: getBaziColorHex(p.zhi) }}>{p.zhi}</div>
                        <div className="text-[10px] text-zinc-400 mt-1">{p.naYin}</div>
                      </div>
                    ))}
                  </div>

                  {/* 大运与流年 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-gold font-bold mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> 当前大运
                      </div>
                      <div className="text-sm font-bold text-white">
                        {analysisData.currentDaYun.getGanZhi()}运 ({analysisData.currentDaYun.getStartYear()} - {analysisData.currentDaYun.getEndYear()}年)
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                      <div className="text-xs text-gold font-bold mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> {analysisData.currentYear} 流年
                      </div>
                      <div className="text-sm font-bold text-white">
                        {analysisData.currentLiuNian.getGanZhi()}年 ({analysisData.currentLiuNian.getAge()}岁)
                      </div>
                    </div>
                  </div>

                  {/* 五行力量分布 */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5">
                    <div className="text-xs text-zinc-300 font-bold mb-2">五行原局能量分布</div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {(['木', '火', '土', '金', '水'] as const).map(el => {
                        const count = analysisData.elementsCount[el] || 0;
                        const c = elemColors[el];
                        return (
                          <div key={el} style={{ backgroundColor: c.bg, borderColor: c.bar }} className="p-2 rounded-xl border">
                            <div style={{ color: c.text }} className="text-xs font-black">{el}</div>
                            <div className="text-sm font-bold text-white mt-0.5">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : activePreviewPage === 2 ? (
                <div className="flex flex-col gap-4">
                  {/* 第二页头部 */}
                  <div className="border-b border-gold/30 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white">命理档案</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">第二页</span>
                    </div>
                    <div className="text-right text-xs text-gold font-mono">{client.name} · 数字命宫</div>
                  </div>

                  {/* 4 柱根数 */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[11px] text-zinc-400 font-bold">年柱根数</div>
                      <div className="text-xl font-black text-amber-400 mt-1">{analysisData.yrRoot}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[11px] text-zinc-400 font-bold">月柱根数</div>
                      <div className="text-xl font-black text-blue-400 mt-1">{analysisData.moRoot}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[11px] text-zinc-400 font-bold">日柱根数</div>
                      <div className="text-xl font-black text-emerald-400 mt-1">{analysisData.daRoot}</div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5">
                      <div className="text-[11px] text-zinc-400 font-bold">时柱根数</div>
                      <div className="text-xl font-black text-purple-400 mt-1">{analysisData.hrRoot}</div>
                    </div>
                  </div>

                  {/* 核心主导数与特质 */}
                  <div className="bg-zinc-950 border border-gold/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gold/15 border border-gold flex items-center justify-center text-xl font-black text-gold">
                        {analysisData.coreRoot}
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">生命核心主导数</div>
                        <div className="text-base font-black text-white">{analysisData.traitInfo.title}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{analysisData.traitInfo.desc}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* 第三页头部 */}
                  <div className="border-b border-gold/30 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-black text-white">命理档案</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30 font-bold">第三页</span>
                    </div>
                    <div className="text-right text-xs text-gold font-mono">{client.name} · 西洋占星</div>
                  </div>

                  <WesternAstrologyFullView
                    westernData={analysisData}
                    aspects={analysisData.aspectsList}
                    isPdf={false}
                  />
                </div>
              )}
            </div>

            {/* 底部浮动操作栏 */}
            <div className="mt-4 mb-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleShareToWhatsApp}
                className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-zinc-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all"
              >
                <MessageCircle className="w-4 h-4 fill-zinc-950" />
                <span>转发 PDF 到 WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow cursor-pointer active:scale-95 transition-all"
              >
                <Download className="w-4 h-4 text-gold" />
                <span>保存至手机</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          离屏 A4 高清模板 (794px × 1123px)，专供 jsPDF / html2canvas 生成
          ========================================================================= */}
      
      {/* 第 1 页：八字原局与当前年份流年全息图 */}
      <div 
        ref={page1Ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          height: '1123px',
          backgroundColor: '#090a0f',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden'
        }}
        className="p-7 flex flex-col justify-between"
      >
        {/* 页眉 */}
        <div 
          style={{ borderColor: '#d4af37', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(20,22,30,0.95) 100%)' }}
          className="border-2 rounded-2xl p-4 flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt="Logo" 
                style={{ borderColor: '#d4af37', backgroundColor: '#000000' }}
                className="w-12 h-12 rounded-xl border-2 object-contain p-1" 
              />
            ) : (
              <div 
                style={{ borderColor: '#d4af37', backgroundColor: '#000000' }}
                className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-[#d4af37]"
              >
                <Sparkles className="w-6 h-6 text-[#d4af37]" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-white">命理档案</h1>
              <span className="text-[10px] text-[#d4af37] font-bold">八字排盘</span>
            </div>
          </div>

          <div className="text-right min-w-0 max-w-[280px]">
            <div 
              className="font-black text-white truncate whitespace-nowrap"
              style={{
                fontSize: client.name.length > 18 ? '12px' : client.name.length > 12 ? '14px' : '16px'
              }}
              title={client.name}
            >
              {client.name}
            </div>
            <div className="text-xs text-[#d4af37] font-bold whitespace-nowrap">
              {client.gender === 'male' ? '乾造' : '坤造'} · {age}岁
            </div>
            <div className="text-[10px] text-zinc-400 font-mono whitespace-nowrap flex items-center justify-end gap-1.5">
              <span>{analysisData.currentYear}流年</span>
              <span>·</span>
              <span>生成日期: {todayStr}</span>
            </div>
          </div>
        </div>

        {/* 基本信息栏 */}
        <div 
          style={{ backgroundColor: '#13141c', borderColor: '#27272a' }}
          className="border rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center text-xs"
        >
          <div>
            <span className="text-zinc-500 text-[10px]">公历</span>
            <div className="text-white font-mono font-bold mt-0.5">{analysisData.solarStr}</div>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px]">农历</span>
            <div className="text-[#d4af37] font-bold mt-0.5">{analysisData.lunarStr}</div>
          </div>
          <div>
            <span className="text-zinc-500 text-[10px]">日主</span>
            <div className="text-white font-black mt-0.5">{analysisData.dayGan}</div>
          </div>
        </div>

        {/* 模块区域：八字排盘 + 大运流年 + 五行格局 */}
        <div className="flex flex-col gap-3 my-2 justify-start">
          {/* 模块一：八字原局 + 目前年份流年大运并列排盘 */}
          <div 
            style={{ backgroundColor: '#11131a', borderColor: '#2a2c36' }}
            className="border rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                <h2 className="text-xs font-black text-white">八字排盘</h2>
              </div>
              <span className="text-xs font-bold text-[#d4af37]">当前流年</span>
            </div>

            {/* 7 列排盘表：时柱、日柱、月柱、年柱、大运、流年、流月 */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-[10px] font-bold bg-zinc-900/90">
                {analysisData.pillars.map((p, i) => (
                  <div key={i} className="py-2 border-r border-zinc-800 last:border-r-0 text-zinc-400">
                    {p.label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 border-b border-zinc-800 text-center text-[9px] font-mono text-zinc-400 bg-zinc-950">
                {analysisData.pillars.map((p, i) => (
                  <div key={i} className="py-1.5 border-r border-zinc-800 last:border-r-0">
                    {p.ageYear}
                  </div>
                ))}
              </div>

              {/* 天干 */}
              <div className="grid grid-cols-7 border-b border-zinc-800 text-center bg-zinc-900/40">
                {analysisData.pillars.map((p, i) => (
                  <div key={i} className="py-3.5 border-r border-zinc-800 last:border-r-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-serif font-black" style={{ color: getBaziColorHex(p.gan) }}>
                      {p.gan}
                    </span>
                    <span className="text-[10px] text-zinc-300 font-bold mt-1.5 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60">
                      {getShiShenShort(p.shiShen)}
                    </span>
                  </div>
                ))}
              </div>

              {/* 地支 */}
              <div className="grid grid-cols-7 border-b border-zinc-800 text-center bg-zinc-950/70">
                {analysisData.pillars.map((p, i) => (
                  <div key={i} className="py-3.5 border-r border-zinc-800 last:border-r-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-serif font-black" style={{ color: getBaziColorHex(p.zhi) }}>
                      {p.zhi}
                    </span>
                    <div className="flex gap-1 mt-1.5">
                      {getShiShenFromZhi(analysisData.dayGan, p.zhi).slice(0, 2).map((s, idx) => (
                        <span key={idx} className="text-[8px] text-zinc-400 font-bold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                          {getShiShenShort(s)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 纳音 */}
              <div className="grid grid-cols-7 text-center text-[9px] text-zinc-400 bg-zinc-900/50">
                {analysisData.pillars.map((p, i) => (
                  <div key={i} className="py-1.5 border-r border-zinc-800 last:border-r-0 font-mono">
                    {p.naYin}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 模块二：大运与当前年份流年走势 */}
          <div 
            style={{ backgroundColor: '#11131a', borderColor: '#2a2c36' }}
            className="border rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                <h2 className="text-xs font-black text-white">大运流年</h2>
              </div>
              <span className="text-xs font-bold text-[#d4af37]">当前流年</span>
            </div>

            {/* 8 步大运 */}
            <div className="grid grid-cols-8 gap-1.5 text-center">
              {analysisData.daYunList.map((dy, idx) => {
                const isActive = dy.getStartYear() === analysisData.currentDaYun.getStartYear();
                const gan = dy.getGanZhi().substring(0, 1);
                const zhi = dy.getGanZhi().substring(1, 2);
                return (
                  <div 
                    key={idx} 
                    style={{
                      backgroundColor: isActive ? 'rgba(212,175,55,0.2)' : '#181a24',
                      borderColor: isActive ? '#d4af37' : '#2f3240'
                    }}
                    className="border p-1.5 py-2 rounded-lg flex flex-col items-center shadow-sm"
                  >
                    <span className="text-[8px] font-mono text-zinc-400">{dy.getStartAge()}岁</span>
                    <span className="text-sm font-bold font-serif my-0.5" style={{ color: getBaziColorHex(gan) }}>
                      {gan}{zhi}
                    </span>
                    <span className="text-[8px] font-mono text-zinc-500">{dy.getStartYear()}</span>
                  </div>
                );
              })}
            </div>

            {/* 10 个流年 */}
            <div className="grid grid-cols-10 gap-1 text-center mt-0.5">
              {analysisData.liuNianList.map((ln, idx) => {
                const isCurrent = ln.getYear() === analysisData.currentYear;
                const gan = ln.getGanZhi().substring(0, 1);
                const zhi = ln.getGanZhi().substring(1, 2);
                return (
                  <div 
                    key={idx}
                    style={{
                      backgroundColor: isCurrent ? 'rgba(212,175,55,0.25)' : '#161822',
                      borderColor: isCurrent ? '#d4af37' : '#27272a'
                    }}
                    className="border p-1 py-1.5 rounded flex flex-col items-center"
                  >
                    <span className={`text-[8px] font-mono ${isCurrent ? 'text-white font-bold' : 'text-zinc-500'}`}>
                      {ln.getYear()}
                    </span>
                    <span className="text-xs font-bold font-serif" style={{ color: getBaziColorHex(gan) }}>
                      {gan}{zhi}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 12 流月节气 */}
            <div className="grid grid-cols-12 gap-0.5 text-center mt-0.5">
              {analysisData.liuYueList.map((ly, idx) => {
                const gan = ly.getGanZhi().substring(0, 1);
                const zhi = ly.getGanZhi().substring(1, 2);
                return (
                  <div key={idx} className="p-1 rounded bg-zinc-950 border border-zinc-800 flex flex-col items-center">
                    <span className="text-[7px] text-zinc-500">{JIE_QI_TERMS[idx]}</span>
                    <span className="text-[10px] font-bold font-serif" style={{ color: getBaziColorHex(gan) }}>
                      {gan}{zhi}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 模块三：五行能量与胎元命宫身宫 */}
          <div 
            style={{ backgroundColor: '#11131a', borderColor: '#2a2c36' }}
            className="border rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
                <h2 className="text-xs font-black text-white">五行能量</h2>
              </div>
              <span className="text-xs font-bold text-[#d4af37]">原局格局</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {Object.entries(analysisData.elementsCount).map(([el, count]) => {
                const style = elemColors[el] || { bg: '#222', text: '#fff', bar: '#888' };
                const percent = Math.min(100, Math.round((Number(count) / 8) * 100));
                return (
                  <div key={el} className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/40 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span style={{ color: style.text }}>{el}</span>
                      <span className="text-white font-mono">{count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: style.bar }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-1">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                胎元: <span className="text-[#d4af37] font-bold">{analysisData.taiYuan}</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                命宫: <span className="text-[#d4af37] font-bold">{analysisData.mingGong}</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                身宫: <span className="text-[#d4af37] font-bold">{analysisData.shenGong}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 页脚 1 */}
        <div style={{ borderColor: 'rgba(212,175,55,0.4)' }} className="border-t pt-2.5 mt-auto flex items-center justify-between text-xs text-zinc-500">
          <span className="text-[#d4af37] font-bold">命理档案</span>
          <span className="text-[10px] text-zinc-400 font-mono">生成日期: {todayStr}</span>
          <span className="font-mono text-[10px]">PAGE 1 OF 3</span>
        </div>
      </div>

      {/* 第 2 页：数字密码与十二命宫全息图 */}
      <div 
        ref={page2Ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          height: '1123px',
          backgroundColor: '#090a0f',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden'
        }}
        className="p-7 flex flex-col justify-between"
      >
        {/* 页眉 */}
        <div 
          style={{ borderColor: '#d4af37', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(20,22,30,0.95) 100%)' }}
          className="border-2 rounded-2xl p-4 flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt="Logo" 
                style={{ borderColor: '#d4af37', backgroundColor: '#000000' }}
                className="w-12 h-12 rounded-xl border-2 object-contain p-1" 
              />
            ) : (
              <div 
                style={{ borderColor: '#d4af37', backgroundColor: '#000000' }}
                className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-[#d4af37]"
              >
                <Sparkles className="w-6 h-6 text-[#d4af37]" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-white">命理档案</h1>
              <span className="text-[10px] text-[#d4af37] font-bold">数字命宫</span>
            </div>
          </div>

          <div className="text-right min-w-0 max-w-[280px]">
            <div 
              className="font-black text-white truncate whitespace-nowrap"
              style={{
                fontSize: client.name.length > 18 ? '12px' : client.name.length > 12 ? '14px' : '16px'
              }}
              title={client.name}
            >
              {client.name}
            </div>
            <div className="text-xs text-[#d4af37] font-bold whitespace-nowrap">
              {client.gender === 'male' ? '乾造' : '坤造'} · {age}岁
            </div>
            <div className="text-[10px] text-zinc-400 font-mono whitespace-nowrap flex items-center justify-end gap-1.5">
              <span>{analysisData.currentYear}流年</span>
              <span>·</span>
              <span>生成日期: {todayStr}</span>
            </div>
          </div>
        </div>

        {/* 模块一：数字学 NUMEROLOGY & 模块二：十二命宫巡环 THAI DESTINY WHEEL */}
        <div className="flex flex-col gap-3 my-2 justify-start">
          <NumerologyMatrixView
            birthYear={analysisData.birthYearStr}
            birthMonth={analysisData.birthMonthStr}
            birthDay={analysisData.birthDayStr}
            coreVal={analysisData.coreVal}
            currentYear={analysisData.currentYear}
            matrixRows={analysisData.numerologyMatrixRows}
            baseValues={analysisData.baseValues}
            numDimensions={analysisData.numDimensions}
            isPdf={true}
          />

          <ThaiDestinyWheelView
            client={client}
            age={age}
            thaiIndex={analysisData.thaiIndex}
            activeThaiSymbol={analysisData.activeThaiSymbol}
            isPdf={true}
          />
        </div>

        {/* 页脚 2 */}
        <div style={{ borderColor: 'rgba(212,175,55,0.4)' }} className="border-t pt-2.5 mt-auto flex items-center justify-between text-xs text-zinc-500">
          <span className="text-[#d4af37] font-bold">命理档案</span>
          <span className="text-[10px] text-zinc-400 font-mono">生成日期: {todayStr}</span>
          <span className="font-mono text-[10px]">PAGE 2 OF 3</span>
        </div>
      </div>

      {/* 第 3 页：西洋占星全息图 (星盘 + 四角 + 行星位置 + 完整相位分析) */}
      <div 
        ref={page3Ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '794px',
          height: '1123px',
          backgroundColor: '#090a0f',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden'
        }}
        className="p-7 flex flex-col justify-between"
      >
        {/* 页眉 */}
        <div 
          style={{ borderColor: '#d4af37', background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(20,22,30,0.95) 100%)' }}
          className="border-2 rounded-2xl p-4 flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            {currentLogo ? (
              <img 
                src={currentLogo} 
                alt="Logo" 
                style={{ borderColor: '#d4af37', backgroundColor: '#000000' }}
                className="w-12 h-12 rounded-xl border-2 object-contain p-1" 
              />
            ) : (
              <div 
                style={{ borderColor: '#d4af37', backgroundColor: '#000000' }}
                className="w-12 h-12 rounded-xl border-2 flex items-center justify-center text-[#d4af37]"
              >
                <Sparkles className="w-6 h-6 text-[#d4af37]" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-black text-white">命理档案</h1>
              <span className="text-[10px] text-[#d4af37] font-bold">西洋占星</span>
            </div>
          </div>

          <div className="text-right min-w-0 max-w-[280px]">
            <div 
              className="font-black text-white truncate whitespace-nowrap"
              style={{
                fontSize: client.name.length > 18 ? '12px' : client.name.length > 12 ? '14px' : '16px'
              }}
              title={client.name}
            >
              {client.name}
            </div>
            <div className="text-xs text-[#d4af37] font-bold whitespace-nowrap">
              {client.gender === 'male' ? '乾造' : '坤造'} · {age}岁
            </div>
            <div className="text-[10px] text-zinc-400 font-mono whitespace-nowrap flex items-center justify-end gap-1.5">
              <span>{analysisData.currentYear}流年</span>
              <span>·</span>
              <span>生成日期: {todayStr}</span>
            </div>
          </div>
        </div>

        {/* 模块一：西洋占星全息图 (星盘 + 4轴 + 10行星 + 完整相位分析) */}
        <div className="flex flex-col gap-3 my-2 justify-start">
          <WesternAstrologyFullView
            westernData={analysisData}
            aspects={analysisData.aspectsList}
            isPdf={true}
          />
        </div>

        {/* 页脚 3 */}
        <div style={{ borderColor: 'rgba(212,175,55,0.4)' }} className="border-t pt-2.5 mt-auto flex items-center justify-between text-xs text-zinc-500">
          <span className="text-[#d4af37] font-bold">命理档案</span>
          <span className="text-[10px] text-zinc-400 font-mono">生成日期: {todayStr}</span>
          <span className="font-mono text-[10px]">PAGE 3 OF 3</span>
        </div>
      </div>

    </div>
  );
}
