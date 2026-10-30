// 投资倾向：用本命财帛/福德/命宫定「财富剧本」与风险预算，再叠当前大限/流年节奏。
// 不预测指数、个股、收益率，不构成投资建议；命盘只用于个人风险偏好与决策习惯自检。

import type { Astrolabe, Palace, Star } from '../types';
import { getScopeData, type ScopeData } from './scope';

export type InvestmentScore = { label: string; value: number; note: string };

export type InvestmentTiming = {
  level: '积极' | '均衡' | '防守';
  decadalLabel: string;
  yearlyLabel: string;
  note: string;
  details: string[];
};

export type InvestmentProfile = {
  title: string;
  subtitle: string;
  summary: string;
  style: '防守型' | '稳健型' | '均衡型' | '进攻型' | '经营型' | '专业型';
  riskScore: number;
  riskLabel: string;
  scores: InvestmentScore[];
  patterns: string[];
  strengths: string[];
  cautions: string[];
  suitable: string[];
  avoid: string[];
  timing: InvestmentTiming | null;
  yearMutagens: { star: string; mutagen: string; landing?: string }[];
  checklist: string[];
  evidence: string[];
};

const SHA = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '天刑']);
const STABLE_STARS = new Set(['天府', '太阴', '天相', '天梁', '禄存']);
const ATTACK_STARS = new Set(['七杀', '破军', '贪狼', '武曲']);
const MIND_STARS = new Set(['文昌', '文曲', '天机', '太阳']);

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function palaceOf(a: Astrolabe, name: string): Palace | undefined {
  return a.palaces.find((p) => p.name === name);
}

function starsOf(p?: Palace): Star[] {
  return p ? [...p.majorStars, ...p.minorStars, ...p.adjectiveStars] : [];
}

function namesOf(p?: Palace): string[] {
  return starsOf(p).map((s) => s.name);
}

function hasMutagen(p: Palace | undefined, mutagen: string): boolean {
  return starsOf(p).some((s) => s.mutagen === mutagen);
}

function findLanding(a: Astrolabe, star: string): string | undefined {
  return a.palaces.find((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star))?.name;
}

function flowWealthBase(scope: ScopeData): string | undefined {
  return Object.entries(scope.flowPalaceByBase).find(([, flow]) => flow === '财帛')?.[0];
}

function timingFromScope(a: Astrolabe, scope: ScopeData, label: string): { level: InvestmentTiming['level']; details: string[]; bad: number; good: number } {
  const base = flowWealthBase(scope);
  const flowStars = base ? (scope.palaces[base] ?? []).map((s) => s.name) : [];
  const mutagens = scope.mutagenMap.map((m) => ({ ...m, landing: findLanding(a, m.star) }));
  const inWealth = base ? mutagens.filter((m) => m.landing === base) : [];
  const sha = flowStars.filter((s) => SHA.has(s)).length;
  const ji = inWealth.filter((m) => m.mutagen === '忌').length;
  const good = inWealth.filter((m) => m.mutagen === '禄' || m.mutagen === '权' || m.mutagen === '科').length;
  const level: InvestmentTiming['level'] = ji || sha >= 2 ? '防守' : good >= 1 ? '积极' : '均衡';
  const details = [
    base ? `${label}财帛落本命${base}` : `${label}财帛未定位`,
    flowStars.length ? `${label}财帛流曜：${flowStars.slice(0, 5).join('、')}` : `${label}财帛无流曜`,
    inWealth.length ? `${label}四化入财帛：${inWealth.map((m) => `${m.star}化${m.mutagen}`).join('、')}` : `${label}四化未直接入财帛`,
    sha ? `${label}财帛煞星 ${sha} 个` : `${label}财帛无明显煞星`,
  ];
  return { level, details, bad: ji + sha, good };
}

