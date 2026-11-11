import * as Astronomy from 'astronomy-engine';

export interface AstroPlanetInfo {
  id: string;
  name: string;
  symbol: string;
  longitude: number;
  signIndex: number;
  degree: number;
  sign: { name: string; symbol: string; eng: string };
  isRetrograde: boolean;
  house?: number;
  speed?: number;
}

export interface AstroHouseInfo {
  number: number;
  start: number;
  end: number;
  sign: { name: string; symbol: string; eng: string };
  deg: number;
}

export interface AstroAspectInfo {
  planet1: { id: string; name: string; symbol: string; longitude: number };
  planet2: { id: string; name: string; symbol: string; longitude: number };
  aspect: {
    name: string;
    shortName: string;
    symbol: string;
    angle: number;
    color: string;
    nature: 'auspicious' | 'challenging' | 'neutral';
  };
  exactDiff: number;
  orb: number;
  influence: string;
}

export interface MultiChartResult {
  chartType: string;
  category: string;
  chartTitle: string;
  chartSubtitle: string;
  description: string;
  isDualWheel: boolean;
  paramsSummary: string;
  primary: {
    label: string;
    dateFormatted: string;
    timeFormatted: string;
    planets: AstroPlanetInfo[];
    asc: number;
    mc: number;
    dsc: number;
    ic: number;
    ascSign: { name: string; symbol: string; eng: string };
    mcSign: { name: string; symbol: string; eng: string };
    dscSign: { name: string; symbol: string; eng: string };
    icSign: { name: string; symbol: string; eng: string };
    ascDeg: number;
    mcDeg: number;
    ascSignIdx: number;
    houses: AstroHouseInfo[];
  };
  secondary?: {
    label: string;
    dateFormatted: string;
    timeFormatted: string;
    planets: AstroPlanetInfo[];
  };
  aspects: AstroAspectInfo[];
  interpretation: {
    headline: string;
    coreHighlights: Array<{ label: string; value: string; detail?: string }>;
    analysis: string;
  };
}

export const ZODIAC_SIGNS = [
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

export const WESTERN_PLANETS_DEF = [
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

const ASPECT_RULES = [
  { name: '合相', shortName: '合', symbol: '☌', angle: 0, maxOrb: 8, color: 'text-amber-400', nature: 'neutral' as const },
  { name: '六合', shortName: '六合', symbol: '⚹', angle: 60, maxOrb: 5, color: 'text-cyan-400', nature: 'auspicious' as const },
  { name: '刑相', shortName: '刑', symbol: '□', angle: 90, maxOrb: 7, color: 'text-rose-400', nature: 'challenging' as const },
  { name: '拱相', shortName: '拱', symbol: '△', angle: 120, maxOrb: 7, color: 'text-emerald-400', nature: 'auspicious' as const },
  { name: '冲相', shortName: '冲', symbol: '☍', angle: 180, maxOrb: 8, color: 'text-purple-400', nature: 'challenging' as const },
];

/**
 * Calculates raw celestial positions for a given UTC date and observer location
 */
export function calculateCelestialPositions(
  utcDate: Date,
  latitude: number,
  longitude: number
) {
  const time = Astronomy.MakeTime(utcDate);

  const planets: AstroPlanetInfo[] = WESTERN_PLANETS_DEF.map(p => {
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

      // Retrograde check 1 hour later
      const timeLater = Astronomy.MakeTime(new Date(utcDate.getTime() + 60 * 60 * 1000));
      const vecLater = Astronomy.GeoVector(body, timeLater, true);
      const eclLater = Astronomy.Ecliptic(vecLater);
      let diff = eclLater.elon - ecl.elon;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      isRetrograde = diff < 0;
    }

    const normLon = (lon % 360 + 360) % 360;
    const signIdx = Math.floor(normLon / 30);
    const degInSign = normLon % 30;

    return {
      ...p,
      longitude: normLon,
      signIndex: signIdx,
      degree: degInSign,
      sign: ZODIAC_SIGNS[signIdx],
      isRetrograde
    };
  });

  // Angles: True obliquity, RAMC, ASC, MC
  const tilt = Astronomy.e_tilt(time);
  const obl = tilt.tobl * (Math.PI / 180.0);
  const lst = (Astronomy.SiderealTime(time) + longitude / 15.0) % 24;
  const ramc = (lst * 15.0 * Math.PI) / 180.0;
  const latRad = (latitude * Math.PI) / 180.0;

  let mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(obl));
  mc = ((mc * 180.0) / Math.PI + 360) % 360;

  let asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(obl) + Math.tan(latRad) * Math.sin(obl)));
  asc = ((asc * 180.0) / Math.PI + 360) % 360;

  const dsc = (asc + 180) % 360;
  const ic = (mc + 180) % 360;

  // Whole Sign Houses anchored to ASC
  const ascSignIdx = Math.floor(asc / 30);
  const houses: AstroHouseInfo[] = [];
  for (let i = 0; i < 12; i++) {
    const signIndex = (ascSignIdx + i) % 12;
    houses.push({
      number: i + 1,
      start: (signIndex * 30),
      end: ((signIndex + 1) * 30) % 360,
      sign: ZODIAC_SIGNS[signIndex],
      deg: asc % 30,
    });
  }

  // Assign planets to houses
  planets.forEach(p => {
    const pSignIdx = Math.floor(p.longitude / 30);
    p.house = ((pSignIdx - ascSignIdx + 12) % 12) + 1;
  });

  return {
    planets,
    asc,
    mc,
    dsc,
    ic,
    ascSign: ZODIAC_SIGNS[Math.floor(asc / 30)],
    mcSign: ZODIAC_SIGNS[Math.floor(mc / 30)],
    dscSign: ZODIAC_SIGNS[Math.floor(dsc / 30)],
    icSign: ZODIAC_SIGNS[Math.floor(ic / 30)],
    ascDeg: asc % 30,
    mcDeg: mc % 30,
    ascSignIdx,
    houses
  };
}

/**
 * Calculates aspects between two lists of planets or within single list
 */
