// 八字详盘：四柱、藏干、十神、十二长生、自坐、纳音、空亡、神煞与扶抑用神初判。
// 用 lunar-typescript 的 EightChar 做底层，避免手写历法；用神/神煞为教学级简化。

import { Solar, Lunar } from 'lunar-typescript';
import type { BirthInput } from '../types';
import { trueSolarTimeMinutes } from './truesolar';

export type Element = '木' | '火' | '土' | '金' | '水';

export type BaziPillarDetail = {
  label: string;
  stem: string;
  branch: string;
  hidden: string[];
  hiddenTenGods: string[];
  tenGod: string;
  naYin: string;
  starFortune: string;
  selfSeat: string;
  xunKong: string;
};

export type BaziProfile = {
  name: string;
  gender: '男' | '女';
  solarText: string;
  lunarText: string;
  eightChar: string;
  pillars: BaziPillarDetail[];
  dayMaster: string;
  dayMasterEl: Element;
  counts: Record<Element, number>;
  missing: Element[];
  strength: '偏强' | '偏弱' | '中和';
  usefulGods: Element[];
  usefulNote: string;
  spouseStar: '财' | '官';
  spouseStars: string[];
  shenSha: string[];
  taiYuan: string;
  mingGong: string;
  shenGong: string;
  caveat: string;
};

const STEM_EL: Record<string, Element> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const BRANCH_EL: Record<string, Element> = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const GENERATES: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const RESTRAINS: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const FED_BY: Record<Element, Element> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };
const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const STAGE_START: Record<string, string> = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };
const STEM_YANG: Record<string, boolean> = { 甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false };

const TIANYI: Record<string, string[]> = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
const WENCHANG: Record<string, string> = { 甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const YANGREN: Record<string, string> = { 甲: '卯', 乙: '寅', 丙: '午', 丁: '巳', 戊: '午', 己: '巳', 庚: '酉', 辛: '申', 壬: '子', 癸: '亥' };
const LUSHEN: Record<string, string> = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };

function branchIndex(branch: string): number {
  return '子丑寅卯辰巳午未申酉戌亥'.indexOf(branch);
}

function selfSeat(stem: string, branch: string): string {
  const start = STAGE_START[stem];
  if (!start) return '—';
  const si = branchIndex(start);
  const bi = branchIndex(branch);
  if (si < 0 || bi < 0) return '—';
  const delta = STEM_YANG[stem] ? (bi - si + 12) % 12 : (si - bi + 12) % 12;
  return STAGES[delta] ?? '—';
}

function groupBranch(branch: string): string {
  if ('申子辰'.includes(branch)) return '申子辰';
  if ('寅午戌'.includes(branch)) return '寅午戌';
  if ('亥卯未'.includes(branch)) return '亥卯未';
  return '巳酉丑';
}

function shenShaOf(dayStem: string, branches: string[]): string[] {
  const out: string[] = [];
  const set = new Set(branches);
  const ty = TIANYI[dayStem] ?? [];
  if (ty.some((b) => set.has(b))) out.push('天乙贵人');
  if (branches.includes(WENCHANG[dayStem] ?? '')) out.push('文昌贵人');
  if (branches.includes(YANGREN[dayStem] ?? '')) out.push('羊刃');
  if (branches.includes(LUSHEN[dayStem] ?? '')) out.push('禄神');
  const dayBranch = branches[2] ?? '';
  const g = groupBranch(dayBranch);
  const peach = g === '申子辰' ? '酉' : g === '寅午戌' ? '卯' : g === '亥卯未' ? '子' : '午';
  const horse = g === '申子辰' ? '寅' : g === '寅午戌' ? '申' : g === '亥卯未' ? '巳' : '亥';
  const canopy = g === '申子辰' ? '辰' : g === '寅午戌' ? '戌' : g === '亥卯未' ? '未' : '丑';
  const general = g === '申子辰' ? '子' : g === '寅午戌' ? '午' : g === '亥卯未' ? '卯' : '酉';
  if (branches.includes(peach)) out.push('桃花');
  if (branches.includes(horse)) out.push('驿马');
  if (branches.includes(canopy)) out.push('华盖');
  if (branches.includes(general)) out.push('将星');
  return Array.from(new Set(out));
}

