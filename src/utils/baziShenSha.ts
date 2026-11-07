/**
 * Comprehensive Bazi ShenSha (八字神煞) Engine
 * Implements all traditional symbolic stars and childhood/adult sha requested by user
 */

export interface ShenShaItem {
  name: string;
  type: 'auspicious' | 'inauspicious' | 'neutral';
  desc?: string;
}

export interface PillarInput {
  gan: string;
  zhi: string;
}

export interface BaziPillarsContext {
  year: PillarInput;
  month: PillarInput;
  day: PillarInput;
  hour: PillarInput;
  gender?: number; // 1 for male, 0 for female
}

const ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const YANG_GANS = ['甲', '丙', '戊', '庚', '壬'];

// Xun Kong (空亡) calculation helper
function getXunKong(gan: string, zhi: string): string[] {
  const GANS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const gIdx = GANS.indexOf(gan);
  const zIdx = ZHI_ORDER.indexOf(zhi);
  if (gIdx === -1 || zIdx === -1) return [];
  const offset = (zIdx - gIdx + 12) % 12;
  return [ZHI_ORDER[(offset + 10) % 12], ZHI_ORDER[(offset + 11) % 12]];
}

/**
 * Calculate all requested ShenSha for a specific target pillar (gan, zhi)
 */
export function calculatePillarShenSha(
  target: PillarInput,
  pillarType: 'year' | 'month' | 'day' | 'hour' | 'dayun' | 'liunian',
  ctx: BaziPillarsContext
): ShenShaItem[] {
  if (!target || !target.gan || !target.zhi || !ctx.day?.gan) return [];

  const results: ShenShaItem[] = [];
  const added = new Set<string>();

  const add = (name: string, type: 'auspicious' | 'inauspicious' | 'neutral', desc?: string) => {
    if (!added.has(name)) {
      added.add(name);
      results.push({ name, type, desc });
    }
  };

  const { gan: tGan, zhi: tZhi } = target;
  const { gan: dGan, zhi: dZhi } = ctx.day;
  const { gan: yGan, zhi: yZhi } = ctx.year;
  const { gan: mGan, zhi: mZhi } = ctx.month;
  const tGanZhi = `${tGan}${tZhi}`;
  const isYangBoyOrYinGirl = ctx.gender === 1 ? YANG_GANS.includes(yGan) : !YANG_GANS.includes(yGan);

  const mZhiIdx = ZHI_ORDER.indexOf(mZhi);
  const yZhiIdx = ZHI_ORDER.indexOf(yZhi);

  // ==========================================
  // GROUP 1: 吉星 / 贵人类
  // ==========================================

  // 1. 天乙贵人
  const tianYiMap: Record<string, string[]> = {
    '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
    '乙': ['子', '申'], '己': ['子', '申'],
    '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
    '辛': ['寅', '午'],
  };
  if (tianYiMap[dGan]?.includes(tZhi) || tianYiMap[yGan]?.includes(tZhi)) {
    add('天乙贵人', 'auspicious', '逢凶化吉，贵人相扶');
  }

  // 2. 文昌贵人
  const wenChangMap: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
    '丁': '酉', '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯'
  };
  if (wenChangMap[dGan] === tZhi || wenChangMap[yGan] === tZhi) {
    add('文昌贵人', 'auspicious', '聪明好学，文笔秀拔利考运');
  }

  // 3. 太极贵人
  const taiJiMap: Record<string, string[]> = {
    '甲': ['子', '午'], '乙': ['子', '午'],
    '丙': ['卯', '酉'], '丁': ['卯', '酉'],
    '戊': ['辰', '戌', '丑', '未'], '己': ['辰', '戌', '丑', '未'],
    '庚': ['寅', '亥'], '辛': ['寅', '亥'],
    '壬': ['巳', '申'], '癸': ['巳', '申'],
  };
  if (taiJiMap[dGan]?.includes(tZhi) || taiJiMap[yGan]?.includes(tZhi)) {
    add('太极贵人', 'auspicious', '悟性敏锐，有钻研玄学哲理天分');
  }

  // 4. 天德贵人
  const tianDeMap: Record<string, string> = {
    '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
    '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
    '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚'
  };
  if (tianDeMap[mZhi] && (tGan === tianDeMap[mZhi] || tZhi === tianDeMap[mZhi])) {
    add('天德贵人', 'auspicious', '得天庇佑，化险为夷');
  }

  // 5. 月德贵人
  const yueDeMap: Record<string, string> = {
    '寅': '丙', '午': '丙', '戌': '丙',
    '申': '壬', '子': '壬', '辰': '壬',
    '亥': '甲', '卯': '甲', '未': '甲',
    '巳': '庚', '酉': '庚', '丑': '庚'
  };
  if (yueDeMap[mZhi] === tGan) {
    add('月德贵人', 'auspicious', '得人和之助，逢凶化吉');
  }

  // 6. 天德合
  const tianDeHeMap: Record<string, string> = {
    '寅': '壬', '卯': '巳', '辰': '丁', '巳': '丙',
    '午': '寅', '未': '己', '申': '戊', '酉': '亥',
    '戌': '辛', '亥': '庚', '子': '申', '丑': '乙'
  };
  if (tianDeHeMap[mZhi] && (tGan === tianDeHeMap[mZhi] || tZhi === tianDeHeMap[mZhi])) {
    add('天德合', 'auspicious', '吉星加会，尊贵福寿');
  }

  // 7. 月德合
  const yueDeHeMap: Record<string, string> = {
    '寅': '辛', '午': '辛', '戌': '辛',
    '申': '丁', '子': '丁', '辰': '丁',
    '亥': '己', '卯': '己', '未': '己',
    '巳': '乙', '酉': '乙', '丑': '乙'
  };
  if (yueDeHeMap[mZhi] === tGan) {
    add('月德合', 'auspicious', '善缘深厚，遇难成祥');
  }

  // 8. 福星贵人
  const fuXingMap: Record<string, string[]> = {
    '甲': ['寅', '子'], '丙': ['寅', '子'],
    '乙': ['卯', '丑'], '癸': ['卯', '丑'],
    '戊': ['申'], '己': ['未'], '丁': ['亥'], '庚': ['午'], '辛': ['巳'], '壬': ['辰']
  };
  if (fuXingMap[dGan]?.includes(tZhi) || fuXingMap[yGan]?.includes(tZhi)) {
    add('福星贵人', 'auspicious', '一生福禄丰厚，少灾无忧');
  }

  // 9. 国印贵人
  const guoYinMap: Record<string, string> = {
    '甲': '戌', '乙': '亥', '丙': '丑', '丁': '寅', '戊': '丑',
    '己': '寅', '庚': '辰', '辛': '巳', '壬': '未', '癸': '申'
  };
  if (guoYinMap[dGan] === tZhi || guoYinMap[yGan] === tZhi) {
    add('国印贵人', 'auspicious', '掌印信权力，严谨守信');
  }

  // 10. 德秀贵人
  // 寅午戌月见丙丁(德)戊己(秀); 申子辰月见壬癸(德)甲乙(秀); 巳酉丑月见庚辛(德)壬癸(秀); 亥卯未月见甲乙(德)丙丁(秀)
  const deXiuMonthMap: Record<string, { de: string[]; xiu: string[] }> = {
    '寅': { de: ['丙', '丁'], xiu: ['戊', '己'] },
    '午': { de: ['丙', '丁'], xiu: ['戊', '己'] },
    '戌': { de: ['丙', '丁'], xiu: ['戊', '己'] },
    '申': { de: ['壬', '癸'], xiu: ['甲', '乙'] },
    '子': { de: ['壬', '癸'], xiu: ['甲', '乙'] },
    '辰': { de: ['壬', '癸'], xiu: ['甲', '乙'] },
    '巳': { de: ['庚', '辛'], xiu: ['壬', '癸'] },
    '酉': { de: ['庚', '辛'], xiu: ['壬', '癸'] },
    '丑': { de: ['庚', '辛'], xiu: ['壬', '癸'] },
    '亥': { de: ['甲', '乙'], xiu: ['丙', '丁'] },
    '卯': { de: ['甲', '乙'], xiu: ['丙', '丁'] },
    '未': { de: ['甲', '乙'], xiu: ['丙', '丁'] },
  };
  const curDeXiu = deXiuMonthMap[mZhi];
  if (curDeXiu && (curDeXiu.de.includes(tGan) || curDeXiu.xiu.includes(tGan))) {
    add('德秀贵人', 'auspicious', '温和沉着，才华出众有品德');
  }

  // 11. 三奇贵人 (天上三奇甲戊庚，地下三奇乙丙丁，人中三奇壬癸辛)
  const allGans = [ctx.year.gan, ctx.month.gan, ctx.day.gan, ctx.hour.gan];
  const hasTianSanQi = allGans.includes('甲') && allGans.includes('戊') && allGans.includes('庚');
  const hasDiSanQi = allGans.includes('乙') && allGans.includes('丙') && allGans.includes('丁');
  const hasRenSanQi = allGans.includes('壬') && allGans.includes('癸') && allGans.includes('辛');
  if (
    (hasTianSanQi && ['甲', '戊', '庚'].includes(tGan)) ||
    (hasDiSanQi && ['乙', '丙', '丁'].includes(tGan)) ||
    (hasRenSanQi && ['壬', '癸', '辛'].includes(tGan))
  ) {
    add('三奇贵人', 'auspicious', '胸怀博大，才华超群有奇遇');
  }

  // 12. 天医贵人
  if (mZhiIdx >= 0) {
    const tianYiZhi = ZHI_ORDER[(mZhiIdx + 11) % 12];
    if (tZhi === tianYiZhi) {
      add('天医贵人', 'auspicious', '能化疾病，对中西医学心理有慧根');
    }
  }

  // 13. 金舆贵人
  const jinYuMap: Record<string, string> = {
    '甲': '辰', '乙': '巳', '丙': '未', '戊': '未',
    '丁': '申', '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅'
  };
  if (jinYuMap[dGan] === tZhi) {
    add('金舆贵人', 'auspicious', '出行乘车，贵人辅佐，妻贤夫贵');
  }

  // 14. 天赦
  const isSpring = ['寅', '卯', '辰'].includes(mZhi);
  const isSummer = ['巳', '午', '未'].includes(mZhi);
  const isAutumn = ['申', '酉', '戌'].includes(mZhi);
  const isWinter = ['亥', '子', '丑'].includes(mZhi);
  if (
    (isSpring && tGanZhi === '戊寅') ||
    (isSummer && tGanZhi === '甲午') ||
    (isAutumn && tGanZhi === '戊申') ||
    (isWinter && tGanZhi === '甲子')
  ) {
    add('天赦', 'auspicious', '解灾赦罪，能化难呈祥');
  }

  // 15. 学堂 (长生位)
  const xueTangMap: Record<string, string> = {
    '甲': '亥', '乙': '午', '丙': '寅', '丁': '酉', '戊': '寅',
    '己': '酉', '庚': '巳', '辛': '子', '壬': '申', '癸': '卯'
  };
  if (xueTangMap[dGan] === tZhi) {
    add('学堂', 'auspicious', '学识丰富，登科进产');
  }

  // 16. 词馆 (临官位)
  const ciGuanMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
  };
  if (ciGuanMap[dGan] === tZhi) {
    add('词馆', 'auspicious', '文章作赋，才思敏捷有功名');
  }

  // 17. 天印贵人 (天厨/天印)
  const tianYinMap: Record<string, string> = {
    '甲': '子', '乙': '亥', '丙': '寅', '丁': '卯',
    '戊': '午', '己': '巳', '庚': '辰', '辛': '酉', '壬': '申', '癸': '巳'
  };
  if (tianYinMap[dGan] === tZhi) {
    add('天印贵人', 'auspicious', '天印庇护，仕途顺利有实权');
  }

  // 18. 红鸾
  const hongLuanMap: Record<string, string> = {
    '子': '卯', '丑': '寅', '寅': '丑', '卯': '子',
    '辰': '亥', '巳': '戌', '午': '酉', '未': '申',
    '申': '未', '酉': '午', '戌': '巳', '亥': '辰'
  };
  if (hongLuanMap[yZhi] === tZhi) {
    add('红鸾', 'auspicious', '姻缘喜庆，早定婚姻');
  }

  // 19. 天喜
  const tianXiMap: Record<string, string> = {
    '子': '酉', '丑': '申', '寅': '未', '卯': '午',
    '辰': '巳', '巳': '辰', '午': '卯', '未': '寅',
    '申': '丑', '酉': '子', '戌': '亥', '亥': '戌'
  };
  if (tianXiMap[yZhi] === tZhi) {
    add('天喜', 'auspicious', '喜事连连，逢凶化吉');
  }

  // 20. 将星
  const jiangXingMap: Record<string, string> = {
    '申': '子', '子': '子', '辰': '子',
    '寅': '午', '午': '午', '戌': '午',
    '巳': '酉', '酉': '酉', '丑': '酉',
    '亥': '卯', '卯': '卯', '未': '卯'
  };
  if (jiangXingMap[dZhi] === tZhi || jiangXingMap[yZhi] === tZhi) {
    add('将星', 'auspicious', '领导威权，有魄力果决之才');
  }

  // ==========================================
  // GROUP 2: 凶煞 / 关煞类
  // ==========================================

  // 21. 羊刃
  const yangRenMap: Record<string, string> = {
    '甲': '卯', '乙': '辰', '丙': '午', '戊': '午',
    '丁': '未', '己': '未', '庚': '酉', '辛': '戌', '壬': '子', '癸': '丑'
  };
  if (yangRenMap[dGan] === tZhi) {
    add('羊刃', 'inauspicious', '刚强果断，需防过刚易折');
  }

  // 22. 劫煞
  const jieShaMap: Record<string, string> = {
    '申': '巳', '子': '巳', '辰': '巳',
    '寅': '亥', '午': '亥', '戌': '亥',
    '巳': '寅', '酉': '寅', '丑': '寅',
    '亥': '申', '卯': '申', '未': '申'
  };
  if (jieShaMap[dZhi] === tZhi || jieShaMap[yZhi] === tZhi) {
    add('劫煞', 'inauspicious', '争斗是非，行事宜谨慎');
  }

  // 23. 灾煞
  const zaiShaMap: Record<string, string> = {
    '申': '午', '子': '午', '辰': '午',
    '寅': '子', '午': '子', '戌': '子',
    '巳': '卯', '酉': '卯', '丑': '卯',
    '亥': '酉', '卯': '酉', '未': '酉'
  };
  if (zaiShaMap[dZhi] === tZhi || zaiShaMap[yZhi] === tZhi) {
    add('灾煞', 'inauspicious', '冲将星之煞，防意外损耗');
  }

  // 24. 亡神
  const wangShenMap: Record<string, string> = {
    '申': '亥', '子': '亥', '辰': '亥',
    '寅': '巳', '午': '巳', '戌': '巳',
    '巳': '申', '酉': '申', '丑': '申',
    '亥': '寅', '卯': '寅', '未': '寅'
  };
  if (wangShenMap[dZhi] === tZhi || wangShenMap[yZhi] === tZhi) {
    add('亡神', 'inauspicious', '多谋善变，需防心神不宁');
  }

  // 25. 血刃
  const xueRenMap: Record<string, string> = {
    '甲': '卯', '乙': '辰', '丙': '午', '丁': '未', '戊': '午',
    '己': '未', '庚': '酉', '辛': '戌', '壬': '子', '癸': '丑'
  };
  if (xueRenMap[dGan] === tZhi || xueRenMap[yGan] === tZhi) {
    add('血刃', 'inauspicious', '防身体血光外伤之虞');
  }

  // 26. 元辰
  if (yZhiIdx >= 0) {
    const chongIdx = (yZhiIdx + 6) % 12;
    const yuanChenZhi = isYangBoyOrYinGirl 
      ? ZHI_ORDER[(chongIdx + 1) % 12] 
      : ZHI_ORDER[(chongIdx + 11) % 12];
    if (tZhi === yuanChenZhi) {
      add('元辰', 'inauspicious', '行事波折，宜守不宜急进');
    }
  }

  // 27. 大耗 (岁破冲年支)
  if (yZhiIdx >= 0 && tZhi === ZHI_ORDER[(yZhiIdx + 6) % 12]) {
    add('大耗', 'inauspicious', '岁破冲年，钱财多耗防破耗');
  }

  // 28. 十恶大败
  const shiEDaBai = [
    '甲辰', '乙巳', '丙申', '丁亥', '戊戌',
    '己丑', '庚辰', '辛巳', '壬申', '癸亥'
  ];
  if (shiEDaBai.includes(tGanZhi)) {
    add('十恶大败', 'inauspicious', '钱财易散，忌冲动理财');
  }

  // 29. 白虎煞
  const baiHuMap: Record<string, string> = {
    '申': '戌', '子': '戌', '辰': '戌',
    '寅': '辰', '午': '辰', '戌': '辰',
    '巳': '未', '酉': '未', '丑': '未',
    '亥': '丑', '卯': '丑', '未': '丑'
  };
  if (baiHuMap[yZhi] === tZhi || baiHuMap[dZhi] === tZhi) {
    add('白虎煞', 'inauspicious', '白虎凶神，防口舌是非与血光');
  }

  // 30. 天罗地网
  const hasChen = [ctx.year.zhi, ctx.month.zhi, ctx.day.zhi, ctx.hour.zhi].includes('辰');
  const hasSi = [ctx.year.zhi, ctx.month.zhi, ctx.day.zhi, ctx.hour.zhi].includes('巳');
  const hasXu = [ctx.year.zhi, ctx.month.zhi, ctx.day.zhi, ctx.hour.zhi].includes('戌');
  const hasHai = [ctx.year.zhi, ctx.month.zhi, ctx.day.zhi, ctx.hour.zhi].includes('亥');
  if ((hasChen && hasSi && ['辰', '巳'].includes(tZhi)) || (hasXu && hasHai && ['戌', '亥'].includes(tZhi))) {
    add('天罗地网', 'inauspicious', '凡事多羁绊，宜守正道解凶');
  }

  // 31. 流霞
  const liuXiaMap: Record<string, string> = {
    '甲': '酉', '乙': '戌', '丙': '未', '丁': '申', '戊': '巳',
    '己': '午', '庚': '辰', '辛': '卯', '壬': '亥', '癸': '寅'
  };
  if (liuXiaMap[dGan] === tZhi) {
    add('流霞', 'inauspicious', '主轻浮酒色或产厄血光');
  }

  // 32. 飞刃 (与羊刃相对冲)
  const feiRenMap: Record<string, string> = {
    '甲': '酉', '乙': '戌', '丙': '子', '戊': '子',
    '丁': '丑', '己': '丑', '庚': '卯', '辛': '辰', '壬': '午', '癸': '未'
  };
  if (feiRenMap[dGan] === tZhi) {
    add('飞刃', 'inauspicious', '突发冲击，性急防躁动');
  }

  // 33. 勾绞煞
  if (yZhiIdx >= 0) {
    const gouZhi = isYangBoyOrYinGirl ? ZHI_ORDER[(yZhiIdx + 3) % 12] : ZHI_ORDER[(yZhiIdx + 9) % 12];
    const jiaoZhi = isYangBoyOrYinGirl ? ZHI_ORDER[(yZhiIdx + 9) % 12] : ZHI_ORDER[(yZhiIdx + 3) % 12];
    if (tZhi === gouZhi || tZhi === jiaoZhi) {
      add('勾绞煞', 'inauspicious', '勾连绞绊，人事多纠葛');
    }
  }

  // 34. 孤鸾煞 (日柱或时柱)
  const guLuan = ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '戊午', '壬子', '丙午'];
  if (guLuan.includes(tGanZhi) && (pillarType === 'day' || pillarType === 'hour')) {
    add('孤鸾煞', 'inauspicious', '独坐孤鸾，感情宜迟婚包容');
  }

  // 35. 四废
  if (
    (isSpring && ['庚申', '辛酉'].includes(tGanZhi)) ||
    (isSummer && ['壬子', '癸亥'].includes(tGanZhi)) ||
    (isAutumn && ['甲寅', '乙卯'].includes(tGanZhi)) ||
    (isWinter && ['丙午', '丁巳'].includes(tGanZhi))
  ) {
    add('四废', 'inauspicious', '身弱不任财官，凡事多费心');
  }

  // 36. 折伤
  const zheShangMap: Record<string, string> = {
    '子': '卯', '丑': '辰', '寅': '巳', '卯': '午',
    '辰': '未', '巳': '申', '午': '酉', '未': '戌',
    '申': '亥', '酉': '子', '戌': '丑', '亥': '寅'
  };
  if (zheShangMap[yZhi] === tZhi) {
    add('折伤', 'inauspicious', '行路运动防跌扑折伤');
  }

  // 37. 地贼
  const diZeiMap: Record<string, string> = {
    '寅': '子', '卯': '丑', '辰': '寅', '巳': '卯',
    '午': '辰', '未': '巳', '申': '午', '酉': '未',
    '戌': '申', '亥': '酉', '子': '戌', '丑': '亥'
  };
  if (diZeiMap[mZhi] === tZhi) {
    add('地贼', 'inauspicious', '出门防盗窃欺诈遗失');
  }

  // 38. 天火
  const tianHuoMap: Record<string, string> = {
    '子': '戌', '丑': '亥', '寅': '子', '卯': '丑',
    '辰': '寅', '巳': '卯', '午': '辰', '未': '巳',
    '申': '午', '酉': '未', '戌': '申', '亥': '酉'
  };
  if (tianHuoMap[mZhi] === tZhi) {
    add('天火', 'inauspicious', '提防火烛灼烫，性急防躁');
  }

  // 39. 断桥关 (正二月见寅, 三四月见卯, 五六月见申, 七八月见丑, 九十月见戌, 十一十二月见亥)
  const duanQiaoMonthMap: Record<string, string> = {
    '寅': '寅', '卯': '寅', '辰': '卯', '巳': '卯',
    '午': '申', '未': '申', '申': '丑', '酉': '丑',
    '戌': '戌', '亥': '戌', '子': '亥', '丑': '亥'
  };
  if (duanQiaoMonthMap[mZhi] === tZhi) {
    add('断桥关', 'inauspicious', '关煞防过桥近险地与跌跌撞撞');
  }

  // 40. 短命关 (寅卯见辰戌, 巳午见丑未, 申酉见寅申, 亥子见卯酉)
  const duanMingMonthMap: Record<string, string[]> = {
    '寅': ['辰', '戌'], '卯': ['辰', '戌'],
    '巳': ['丑', '未'], '午': ['丑', '未'],
    '申': ['寅', '申'], '酉': ['寅', '申'],
    '亥': ['卯', '酉'], '子': ['卯', '酉']
  };
  if (duanMingMonthMap[mZhi]?.includes(tZhi)) {
    add('短命关', 'inauspicious', '小儿关煞，幼时宜多注意呵护调养');
  }

  // 41. 断肠关 (甲乙见午, 丙丁见未, 戊己见申, 庚辛见亥, 壬癸见子)
  const duanChangMap: Record<string, string> = {
    '甲': '午', '乙': '午', '丙': '未', '丁': '未',
    '戊': '申', '己': '申', '庚': '亥', '辛': '亥',
    '壬': '子', '癸': '子'
  };
  if (duanChangMap[yGan] === tZhi || duanChangMap[dGan] === tZhi) {
    add('断肠关', 'inauspicious', '防肠胃饮食不良之疾');
  }

  // 42. 百日关 (春见寅巳申亥, 夏见子卯午酉, 秋见辰戌丑未, 冬见寅申巳亥)
  const baiRiSpring = isSpring && ['寅', '巳', '申', '亥'].includes(tZhi);
  const baiRiSummer = isSummer && ['子', '卯', '午', '酉'].includes(tZhi);
  const baiRiAutumn = isAutumn && ['辰', '戌', '丑', '未'].includes(tZhi);
  const baiRiWinter = isWinter && ['寅', '申', '巳', '亥'].includes(tZhi);
  if (baiRiSpring || baiRiSummer || baiRiAutumn || baiRiWinter) {
    add('百日关', 'inauspicious', '百日之内防惊吓受风');
  }

  // ==========================================
  // GROUP 3: 中性 / 特殊星煞类
  // ==========================================

  // 43. 华盖
  const huaGaiMap: Record<string, string> = {
    '申': '辰', '子': '辰', '辰': '辰',
    '寅': '戌', '午': '戌', '戌': '戌',
    '巳': '丑', '酉': '丑', '丑': '丑',
    '亥': '未', '卯': '未', '未': '未'
  };
  if (huaGaiMap[dZhi] === tZhi || huaGaiMap[yZhi] === tZhi) {
    add('华盖', 'neutral', '高雅清贵，喜好艺术宗教玄学思维');
  }

  // 44. 驿马
  const yiMaMap: Record<string, string> = {
    '申': '寅', '子': '寅', '辰': '寅',
    '寅': '申', '午': '申', '戌': '申',
    '巳': '亥', '酉': '亥', '丑': '亥',
    '亥': '巳', '卯': '巳', '未': '巳'
  };
  if (yiMaMap[dZhi] === tZhi || yiMaMap[yZhi] === tZhi) {
    add('驿马', 'neutral', '好动不居，迁动远行，利外乡发展');
  }

  // 45. 咸池 & 46. 桃花
  const taoHuaMap: Record<string, string> = {
    '申': '酉', '子': '酉', '辰': '酉',
    '寅': '卯', '午': '卯', '戌': '卯',
    '巳': '午', '酉': '午', '丑': '午',
    '亥': '子', '卯': '子', '未': '子'
  };
  if (taoHuaMap[dZhi] === tZhi || taoHuaMap[yZhi] === tZhi) {
    add('咸池', 'neutral', '风流多情，魅力人缘');
    add('桃花', 'neutral', '感情异性缘旺');
  }

  // 47. 魁罡贵人
  const kuiGang = ['戊戌', '庚辰', '庚戌', '壬辰'];
  if (kuiGang.includes(tGanZhi)) {
    add('魁罡贵人', 'auspicious', '性刚胆大，有威权领导力');
  }

  // 48. 空亡 (日柱旬空或年柱旬空)
  const dXunKong = getXunKong(dGan, dZhi);
  const yXunKong = getXunKong(yGan, yZhi);
  if (dXunKong.includes(tZhi) || yXunKong.includes(tZhi)) {
    add('空亡', 'neutral', '临空转虚，宜修心务实');
  }

  // 49. 孤辰 & 50. 寡宿
  const guChenMap: Record<string, string> = {
    '亥': '寅', '子': '寅', '丑': '寅',
    '寅': '巳', '卯': '巳', '辰': '巳',
    '巳': '申', '午': '申', '未': '申',
    '申': '亥', '酉': '亥', '戌': '亥'
  };
  const guaSuMap: Record<string, string> = {
    '亥': '戌', '子': '戌', '丑': '戌',
    '寅': '丑', '卯': '丑', '辰': '丑',
    '巳': '辰', '午': '辰', '未': '辰',
    '申': '未', '酉': '未', '戌': '未'
  };
  if (guChenMap[yZhi] === tZhi) {
    add('孤辰', 'inauspicious', '性格内敛孤僻，独立自主');
  }
  if (guaSuMap[yZhi] === tZhi) {
    add('寡宿', 'inauspicious', '独处喜静，清心寡欲');
  }

  // 51. 阴阳差错
  const yinYangChaCuo = [
    '丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳',
    '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'
  ];
  if (yinYangChaCuo.includes(tGanZhi)) {
    add('阴阳差错', 'inauspicious', '男女感情波折，需包容调和');
  }

  // 52. 红艳煞
  const hongYanMap: Record<string, string> = {
    '甲': '午', '乙': '申', '丙': '寅', '丁': '未', '戊': '辰',
    '己': '辰', '庚': '戌', '辛': '酉', '壬': '子', '癸': '申'
  };
  if (hongYanMap[dGan] === tZhi) {
    add('红艳煞', 'neutral', '浪漫多情，风流才情');
  }

  // 53. 禄神 / 54. 岁禄 / 55. 建禄 / 56. 专禄 / 57. 归禄
  const luMap: Record<string, string> = {
    '甲': '寅', '乙': '卯', '丙': '巳', '戊': '巳',
    '丁': '午', '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
  };
  if (luMap[dGan] === tZhi) {
    add('禄神', 'auspicious', '衣禄福田，得财禄自立');
    if (pillarType === 'year') add('岁禄', 'auspicious', '年支禄位，得祖荫');
    if (pillarType === 'month') add('建禄', 'auspicious', '月支禄位，自立昌盛');
    if (pillarType === 'day') add('专禄', 'auspicious', '日坐禄地，主观自信');
    if (pillarType === 'hour') add('归禄', 'auspicious', '日禄归时，晚福衣食丰足');
  }

  // 58. 金神 (乙丑, 己巳, 癸酉)
  const jinShen = ['乙丑', '己巳', '癸酉'];
  if (jinShen.includes(tGanZhi)) {
    add('金神', 'auspicious', '刚强果断，遇火炼则富贵');
  }

  // 59. 童子煞 (春秋见寅子，冬夏见卯未辰)
  const tongZiSpringAutumn = (isSpring || isAutumn) && ['寅', '子'].includes(tZhi);
  const tongZiSummerWinter = (isSummer || isWinter) && ['卯', '未', '辰'].includes(tZhi);
  if (tongZiSpringAutumn || tongZiSummerWinter) {
    add('童子煞', 'neutral', '相貌清秀聪明，婚姻宜迟或早皈依护佑');
  }

  return results;
}
