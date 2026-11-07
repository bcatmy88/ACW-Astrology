import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, 
  MapPin, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Compass, 
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sliders,
  Sparkles
} from 'lucide-react';
import type { AppLanguage } from '../types';
import LanguageToggle from './LanguageToggle';

interface LuopanViewProps {
  onOpenMenu: () => void;
  lang?: AppLanguage;
  onToggleLang?: (lang: AppLanguage) => void;
}

// 24 Mountains definition in 360° clockwise order starting from 0° (正北子山)
interface MountainData {
  id: number;
  name: string;
  bagua: string;
  trigram: string;
  element: string;
  polarity: '阴' | '阳';
  centerDeg: number;
  startDeg: number;
  endDeg: number;
  color: string;
}

const MOUNTAINS_24: MountainData[] = [
  { id: 0, name: '子', bagua: '坎', trigram: '☵', element: '水', polarity: '阴', centerDeg: 0, startDeg: 352.5, endDeg: 7.5, color: '#38bdf8' },
  { id: 1, name: '癸', bagua: '坎', trigram: '☵', element: '水', polarity: '阴', centerDeg: 15, startDeg: 7.5, endDeg: 22.5, color: '#38bdf8' },
  { id: 2, name: '丑', bagua: '艮', trigram: '☶', element: '土', polarity: '阴', centerDeg: 30, startDeg: 22.5, endDeg: 37.5, color: '#facc15' },
  { id: 3, name: '艮', bagua: '艮', trigram: '☶', element: '土', polarity: '阳', centerDeg: 45, startDeg: 37.5, endDeg: 52.5, color: '#facc15' },
  { id: 4, name: '寅', bagua: '艮', trigram: '☶', element: '木', polarity: '阳', centerDeg: 60, startDeg: 52.5, endDeg: 67.5, color: '#4ade80' },
  { id: 5, name: '甲', bagua: '震', trigram: '☳', element: '木', polarity: '阳', centerDeg: 75, startDeg: 67.5, endDeg: 82.5, color: '#4ade80' },
  { id: 6, name: '卯', bagua: '震', trigram: '☳', element: '木', polarity: '阴', centerDeg: 90, startDeg: 82.5, endDeg: 97.5, color: '#4ade80' },
  { id: 7, name: '乙', bagua: '震', trigram: '☳', element: '木', polarity: '阴', centerDeg: 105, startDeg: 97.5, endDeg: 112.5, color: '#4ade80' },
  { id: 8, name: '辰', bagua: '巽', trigram: '☴', element: '土', polarity: '阳', centerDeg: 120, startDeg: 112.5, endDeg: 127.5, color: '#facc15' },
  { id: 9, name: '巽', bagua: '巽', trigram: '☴', element: '木', polarity: '阴', centerDeg: 135, startDeg: 127.5, endDeg: 142.5, color: '#4ade80' },
  { id: 10, name: '巳', bagua: '巽', trigram: '☴', element: '火', polarity: '阴', centerDeg: 150, startDeg: 142.5, endDeg: 157.5, color: '#f87171' },
  { id: 11, name: '丙', bagua: '离', trigram: '☲', element: '火', polarity: '阳', centerDeg: 165, startDeg: 157.5, endDeg: 172.5, color: '#f87171' },
  { id: 12, name: '午', bagua: '离', trigram: '☲', element: '火', polarity: '阴', centerDeg: 180, startDeg: 172.5, endDeg: 187.5, color: '#f87171' },
  { id: 13, name: '丁', bagua: '离', trigram: '☲', element: '火', polarity: '阴', centerDeg: 195, startDeg: 187.5, endDeg: 202.5, color: '#f87171' },
  { id: 14, name: '未', bagua: '坤', trigram: '☷', element: '土', polarity: '阴', centerDeg: 210, startDeg: 202.5, endDeg: 217.5, color: '#facc15' },
  { id: 15, name: '坤', bagua: '坤', trigram: '☷', element: '土', polarity: '阴', centerDeg: 225, startDeg: 217.5, endDeg: 232.5, color: '#facc15' },
  { id: 16, name: '申', bagua: '坤', trigram: '☷', element: '金', polarity: '阳', centerDeg: 240, startDeg: 232.5, endDeg: 247.5, color: '#e2e8f0' },
  { id: 17, name: '庚', bagua: '兑', trigram: '☱', element: '金', polarity: '阳', centerDeg: 255, startDeg: 247.5, endDeg: 262.5, color: '#e2e8f0' },
  { id: 18, name: '酉', bagua: '兑', trigram: '☱', element: '金', polarity: '阴', centerDeg: 270, startDeg: 262.5, endDeg: 277.5, color: '#e2e8f0' },
  { id: 19, name: '辛', bagua: '兑', trigram: '☱', element: '金', polarity: '阴', centerDeg: 285, startDeg: 277.5, endDeg: 292.5, color: '#e2e8f0' },
  { id: 20, name: '戌', bagua: '乾', trigram: '☰', element: '土', polarity: '阳', centerDeg: 300, startDeg: 292.5, endDeg: 307.5, color: '#facc15' },
  { id: 21, name: '乾', bagua: '乾', trigram: '☰', element: '金', polarity: '阳', centerDeg: 315, startDeg: 307.5, endDeg: 322.5, color: '#e2e8f0' },
  { id: 22, name: '亥', bagua: '乾', trigram: '☰', element: '水', polarity: '阴', centerDeg: 330, startDeg: 322.5, endDeg: 337.5, color: '#38bdf8' },
  { id: 23, name: '壬', bagua: '坎', trigram: '☵', element: '水', polarity: '阳', centerDeg: 345, startDeg: 337.5, endDeg: 352.5, color: '#38bdf8' }
];