function toSolar(input: BirthInput): Solar {
  const [y, m, d] = input.birthday.split('-').map(Number);
  const [hh, mm] = (input.clockTime || '12:00').split(':').map(Number);
  let solar = input.birthdayType === 'lunar'
    ? Lunar.fromYmdHms(y, input.isLeapMonth ? -m : m, d, hh || 12, mm || 0, 0).getSolar()
    : Solar.fromYmdHms(y, m, d, hh || 12, mm || 0, 0);
  if (input.useTrueSolar) {
    const base = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
    const corrected = new Date(base.getTime() + trueSolarTimeMinutes((hh || 12) * 60 + (mm || 0), input.longitude, base) * 60000);
    solar = Solar.fromYmdHms(corrected.getFullYear(), corrected.getMonth() + 1, corrected.getDate(), corrected.getHours(), corrected.getMinutes(), 0);
  }
  return solar;
}

function tenGod(dayStem: string, other: string): string {
  const de = STEM_EL[dayStem];
  const oe = STEM_EL[other];
  if (!de || !oe) return '';
  const same = STEM_YANG[dayStem] === STEM_YANG[other];
  if (de === oe) return same ? '比肩' : '劫财';
  if (GENERATES[oe] === de) return same ? '偏印' : '正印';
  if (GENERATES[de] === oe) return same ? '食神' : '伤官';
  if (RESTRAINS[de] === oe) return same ? '偏财' : '正财';
  if (RESTRAINS[oe] === de) return same ? '七杀' : '正官';
  return '';
}