function buildTiming(a: Astrolabe, raw: Record<string, unknown> | null | undefined, currentYear: number): InvestmentTiming | null {
  if (!raw) return null;
  try {
    const birthYear = Number(a.solarDate.split('-')[0]);
    const age = currentYear - birthYear + 1;
    const list = (raw as { decadalList: () => { ageRange?: [number, number]; palaceName?: string; heavenlyStem?: string; earthlyBranch?: string }[] }).decadalList();
    const idx = list.findIndex((d) => d.ageRange && age >= d.ageRange[0] && age <= d.ageRange[1]);
    const decadal = idx >= 0 ? getScopeData(raw as never, 'decadal', { decadalIndex: idx }) : null;
    const yearly = getScopeData(raw as never, 'yearly', { targetDate: `${currentYear}-06-15` });
    const dTiming = decadal ? timingFromScope(a, decadal, '大限') : null;
    const yTiming = timingFromScope(a, yearly, `${currentYear}流年`);
    const level: InvestmentTiming['level'] =
      dTiming?.level === '防守' || yTiming.level === '防守'
        ? '防守'
        : dTiming?.level === '积极' || yTiming.level === '积极'
          ? '积极'
          : '均衡';
    const decadalLabel = decadal
      ? `${decadal.heavenlyStem}${decadal.earthlyBranch} · ${decadal.scopePalaceName ?? ''}`
      : '当前大限未定位';
    const yearlyLabel = `${currentYear} ${yearly.heavenlyStem}${yearly.earthlyBranch}`;
    return {
      level,
      decadalLabel,
      yearlyLabel,
      note:
        level === '防守'
          ? '当前节奏偏防守：先控风险预算，不用杠杆、不押短期要用的钱；把「不亏大钱」放在「抓机会」前面。'
          : level === '积极'
            ? '当前节奏相对积极：可以按计划推进，但仍建议分批、设上限；这不等于市场会涨。'
            : '当前节奏中性：按既定配置走，少做临时加仓/减仓的情绪化决定。',
      details: [...(dTiming?.details ?? []), ...yTiming.details],
    };
  } catch {
    return null;
  }
}

