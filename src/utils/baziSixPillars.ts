/**
 * 细盘六柱提示计算工具 (Six Pillars Deep Analysis)
 * 涵盖：年柱、月柱、日柱、时柱、大运、流年（岁），以及流月动态对比
 */

export interface PillarItem {
  name: string; // '年' | '月' | '日' | '时' | '运' | '岁'
  fullName: string; // '年柱' | '月柱' | '日柱' | '时柱' | '大运' | '流年'
  gan: string;
  zhi: string;
  ganZhi: string;
}

export interface SixPillarsResult {
  tianGan: string[];
  diZhi: string[];
  zhengZhu: string[];
  liuYue: string[];
  more: string[];
}

// 天干冲合字典
const GAN_CHONG_PAIRS: [string, string][] = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
];

const GAN_HE_PAIRS: [string, string, string][] = [
  ['甲', '己', '合土'],
  ['乙', '庚', '合金'],
  ['丙', '辛', '合水'],
  ['丁', '壬', '合木'],
  ['戊', '癸', '合火'],
];

// 地支六冲
const ZHI_CHONG_PAIRS: [string, string][] = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

// 地支六合
const ZHI_HE_PAIRS: [string, string, string][] = [
  ['子', '丑', '合土'],
  ['寅', '亥', '合木'],
  ['卯', '戌', '合火'],
  ['辰', '酉', '合金'],
  ['巳', '申', '合水'],
  ['午', '未', '合土'],
];

// 地支三合局
const SAN_HE_GROUPS: [string, string, string, string][] = [
  ['申', '子', '辰', '水局'],
  ['巳', '酉', '丑', '金局'],
  ['寅', '午', '戌', '火局'],
  ['亥', '卯', '未', '木局'],
];

// 地支三会局
const SAN_HUI_GROUPS: [string, string, string, string][] = [
  ['寅', '卯', '辰', '东方木局'],
  ['巳', '午', '未', '南方火局'],
  ['申', '酉', '戌', '西方金局'],
  ['亥', '子', '丑', '北方水局'],
];

// 地支相刑
const ZHI_ZI_XING = ['辰', '午', '酉', '亥'];

// 十灵日/时列表
const SHI_LING_LIST = ['甲辰', '乙亥', '丙辰', '丁酉', '戊午', '庚戌', '庚寅', '辛亥', '壬寅', '癸未'];

// 魁罡
const KUI_GANG_LIST = ['戊戌', '庚辰', '庚戌', '壬辰'];

/**
 * 判断两个地支是否相刑
 */
function checkZhiXing(z1: string, z2: string): string | null {
  if (z1 === z2 && ZHI_ZI_XING.includes(z1)) {
    return `${z1}${z2}可自刑`;
  }
  if ((z1 === '子' && z2 === '卯') || (z1 === '卯' && z2 === '子')) {
    return '子卯相刑';
  }
  // 恃势之刑 (寅巳申)
  if ((z1 === '寅' && z2 === '巳') || (z1 === '巳' && z2 === '寅')) return '寅巳相刑';
  if ((z1 === '巳' && z2 === '申') || (z1 === '申' && z2 === '巳')) return '巳申相刑';
  if ((z1 === '寅' && z2 === '申') || (z1 === '申' && z2 === '寅')) return '寅申相刑';
  // 无恩之刑 (丑戌未)
  if ((z1 === '丑' && z2 === '戌') || (z1 === '戌' && z2 === '丑')) return '丑戌相刑';
  if ((z1 === '戌' && z2 === '未') || (z1 === '未' && z2 === '戌')) return '戌未相刑';
  if ((z1 === '丑' && z2 === '未') || (z1 === '未' && z2 === '丑')) return '丑未相刑';
  return null;
}

/**
 * 判断两个地支是否相害
 */
function checkZhiHai(z1: string, z2: string): string | null {
  const haiPairs: [string, string][] = [
    ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']
  ];
  for (const [a, b] of haiPairs) {
    if ((z1 === a && z2 === b) || (z1 === b && z2 === a)) {
      return `${a}${b}相害`;
    }
  }
  return null;
}