export function buildBaziProfile(input: BirthInput, name = '', gender?: '男' | '女'): BaziProfile {
  const solar = toSolar(input);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  const dayStem = ec.getDayGan();
  const dayEl = STEM_EL[dayStem] ?? '土';
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const rawPillars = [
    { g: ec.getYearGan(), z: ec.getYearZhi(), h: ec.getYearHideGan(), tg: ec.getYearShiShenGan(), htg: ec.getYearShiShenZhi(), n: ec.getYearNaYin(), d: ec.getYearDiShi(), x: ec.getYearXunKong() },
    { g: ec.getMonthGan(), z: ec.getMonthZhi(), h: ec.getMonthHideGan(), tg: ec.getMonthShiShenGan(), htg: ec.getMonthShiShenZhi(), n: ec.getMonthNaYin(), d: ec.getMonthDiShi(), x: ec.getMonthXunKong() },
    { g: ec.getDayGan(), z: ec.getDayZhi(), h: ec.getDayHideGan(), tg: '日主', htg: ec.getDayShiShenZhi(), n: ec.getDayNaYin(), d: ec.getDayDiShi(), x: ec.getDayXunKong() },
    { g: ec.getTimeGan(), z: ec.getTimeZhi(), h: ec.getTimeHideGan(), tg: ec.getTimeShiShenGan(), htg: ec.getTimeShiShenZhi(), n: ec.getTimeNaYin(), d: ec.getTimeDiShi(), x: ec.getTimeXunKong() },
  ];
  const pillars: BaziPillarDetail[] = rawPillars.map((p, i) => ({
    label: labels[i],
    stem: p.g,
    branch: p.z,
    hidden: p.h ?? [],
    hiddenTenGods: p.htg ?? [],
    tenGod: p.tg ?? '',
    naYin: p.n ?? '—',
    starFortune: p.d ?? '—',
    selfSeat: selfSeat(p.g, p.z),
    xunKong: p.x ?? '—',
  }));

  const counts: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  rawPillars.forEach((p) => {
    counts[STEM_EL[p.g] ?? '土']++;
    counts[BRANCH_EL[p.z] ?? '土']++;
  });
  const missing = (Object.keys(counts) as Element[]).filter((e) => counts[e] === 0);
  const support = counts[dayEl] + counts[FED_BY[dayEl]];
  const ratio = support / 8;
  const strength: BaziProfile['strength'] = ratio >= 0.5 ? '偏强' : ratio <= 0.25 ? '偏弱' : '中和';

  const dayRestrained = Object.keys(RESTRAINS).find((k) => RESTRAINS[k as Element] === dayEl) as Element | undefined;
  const dayOutput = GENERATES[dayEl];
  const dayWealth = RESTRAINS[dayEl];
  const yin = FED_BY[dayEl];
  const usefulCandidates: Element[] = strength === '偏强'
    ? [dayRestrained ?? dayWealth, dayOutput, dayWealth]
    : strength === '偏弱'
      ? [yin, dayEl]
      : [...missing, yin];
  const usefulGods = Array.from(new Set(usefulCandidates.filter(Boolean))).slice(0, 2);
  const usefulNote = strength === '偏强'
    ? '扶抑初判：身偏强，优先取克泄耗（官杀/食伤/财）中在盘里偏弱的一项。'
    : strength === '偏弱'
      ? '扶抑初判：身偏弱，优先取印比（生我/同我）中能补根的一项。'
      : '扶抑初判：偏中和，先看调候与格局，不宜只凭缺什么补什么。';

  const allGods = rawPillars.flatMap((p) => [p.tg, ...(p.htg ?? [])]).filter(Boolean);
  const spouseStar: '财' | '官' = (gender ?? input.gender) === '男' ? '财' : '官';
  const spouseStars = allGods.filter((g) => spouseStar === '财' ? g.includes('财') : g.includes('官') || g.includes('杀'));
  const shenSha = shenShaOf(dayStem, rawPillars.map((p) => p.z));

  return {
    name,
    gender: gender ?? input.gender,
    solarText: solar.toYmdHms(),
    lunarText: lunar.toString(),
    eightChar: ec.toString(),
    pillars,
    dayMaster: dayStem,
    dayMasterEl: dayEl,
    counts,
    missing,
    strength,
    usefulGods,
    usefulNote,
    spouseStar,
    spouseStars,
    shenSha,
    taiYuan: ec.getTaiYuan?.() ?? '—',
    mingGong: ec.getMingGong?.() ?? '—',
    shenGong: ec.getShenGong?.() ?? '—',
    caveat: '藏干/十神/十二长生/纳音/空亡来自 lunar-typescript；用神为扶抑初判，神煞为常用简表，未纳格局、调候、旺衰细节，不能替代完整八字师承。',
  };
}

export function baziDaily(profile: BaziProfile, date: string): {
  dayPillar: string;
  tenGod: string;
  relation: string;
  clash: string;
  advice: string;
} {
  const [y, m, d] = date.split('-').map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const day = solar.getLunar().getDayGan() + solar.getLunar().getDayZhi();
  const dayGan = solar.getLunar().getDayGan();
  const dayZhi = solar.getLunar().getDayZhi();
  const god = tenGod(profile.dayMaster, dayGan);
  const natalDayZhi = profile.pillars[2]?.branch ?? '';
  const relation = dayZhi === natalDayZhi ? '伏吟' : '无直接合冲';
  const clash = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].some((p) => p.includes(dayZhi) && p.includes(natalDayZhi)) ? '日支相冲' : '';
  const advice = clash
    ? '今天日支冲夫妻宫：节奏容易被打断，重要沟通先约时间，别在情绪高点处理关系议题。'
    : god.includes('财')
      ? '今天走财星主题：适合对账、谈钱、做具体交付；不要用消费来缓解焦虑。'
      : god.includes('食') || god.includes('伤')
        ? '今天走食伤主题：表达与创意顺，但别把直率当成不必负责。'
        : god.includes('官') || god.includes('杀')
          ? '今天走官杀主题：适合处理责任、规则与上级沟通；先确认标准再动手。'
          : god.includes('印')
            ? '今天走印星主题：适合学习、复盘、补资料；少做临时起意的大决定。'
            : '今天比劫主题：适合推进自己的事，注意合作里的钱与边界。';
  return { dayPillar: day, tenGod: god, relation: clash || relation, clash, advice };
}
