// 八字合盘：四柱天干地支、日主、夫妻宫、合冲害与五行互补。
// 只用主气，不纳藏干/旺衰/用神/大运，属于结构层参考。

import type { Astrolabe } from '../types';

export type BaziPillar = { stem: string; branch: string; stemEl: Element; branchEl: Element };
export type Element = '木' | '火' | '土' | '金' | '水';

export type BaziPerson = {
  name: string;
  gender: '男' | '女';
  pillars: BaziPillar[];
  dayMaster: string;
  dayMasterEl: Element;
  counts: Record<Element, number>;
  missing: Element[];
  spouseStar: '财' | '官';
  spouseStars: string[];
};

export type BaziInteraction = { type: '六合' | '三合' | '六冲' | '相害' | '天干合'; a: string; b: string; score: number; note: string };

export type BaziDimension = { label: string; score: number; weight: number; note: string };

export type BaziSynastry = {
  score: number;
  grade: string;
  a: BaziPerson;
  b: BaziPerson;
  interactions: BaziInteraction[];
  dimensions: BaziDimension[];
  advice: string[];
  summary: string;
  caveat: string;
};

const STEM_EL: Record<string, Element> = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
const BRANCH_EL: Record<string, Element> = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const STEM_YANG: Record<string, boolean> = { 甲: true, 乙: false, 丙: true, 丁: false, 戊: true, 己: false, 庚: true, 辛: false, 壬: true, 癸: false };
const GENERATES: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const RESTRAINS: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const HE_6 = ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'];
const CHONG = ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'];
const HAI = ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'];
const SAN_HE = [['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑']];
const STEM_HE = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

function parse(input: string): BaziPillar[] {
  return input.trim().split(/\s+/).filter(Boolean).slice(0, 4).map((t) => ({
    stem: t[0] ?? '',
    branch: t[1] ?? '',
    stemEl: STEM_EL[t[0]] ?? '土',
    branchEl: BRANCH_EL[t[1]] ?? '土',
  }));
}

function counts(pillars: BaziPillar[]): Record<Element, number> {
  const c: Record<Element, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p) => { c[p.stemEl]++; c[p.branchEl]++; });
  return c;
}

function tenGod(day: string, other: string): string {
  const de = STEM_EL[day];
  const oe = STEM_EL[other];
  if (!de || !oe) return '';
  const samePolarity = STEM_YANG[day] === STEM_YANG[other];
  if (de === oe) return samePolarity ? '比肩' : '劫财';
  if (GENERATES[oe] === de) return samePolarity ? '偏印' : '正印';
  if (GENERATES[de] === oe) return samePolarity ? '食神' : '伤官';
  if (RESTRAINS[de] === oe) return samePolarity ? '偏财' : '正财';
  if (RESTRAINS[oe] === de) return samePolarity ? '七杀' : '正官';
  return '';
}

function buildPerson(name: string, gender: '男' | '女', chineseDate: string): BaziPerson {
  const pillars = parse(chineseDate);
  const dayMaster = pillars[2]?.stem ?? '';
  const dayMasterEl = STEM_EL[dayMaster] ?? '土';
  const c = counts(pillars);
  const otherStems = pillars.filter((_, i) => i !== 2).map((p) => p.stem);
  const gods = otherStems.map((s) => tenGod(dayMaster, s)).filter(Boolean);
  const spouseStar: '财' | '官' = gender === '男' ? '财' : '官';
  const spouseStars = gods.filter((g) => (spouseStar === '财' ? g.includes('财') : g.includes('官') || g.includes('杀')));
  return {
    name,
    gender,
    pillars,
    dayMaster,
    dayMasterEl,
    counts: c,
    missing: ELEMENTS.filter((e) => c[e] === 0),
    spouseStar,
    spouseStars,
  };
}

function hasPair(a: string, b: string, list: string[]): boolean {
  return list.includes(`${a}${b}`) || list.includes(`${b}${a}`);
}

function interactionScore(type: BaziInteraction['type']): number {
  switch (type) {
    case '六合': return 12;
    case '三合': return 10;
    case '天干合': return 8;
    case '六冲': return -14;
    case '相害': return -7;
  }
}