const BAGUA_8 = [
  { name: '坎', trigram: '☵', dir: '正北', centerDeg: 0, element: '水', number: '一白' },
  { name: '艮', trigram: '☶', dir: '东北', centerDeg: 45, element: '土', number: '八白' },
  { name: '震', trigram: '☳', dir: '正东', centerDeg: 90, element: '木', number: '三碧' },
  { name: '巽', trigram: '☴', dir: '东南', centerDeg: 135, element: '木', number: '四绿' },
  { name: '离', trigram: '☲', dir: '正南', centerDeg: 180, element: '火', number: '九紫' },
  { name: '坤', trigram: '☷', dir: '西南', centerDeg: 225, element: '土', number: '二黑' },
  { name: '兑', trigram: '☱', dir: '正西', centerDeg: 270, element: '金', number: '七赤' },
  { name: '乾', trigram: '☰', dir: '西北', centerDeg: 315, element: '金', number: '六白' }
];

// Calculate Mountain from degree (0 - 360)
function getMountainFromDegree(deg: number): MountainData {
  const normalized = ((deg % 360) + 360) % 360;
  for (const m of MOUNTAINS_24) {
    if (m.startDeg > m.endDeg) {
      // Wraps around 0° (子山: 352.5° - 7.5°)
      if (normalized >= m.startDeg || normalized < m.endDeg) return m;
    } else {
      if (normalized >= m.startDeg && normalized < m.endDeg) return m;
    }
  }
  return MOUNTAINS_24[0];
}

// Calculate sitting direction from facing direction
function getSittingMountain(facingDeg: number): MountainData {
  const sittingDeg = (facingDeg + 180) % 360;
  return getMountainFromDegree(sittingDeg);
}

// Calculate Fenjin deviation (兼向分金)
function getFenjinStatus(deg: number, mountain: MountainData): string {
  const diff = Math.abs(((deg - mountain.centerDeg + 180) % 360) - 180);
  if (diff <= 3.0) {
    return '正针清纯 (正线大吉)';
  } else if (diff <= 4.5) {
    return '微兼 (线位平和)';
  } else {
    return '兼向分金 (兼线分金)';
  }
}