export function investmentProfile(a: Astrolabe, raw: Record<string, unknown> | null | undefined, currentYear = new Date().getFullYear()): InvestmentProfile {
  const soul = palaceOf(a, '命宫');
  const wealth = palaceOf(a, '财帛');
  const spirit = palaceOf(a, '福德');
  const career = palaceOf(a, '官禄');
  const wealthNames = namesOf(wealth);
  const wealthMajor = wealth?.majorStars.map((s) => s.name) ?? [];
  const soulNames = namesOf(soul);
  const wealthSha = starsOf(wealth).filter((s) => SHA.has(s.name)).length;
  const jiInWealth = hasMutagen(wealth, '忌');
  const powerInWealth = hasMutagen(wealth, '权');
  const luInWealth = hasMutagen(wealth, '禄');
  const wenchangJi = [...soulNames, ...wealthNames].includes('文昌') && [...soulNames, ...wealthNames].some((n) => n === '文昌') && starsOf(wealth).concat(starsOf(soul)).some((s) => s.name === '文昌' && s.mutagen === '忌');
  const fireGreed = wealthNames.includes('贪狼') && (wealthNames.includes('火星') || wealthNames.includes('铃星'));
  const ziweiSeven = wealthMajor.includes('紫微') && wealthMajor.includes('七杀');
  const tianfu = wealthNames.includes('天府');
  const taiyin = wealthNames.includes('太阴');
  const wuqu = wealthNames.includes('武曲');
  const mind = wealthNames.some((n) => MIND_STARS.has(n)) || soulNames.some((n) => MIND_STARS.has(n));
  const stableCount = wealthNames.filter((n) => STABLE_STARS.has(n)).length;
  const attackCount = wealthNames.filter((n) => ATTACK_STARS.has(n)).length;

  const scores: InvestmentScore[] = [
    {
      label: '守成力',
      value: clamp(50 + (tianfu ? 14 : 0) + (taiyin ? 9 : 0) + (stableCount * 4) + (luInWealth ? 8 : 0) - wealthSha * 6 - (jiInWealth ? 12 : 0)),
      note: '能不能把赚到的钱留下来；高不等于保守，低也不等于该冒险。',
    },
    {
      label: '进攻性',
      value: clamp(50 + (attackCount * 8) + (fireGreed ? 16 : 0) + (powerInWealth ? 9 : 0) + (ziweiSeven ? 8 : 0) - (jiInWealth ? 10 : 0)),
      note: '对波动与不确定的承受倾向；高波动适配不等于高仓位。',
    },
    {
      label: '纪律性',
      value: clamp(50 + (mind ? 14 : 0) + (wealthNames.includes('化科') ? 0 : 0) + (wealth?.majorStars.some((s) => s.mutagen === '科') ? 8 : 0) - (fireGreed ? 10 : 0) - wealthSha * 4 - (jiInWealth ? 6 : 0)),
      note: '能不能按规则执行；火贪/煞重时，最需要外部纪律。',
    },
    {
      label: '正财力',
      value: clamp(50 + (wuqu ? 12 : 0) + (tianfu ? 9 : 0) + (taiyin ? 7 : 0) + (luInWealth ? 10 : 0) + (wealthMajor.length ? 3 : -10) - wealthSha * 5),
      note: '靠专业、经营与稳定现金流赚钱的能力。',
    },
  ];

  const riskScore = clamp(scores[1].value * 0.45 + scores[0].value * 0.2 + scores[2].value * 0.2 + scores[3].value * 0.15);
  const riskLabel = riskScore >= 70 ? '高波动适配' : riskScore >= 55 ? '均衡偏进攻' : riskScore >= 40 ? '均衡' : '低波动适配';

  let style: InvestmentProfile['style'] = '均衡型';
  let title = '财富剧本 · 均衡配置型';
  let subtitle = '没有单一极端的财富信号，适合用配置而不是押注。';
  let summary = '财帛宫与命宫没有形成极端的火贪、化忌或权禄结构；更适合分散、分批、按计划执行。';

  if (jiInWealth || wenchangJi) {
    style = '防守型';
    title = '财富剧本 · 防守守成型';
    subtitle = '财帛/命宫见忌，先守本金，再谈收益。';
    summary = wenchangJi
      ? '命宫或财帛见文昌化忌，传统上对「文件类」投资（股票、合约、复杂产品）更不友好；杠杆与短线尤其要避开。'
      : '财帛宫见化忌，传统上是风险警示：容易在钱上执念或反复；更适合低波动、透明、流动性好的安排。';
  } else if (fireGreed) {
    style = '进攻型';
    title = '财富剧本 · 火贪爆发型';
    subtitle = '爆发力与暴起暴落并存，最忌把偶然当能力。';
    summary = '财帛宫见贪狼与火铃，传统称「火贪格」：有机会抓到突发性机会，但也容易在情绪高点加码；适合小仓位、严格止损，不适合借钱或高频自己操盘。';
  } else if (ziweiSeven) {
    style = '经营型';
    title = '财富剧本 · 紫微七杀开创型';
    subtitle = '更适合自己开疆拓土，而不是在别人的规则里熬。';
    summary = '财帛宫紫微七杀，帝星与战将同宫：有自主经营的驱动力，但不等于适合炒股；把进攻性放在事业、业务股权或专业服务上更顺。';
  } else if (powerInWealth && luInWealth) {
    style = '经营型';
    title = '财富剧本 · 权禄相逢型';
    subtitle = '有经营与掌盘欲，适合把能力变成生意。';
    summary = '财帛宫化权与化禄同现，传统上偏向创业/经营；重点不是「赌对一次」，而是把现金流、合伙与分配规则先写清楚。';
  } else if (powerInWealth && !luInWealth) {
    style = '专业型';
    title = '财富剧本 · 唯权无禄型';
    subtitle = '更适合在平台内做高管/专家，而不是盲目创业。';
    summary = '财帛宫有化权无化禄：领导力与掌控力强，但现金流未必同步；在组织里做管理、专业服务或项目负责，比独自扛全部风险更合适。';
  } else if (tianfu || taiyin) {
    style = '稳健型';
    title = '财富剧本 · 稳健积累型';
    subtitle = '天府/太阴的守成气质，适合长期、分散、可解释的配置。';
    summary = '财帛宫偏稳定，硬做高频投机反而容易不适；把重点放在储蓄率、保障、长期定投与资产分散。';
  } else if (mind) {
    style = '专业型';
    title = '财富剧本 · 专业服务型';
    subtitle = '靠脑子、表达与专业赚钱，比靠盘感更稳。';
    summary = '命宫/财帛见文昌文曲天机等，优势在信息处理、表达与专业服务；投资上更适合「研究后按计划执行」，而不是凭消息追涨杀跌。';
  }

  const patterns = [
    fireGreed ? '火贪/铃贪' : '',
    ziweiSeven ? '紫微七杀在财帛' : '',
    powerInWealth && luInWealth ? '权禄相逢' : '',
    powerInWealth && !luInWealth ? '唯权无禄' : '',
    jiInWealth ? '财帛化忌' : '',
    wenchangJi ? '文昌化忌' : '',
    tianfu ? '天府守财' : '',
    taiyin ? '太阴稳财' : '',
    wuqu ? '武曲正财' : '',
  ].filter(Boolean);

  const strengths = [
    tianfu || taiyin ? '守成与长期积累的底子较好，适合把节奏放慢。' : '',
    wuqu ? '正财/专业变现的驱动力强，先把主业现金流做厚。' : '',
    mind ? '信息处理与学习能力可用，适合建立自己的研究/复盘清单。' : '',
    !jiInWealth && wealthSha === 0 ? '财帛宫没有明显煞忌，按规则执行的空间较大。' : '',
  ].filter(Boolean);
  if (!strengths.length) strengths.push('没有单一极端的财富信号，适合用分散与长期配置降低决策压力。');

  const cautions = [
    fireGreed ? '火贪的爆发力容易让人把一次运气当成能力；不要借钱、不要 All-in、不要在高潮加仓。' : '',
    jiInWealth ? '财帛化忌：先设风险预算与止损，不用短期要用的钱投资。' : '',
    wenchangJi ? '文昌化忌：对合约、文件、复杂产品尤其要慢；看不懂的不要碰。' : '',
    wealthSha >= 2 ? '财帛宫煞星偏多：波动容易放大，仓位与止损要比别人更严格。' : '',
    '任何命盘都不能可靠预测指数或个股涨跌；不要用这张盘替代基本面与风险测评。',
  ].filter(Boolean);

  const suitable = style === '防守型'
    ? ['现金管理 / 短债 / 货币类', '宽基指数小额定投（只用闲钱）', '保险保障与应急金优先']
    : style === '稳健型'
      ? ['宽基指数长期定投', '债券/现金管理做底仓', '分散配置，按年度再平衡']
      : style === '进攻型'
        ? ['小仓位行业/主题基金（设上限）', '权益类资产分批，不追涨', '先写止损与退出条件']
        : style === '经营型'
          ? ['主业/业务股权/专业服务', '把经营现金流与投资账户分开', '合伙与分配规则先写清楚']
          : style === '专业型'
            ? ['专业服务/佣金/知识付费', '研究后按计划执行，不凭消息', '用定投替代频繁择时']
            : ['资产配置 + 定投', '先应急金、保障，再投资', '少做临时起意的加仓/减仓'];

  const avoid = [
    '杠杆、借钱、短期要用的钱',
    '看不懂的复杂产品/合约',
    ...(fireGreed || wealthSha >= 2 ? ['高频自己操盘、追涨杀跌'] : []),
    ...(jiInWealth || wenchangJi ? ['All-in、补仓摊平、死扛'] : []),
    '把紫微盘当成买卖信号',
  ];

  const timing = buildTiming(a, raw, currentYear);
  const yearScope = raw ? (() => {
    try {
      return getScopeData(raw as never, 'yearly', { targetDate: `${currentYear}-06-15` });
    } catch {
      return null;
    }
  })() : null;
  const yearMutagens = yearScope
    ? yearScope.mutagenMap.map((m) => ({ ...m, landing: findLanding(a, m.star) }))
    : [];

  const checklist = [
    '先留应急金，再谈投资；保障优先于收益。',
    '把可投资的钱分成「底仓 / 进攻 / 机会」三份，先定上限。',
    '每笔交易先写退出条件，不用情绪决定加仓或割肉。',
    '每年复盘一次：是策略有效，还是运气好？',
    '命盘只做自我认知与风险提醒，不替代持牌财务/税务/法律意见。',
  ];

  return {
    title,
    subtitle,
    summary,
    style,
    riskScore,
    riskLabel,
    scores,
    patterns,
    strengths,
    cautions,
    suitable,
    avoid,
    timing,
    yearMutagens,
    checklist,
    evidence: [
      `命宫：${soul?.majorStars.map((s) => s.name).join('、') || '空宫'}`,
      `财帛宫：${wealthMajor.join('、') || '空宫'}${wealth ? `（${wealth.heavenlyStem}${wealth.earthlyBranch}）` : ''}`,
      `福德宫：${spirit?.majorStars.map((s) => s.name).join('、') || '空宫'}`,
      `官禄宫：${career?.majorStars.map((s) => s.name).join('、') || '空宫'}`,
      `当前年龄：${currentYear - Number(a.solarDate.split('-')[0]) + 1} 岁（虚岁）`,
    ],
  };
}
