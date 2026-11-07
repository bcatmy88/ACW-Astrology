import * as Astronomy from 'astronomy-engine';

export interface TransitPlanet {
  id: string;
  name: string;
  symbol: string;
  longitude: number;
  signIndex: number;
  degree: number;
  signName: string;
  signEng: string;
  signSymbol: string;
  isRetrograde: boolean;
  natalHouse: number; // The natal house this transit planet is currently visiting (1 - 12)
}

export interface TransitAspect {
  transitPlanet: { id: string; name: string; symbol: string; longitude: number };
  natalPlanet: { id: string; name: string; symbol: string; longitude: number };
  aspect: {
    name: string;
    symbol: string;
    angle: number;
    color: string;
    nature: 'auspicious' | 'challenging' | 'neutral';
  };
  exactDiff: number;
  orb: number;
  influence: string;
}

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

const PLANETS_CONFIG = [
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

const TRANSIT_ASPECTS_DEF = [
  { name: '合相 (Conjunction)', symbol: '☌', angle: 0, maxOrb: 4.5, color: 'text-amber-400', nature: 'neutral' as const },
  { name: '六合 (Sextile)', symbol: '⚹', angle: 60, maxOrb: 3.5, color: 'text-cyan-400', nature: 'auspicious' as const },
  { name: '刑相 (Square)', symbol: '□', angle: 90, maxOrb: 4.5, color: 'text-rose-400', nature: 'challenging' as const },
  { name: '拱相 (Trine)', symbol: '△', angle: 120, maxOrb: 4.5, color: 'text-emerald-400', nature: 'auspicious' as const },
  { name: '冲相 (Opposition)', symbol: '☍', angle: 180, maxOrb: 4.5, color: 'text-purple-400', nature: 'challenging' as const },
];

// Meaning of Transiting Planets in Natal Houses (流年过境本命十二宫含义)
export const TRANSIT_HOUSE_DESCRIPTIONS: Record<string, string> = {
  '1': '自我觉醒与形象蜕变期，个人主动性大幅增强，宜开创崭新方向。',
  '2': '正财收益与财务重整期，关注个人价值感、收入来源与理性支出。',
  '3': '思维沟通与短途出行活跃期，利学习深造、签约洽谈与手足人脉。',
  '4': '家庭根基与内在安全感筑牢期，适合置产安家、处理居所或陪伴家人。',
  '5': '偏财投资与才华创作高光期，桃花吸引力大增，利娱乐与亲子关系。',
  '6': '日常职场工作与健康作息调整期，利专业技能精进、宠物与养生。',
  '7': '重要合作与亲密伴侣关系升华期，签约盟约、合伙创业与婚姻考量。',
  '8': '深度资源与偏财红利转化期，涉及投资分红、借贷或身心灵疗愈。',
  '9': '远方贵人与高维认知拓展期，利跨界发展、出国旅行与学术进修。',
  '10': '事业名望与社会地位晋升期，受高层重视，宜大展拳脚确立里程碑。',
  '11': '社交圈层跃迁与团队愿景期，结识同频优质圈子，利公众影响力。',
  '12': '沉淀反思与潜意识净化期，适宜休养生息、灵性修行与断舍离。',
};

/**
 * Calculates current transit planetary positions for a given transit date/time
 */
export function calculateTransitPlanets(
  transitDateStr: string, // YYYY-MM-DD
  transitTimeStr: string, // HH:mm
  timezone: number,
  natalAscSignIdx: number
): TransitPlanet[] {
  try {
    const [y, m, d] = transitDateStr.split('-').map(Number);
    const [hh, mm] = transitTimeStr.split(':').map(Number);
    const dateUtc = new Date(Date.UTC(y, m - 1, d, (hh || 12) - timezone, mm || 0));
    const time = Astronomy.MakeTime(dateUtc);

    return PLANETS_CONFIG.map(p => {
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

        // Retrograde check (1 hour later)
        const timeLater = Astronomy.MakeTime(new Date(dateUtc.getTime() + 60 * 60 * 1000));
        const vecLater = Astronomy.GeoVector(body, timeLater, true);
        const eclLater = Astronomy.Ecliptic(vecLater);

        let diff = eclLater.elon - ecl.elon;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        isRetrograde = diff < 0;
      }

      const signIdx = Math.floor(lon / 30);
      const degree = lon % 30;
      const sign = ZODIAC_SIGNS[signIdx];
      // Whole Sign House relative to Natal Ascendant
      const natalHouse = ((signIdx - natalAscSignIdx + 12) % 12) + 1;

      return {
        id: p.id,
        name: p.name,
        symbol: p.symbol,
        longitude: lon,
        signIndex: signIdx,
        degree,
        signName: sign.name,
        signEng: sign.eng,
        signSymbol: sign.symbol,
        isRetrograde,
        natalHouse,
      };
    });
  } catch (err) {
    console.error('Failed to calculate transit planets:', err);
    return [];
  }
}

/**
 * Calculates aspects between Transit planets and Natal chart points (Planets + ASC + MC)
 */
export function calculateTransitToNatalAspects(
  transitPlanets: TransitPlanet[],
  natalPoints: { id: string; name: string; symbol: string; longitude: number }[]
): TransitAspect[] {
  const aspectsList: TransitAspect[] = [];

  transitPlanets.forEach(tPlanet => {
    natalPoints.forEach(nPoint => {
      // Angular distance
      let diff = Math.abs(tPlanet.longitude - nPoint.longitude);
      if (diff > 180) diff = 360 - diff;

      for (const def of TRANSIT_ASPECTS_DEF) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.maxOrb) {
          let influence = '';
          if (def.nature === 'auspicious') {
            influence = `流年${tPlanet.name}与本命${nPoint.name}形成${def.name.split(' ')[0]}，带来顺遂贵人支持与扩展良机。`;
          } else if (def.nature === 'challenging') {
            influence = `流年${tPlanet.name}与本命${nPoint.name}形成${def.name.split(' ')[0]}，代表当前阶段需面对磨砺挑战，宜稳扎稳打。`;
          } else {
            influence = `流年${tPlanet.name}与本命${nPoint.name}紧密结合，聚焦唤醒该领域的关键动能与转折点。`;
          }

          aspectsList.push({
            transitPlanet: { id: tPlanet.id, name: tPlanet.name, symbol: tPlanet.symbol, longitude: tPlanet.longitude },
            natalPlanet: { id: nPoint.id, name: nPoint.name, symbol: nPoint.symbol, longitude: nPoint.longitude },
            aspect: def,
            exactDiff: diff,
            orb: parseFloat(orb.toFixed(2)),
            influence,
          });
          break;
        }
      }
    });
  });

  // Sort by tightest orb
  return aspectsList.sort((a, b) => a.orb - b.orb);
}