export default function LuopanView({ onOpenMenu, lang = 'zh', onToggleLang }: LuopanViewProps) {
  // Heading degree: 0° is North
  const [heading, setHeading] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [useDeviceSensor, setUseDeviceSensor] = useState<boolean>(false);
  const [sensorSupported, setSensorSupported] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Drag interaction state
  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartAngleRef = useRef<number>(0);
  const initialHeadingRef = useRef<number>(0);

  // Geolocation state
  const [locationText, setLocationText] = useState<string>('定位中...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLoadingLoc, setIsLoadingLoc] = useState<boolean>(false);

  // Fetch real geolocation
  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationText('吉隆坡 (3.1390° N, 101.6869° E)');
      return;
    }
    setIsLoadingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setAccuracy(Math.round(pos.coords.accuracy));
        const latStr = `${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
        const lngStr = `${lng.toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
        setLocationText(`${latStr}, ${lngStr}`);
        setIsLoadingLoc(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        // Fallback default
        setLocationText('吉隆坡 (3.1390° N, 101.6869° E)');
        setIsLoadingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  // Handle Device Orientation Sensor
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setSensorSupported(true);
    }
  }, []);

  useEffect(() => {
    if (!useDeviceSensor || isLocked) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;
      // iOS webkitCompassHeading
      if ((e as any).webkitCompassHeading !== undefined) {
        compassHeading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Android fallback (approximate true heading)
        compassHeading = (360 - e.alpha) % 360;
      }

      if (compassHeading !== null) {
        setHeading(Math.round(compassHeading * 10) / 10);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [useDeviceSensor, isLocked]);

  const requestSensorPermission = async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setHasPermission(true);
          setUseDeviceSensor(true);
        } else {
          alert('需要授权罗盘传感器权限以使用实时方向');
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setUseDeviceSensor(prev => !prev);
    }
  };

  // Drag rotation handlers for dial
  const getAngleFromEvent = (clientX: number, clientY: number): number => {
    if (!dialRef.current) return 0;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(clientY - cy, clientX - cx);
    let deg = (rad * 180) / Math.PI;
    // Rotate so top is 0°
    deg = (deg + 90 + 360) % 360;
    return deg;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;
    isDraggingRef.current = true;
    const angle = getAngleFromEvent(e.clientX, e.clientY);
    dragStartAngleRef.current = angle;
    initialHeadingRef.current = heading;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || isLocked) return;
    const currentAngle = getAngleFromEvent(e.clientX, e.clientY);
    const delta = currentAngle - dragStartAngleRef.current;
    // Rotate counter to drag so dial follows pointer
    let newHeading = (initialHeadingRef.current - delta + 360) % 360;
    setHeading(Math.round(newHeading * 10) / 10);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
  };

  // Current calculations
  const facingMountain = useMemo(() => getMountainFromDegree(heading), [heading]);
  const sittingMountain = useMemo(() => getSittingMountain(heading), [heading]);
  const fenjinText = useMemo(() => getFenjinStatus(heading, facingMountain), [heading, facingMountain]);

  const facingBagua = useMemo(() => {
    return BAGUA_8.find(b => b.name === facingMountain.bagua) || BAGUA_8[0];
  }, [facingMountain]);


  return (
    <div className="flex flex-col gap-3 pb-8 max-w-4xl mx-auto w-full">
      {/* 1. HEADER BAR */}
      <header 
        className="sticky top-0 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-10 sm:pt-12 pb-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between gap-2 shadow-lg"
        style={{ paddingTop: 'max(2.75rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))' }}
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
              {lang === 'zh' ? '风水罗盘' : 'Feng Shui Luopan'}
            </h1>
            <span className="text-[11px] bg-gold/20 text-gold border border-gold/40 px-2 py-0.5 rounded-full font-black shrink-0">
              
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Lock / Unlock Toggle */}
          <button
            type="button"
            onClick={() => setIsLocked(!isLocked)}
            className={`h-9 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
              isLocked 
                ? 'bg-amber-500/20 border-gold text-gold shadow-sm' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title={isLocked ? '已锁盘' : '解锁中'}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5 text-gold" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="text-[11px] whitespace-nowrap">{isLocked ? '已锁盘' : '锁定'}</span>
          </button>

          {/* Device Sensor Toggle */}
          <button
            type="button"
            onClick={requestSensorPermission}
            className={`h-9 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all cursor-pointer ${
              useDeviceSensor 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="实景陀螺仪"
          >
            <Compass className={`w-3.5 h-3.5 ${useDeviceSensor ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
            <span className="text-[11px] whitespace-nowrap">{useDeviceSensor ? '实测中' : '传感器'}</span>
          </button>

          {onToggleLang && <LanguageToggle lang={lang} onToggle={onToggleLang} />}
        </div>
      </header>

      {/* 2. MAIN LUOPAN DIAL CONTAINER (天圆地方黑金尊贵设计) */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-5 shadow-2xl flex flex-col items-center relative overflow-hidden">
        {/* Top Direction Banner */}
        <div className="flex items-center justify-between w-full mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">当前朝向:</span>
            <span className="text-base sm:text-lg font-black text-gold font-mono tracking-tight">
              {heading.toFixed(1)}°
            </span>
            <span className="px-2 py-0.5 rounded bg-gold/15 border border-gold/30 text-gold text-xs font-black">
              {facingMountain.bagua}卦·{facingMountain.name}山
            </span>
          </div>

          <div className="text-xs font-bold text-zinc-400">
            坐向: <strong className="text-white ml-1 font-bold">坐{sittingMountain.name}向{facingMountain.name}</strong>
          </div>
        </div>

        {/* The Luopan Chassis & Rotating Disc */}
        <div 
          ref={dialRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-72 h-72 sm:w-84 sm:h-84 md:w-96 md:h-96 touch-none select-none flex items-center justify-center mx-auto my-2 cursor-grab active:cursor-grabbing"
        >
          {/* Outer Square Chassis (天圆地方底座) */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-gold/40 shadow-[0_0_35px_rgba(212,175,55,0.18)] flex items-center justify-center overflow-hidden">
            {/* Corner Decorative Patterns */}
            <div className="absolute top-1.5 left-2 text-[9px] font-black text-gold/40">天圆地方</div>
            <div className="absolute top-1.5 right-2 text-[9px] font-black text-gold/40">九运分金</div>
            <div className="absolute bottom-1.5 left-2 text-[9px] font-black text-gold/40">正针指南</div>
            <div className="absolute bottom-1.5 right-2 text-[9px] font-black text-gold/40">玄空大卦</div>
          </div>

          {/* Rotating Plate (内圆转盘) - Rotates with -heading */}
          <div 
            className="relative w-[92%] h-[92%] rounded-full shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-transform ease-out"
            style={{ 
              transform: `rotate(${-heading}deg)`,
              transitionDuration: isDraggingRef.current ? '0ms' : '200ms'
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-md">
              {/* Dial Background Plate */}
              <circle cx="200" cy="200" r="198" fill="#090a0f" stroke="#d4af37" strokeWidth="2" />
              <circle cx="200" cy="200" r="172" fill="#0f1118" stroke="#d4af37" strokeWidth="1" opacity="0.6" />
              <circle cx="200" cy="200" r="126" fill="#090a0f" stroke="#d4af37" strokeWidth="1" opacity="0.6" />
              <circle cx="200" cy="200" r="78" fill="#141724" stroke="#d4af37" strokeWidth="1.5" />

              {/* 1. Ring 1: 360 Degree Ticks & Numbers (Outer Ring) */}
              {Array.from({ length: 72 }).map((_, i) => {
                const deg = i * 5;
                const isMajor = deg % 30 === 0;
                const isMedium = deg % 10 === 0;
                const rad = ((deg - 90) * Math.PI) / 180;
                const rInner = isMajor ? 180 : isMedium ? 185 : 189;
                const rOuter = 196;
                const x1 = 200 + rInner * Math.cos(rad);
                const y1 = 200 + rInner * Math.sin(rad);
                const x2 = 200 + rOuter * Math.cos(rad);
                const y2 = 200 + rOuter * Math.sin(rad);

                // Degree text at 30° intervals
                let labelElem = null;
                if (isMajor) {
                  const textR = 175;
                  const tx = 200 + textR * Math.cos(rad);
                  const ty = 200 + textR * Math.sin(rad);
                  labelElem = (
                    <text
                      key={`deg-${deg}`}
                      x={tx}
                      y={ty}
                      fill="#a1a1aa"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${deg}, ${tx}, ${ty})`}
                    >
                      {deg}°
                    </text>
                  );
                }

                return (
                  <React.Fragment key={`tick-${i}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isMajor ? '#facc15' : isMedium ? '#71717a' : '#3f3f46'}
                      strokeWidth={isMajor ? 1.5 : 0.75}
                    />
                    {labelElem}
                  </React.Fragment>
                );
              })}

              {/* 2. Ring 2: 24 Mountains (二十四山环) */}
              {MOUNTAINS_24.map((m) => {
                const deg = m.centerDeg;
                const rad = ((deg - 90) * Math.PI) / 180;
                // Dividing radial lines for each 15°
                const lineRad = ((m.startDeg - 90) * Math.PI) / 180;
                const lx1 = 200 + 126 * Math.cos(lineRad);
                const ly1 = 200 + 126 * Math.sin(lineRad);
                const lx2 = 200 + 172 * Math.cos(lineRad);
                const ly2 = 200 + 172 * Math.sin(lineRad);

                // Mountain Character Position
                const mr = 150;
                const mx = 200 + mr * Math.cos(rad);
                const my = 200 + mr * Math.sin(rad);

                // Polarity dot position (+ for Yang, - for Yin)
                const pr = 163;
                const px = 200 + pr * Math.cos(rad);
                const py = 200 + pr * Math.sin(rad);

                return (
                  <React.Fragment key={`mountain-${m.id}`}>
                    {/* 15° Border Line */}
                    <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#3f3f46" strokeWidth="0.75" />
                    
                    {/* Mountain Character */}
                    <text
                      x={mx}
                      y={my}
                      fill={m.color}
                      fontSize="14"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${deg}, ${mx}, ${my})`}
                    >
                      {m.name}
                    </text>

                    {/* Element / Polarity dot */}
                    <circle 
                      cx={px} 
                      cy={py} 
                      r="1.75" 
                      fill={m.polarity === '阳' ? '#ef4444' : '#60a5fa'} 
                    />
                  </React.Fragment>
                );
              })}

              {/* 3. Ring 3: Eight Trigrams (八卦环) */}
              {BAGUA_8.map((b, i) => {
                const deg = b.centerDeg;
                const rad = ((deg - 90) * Math.PI) / 180;
                // 45° boundary lines
                const lineRad = ((deg - 22.5 - 90) * Math.PI) / 180;
                const lx1 = 200 + 78 * Math.cos(lineRad);
                const ly1 = 200 + 78 * Math.sin(lineRad);
                const lx2 = 200 + 126 * Math.cos(lineRad);
                const ly2 = 200 + 126 * Math.sin(lineRad);

                // Trigram symbol & name
                const textR = 102;
                const tx = 200 + textR * Math.cos(rad);
                const ty = 200 + textR * Math.sin(rad);

                return (
                  <React.Fragment key={`bagua-${i}`}>
                    <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="#d4af37" strokeWidth="1" opacity="0.7" />
                    <text
                      x={tx}
                      y={ty}
                      fill="#fef08a"
                      fontSize="13"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${deg}, ${tx}, ${ty})`}
                    >
                      {b.name} {b.trigram}
                    </text>
                  </React.Fragment>
                );
              })}

              {/* 4. Center Heaven Pool (天池) */}
              <circle cx="200" cy="200" r="76" fill="#040609" stroke="#d4af37" strokeWidth="2" />
              <circle cx="200" cy="200" r="73" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="2 2" />

              {/* Bottom Heaven Pool Red Guideline (海底子午红线) */}
              <line x1="200" y1="128" x2="200" y2="272" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
              <circle cx="200" cy="132" r="2.5" fill="#ef4444" />
              <circle cx="200" cy="268" r="2.5" fill="#ef4444" />

              {/* Heaven Pool Labels: 子(北) at top, 午(南) at bottom */}
              <text x="200" y="145" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">子</text>
              <text x="200" y="258" fill="#e4e4e7" fontSize="10" fontWeight="bold" textAnchor="middle">午</text>
            </svg>
          </div>

          {/* FIXED OVERLAY: Crosshairs (十字天心红线 - Fixed to Chassis) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 400 400">
            {/* Red Crosshairs (十字红线) */}
            <line x1="200" y1="8" x2="200" y2="392" stroke="#ef4444" strokeWidth="1.2" opacity="0.9" />
            <line x1="8" y1="200" x2="392" y2="200" stroke="#ef4444" strokeWidth="1.2" opacity="0.9" />

            {/* Top Facing Arrow Pointer (向首定位三角) */}
            <polygon points="200,6 193,22 207,22" fill="#ef4444" stroke="#ffffff" strokeWidth="0.5" />
            <text x="200" y="32" fill="#facc15" fontSize="11" fontWeight="900" textAnchor="middle">向</text>
            <text x="200" y="375" fill="#a1a1aa" fontSize="11" fontWeight="900" textAnchor="middle">坐</text>
          </svg>

          {/* FIXED OVERLAY: Magnetic Needle (天池磁针 - Points Magnetic North/South) */}
          <div className="absolute z-20 pointer-events-none flex items-center justify-center">
            {/* Magnetic Needle */}
            <svg width="40" height="96" viewBox="0 0 40 96" className="drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
              {/* North Pointer (Red) */}
              <polygon points="20,8 14,48 26,48" fill="#ef4444" stroke="#ffffff" strokeWidth="0.5" />
              {/* South Pointer (Gold/Brass) */}
              <polygon points="20,88 14,48 26,48" fill="#d4af37" stroke="#ffffff" strokeWidth="0.5" />
              {/* Center Gem Pivot */}
              <circle cx="20" cy="48" r="4.5" fill="#facc15" stroke="#000000" strokeWidth="1.5" />
              <circle cx="20" cy="48" r="1.5" fill="#ffffff" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. CURRENT LOCATION BANNER (当前定位 - 单行紧凑整洁) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs shadow-md">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-gold shrink-0" />
          <span className="text-zinc-400 font-bold shrink-0">当前定位:</span>
          <span className="text-white font-mono font-bold truncate">
            {locationText}
          </span>
          {accuracy && (
            <span className="text-[10px] text-zinc-500 hidden sm:inline">
              (精度 ±{accuracy}m)
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={fetchLocation}
          disabled={isLoadingLoc}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-gold text-[11px] font-bold border border-zinc-700/80 transition-all shrink-0 cursor-pointer ml-2"
          title="重新刷新当前位置"
        >
          <RefreshCw className={`w-3 h-3 ${isLoadingLoc ? 'animate-spin' : ''}`} />
          <span>刷新</span>
        </button>
      </div>

      {/* 4. LUOPAN DATA CARDS (核心罗盘数据 - 严格单行高对比排版，绝不缩成两排) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Card 1: 坐向分金 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-zinc-400">坐向分金</span>
          <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-zinc-400">坐</span>
            <strong className="text-amber-300">{sittingMountain.name}山</strong>
            <span className="text-zinc-400">向</span>
            <strong className="text-gold">{facingMountain.name}山</strong>
            <span className="text-[10px] text-zinc-500 font-normal">({sittingMountain.bagua}向{facingMountain.bagua})</span>
          </span>
        </div>

        {/* Card 2: 朝向度数 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-zinc-400">朝向度数</span>
          <span className="text-xs sm:text-sm font-black text-gold font-mono whitespace-nowrap">
            {heading.toFixed(1)}° <span className="text-white font-sans text-xs">({facingBagua.dir})</span>
          </span>
        </div>

        {/* Card 3: 所属八卦 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-zinc-400">所属八卦</span>
          <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-amber-300">{facingBagua.name}卦</span>
            <span className="text-xs font-mono text-gold">{facingBagua.trigram}</span>
            <span className="text-[11px] text-zinc-400">({facingBagua.number}·{facingBagua.element})</span>
          </span>
        </div>

        {/* Card 4: 二十四山当令 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-zinc-400">当令本山</span>
          <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1 whitespace-nowrap">
            <strong style={{ color: facingMountain.color }}>{facingMountain.name}山</strong>
            <span className="text-[11px] text-zinc-400">({facingMountain.polarity}{facingMountain.element}·中心 {facingMountain.centerDeg}°)</span>
          </span>
        </div>

        {/* Card 5: 分金出线状态 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-zinc-400">分金线度</span>
          <span className="text-xs sm:text-sm font-black text-amber-300 whitespace-nowrap">
            {fenjinText}
          </span>
        </div>

        {/* Card 6: 三元九运 (2024-2043) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-zinc-400">三元九运</span>
          <span className="text-xs sm:text-sm font-black text-gold flex items-center gap-1 whitespace-nowrap">
            <span>九运 (2024-2043)</span>
            <span className="text-[11px] text-zinc-400">离火当令</span>
          </span>
        </div>
      </div>
    </div>
  );
}