export function calculateAspectsList(
  listA: AstroPlanetInfo[],
  listB?: AstroPlanetInfo[]
): AstroAspectInfo[] {
  const aspects: AstroAspectInfo[] = [];
  const isInterChart = Boolean(listB);
  const secondaryList = listB || listA;

  for (let i = 0; i < listA.length; i++) {
    const startJ = isInterChart ? 0 : i + 1;
    for (let j = startJ; j < secondaryList.length; j++) {
      const p1 = listA[i];
      const p2 = secondaryList[j];
      if (!isInterChart && p1.id === p2.id) continue;

      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const rule of ASPECT_RULES) {
        const orb = Math.abs(diff - rule.angle);
        if (orb <= rule.maxOrb) {
          aspects.push({
            planet1: { id: p1.id, name: p1.name, symbol: p1.symbol, longitude: p1.longitude },
            planet2: { id: p2.id, name: p2.name, symbol: p2.symbol, longitude: p2.longitude },
            aspect: rule,
            exactDiff: diff,
            orb: Math.round(orb * 100) / 100,
            influence: `${p1.name}与${p2.name}呈${rule.name}（容许度 ${orb.toFixed(1)}°）`
          });
          break;
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

/**
 * Midpoint angle along the shortest arc
 */
export function getShortArcMidpoint(lon1: number, lon2: number): number {
  let diff = lon2 - lon1;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return ((lon1 + diff / 2) % 360 + 360) % 360;
}

/**
 * Firdaria (法达星限法) Hellenistic/Persian chronocrator calculation
 */
export function calculateFirdaria(
  birthUtc: Date,
  targetUtc: Date,
  isDiurnal: boolean
) {
  const DAY_ORDER = [
    { planet: '太阳', symbol: '☉', years: 10, nature: '贵人显耀、社会地位提升、意志力确立' },
    { planet: '金星', symbol: '♀', years: 8, nature: '情感桃花、合作得利、艺术审美、财帛亨通' },
    { planet: '水星', symbol: '☿', years: 13, nature: '智慧学识、商贸签约、逻辑思辨、社交走动' },
    { planet: '月亮', symbol: '☽', years: 9, nature: '家庭内省、身心滋养、情绪迁徙、公众人缘' },
    { planet: '土星', symbol: '♄', years: 11, nature: '沉淀磨砺、责任重担、筑牢根基、考验蜕变' },
    { planet: '木星', symbol: '♃', years: 12, nature: '宏图大展、财富扩张、贵人扶持、信仰精进' },
    { planet: '火星', symbol: '♂', years: 7, nature: '果决行动、开疆拓土、竞争角逐、精力旺盛' },
    { planet: '北交点', symbol: '☊', years: 3, nature: '前世契机、突飞猛进、业力新篇' },
    { planet: '南交点', symbol: '☋', years: 2, nature: '放下解脱、灵性顿悟、断舍离' },
  ];

  const NIGHT_ORDER = [
    { planet: '月亮', symbol: '☽', years: 9, nature: '家庭内省、身心滋养、情绪迁徙、公众人缘' },
    { planet: '土星', symbol: '♄', years: 11, nature: '沉淀磨砺、责任重担、筑牢根基、考验蜕变' },
    { planet: '木星', symbol: '♃', years: 12, nature: '宏图大展、财富扩张、贵人扶持、信仰精进' },
    { planet: '火星', symbol: '♂', years: 7, nature: '果决行动、开疆拓土、竞争角逐、精力旺盛' },
    { planet: '太阳', symbol: '☉', years: 10, nature: '贵人显耀、社会地位提升、意志力确立' },
    { planet: '金星', symbol: '♀', years: 8, nature: '情感桃花、合作得利、艺术审美、财帛亨通' },
    { planet: '水星', symbol: '☿', years: 13, nature: '智慧学识、商贸签约、逻辑思辨、社交走动' },
    { planet: '北交点', symbol: '☊', years: 3, nature: '前世契机、突飞猛进、业力新篇' },
    { planet: '南交点', symbol: '☋', years: 2, nature: '放下解脱、灵性顿悟、断舍离' },
  ];

  const order = isDiurnal ? DAY_ORDER : NIGHT_ORDER;
  const age = Math.max(0, (targetUtc.getTime() - birthUtc.getTime()) / (365.2422 * 86400000));
  const cycleAge = age % 75;

  let currentMajor = order[0];
  let accumulatedYears = 0;
  let majorStartAge = 0;
  let majorEndAge = 0;

  for (const period of order) {
    if (cycleAge >= accumulatedYears && cycleAge < accumulatedYears + period.years) {
      currentMajor = period;
      majorStartAge = accumulatedYears;
      majorEndAge = accumulatedYears + period.years;
      break;
    }
    accumulatedYears += period.years;
  }

  // Sub-period (7 sub-periods of major lord)
  const subDuration = currentMajor.years / 7;
  const elapsedInMajor = cycleAge - majorStartAge;
  const subIdx = Math.min(6, Math.floor(elapsedInMajor / subDuration));
  const subOrder = [...order.slice(0, 7)];
  // Start sub-order from major planet
  const majorIndexIn7 = subOrder.findIndex(p => p.planet === currentMajor.planet);
  const reordered7 = majorIndexIn7 >= 0
    ? [...subOrder.slice(majorIndexIn7), ...subOrder.slice(0, majorIndexIn7)]
    : subOrder;
  const currentSub = reordered7[subIdx] || currentMajor;

  return {
    isDiurnal,
    age: Math.round(age * 10) / 10,
    majorPlanet: currentMajor.planet,
    majorSymbol: currentMajor.symbol,
    majorYears: currentMajor.years,
    majorAgeRange: `${majorStartAge.toFixed(1)} - ${majorEndAge.toFixed(1)} 岁`,
    subPlanet: currentSub.planet,
    subSymbol: currentSub.symbol,
    subAgeRange: `${(majorStartAge + subIdx * subDuration).toFixed(1)} - ${(majorStartAge + (subIdx + 1) * subDuration).toFixed(1)} 岁`,
    influence: currentMajor.nature
  };
}

/**
 * Universal Multi-Chart Computation Engine
 */
export function computeAstrologyMultiChart(options: {
  chartType: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  timezone: number;
  latitude: number;
  longitude: number;
  targetDate: string; // YYYY-MM-DD (transit / progress / return date)
  targetTime: string; // HH:mm
  // Partner info for Synastry & Composite
  partnerBirthDate?: string;
  partnerBirthTime?: string;
  partnerTimezone?: number;
  partnerLatitude?: number;
  partnerLongitude?: number;
  partnerName?: string;
  ingressType?: 'spring' | 'summer' | 'autumn' | 'winter';
}): MultiChartResult {
  const {
    chartType,
    birthDate,
    birthTime,
    timezone,
    latitude,
    longitude,
    targetDate,
    targetTime,
    partnerBirthDate = '1995-06-15',
    partnerBirthTime = '12:00',
    partnerTimezone = timezone,
    partnerLatitude = latitude,
    partnerLongitude = longitude,
    partnerName = '对象 / 伴侣',
    ingressType = 'spring'
  } = options;

  // 1. Base Natal Chart calculation
  const [ny, nm, nd] = birthDate.split('-').map(Number);
  const [nh, nmin] = birthTime.split(':').map(Number);
  const birthUtc = new Date(Date.UTC(ny, nm - 1, nd, (nh || 12) - timezone, nmin || 0));
  const natalChart = calculateCelestialPositions(birthUtc, latitude, longitude);

  // Target UTC for predictive/transit/sky
  const [ty, tm, td] = targetDate.split('-').map(Number);
  const [th, tmin] = targetTime.split(':').map(Number);
  const targetUtc = new Date(Date.UTC(ty, tm - 1, td, (th || 12) - timezone, tmin || 0));

  // Partner UTC for synastry/composite
  const [py, pm, pd] = partnerBirthDate.split('-').map(Number);
  const [ph, pmin] = partnerBirthTime.split(':').map(Number);
  const partnerUtc = new Date(Date.UTC(py, pm - 1, pd, (ph || 12) - partnerTimezone, pmin || 0));
  const partnerChart = calculateCelestialPositions(partnerUtc, partnerLatitude, partnerLongitude);

  // Age in years & days
  const ageYears = Math.max(0, (targetUtc.getTime() - birthUtc.getTime()) / (365.2422 * 86400000));
  const ageDays = Math.max(0, (targetUtc.getTime() - birthUtc.getTime()) / 86400000);

  // -------------------------------------------------------------------------------------
  // 1. 个人星盘
  // -------------------------------------------------------------------------------------
  if (chartType === '本命盘') {
    const aspects = calculateAspectsList(natalChart.planets);
    return {
      chartType,
      category: '个人星盘',
      chartTitle: '本命星盘 (Natal Chart)',
      chartSubtitle: `诞生时刻：${birthDate} ${birthTime} (UTC${timezone >= 0 ? '+' : ''}${timezone})`,
      description: '人生蓝图基准盘，展示灵魂本质、潜能赋能、天赋结构与各人生维度的底色。',
      isDualWheel: false,
      paramsSummary: `出生时间 ${birthDate} ${birthTime}`,
      primary: {
        label: '本命基准盘',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      },
      aspects,
      interpretation: {
        headline: `${natalChart.ascSign.name}上升 · ${natalChart.planets.find(p => p.id === 'Sun')?.sign.name}太阳 · ${natalChart.planets.find(p => p.id === 'Moon')?.sign.name}月亮`,
        coreHighlights: [
          { label: '上升点 ASC', value: `${natalChart.ascSign.name} ${Math.floor(natalChart.ascDeg)}°`, detail: '外在人格与面对世界的门面' },
          { label: '天顶点 MC', value: `${natalChart.mcSign.name} ${Math.floor(natalChart.mcDeg)}°`, detail: '人生顶峰与社会声望追求' },
          { label: '日月组合', value: `${natalChart.planets.find(p => p.id === 'Sun')?.sign.name}日 / ${natalChart.planets.find(p => p.id === 'Moon')?.sign.name}月`, detail: '核心意志与内在潜意识安全感' }
        ],
        analysis: '本命盘为终生不变的本源架构，所有推运、流年与合盘均以本命星体度数作为第一共振受体。'
      }
    };
  }

  if (chartType === '天象盘') {
    const skyChart = calculateCelestialPositions(targetUtc, latitude, longitude);
    const aspects = calculateAspectsList(skyChart.planets);
    return {
      chartType,
      category: '个人星盘',
      chartTitle: '即时天象盘 (Current Sky Chart)',
      chartSubtitle: `天象时刻：${targetDate} ${targetTime} (当地天顶观测)`,
      description: '当前宇宙天际正在运行的即时星空星象图，用于观察即时天象吉凶、行星逆行与宇宙共时性。',
      isDualWheel: false,
      paramsSummary: `天象时间 ${targetDate} ${targetTime}`,
      primary: {
        label: '当前天象',
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        ...skyChart
      },
      aspects,
      interpretation: {
        headline: `即时天象上升 ${skyChart.ascSign.name} · 太阳位于 ${skyChart.planets.find(p => p.id === 'Sun')?.sign.name}`,
        coreHighlights: [
          { label: '即时太阳', value: `${skyChart.planets.find(p => p.id === 'Sun')?.sign.name} ${Math.floor(skyChart.planets.find(p => p.id === 'Sun')?.degree || 0)}°`, detail: '当前集体意识焦点' },
          { label: '即时月亮', value: `${skyChart.planets.find(p => p.id === 'Moon')?.sign.name} ${Math.floor(skyChart.planets.find(p => p.id === 'Moon')?.degree || 0)}°`, detail: '当前大众情绪共振' },
          { label: '逆行行星', value: skyChart.planets.filter(p => p.isRetrograde).map(p => p.name).join('、') || '无逆行', detail: '内省、复盘与审慎推进之星' }
        ],
        analysis: '天象盘反映当前宏观能量场，可配合即时卜卦、择日或作为大环境运势之参考。'
      }
    };
  }

  // -------------------------------------------------------------------------------------
  // 2. 预测类星盘
  // -------------------------------------------------------------------------------------
  if (chartType === '行运盘') {
    const transitSky = calculateCelestialPositions(targetUtc, latitude, longitude);
    const aspects = calculateAspectsList(transitSky.planets, natalChart.planets);
    return {
      chartType,
      category: '预测类星盘',
      chartTitle: '行运盘 (Transit Chart)',
      chartSubtitle: `推运时刻：${targetDate} ${targetTime} 对应本命`,
      description: '双圈行运盘，内圈为本命星盘，外圈为实时流年过境星体，观察流年行星对本命的相位触碰。',
      isDualWheel: true,
      paramsSummary: `行运日期 ${targetDate} ${targetTime}`,
      primary: {
        label: '本命盘 (内圈)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      },
      secondary: {
        label: '流年行运 (外圈)',
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        planets: transitSky.planets
      },
      aspects,
      interpretation: {
        headline: `流年行运触动 · 共 ${aspects.length} 组过境相位`,
        coreHighlights: [
          { label: '重点过境', value: aspects.slice(0, 2).map(a => `${a.planet1.name}${a.aspect.shortName}${a.planet2.name}`).join('、') || '平稳过境', detail: '近期最具张力的流年事件触发器' },
          { label: '流年木星', value: `${transitSky.planets.find(p => p.id === 'Jupiter')?.sign.name}`, detail: '当前人生主要扩张与幸运领域' },
          { label: '流年土星', value: `${transitSky.planets.find(p => p.id === 'Saturn')?.sign.name}`, detail: '当前面临考验与需建立秩序之领域' }
        ],
        analysis: '外圈行星每分每秒在走动，当外圈木土天海冥与内圈四轴或个人星体成紧密相位时，即为重大转折期。'
      }
    };
  }

  if (chartType === '次限盘') {
    // Secondary Progressions: 1 day after birth = 1 year of life
    const progressedUtc = new Date(birthUtc.getTime() + ageYears * 86400000);
    const progressedChart = calculateCelestialPositions(progressedUtc, latitude, longitude);
    const aspects = calculateAspectsList(progressedChart.planets);
    return {
      chartType,
      category: '预测类星盘',
      chartTitle: '次限推运盘 (Secondary Progressions)',
      chartSubtitle: `推运目标：${targetDate} (虚岁/周岁 ${ageYears.toFixed(1)} 岁 · 一日抵一年)`,
      description: '次限盘代表内心心智、情绪与深层人格演变，次限月亮每2.5年换一宫，精准昭示心理重点。',
      isDualWheel: false,
      paramsSummary: `推运目标 ${targetDate} (${ageYears.toFixed(1)} 岁)`,
      primary: {
        label: `次限演进盘 (${ageYears.toFixed(1)}岁)`,
        dateFormatted: progressedUtc.toISOString().split('T')[0],
        timeFormatted: progressedUtc.toISOString().split('T')[1].slice(0, 5),
        ...progressedChart
      },
      aspects,
      interpretation: {
        headline: `次限月亮运行至 ${progressedChart.planets.find(p => p.id === 'Moon')?.sign.name} ${Math.floor(progressedChart.planets.find(p => p.id === 'Moon')?.degree || 0)}°`,
        coreHighlights: [
          { label: '次限太阳', value: `${progressedChart.planets.find(p => p.id === 'Sun')?.sign.name} ${Math.floor(progressedChart.planets.find(p => p.id === 'Sun')?.degree || 0)}°`, detail: '当前人生大周期的精神演变方向' },
          { label: '次限月亮', value: `${progressedChart.planets.find(p => p.id === 'Moon')?.sign.name} 第${progressedChart.planets.find(p => p.id === 'Moon')?.house}宫`, detail: '当前1~2年内心渴望与情感情绪寄托' },
          { label: '次限日月相位', value: `${Math.round(Math.abs((progressedChart.planets.find(p => p.id === 'Sun')?.longitude || 0) - (progressedChart.planets.find(p => p.id === 'Moon')?.longitude || 0)) % 360)}°`, detail: '次限日月相位周期（新月/满月转折点）' }
        ],
        analysis: '次限推运是西方主流心理运势基石，当次限月亮移入新的星座或宫位，个体会明显感觉人生心态焕然一新。'
      }
    };
  }

  if (chartType === '三限盘') {
    // Tertiary Progressions: 1 day after birth = 1 sidereal lunar month (~27.321661 days)
    const tertiaryDays = ageDays / 27.321661;
    const tertiaryUtc = new Date(birthUtc.getTime() + tertiaryDays * 86400000);
    const tertiaryChart = calculateCelestialPositions(tertiaryUtc, latitude, longitude);
    const aspects = calculateAspectsList(tertiaryChart.planets);
    return {
      chartType,
      category: '预测类星盘',
      chartTitle: '三限推运盘 (Tertiary Progressions)',
      chartSubtitle: `推运目标：${targetDate} (一日抵一月 · 短期月度情绪应期)`,
      description: '三限盘运转节奏迅速，极度灵敏反应月度、季度级别的现实生活事件与突发情绪变动。',
      isDualWheel: false,
      paramsSummary: `推运目标 ${targetDate}`,
      primary: {
        label: '三限演进盘',
        dateFormatted: tertiaryUtc.toISOString().split('T')[0],
        timeFormatted: tertiaryUtc.toISOString().split('T')[1].slice(0, 5),
        ...tertiaryChart
      },
      aspects,
      interpretation: {
        headline: `三限月亮高频触发 · 位于 ${tertiaryChart.planets.find(p => p.id === 'Moon')?.sign.name}`,
        coreHighlights: [
          { label: '三限月亮', value: `${tertiaryChart.planets.find(p => p.id === 'Moon')?.sign.name} ${Math.floor(tertiaryChart.planets.find(p => p.id === 'Moon')?.degree || 0)}°`, detail: '近数周内心敏感点与行动焦点' },
          { label: '三限上升 ASC', value: `${tertiaryChart.ascSign.name}`, detail: '当前阶段的应事门面与应激反应' },
          { label: '紧密相位', value: `${aspects.length} 组`, detail: '促成短线现实决断的推运动力' }
        ],
        analysis: '三限盘特别适用于短期择期、求职面试、恋爱告白或关键月份的机缘把握。'
      }
    };
  }

  if (chartType === '太阳弧推运盘') {
    // Solar Arc: Progressed Sun Lon - Natal Sun Lon
    const progressedUtc = new Date(birthUtc.getTime() + ageYears * 86400000);
    const pSunTime = Astronomy.MakeTime(progressedUtc);
    const nSunTime = Astronomy.MakeTime(birthUtc);
    let arc = Astronomy.SunPosition(pSunTime).elon - Astronomy.SunPosition(nSunTime).elon;
    if (arc < 0) arc += 360;

    // Shift every natal body and point by this arc
    const arcPlanets = natalChart.planets.map(p => {
      const newLon = (p.longitude + arc) % 360;
      const sIdx = Math.floor(newLon / 30);
      return {
        ...p,
        longitude: newLon,
        signIndex: sIdx,
        degree: newLon % 30,
        sign: ZODIAC_SIGNS[sIdx]
      };
    });

    const newAsc = (natalChart.asc + arc) % 360;
    const newMc = (natalChart.mc + arc) % 360;
    const aspects = calculateAspectsList(arcPlanets, natalChart.planets);

    return {
      chartType,
      category: '预测类星盘',
      chartTitle: '太阳弧推运盘 (Solar Arc Directions)',
      chartSubtitle: `推运弧度：+${arc.toFixed(2)}° (对应 ${ageYears.toFixed(1)} 岁)`,
      description: '太阳弧是现代占星大事件预测王牌工具。当太阳弧星体合相、刑冲本命星体时，往往伴随命运硬事件。',
      isDualWheel: true,
      paramsSummary: `目标 ${targetDate} (弧度 ${arc.toFixed(2)}°)`,
      primary: {
        label: '本命盘 (内圈)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      },
      secondary: {
        label: `太阳弧推进 (外圈 +${arc.toFixed(1)}°)`,
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        planets: arcPlanets
      },
      aspects,
      interpretation: {
        headline: `太阳弧推进度数：+${arc.toFixed(2)}° · 精准大运应期`,
        coreHighlights: [
          { label: '推运太阳弧', value: `${arc.toFixed(2)}°`, detail: '全盘星体同速匀移的命运节律' },
          { label: '高亮弧角硬相位', value: aspects.filter(a => a.orb <= 1.0).map(a => `${a.planet1.name}${a.aspect.shortName}${a.planet2.name}`).join('、') || '暂无 1° 内极紧硬相位', detail: '大事件发生的核心触发点' },
          { label: '太阳弧天顶', value: `${ZODIAC_SIGNS[Math.floor(newMc / 30)].name} ${Math.floor(newMc % 30)}°`, detail: '事业顶峰与社会声望演进' }
        ],
        analysis: '太阳弧容许度仅取 1°（前后约1年），一旦出现合刑冲硬相位，必然在现实职场、资产或婚姻中落地显现。'
      }
    };
  }

  if (chartType === '法达盘') {
    // Determine diurnal birth: Sun in houses 7..12 means above horizon
    const sunPlanet = natalChart.planets.find(p => p.id === 'Sun');
    const isDiurnal = sunPlanet ? (sunPlanet.house ? sunPlanet.house >= 7 : true) : true;
    const firdaria = calculateFirdaria(birthUtc, targetUtc, isDiurnal);
    const aspects = calculateAspectsList(natalChart.planets);

    return {
      chartType,
      category: '预测类星盘',
      chartTitle: '法达星限盘 (Firdaria Chronocrators)',
      chartSubtitle: `希腊/波斯时主星法 · 当前年龄 ${firdaria.age} 岁 (${firdaria.isDiurnal ? '日生盘' : '夜生盘'})`,
      description: '古典占星大运时主星系统，判定人生各个阶段由哪颗行星总揽大局，揭示人生阶段宏观剧本。',
      isDualWheel: false,
      paramsSummary: `当前大运【${firdaria.majorPlanet}】/ 小运【${firdaria.subPlanet}】`,
      primary: {
        label: '法达承运盘',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      },
      aspects,
      interpretation: {
        headline: `当前法达大运主星：${firdaria.majorSymbol} ${firdaria.majorPlanet} · 小运主星：${firdaria.subSymbol} ${firdaria.subPlanet}`,
        coreHighlights: [
          { label: '主运大运', value: `${firdaria.majorPlanet}限 (${firdaria.majorAgeRange})`, detail: `统摄 ${firdaria.majorYears} 年人生主旋律` },
          { label: '当期小运', value: `${firdaria.subPlanet}小限 (${firdaria.subAgeRange})`, detail: '当前年岁具体执行与触发行星' },
          { label: '气运指引', value: firdaria.influence, detail: '结合本命该星体尊贵力与所落宫位定吉凶' }
        ],
        analysis: `当前由【${firdaria.majorPlanet}】执掌人生大权，若本命盘中该星体庙旺或处吉宫，此阶段大吉亨通；若受损则须蓄力守成。`
      }
    };
  }

  // -------------------------------------------------------------------------------------
  // 3. 反照盘类
  // -------------------------------------------------------------------------------------
  if (chartType === '太阳反照盘' || chartType === '太阳反照比较盘') {
    // Find moment transiting sun equals natal sun longitude in target year
    const natalSunLon = natalChart.planets.find(p => p.id === 'Sun')?.longitude || 0;
    // Search around target year's birthday
    const searchStart = new Date(Date.UTC(ty, nm - 1, Math.max(1, nd - 2), 0, 0));
    let returnTime = Astronomy.SearchSunLongitude(natalSunLon, searchStart, 10);
    if (!returnTime) {
      // Fallback close approximation
      returnTime = Astronomy.MakeTime(new Date(Date.UTC(ty, nm - 1, nd, (nh || 12) - timezone, nmin || 0)));
    }
    const returnUtc = returnTime.date;
    const returnChart = calculateCelestialPositions(returnUtc, latitude, longitude);

    const isDual = chartType === '太阳反照比较盘';
    const aspects = isDual
      ? calculateAspectsList(returnChart.planets, natalChart.planets)
      : calculateAspectsList(returnChart.planets);

    return {
      chartType,
      category: '反照盘类',
      chartTitle: isDual ? '太阳反照比较盘 (Solar Return Synastry)' : '太阳反照盘 (Solar Return Chart)',
      chartSubtitle: `${ty} 年度太阳回归精确时刻：${returnUtc.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      description: '太阳回归盘为西方年度运势核心，以每年太阳回归本命度数瞬间立盘，预测该岁运吉凶焦点。',
      isDualWheel: isDual,
      paramsSummary: `${ty} 年度太阳反照盘`,
      primary: isDual ? {
        label: '本命盘 (内圈)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      } : {
        label: `${ty} 太阳回归盘`,
        dateFormatted: returnUtc.toISOString().split('T')[0],
        timeFormatted: returnUtc.toISOString().split('T')[1].slice(0, 5),
        ...returnChart
      },
      secondary: isDual ? {
        label: `${ty} 太阳回归 (外圈)`,
        dateFormatted: returnUtc.toISOString().split('T')[0],
        timeFormatted: returnUtc.toISOString().split('T')[1].slice(0, 5),
        planets: returnChart.planets
      } : undefined,
      aspects,
      interpretation: {
        headline: `${ty} 年度回归上升为 ${returnChart.ascSign.name} · 年度重点宫位聚焦`,
        coreHighlights: [
          { label: '回归上升 ASC', value: `${returnChart.ascSign.name} ${Math.floor(returnChart.ascDeg)}°`, detail: '这一年个人生活最显著的生活形态' },
          { label: '回归天顶 MC', value: `${returnChart.mcSign.name} ${Math.floor(returnChart.mcDeg)}°`, detail: '这一年职场与事业成就的舞台' },
          { label: '群星聚焦宫位', value: `第 ${returnChart.planets.find(p => p.id === 'Sun')?.house} 宫`, detail: '年度精力最集中投入的生命领域' }
        ],
        analysis: `太阳反照盘以回归上升落入本命何宫为第一要诀，当前回归盘显示 ${ty} 年生活重心高度集中在相关领域。`
      }
    };
  }

  if (chartType === '月亮反照盘' || chartType === '月亮反照比较盘') {
    const isDual = chartType === '月亮反照比较盘';
    // Moon returns ~ every 27.32 days
    const lunarReturnUtc = new Date(targetUtc.getTime());
    const returnChart = calculateCelestialPositions(lunarReturnUtc, latitude, longitude);
    const aspects = isDual
      ? calculateAspectsList(returnChart.planets, natalChart.planets)
      : calculateAspectsList(returnChart.planets);

    return {
      chartType,
      category: '反照盘类',
      chartTitle: isDual ? '月亮反照比较盘 (Lunar Return Synastry)' : '月亮反照盘 (Lunar Return Chart)',
      chartSubtitle: `月度回归时刻：${targetDate} ${targetTime} 周期`,
      description: '月亮回归盘以月亮回归本命度数立盘，用于预测 28 天周期内的情绪、家庭与短期财务波动。',
      isDualWheel: isDual,
      paramsSummary: `月亮回归周期 ${targetDate}`,
      primary: isDual ? {
        label: '本命盘 (内圈)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      } : {
        label: '月亮回归盘',
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        ...returnChart
      },
      secondary: isDual ? {
        label: '月亮回归 (外圈)',
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        planets: returnChart.planets
      } : undefined,
      aspects,
      interpretation: {
        headline: `当期月度情绪周期回归 · 上升 ${returnChart.ascSign.name}`,
        coreHighlights: [
          { label: '月亮落宫', value: `第 ${returnChart.planets.find(p => p.id === 'Moon')?.house} 宫`, detail: '本月情绪触动与安全感诉求' },
          { label: '回归天顶', value: `${returnChart.mcSign.name}`, detail: '本月工作状态与效率' }
        ],
        analysis: '月亮反照盘适用于精细复盘一个月内的人际关系、情绪健康与日常收支。'
      }
    };
  }

  // -------------------------------------------------------------------------------------
  // 4. 合盘类
  // -------------------------------------------------------------------------------------
  if (chartType === '比较盘') {
    const aspects = calculateAspectsList(partnerChart.planets, natalChart.planets);
    return {
      chartType,
      category: '合盘类',
      chartTitle: '双人比较盘 (Synastry Chart)',
      chartSubtitle: `本命甲方 (${birthDate}) VS 乙方【${partnerName}】(${partnerBirthDate})`,
      description: '双人比较盘将双方本命星体同盘对照，揭示相处火花、吸引力强弱、沟通阻滞与缘分深度。',
      isDualWheel: true,
      paramsSummary: `甲方 (${birthDate}) × 乙方 (${partnerBirthDate})`,
      primary: {
        label: '甲方本命 (内圈)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      },
      secondary: {
        label: `乙方【${partnerName}】(外圈)`,
        dateFormatted: partnerBirthDate,
        timeFormatted: partnerBirthTime,
        planets: partnerChart.planets
      },
      aspects,
      interpretation: {
        headline: `双人星盘交织 · 共检出 ${aspects.length} 组互动态势相位`,
        coreHighlights: [
          { label: '日月中轴碰撞', value: `${aspects.filter(a => (a.planet1.id === 'Sun' || a.planet1.id === 'Moon') && (a.planet2.id === 'Sun' || a.planet2.id === 'Moon')).length} 组`, detail: '决定双方核心三观与性格兼容度' },
          { label: '金火化学反应', value: `${aspects.filter(a => (a.planet1.id === 'Venus' || a.planet1.id === 'Mars') && (a.planet2.id === 'Venus' || a.planet2.id === 'Mars')).length} 组`, detail: '决定审美吸引、浪漫激情与相处情趣' },
          { label: '土星责任纽带', value: `${aspects.filter(a => a.planet1.id === 'Saturn' || a.planet2.id === 'Saturn').length} 组`, detail: '决定关系的稳定性、承诺度与长期考验' }
        ],
        analysis: '比较盘是了解两人互动第一现场的最真实镜像，观察外圈行星落入内圈何宫，即知对对方产生何种影响。'
      }
    };
  }

  if (chartType === '组合盘') {
    // Composite Chart: Midpoint of each planet between person A and B
    const compositePlanets: AstroPlanetInfo[] = natalChart.planets.map(pA => {
      const pB = partnerChart.planets.find(p => p.id === pA.id) || pA;
      const midLon = getShortArcMidpoint(pA.longitude, pB.longitude);
      const sIdx = Math.floor(midLon / 30);
      return {
        ...pA,
        longitude: midLon,
        signIndex: sIdx,
        degree: midLon % 30,
        sign: ZODIAC_SIGNS[sIdx],
        isRetrograde: pA.isRetrograde || pB.isRetrograde
      };
    });

    const compAsc = getShortArcMidpoint(natalChart.asc, partnerChart.asc);
    const compMc = getShortArcMidpoint(natalChart.mc, partnerChart.mc);
    const compDsc = (compAsc + 180) % 360;
    const compIc = (compMc + 180) % 360;
    const compAscSignIdx = Math.floor(compAsc / 30);

    const compHouses: AstroHouseInfo[] = [];
    for (let i = 0; i < 12; i++) {
      const sIndex = (compAscSignIdx + i) % 12;
      compHouses.push({
        number: i + 1,
        start: sIndex * 30,
        end: ((sIndex + 1) * 30) % 360,
        sign: ZODIAC_SIGNS[sIndex],
        deg: compAsc % 30
      });
    }

    compositePlanets.forEach(p => {
      const pSignIdx = Math.floor(p.longitude / 30);
      p.house = ((pSignIdx - compAscSignIdx + 12) % 12) + 1;
    });

    const aspects = calculateAspectsList(compositePlanets);

    return {
      chartType,
      category: '合盘类',
      chartTitle: '组合中点盘 (Composite Chart)',
      chartSubtitle: `双方行星中点合成 · 关系实体独立星盘`,
      description: '组合盘将两人看作一个独立的“第三者生命体”，揭示这段关系自身的目的、宿命演进与外界观感。',
      isDualWheel: false,
      paramsSummary: `甲方 × 乙方 组合中点盘`,
      primary: {
        label: '组合中点盘',
        dateFormatted: '双方中点',
        timeFormatted: '--:--',
        planets: compositePlanets,
        asc: compAsc,
        mc: compMc,
        dsc: compDsc,
        ic: compIc,
        ascSign: ZODIAC_SIGNS[compAscSignIdx],
        mcSign: ZODIAC_SIGNS[Math.floor(compMc / 30)],
        dscSign: ZODIAC_SIGNS[Math.floor(compDsc / 30)],
        icSign: ZODIAC_SIGNS[Math.floor(compIc / 30)],
        ascDeg: compAsc % 30,
        mcDeg: compMc % 30,
        ascSignIdx: compAscSignIdx,
        houses: compHouses
      },
      aspects,
      interpretation: {
        headline: `组合盘太阳位于 ${compositePlanets.find(p => p.id === 'Sun')?.sign.name} 第 ${compositePlanets.find(p => p.id === 'Sun')?.house} 宫`,
        coreHighlights: [
          { label: '组合太阳', value: `${compositePlanets.find(p => p.id === 'Sun')?.sign.name} 第${compositePlanets.find(p => p.id === 'Sun')?.house}宫`, detail: '这段关系存在的核心意义与共同目标' },
          { label: '组合月亮', value: `${compositePlanets.find(p => p.id === 'Moon')?.sign.name} 第${compositePlanets.find(p => p.id === 'Moon')?.house}宫`, detail: '两人相处时的真实情感滋养与内在默契' },
          { label: '组合上升', value: `${ZODIAC_SIGNS[compAscSignIdx].name}`, detail: '外界眼中的“我们”这一对形象' }
        ],
        analysis: '若组合盘日水金落入吉宫且相位良顺，双方在一起能产生极强的一体感与建设性成果。'
      }
    };
  }

  if (chartType === '时空中点盘') {
    // Davison Chart: True Time and Space midpoint
    const midTimeMs = (birthUtc.getTime() + partnerUtc.getTime()) / 2;
    const midUtc = new Date(midTimeMs);
    const midLat = (latitude + partnerLatitude) / 2;
    const midLon = (longitude + partnerLongitude) / 2;
    const davisonChart = calculateCelestialPositions(midUtc, midLat, midLon);
    const aspects = calculateAspectsList(davisonChart.planets);

    return {
      chartType,
      category: '合盘类',
      chartTitle: '戴维森时空中点盘 (Davison Relationship Chart)',
      chartSubtitle: `时空交点：${midUtc.toISOString().replace('T', ' ').slice(0, 16)} UTC (真实的实体星历)`,
      description: '戴维森盘在时间和经纬度上严格求算物理中点，是一张具有完整天文真实性的独立实体星盘，可进一步做次限推运！',
      isDualWheel: false,
      paramsSummary: `时空中点 ${midUtc.toISOString().split('T')[0]}`,
      primary: {
        label: '戴维森时空盘',
        dateFormatted: midUtc.toISOString().split('T')[0],
        timeFormatted: midUtc.toISOString().split('T')[1].slice(0, 5),
        ...davisonChart
      },
      aspects,
      interpretation: {
        headline: `时空中点上升 ${davisonChart.ascSign.name} · 太阳位于 ${davisonChart.planets.find(p => p.id === 'Sun')?.sign.name}`,
        coreHighlights: [
          { label: '时空太阳', value: `${davisonChart.planets.find(p => p.id === 'Sun')?.sign.name} 第${davisonChart.planets.find(p => p.id === 'Sun')?.house}宫`, detail: '关系的命脉焦点与宿命因缘' },
          { label: '时空金星', value: `${davisonChart.planets.find(p => p.id === 'Venus')?.sign.name}`, detail: '关系的爱意表达与和谐度' },
          { label: '时空火星', value: `${davisonChart.planets.find(p => p.id === 'Mars')?.sign.name}`, detail: '摩擦、激情与面对外部阻力的行动力' }
        ],
        analysis: '戴维森盘相较于数学中点组合盘更为稳固，且能无缝支持日后次限、三限推运，观察关系何时升温或出现危机。'
      }
    };
  }

  if (chartType === '马克思盘') {
    // Marks Chart: Composite Chart rotated to Person A's perspective
    const midTimeMs = (birthUtc.getTime() + partnerUtc.getTime()) / 2;
    const midUtc = new Date(midTimeMs);
    const marksRaw = calculateCelestialPositions(midUtc, latitude, longitude);
    const aspects = calculateAspectsList(marksRaw.planets);

    return {
      chartType,
      category: '合盘类',
      chartTitle: '马克思盘 (Marks Chart - 甲方心理视角)',
      chartSubtitle: `以甲方 (${birthDate}) 心理视角观察对乙方的真实心境与潜意识`,
      description: '马克思盘在中国现代占星中广受认可，专门剖析“在这段关系中，当事人到底怎么想对方、真实心理感受为何”。',
      isDualWheel: false,
      paramsSummary: `甲方对乙方的马盘心境`,
      primary: {
        label: '马盘 (甲方视角)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...marksRaw
      },
      aspects,
      interpretation: {
        headline: `马盘月亮落入 ${marksRaw.planets.find(p => p.id === 'Moon')?.sign.name} 第${marksRaw.planets.find(p => p.id === 'Moon')?.house}宫 · 核心心境`,
        coreHighlights: [
          { label: '马盘月亮', value: `${marksRaw.planets.find(p => p.id === 'Moon')?.sign.name} 第${marksRaw.planets.find(p => p.id === 'Moon')?.house}宫`, detail: '甲方对乙方最真实、最深层的情感需要与脆弱点' },
          { label: '马盘太阳', value: `${marksRaw.planets.find(p => p.id === 'Sun')?.sign.name} 第${marksRaw.planets.find(p => p.id === 'Sun')?.house}宫`, detail: '甲方在这段关系中想扮演的公开角色' },
          { label: '马盘金星', value: `${marksRaw.planets.find(p => p.id === 'Venus')?.sign.name}`, detail: '甲方眼中的乙方吸引力与温柔度' }
        ],
        analysis: '马盘月亮极其关键，若月亮受困，则容易产生委屈、患得患失或防备心理；月亮得吉则深情依恋。'
      }
    };
  }

  // -------------------------------------------------------------------------------------
  // 5. 合盘类预测
  // -------------------------------------------------------------------------------------
  if (
    chartType === '次限比较盘' ||
    chartType === '三限比较盘' ||
    chartType === '比较次限盘' ||
    chartType === '比较三限盘' ||
    chartType === '组合次限盘' ||
    chartType === '组合三限盘' ||
    chartType === '时空次限盘' ||
    chartType === '时空三限盘' ||
    chartType === '马克思次限盘' ||
    chartType === '马克思三限盘'
  ) {
    const isTertiary = chartType.includes('三限');
    const factorDays = isTertiary ? (ageDays / 27.321661) : ageYears;
    const progressTimeMs = birthUtc.getTime() + factorDays * 86400000;
    const progressedA = calculateCelestialPositions(new Date(progressTimeMs), latitude, longitude);

    const isDualCompare = chartType.includes('比较');
    let primaryData = progressedA;
    let secondaryData = partnerChart.planets;

    if (chartType.startsWith('比较次限') || chartType.startsWith('比较三限')) {
      // Partner progressed vs natal A
      const partnerFactor = isTertiary ? (Math.max(0, (targetUtc.getTime() - partnerUtc.getTime()) / 86400000) / 27.321661) : Math.max(0, (targetUtc.getTime() - partnerUtc.getTime()) / (365.2422 * 86400000));
      const progressedB = calculateCelestialPositions(new Date(partnerUtc.getTime() + partnerFactor * 86400000), partnerLatitude, partnerLongitude);
      primaryData = natalChart;
      secondaryData = progressedB.planets;
    }

    const aspects = isDualCompare
      ? calculateAspectsList(secondaryData, primaryData.planets)
      : calculateAspectsList(primaryData.planets);

    return {
      chartType,
      category: '合盘类预测',
      chartTitle: `${chartType} (Relationship Predictive)`,
      chartSubtitle: `推运推演目标：${targetDate} (${isTertiary ? '三限月度节律' : '次限年度演进'})`,
      description: `结合合盘与推运技术，动态追踪两人关系在 ${targetDate} 的感情升温期、磨合关卡与关键决断节点。`,
      isDualWheel: isDualCompare,
      paramsSummary: `${chartType} · 目标 ${targetDate}`,
      primary: {
        label: isDualCompare ? '基准盘 (内圈)' : `${chartType} 演进盘`,
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        ...primaryData
      },
      secondary: isDualCompare ? {
        label: '推运演进 (外圈)',
        dateFormatted: targetDate,
        timeFormatted: targetTime,
        planets: secondaryData
      } : undefined,
      aspects,
      interpretation: {
        headline: `${chartType} · 动态关系推运相位 ${aspects.length} 组`,
        coreHighlights: [
          { label: '推运周期模式', value: isTertiary ? '短期三限 (月度应期)' : '长期次限 (年度基调)', detail: '捕捉关系互动高低起伏的节奏器' },
          { label: '关键触碰', value: aspects.slice(0, 2).map(a => `${a.planet1.name}${a.aspect.shortName}${a.planet2.name}`).join('、') || '平稳无冲', detail: '当期最显著的互动张力' }
        ],
        analysis: '通过合盘预测，可预判两人何时产生执念、何时能化解误解、何时适宜步入婚姻或共同事业。'
      }
    };
  }

  // -------------------------------------------------------------------------------------
  // 6. 特别星盘
  // -------------------------------------------------------------------------------------
  if (chartType === '二分二至盘') {
    // Equinoxes & Solstices: Aries 0, Cancer 90, Libra 180, Capricorn 270
    let targetDegree = 0;
    let ingressName = '春分盘 (0°白羊)';
    if (ingressType === 'summer') { targetDegree = 90; ingressName = '夏至盘 (0°巨蟹)'; }
    if (ingressType === 'autumn') { targetDegree = 180; ingressName = '秋分盘 (0°天秤)'; }
    if (ingressType === 'winter') { targetDegree = 270; ingressName = '冬至盘 (0°摩羯)'; }

    const searchStart = new Date(Date.UTC(ty, 0, 1, 0, 0));
    let ingressTime = Astronomy.SearchSunLongitude(targetDegree, searchStart, 370);
    if (!ingressTime) {
      ingressTime = Astronomy.MakeTime(targetUtc);
    }
    const ingressUtc = ingressTime.date;
    const ingressChart = calculateCelestialPositions(ingressUtc, latitude, longitude);
    const aspects = calculateAspectsList(ingressChart.planets);

    return {
      chartType,
      category: '特别星盘',
      chartTitle: `二分二至入宫盘 - ${ingressName}`,
      chartSubtitle: `${ty}年精确天象交节：${ingressUtc.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      description: '古典世俗占星四大节气入宫盘，用于研判大气候、宏观环境趋势与整季度气运强弱。',
      isDualWheel: false,
      paramsSummary: `${ty}年 ${ingressName}`,
      primary: {
        label: ingressName,
        dateFormatted: ingressUtc.toISOString().split('T')[0],
        timeFormatted: ingressUtc.toISOString().split('T')[1].slice(0, 5),
        ...ingressChart
      },
      aspects,
      interpretation: {
        headline: `${ty}年 ${ingressName} · 上升落入 ${ingressChart.ascSign.name}`,
        coreHighlights: [
          { label: '入宫时刻', value: `${ingressUtc.toISOString().split('T')[0]}`, detail: '太阳跨入新季节的宇宙节点' },
          { label: '入宫上升 ASC', value: `${ingressChart.ascSign.name} ${Math.floor(ingressChart.ascDeg)}°`, detail: '未来一个季度的宏观大环境主题' },
          { label: '四轴重心', value: `${ingressChart.mcSign.name} 中天`, detail: '集体社会意识与宏观机遇方向' }
        ],
        analysis: '春分盘主管全年基调，夏至、秋分、冬至各司一季，对世俗观察、投资环境研判极具参考价值。'
      }
    };
  }

  if (chartType === '日月蚀盘') {
    // Eclipse: closest solar or lunar eclipse to target date
    let eclipseTime: Astronomy.AstroTime | null = null;
    let eclipseKind = '日食盘 (Solar Eclipse)';
    try {
      const searchStart = Astronomy.MakeTime(new Date(Date.UTC(ty, tm - 1, 1)));
      const sol = Astronomy.SearchGlobalSolarEclipse(searchStart);
      eclipseTime = sol.peak;
    } catch {
      eclipseTime = Astronomy.MakeTime(targetUtc);
    }

    const eclipseUtc = eclipseTime ? eclipseTime.date : targetUtc;
    const eclipseChart = calculateCelestialPositions(eclipseUtc, latitude, longitude);
    const aspects = calculateAspectsList(eclipseChart.planets, natalChart.planets);

    return {
      chartType,
      category: '特别星盘',
      chartTitle: '日月蚀盘 (Eclipse Astrological Chart)',
      chartSubtitle: `${ty} 年度日月交食时刻：${eclipseUtc.toISOString().replace('T', ' ').slice(0, 16)} UTC`,
      description: '日月食代表宇宙强能量清洗与命运重启门槛，日月食落入本命何宫，常带来不可逆的重大新生或结束。',
      isDualWheel: true,
      paramsSummary: `${ty} 日月蚀与本命对照`,
      primary: {
        label: '本命盘 (内圈)',
        dateFormatted: birthDate,
        timeFormatted: birthTime,
        ...natalChart
      },
      secondary: {
        label: `${eclipseKind} (外圈)`,
        dateFormatted: eclipseUtc.toISOString().split('T')[0],
        timeFormatted: eclipseUtc.toISOString().split('T')[1].slice(0, 5),
        planets: eclipseChart.planets
      },
      aspects,
      interpretation: {
        headline: `日月食落入本命盘 · 强力命运激活`,
        coreHighlights: [
          { label: '交食时刻', value: `${eclipseUtc.toISOString().split('T')[0]}`, detail: '宇宙新月/满月强化重塑时刻' },
          { label: '食相触发相位', value: `${aspects.filter(a => a.orb <= 3).length} 组紧密相位`, detail: '本命中被食相直接点亮的星体' },
          { label: '对应本命宫位', value: `第 ${natalChart.planets.find(p => p.id === 'Sun')?.house} 宫`, detail: '命运剧烈重组与重启的领域' }
        ],
        analysis: '日月食能量往往持续半年之久，若食相度数紧扣本命个人行星，该领域将开启全新的生命课题。'
      }
    };
  }

  // Fallback default
  const defaultAspects = calculateAspectsList(natalChart.planets);
  return {
    chartType,
    category: '个人星盘',
    chartTitle: `${chartType}`,
    chartSubtitle: `基准时刻：${birthDate} ${birthTime}`,
    description: '专业占星推演分析盘。',
    isDualWheel: false,
    paramsSummary: `${birthDate} ${birthTime}`,
    primary: {
      label: '本命星位',
      dateFormatted: birthDate,
      timeFormatted: birthTime,
      ...natalChart
    },
    aspects: defaultAspects,
    interpretation: {
      headline: `${natalChart.ascSign.name} 上升 · 综合星体分布`,
      coreHighlights: [
        { label: '上升点', value: `${natalChart.ascSign.name}`, detail: '外在表现' }
      ],
      analysis: '当前星盘数据已按专业算法加载。'
    }
  };
}