function buildInteractions(a: BaziPerson, b: BaziPerson): BaziInteraction[] {
  const out: BaziInteraction[] = [];
  const seen = new Set<string>();
  for (const pa of a.pillars) {
    for (const pb of b.pillars) {
      let type: BaziInteraction['type'] | null = null;
      if (hasPair(pa.branch, pb.branch, HE_6)) type = '六合';
      else if (hasPair(pa.branch, pb.branch, CHONG)) type = '六冲';
      else if (hasPair(pa.branch, pb.branch, HAI)) type = '相害';
      else if (hasPair(pa.stem, pb.stem, STEM_HE)) type = '天干合';
      if (!type) continue;
      const key = `${type}-${pa.stem}${pa.branch}-${pb.stem}${pb.branch}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ type, a: `${pa.stem}${pa.branch}`, b: `${pb.stem}${pb.branch}`, score: interactionScore(type), note: `${type}：${pa.stem}${pa.branch} × ${pb.stem}${pb.branch}` });
    }
  }
  const allBranches = new Set([...a.pillars.map((p) => p.branch), ...b.pillars.map((p) => p.branch)]);
  SAN_HE.forEach((tri) => {
    if (tri.every((x) => allBranches.has(x))) {
      out.push({ type: '三合', a: tri.join(''), b: '双方四柱', score: interactionScore('三合'), note: `三合：${tri.join('、')}会齐，关系里的共同议题会被放大` });
    }
  });
  return out;
}

export function compareBazi(a: Astrolabe, b: Astrolabe, aName: string, bName: string): BaziSynastry {
  const pa = buildPerson(aName, a.gender === '女' ? '女' : '男', a.chineseDate);
  const pb = buildPerson(bName, b.gender === '女' ? '女' : '男', b.chineseDate);
  const relations = (() => {
    const ae = pa.dayMasterEl;
    const be = pb.dayMasterEl;
    if (ae === be) return { score: 82, label: '同日主五行' };
    if (GENERATES[be] === ae) return { score: 88, label: '对方生你' };
    if (GENERATES[ae] === be) return { score: 74, label: '你生对方' };
    if (RESTRAINS[ae] === be) return { score: 56, label: '你克对方' };
    return { score: 48, label: '对方克你' };
  })();

  const interactions = buildInteractions(pa, pb);
  const dayA = pa.pillars[2]?.branch ?? '';
  const dayB = pb.pillars[2]?.branch ?? '';
  const dayIsHe = hasPair(dayA, dayB, HE_6);
  const dayIsChong = hasPair(dayA, dayB, CHONG);
  const dayIsHai = hasPair(dayA, dayB, HAI);
  const dayScore = dayIsHe ? 86 : dayIsChong ? 50 : dayIsHai ? 56 : 68;

  const heCount = interactions.filter((i) => i.type === '六合' || i.type === '三合' || i.type === '天干合').length;
  const clashCount = interactions.filter((i) => i.type === '六冲').length;
  const haiCount = interactions.filter((i) => i.type === '相害').length;
  const interactionScoreVal = Math.max(30, Math.min(92, 62 + heCount * 5 - clashCount * 7 - haiCount * 4));

  const complement = (() => {
    let score = 55;
    ELEMENTS.forEach((e) => {
      if (pa.counts[e] === 0 && pb.counts[e] >= 2) score += 4;
      if (pb.counts[e] === 0 && pa.counts[e] >= 2) score += 4;
      if (pa.counts[e] >= 4 && pb.counts[e] <= 1) score += 2;
    });
    return Math.min(92, score);
  })();

  const spouseScore = Math.max(30, Math.min(90, 58 + Math.min(2, pa.spouseStars.length + pb.spouseStars.length) * 8));
  const dimensions: BaziDimension[] = [
    { label: '日主相性', score: relations.score, weight: 20, note: `${pa.dayMaster}（${pa.dayMasterEl}） × ${pb.dayMaster}（${pb.dayMasterEl}）：${relations.label}` },
    { label: '夫妻宫', score: dayScore, weight: 30, note: `日支 ${dayA || '—'} × ${dayB || '—'}：${dayIsHe ? '六合' : dayIsChong ? '六冲' : dayIsHai ? '相害' : '无明显合冲'}` },
    { label: '地支互动', score: interactionScoreVal, weight: 25, note: `合 ${heCount} · 冲 ${clashCount} · 害 ${haiCount}` },
    { label: '五行互补', score: complement, weight: 15, note: `缺失：${pa.missing.join('、') || '无'} / ${pb.missing.join('、') || '无'}` },
    { label: '十神需求', score: spouseScore, weight: 10, note: `配偶星：${pa.spouseStar} / ${pb.spouseStar}；${pa.spouseStars.length} + ${pb.spouseStars.length} 个` },
  ];
  const score = Math.max(30, Math.min(95, Math.round(dimensions.reduce((s, d) => s + d.score * d.weight / 100, 0))));
  const grade = score >= 84 ? '结构相合' : score >= 70 ? '可磨合' : score >= 56 ? '需要经营' : '张力较大';

  const advice = [
    dayIsChong
      ? `日支${dayA} × ${dayB}见冲：冲突时不要用冷处理逼对方先低头，先约定「暂停—复述—再回应」的流程。`
      : dayIsHe
        ? `日支${dayA} × ${dayB}见合：容易亲近，但也会黏在一起；保留各自空间，反而更长久。`
        : `日支${dayA} × ${dayB}没有明显合冲：关系更依赖日常经营，不要把「没感觉」误判为「不合适」。`,
    clashCount >= 2
      ? '合盘里冲多于合：你们容易被彼此触发，但冲也代表高互动；把争议落到具体安排，不要争谁对谁错。'
      : '合盘以合作为主：别把舒服当成不需要沟通，定期对齐钱、时间、家务与边界。',
    `A 日主 ${pa.dayMaster}${pa.dayMasterEl}，B 日主 ${pb.dayMaster}${pb.dayMasterEl}：${relations.label}；${relations.score >= 80 ? '互相生扶，适合一起做长期事' : relations.score >= 60 ? '有补有耗，先把节奏说清楚' : '需要主动调频，避免用自己的标准要求对方'}。`,
    '八字只看四柱主气，未纳藏干、旺衰、用神与大运；不要用单一合冲断关系好坏。',
  ];

  return {
    score,
    grade,
    a: pa,
    b: pb,
    interactions,
    dimensions,
    advice,
    summary: `${pa.name} 日主 ${pa.dayMaster}${pa.dayMasterEl}，${pb.name} 日主 ${pb.dayMaster}${pb.dayMasterEl}；日支 ${dayA} × ${dayB}，${dayIsHe ? '见六合' : dayIsChong ? '见六冲' : dayIsHai ? '见相害' : '无直接合冲'}。整体${grade}，重点在${dayIsChong ? '冲突后的修复' : '日常经营与边界'}。`,
    caveat: '八字合盘只取四柱天干地支主气，未纳藏干、旺衰、用神、大运与流年；结构参考，不替代真实相处。',
  };
}

export function baziSynastryText(r: BaziSynastry): string {
  return [
    `【八字合盘】${r.a.name} × ${r.b.name}`,
    `八字分 ${r.score} · ${r.grade}`,
    `${r.a.name}：${r.a.pillars.map((p) => `${p.stem}${p.branch}`).join(' ')}｜日主 ${r.a.dayMaster}${r.a.dayMasterEl}`,
    `${r.b.name}：${r.b.pillars.map((p) => `${p.stem}${p.branch}`).join(' ')}｜日主 ${r.b.dayMaster}${r.b.dayMasterEl}`,
    '',
    '【分项】',
    ...r.dimensions.map((d) => `· ${d.label}：${d.score}/100 × ${d.weight}%｜${d.note}`),
    '',
    '【合冲】',
    ...(r.interactions.length ? r.interactions.map((i) => `· ${i.type}：${i.a} × ${i.b}`) : ['· 未见明显合冲']),
    '',
    '【建议】',
    ...r.advice.map((a) => `· ${a}`),
    '',
    r.caveat,
  ].join('\n');
}