export function calculateSixPillarsTips(
  pillars: {
    year: { gan: string; zhi: string };
    month: { gan: string; zhi: string };
    day: { gan: string; zhi: string };
    hour: { gan: string; zhi: string };
    yun: { gan: string; zhi: string };
    sui: { gan: string; zhi: string };
  },
  liuYue?: { gan: string; zhi: string }
): SixPillarsResult {
  const { year, month, day, hour, yun, sui } = pillars;

  const sixPillars: PillarItem[] = [
    { name: '年', fullName: '年柱', gan: year.gan, zhi: year.zhi, ganZhi: year.gan + year.zhi },
    { name: '月', fullName: '月柱', gan: month.gan, zhi: month.zhi, ganZhi: month.gan + month.zhi },
    { name: '日', fullName: '日柱', gan: day.gan, zhi: day.zhi, ganZhi: day.gan + day.zhi },
    { name: '时', fullName: '时柱', gan: hour.gan, zhi: hour.zhi, ganZhi: hour.gan + hour.zhi },
    { name: '运', fullName: '大运', gan: yun.gan, zhi: yun.zhi, ganZhi: yun.gan + yun.zhi },
    { name: '岁', fullName: '流年', gan: sui.gan, zhi: sui.zhi, ganZhi: sui.gan + sui.zhi },
  ].filter(p => p.gan && p.zhi);

  const tianGanList: string[] = [];
  const diZhiList: string[] = [];
  const zhengZhuList: string[] = [];
  const liuYueList: string[] = [];
  const moreList: string[] = [];

  const tianGanSeen = new Set<string>();
  const diZhiSeen = new Set<string>();
  const zhengZhuSeen = new Set<string>();

  // 1. 天干关系检测
  for (let i = 0; i < sixPillars.length; i++) {
    for (let j = i + 1; j < sixPillars.length; j++) {
      const g1 = sixPillars[i].gan;
      const g2 = sixPillars[j].gan;

      // 天干相冲
      for (const [a, b] of GAN_CHONG_PAIRS) {
        if ((g1 === a && g2 === b) || (g1 === b && g2 === a)) {
          const item = `${a}${b}可相冲`;
          if (!tianGanSeen.has(item)) {
            tianGanSeen.add(item);
            tianGanList.push(item);
          }
        }
      }

      // 天干五合
      for (const [a, b, desc] of GAN_HE_PAIRS) {
        if ((g1 === a && g2 === b) || (g1 === b && g2 === a)) {
          const item = `${a}${b}可${desc}`;
          if (!tianGanSeen.has(item)) {
            tianGanSeen.add(item);
            tianGanList.push(item);
          }
        }
      }
    }
  }

  // 2. 地支关系检测
  const allZhis = sixPillars.map(p => p.zhi);

  // 三合局 / 半合局检测
  for (const [z1, z2, z3, ju] of SAN_HE_GROUPS) {
    const has1 = allZhis.includes(z1);
    const has2 = allZhis.includes(z2);
    const has3 = allZhis.includes(z3);

    if (has1 && has2 && has3) {
      const item = `${z1}${z2}${z3}可三合${ju}`;
      if (!diZhiSeen.has(item)) {
        diZhiSeen.add(item);
        diZhiList.push(item);
      }
    } else {
      if (has1 && has2) {
        const item = `${z1}${z2}可半合${ju}`;
        if (!diZhiSeen.has(item)) {
          diZhiSeen.add(item);
          diZhiList.push(item);
        }
      }
      if (has2 && has3) {
        const item = `${z2}${z3}可半合${ju}`;
        if (!diZhiSeen.has(item)) {
          diZhiSeen.add(item);
          diZhiList.push(item);
        }
      }
      if (has1 && has3) {
        const item = `${z1}${z3}可拱合${ju}`;
        if (!diZhiSeen.has(item)) {
          diZhiSeen.add(item);
          diZhiList.push(item);
        }
      }
    }
  }

  // 三会局
  for (const [z1, z2, z3, ju] of SAN_HUI_GROUPS) {
    if (allZhis.includes(z1) && allZhis.includes(z2) && allZhis.includes(z3)) {
      const item = `${z1}${z2}${z3}可三会${ju}`;
      if (!diZhiSeen.has(item)) {
        diZhiSeen.add(item);
        diZhiList.push(item);
      }
    }
  }

  // 地支两两检测 (六合, 六冲, 相刑, 相害)
  for (let i = 0; i < sixPillars.length; i++) {
    for (let j = i + 1; j < sixPillars.length; j++) {
      const z1 = sixPillars[i].zhi;
      const z2 = sixPillars[j].zhi;

      // 六合
      for (const [a, b, desc] of ZHI_HE_PAIRS) {
        if ((z1 === a && z2 === b) || (z1 === b && z2 === a)) {
          const item = `${a}${b}可${desc}`;
          if (!diZhiSeen.has(item)) {
            diZhiSeen.add(item);
            diZhiList.push(item);
          }
        }
      }

      // 六冲
      for (const [a, b] of ZHI_CHONG_PAIRS) {
        if ((z1 === a && z2 === b) || (z1 === b && z2 === a)) {
          const item = `${a}${b}可相冲`;
          if (!diZhiSeen.has(item)) {
            diZhiSeen.add(item);
            diZhiList.push(item);
          }
        }
      }

      // 相刑
      const xingItem = checkZhiXing(z1, z2);
      if (xingItem && !diZhiSeen.has(xingItem)) {
        diZhiSeen.add(xingItem);
        diZhiList.push(xingItem);
      }

      // 相害
      const haiItem = checkZhiHai(z1, z2);
      if (haiItem && !diZhiSeen.has(haiItem)) {
        diZhiSeen.add(haiItem);
        diZhiList.push(haiItem);
      }
    }
  }

  // 3. 整柱关系检测 (例如：年月天冲地冲; 岁日天冲地刑)
  for (let i = 0; i < sixPillars.length; i++) {
    for (let j = i + 1; j < sixPillars.length; j++) {
      const p1 = sixPillars[i];
      const p2 = sixPillars[j];
      const pairName = `${p1.name}${p2.name}`;

      const isGanChong = GAN_CHONG_PAIRS.some(
        ([a, b]) => (p1.gan === a && p2.gan === b) || (p1.gan === b && p2.gan === a)
      );
      const isGanHe = GAN_HE_PAIRS.some(
        ([a, b]) => (p1.gan === a && p2.gan === b) || (p1.gan === b && p2.gan === a)
      );
      const isGanSame = p1.gan === p2.gan;

      const isZhiChong = ZHI_CHONG_PAIRS.some(
        ([a, b]) => (p1.zhi === a && p2.zhi === b) || (p1.zhi === b && p2.zhi === a)
      );
      const isZhiHe = ZHI_HE_PAIRS.some(
        ([a, b]) => (p1.zhi === a && p2.zhi === b) || (p1.zhi === b && p2.zhi === a)
      );
      const xingDesc = checkZhiXing(p1.zhi, p2.zhi);
      const isZhiXing = xingDesc !== null;
      const isZhiHai = checkZhiHai(p1.zhi, p2.zhi) !== null;

      let item = '';
      if (isGanChong && isZhiChong) {
        item = `${pairName}天冲地冲`;
      } else if (isGanChong && isZhiXing) {
        item = `${pairName}天冲地刑`;
      } else if (isGanChong && isZhiHe) {
        item = `${pairName}天冲地合`;
      } else if (isGanChong && isZhiHai) {
        item = `${pairName}天冲地害`;
      } else if (isGanHe && isZhiHe) {
        item = `${pairName}天地双合`;
      } else if (isGanHe && isZhiChong) {
        item = `${pairName}天合地冲`;
      } else if (isGanSame && isZhiChong) {
        item = `${pairName}天比地冲`;
      } else if (isGanSame && isZhiXing) {
        item = `${pairName}天比地刑`;
      }

      if (item && !zhengZhuSeen.has(item)) {
        zhengZhuSeen.add(item);
        zhengZhuList.push(item);
      }
    }
  }

  // 4. 流月关系检测 (动态随选定流月实时变化)
  if (liuYue && liuYue.gan && liuYue.zhi) {
    const lyGz = liuYue.gan + liuYue.zhi;
    const yueSeen = new Set<string>();

    const addYueItem = (msg: string) => {
      if (!yueSeen.has(msg)) {
        yueSeen.add(msg);
        liuYueList.push(msg);
      }
    };

    // 对比每个柱子
    sixPillars.forEach(p => {
      const isSameGz = lyGz === p.ganZhi;
      const isGanChong = GAN_CHONG_PAIRS.some(([a, b]) => (liuYue.gan === a && p.gan === b) || (liuYue.gan === b && p.gan === a));
      const isGanHe = GAN_HE_PAIRS.some(([a, b]) => (liuYue.gan === a && p.gan === b) || (liuYue.gan === b && p.gan === a));
      const isZhiChong = ZHI_CHONG_PAIRS.some(([a, b]) => (liuYue.zhi === a && p.zhi === b) || (liuYue.zhi === b && p.zhi === a));
      const isZhiHe = ZHI_HE_PAIRS.some(([a, b]) => (liuYue.zhi === a && p.zhi === b) || (liuYue.zhi === b && p.zhi === a));
      const isZhiXing = checkZhiXing(liuYue.zhi, p.zhi) !== null;
      const isZhiHai = checkZhiHai(liuYue.zhi, p.zhi) !== null;

      // 整柱感应
      if (isSameGz) {
        if (p.name === '运') addYueItem(`「${lyGz}」月运同途`);
        else if (p.name === '岁') addYueItem(`「${lyGz}」月岁同途`);
        else addYueItem(`「${lyGz}」与${p.name}柱同途(伏吟)`);
      } else if (isGanChong && isZhiChong) {
        if (p.name === '运') addYueItem(`「${lyGz}」月运相冲`);
        else if (p.name === '岁') addYueItem(`「${lyGz}」月岁相冲`);
        else addYueItem(`「${lyGz}」与${p.name}柱天冲地冲`);
      } else if (isGanHe && isZhiHe) {
        addYueItem(`「${lyGz}」与${p.name}柱天地双合`);
      } else {
        // 单项冲合
        if (isZhiChong) {
          if (p.name === '月') addYueItem(`「${lyGz}」冲月提纲`);
          else if (p.name === '日') addYueItem(`「${lyGz}」冲犯日支`);
          else addYueItem(`「${lyGz}」冲${p.name}支(${liuYue.zhi}${p.zhi}冲)`);
        }
        if (isGanChong) {
          addYueItem(`「${lyGz}」天干${liuYue.gan}${p.gan}冲(${p.name}柱)`);
        }
        if (isGanHe) {
          addYueItem(`「${lyGz}」天干${liuYue.gan}${p.gan}合(${p.name}柱)`);
        }
        if (isZhiHe) {
          addYueItem(`「${lyGz}」地支${liuYue.zhi}${p.zhi}合(${p.name}支)`);
        }
        if (isZhiXing) {
          addYueItem(`「${lyGz}」地支${liuYue.zhi}${p.zhi}相刑(${p.name}支)`);
        }
        if (isZhiHai) {
          addYueItem(`「${lyGz}」地支${liuYue.zhi}${p.zhi}相害(${p.name}支)`);
        }
      }
    });

    // 半合/三合局检测
    for (const [z1, z2, z3, ju] of SAN_HE_GROUPS) {
      if (liuYue.zhi === z1 || liuYue.zhi === z2 || liuYue.zhi === z3) {
        const others = [z1, z2, z3].filter(z => z !== liuYue.zhi);
        const matchOther = others.filter(z => allZhis.includes(z));
        if (matchOther.length === 2) {
          addYueItem(`「${lyGz}」合化${ju}(引动三合)`);
        } else if (matchOther.length === 1) {
          addYueItem(`「${lyGz}」与原局${matchOther[0]}半合${ju}`);
        }
      }
    }

    if (liuYueList.length === 0) {
      addYueItem(`「${lyGz}」流月气机平和`);
    }
  }

  // 5. 更多 (特殊神煞格局提示)
  const hourGz = hour.gan + hour.zhi;
  const dayGz = day.gan + day.zhi;

  if (SHI_LING_LIST.includes(hourGz)) {
    moreList.push('十灵时');
  }
  if (SHI_LING_LIST.includes(dayGz)) {
    moreList.push('十灵日');
  }
  if (KUI_GANG_LIST.includes(dayGz)) {
    moreList.push('魁罡日');
  }

  // 四正全 (子午卯酉)
  if (allZhis.includes('子') && allZhis.includes('午') && allZhis.includes('卯') && allZhis.includes('酉')) {
    moreList.push('四正全(子午卯酉)');
  }
  // 四生全 (寅申巳亥)
  if (allZhis.includes('寅') && allZhis.includes('申') && allZhis.includes('巳') && allZhis.includes('亥')) {
    moreList.push('四生全(寅申巳亥)');
  }
  // 四库全 (辰戌丑未)
  if (allZhis.includes('辰') && allZhis.includes('戌') && allZhis.includes('丑') && allZhis.includes('未')) {
    moreList.push('四库全(辰戌丑未)');
  }

  // 岁运并临
  if (yun.gan && sui.gan && yun.gan + yun.zhi === sui.gan + sui.zhi) {
    moreList.push('岁运并临');
  }

  return {
    tianGan: tianGanList,
    diZhi: diZhiList,
    zhengZhu: zhengZhuList,
    liuYue: liuYueList,
    more: moreList,
  };
}
