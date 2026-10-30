// 运限报告引擎：本命为底色，大限/流年/流月/流日为分层视图。
// 统一输出「摘要 → 时间定位 → 叠宫 → 分领域 → 窗口 → 行动/边界 → 证据」。

import type { Astrolabe, BirthInput, ChartOptions, Palace } from '../types';
import {
  daysInMonth,
  getDecadalYearRange,
  getScopeData,
  type ActiveLayers,
  type ScopeData,
} from './scope';

export type ReportLevel = 'decadal' | 'yearly' | 'monthly' | 'daily';
export type LayerKey = 'natal' | ReportLevel;

export const REPORT_LABEL: Record<ReportLevel, string> = {
  decadal: '大限报告',
  yearly: '流年报告',
  monthly: '流月报告',
  daily: '流日报告',
};

const LEVEL_LABEL: Record<ReportLevel, string> = {
  decadal: '十年主题',
  yearly: '年度节奏',
  monthly: '月度窗口',
  daily: '当日提醒',
};

const LAYER_NAME: Record<LayerKey, string> = {
  natal: '本命',
  decadal: '大限',
  yearly: '流年',
  monthly: '流月',
  daily: '流日',
};

const BASE_WEIGHTS: Record<LayerKey, number> = {
  natal: 0.5,
  decadal: 0.2,
  yearly: 0.15,
  monthly: 0.1,
  daily: 0.05,
};

const LUCKY = ['昌', '曲', '魁', '钺', '禄', '喜', '辅', '弼', '马'];
const SHA = ['羊', '陀', '火', '铃', '空', '劫'];

export type LayerInfo = {
  key: LayerKey;
  label: string;
  weight: number;
  data: ScopeData | null;
};

export type ChainRow = {
  layer: LayerKey;
  layerLabel: string;
  flowPalace: string;
  basePalace: string;
};

export type OverlapRow = {
  basePalace: string;
  cells: { layer: LayerKey; label: string; flowPalace: string }[];
};

export type SurroundRow = {
  role: string;
  basePalace: string;
  flowPalace: string;
  stars: string[];
};

export type TransformRow = {
  layer: LayerKey;
  layerLabel: string;
  star: string;
  mutagen: string;
  basePalace: string;
  flowPalace: string;
};

export type DomainInsight = {
  key: string;
  label: string;
  basePalace: string;
  score: number;
  level: '机会' | '观察' | '压力';
  stars: string[];
  mutagens: string[];
  evidence: string;
  advice: string;
  boundary: string;
};

export type WindowInsight = {
  label: string;
  type: '机会' | '压力' | '观察';
  note: string;
};

export type ScopeReport = {
  level: ReportLevel;
  reportLabel: string;
  levelLabel: string;
  periodTitle: string;
  subject: string;
  oneLine: string;
  theme: string;
  layers: LayerInfo[];
  chain: ChainRow[];
  overlapRows: OverlapRow[];
  surroundings: SurroundRow[];
  focusPalace: string;
  focusStars: string[];
  focusFlowStars: string[];
  transforms: TransformRow[];
  domains: DomainInsight[];
  opportunities: DomainInsight[];
  risks: DomainInsight[];
  windows: WindowInsight[];
  actions: string[];
  observables: string[];
  boundaries: string[];
  parameters: { label: string; value: string }[];
  evidence: string[];
  caveat: string;
};

const DOMAINS: { key: string; flow: string; label: string; advice: string; boundary: string }[] = [
  { key: 'self', flow: '命宫', label: '自我与决策', advice: '先把决定权收回自己：重要选择写清标准，再听意见。', boundary: '不把一时情绪当成长期结论。' },
  { key: 'career', flow: '官禄', label: '事业与责任', advice: '把事业机会写成可交付的计划：目标、资源、截止时间。', boundary: '不因短期压力仓促换赛道。' },
  { key: 'wealth', flow: '财帛', label: '财务与资源', advice: '先看现金流与预算，再谈扩张；大额支出留缓冲。', boundary: '不把命理提示当作投资依据。' },
  { key: 'love', flow: '夫妻', label: '亲密与合作', advice: '把期待说成具体请求，重要约定落到书面或明确时间。', boundary: '不用合盘/流日替代真实沟通。' },
  { key: 'spirit', flow: '福德', label: '精神与休息', advice: '给恢复留固定时间；情绪高时不做重大决定。', boundary: '持续失眠或情绪困扰请寻求专业帮助。' },
  { key: 'move', flow: '迁移', label: '外部与出行', advice: '外部机会先小步验证；出行、异地事务留出缓冲。', boundary: '不凭单日提示决定搬迁或远行。' },
  { key: 'health', flow: '疾厄', label: '身心与作息', advice: '把作息、运动、复查当成可执行日程，而不是口号。', boundary: '本报告不作医学诊断或治疗建议。' },
  { key: 'home', flow: '田宅', label: '家庭与资产', advice: '家庭资产与居所事务先对齐预算、产权与责任分工。', boundary: '不把流日小触发当作置业/卖房依据。' },
];

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isLucky(name: string): boolean {
  return LUCKY.some((x) => name.includes(x));
}

function isSha(name: string): boolean {
  return SHA.some((x) => name.includes(x));
}

function natalStars(p: Palace): string[] {
  return [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map((s) => s.name);
}

function findLanding(a: Astrolabe, star: string): string | undefined {
  return a.palaces.find((p) => natalStars(p).includes(star))?.name;
}

function baseForFlow(data: ScopeData | null, flow: string): string | undefined {
  if (!data) return flow;
  const hit = Object.entries(data.flowPalaceByBase).find(([, f]) => f === flow);
  return hit?.[0] ?? flow;
}

function focusLevel(active: ActiveLayers): ReportLevel | null {
  if (active.daily) return 'daily';
  if (active.monthly != null) return 'monthly';
  if (active.yearly != null) return 'yearly';
  if (active.decadal != null) return 'decadal';
  return null;
}

function getData(raw: Record<string, unknown>, level: ReportLevel, active: ActiveLayers): ScopeData | null {
  try {
    if (level === 'decadal') return getScopeData(raw as never, 'decadal', { decadalIndex: active.decadal ?? 0 });
    if (level === 'yearly') return getScopeData(raw as never, 'yearly', { targetDate: `${active.yearly}-06-15` });
    if (level === 'monthly') return getScopeData(raw as never, 'monthly', { targetDate: `${active.yearly}-${String(active.monthly).padStart(2, '0')}-15` });
    if (level === 'daily') return getScopeData(raw as never, 'daily', { targetDate: active.daily ?? undefined });
  } catch {
    return null;
  }
  return null;
}

function buildLayers(raw: Record<string, unknown>, active: ActiveLayers): LayerInfo[] {
  const keys: LayerKey[] = ['natal'];
  if (active.decadal != null) keys.push('decadal');
  if (active.yearly != null) keys.push('yearly');
  if (active.monthly != null && active.yearly != null) keys.push('monthly');
  if (active.daily) keys.push('daily');
  const total = keys.reduce((s, k) => s + BASE_WEIGHTS[k], 0);
  return keys.map((key) => ({
    key,
    label: LAYER_NAME[key],
    weight: Math.round((BASE_WEIGHTS[key] / total) * 100),
    data: key === 'natal' ? null : getData(raw, key, active),
  }));
}

function domainScore(a: Astrolabe, layers: LayerInfo[], base: string): {
  score: number;
  stars: string[];
  mutagens: string[];
  evidence: string;
} {
  let total = 0;
  const stars: string[] = [];
  const mutagens: string[] = [];
  const evidence: string[] = [];
  layers.forEach((layer) => {
    let s = 50;
    let layerStars: string[] = [];
    if (layer.key === 'natal') {
      const p = a.palaces.find((x) => x.name === base);
      layerStars = p ? natalStars(p) : [];
      const natalHua = p ? [...p.majorStars, ...p.minorStars].filter((x) => x.mutagen).map((x) => `${x.name}化${x.mutagen}`) : [];
      layerStars.forEach((n) => { if (isLucky(n)) s += 3; if (isSha(n)) s -= 4; });
      natalHua.forEach((h) => {
        mutagens.push(h);
        s += h.endsWith('忌') ? -8 : h.endsWith('权') ? 5 : h.endsWith('科') ? 4 : 8;
      });
      evidence.push(`本命${base}：${layerStars.slice(0, 5).join('、') || '空宫'}`);
    } else if (layer.data) {
      layerStars = (layer.data.palaces[base] ?? []).map((x) => x.name);
      const flow = layer.data.flowPalaceByBase[base] ?? base;
      layerStars.forEach((n) => { if (isLucky(n)) s += 3; if (isSha(n)) s -= 4; });
      layer.data.mutagenMap.forEach((m) => {
        if (findLanding(a, m.star) === base) {
          const text = `${m.star}化${m.mutagen}`;
          mutagens.push(`${layer.label}${text}`);
          s += m.mutagen === '忌' ? -8 : m.mutagen === '权' ? 5 : m.mutagen === '科' ? 4 : 8;
        }
      });
      evidence.push(`${layer.label}${flow}叠本命${base}：${layerStars.slice(0, 5).join('、') || '空宫'}`);
    }
    stars.push(...layerStars);
    total += s * (layer.weight / 100);
  });
  return {
    score: clamp(total),
    stars: Array.from(new Set(stars)).slice(0, 8),
    mutagens: Array.from(new Set(mutagens)),
    evidence: evidence.join('；'),
  };
}

function windowSignal(a: Astrolabe, data: ScopeData | null): { type: WindowInsight['type']; note: string } {
  if (!data) return { type: '观察', note: '该层数据未取到，按中性处理。' };
  const keyFlows = ['命宫', '财帛', '官禄', '夫妻'];
  const keyBases = keyFlows.map((f) => baseForFlow(data, f)).filter(Boolean) as string[];
  let lu = 0;
  let ji = 0;
  data.mutagenMap.forEach((m) => {
    const base = findLanding(a, m.star);
    if (!base || !keyBases.includes(base)) return;
    if (m.mutagen === '禄') lu += 1;
    if (m.mutagen === '忌') ji += 1;
  });
  let sha = 0;
  keyBases.forEach((base) => {
    (data.palaces[base] ?? []).forEach((s) => { if (isSha(s.name)) sha += 1; });
  });
  if (ji > 0 || sha >= 2) {
    const parts = [ji ? '化忌' : '', sha ? `${sha} 个煞星` : ''].filter(Boolean);
    return { type: '压力', note: `关键宫见 ${parts.join(' + ')}，先守节奏、延后硬决定。` };
  }
  if (lu > 0) {
    return { type: '机会', note: '四化禄入关键宫，适合推进一件具体事；仍要留验收点。' };
  }
  return { type: '观察', note: '关键宫没有强触发，按既有节奏执行。' };
}

function buildWindows(raw: Record<string, unknown>, active: ActiveLayers, level: ReportLevel, a: Astrolabe): WindowInsight[] {
  try {
    if (level === 'decadal') {
      const range = active.decadal != null ? getDecadalYearRange(raw as never, active.decadal) : null;
      if (!range) return [];
      const rows = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i).map((year) => {
        const data = getScopeData(raw as never, 'yearly', { targetDate: `${year}-06-15` });
        return { label: `${year} 年`, ...windowSignal(a, data) };
      });
      return [...rows.filter((x) => x.type === '机会').slice(0, 2), ...rows.filter((x) => x.type === '压力').slice(0, 1)];
    }
    if (level === 'yearly') {
      const year = active.yearly;
      const rows = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const data = getScopeData(raw as never, 'monthly', { targetDate: `${year}-${String(month).padStart(2, '0')}-15` });
        return { label: `${month} 月`, ...windowSignal(a, data) };
      });
      return [...rows.filter((x) => x.type === '机会').slice(0, 2), ...rows.filter((x) => x.type === '压力').slice(0, 1)];
    }
    if (level === 'monthly' && active.yearly != null && active.monthly != null) {
      const total = daysInMonth(active.yearly, active.monthly);
      const rows = Array.from({ length: total }, (_, i) => i + 1).map((day) => {
        const data = getScopeData(raw as never, 'daily', { targetDate: `${active.yearly}-${String(active.monthly).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
        return { label: `${day} 日`, ...windowSignal(a, data) };
      });
      return [...rows.filter((x) => x.type === '机会').slice(0, 2), ...rows.filter((x) => x.type === '压力').slice(0, 1)];
    }
  } catch {
    return [];
  }
  return [];
}

function levelActions(level: ReportLevel): string[] {
  switch (level) {
    case 'decadal':
      return ['这十年先定一条主线；不要因为单年波动频繁改长期方向。', '把资源、关系、健康各写一条年度检查项，每年复盘一次。'];
    case 'yearly':
      return ['这一年只抓一条主线，把大限方向落成一个可交付目标。', '每季度复盘一次：什么在推进、什么该停。'];
    case 'monthly':
      return ['这个月先排优先级，再做时间安排；不要用一个月给关系或事业下终局判断。', '把重要沟通安排在状态稳定的时候，并留书面确认。'];
    case 'daily':
      return ['今天只做 1–3 件重要的事；先处理需要判断的，再处理琐碎的。', '重要沟通先确认对方状态；情绪高时不做不可逆决定。'];
  }
}

export function buildScopeReport(
  astrolabe: Astrolabe,
  raw: Record<string, unknown> | null,
  active: ActiveLayers,
  subject: string,
  input?: BirthInput,
  options?: ChartOptions,
): ScopeReport | null {
  if (!raw) return null;
  const level = focusLevel(active);
  if (!level) return null;
  const layers = buildLayers(raw, active);
  const focusLayer = layers[layers.length - 1];
  const focus = focusLayer.data;
  if (!focus) return null;
  const focusPalace = focus.scopePalaceName ?? '命宫';
  const natalPalace = astrolabe.palaces.find((p) => p.name === focusPalace);
  const focusNatalStars = natalPalace ? natalStars(natalPalace) : [];
  const focusFlowStars = (focus.palaces[focusPalace] ?? []).map((s) => s.name);

  const chain: ChainRow[] = layers.map((l) => ({
    layer: l.key,
    layerLabel: l.label,
    flowPalace: l.key === 'natal' ? focusPalace : (l.data?.flowPalaceByBase[focusPalace] ?? focusPalace),
    basePalace: focusPalace,
  }));

  const focusIndex = astrolabe.palaces.findIndex((p) => p.name === focusPalace);
  const surroundings: SurroundRow[] = [6, 4, 8].map((offset, i) => {
    const base = astrolabe.palaces[(Math.max(0, focusIndex) + offset) % 12]?.name ?? '—';
    const flow = focus.flowPalaceByBase[base] ?? base;
    const stars = (focus.palaces[base] ?? []).map((x) => x.name);
    const natal = astrolabe.palaces.find((p) => p.name === base);
    return {
      role: i === 0 ? '对宫' : '三合',
      basePalace: base,
      flowPalace: flow,
      stars: stars.length ? stars : (natal ? natalStars(natal).slice(0, 4) : []),
    };
  });

  const overlapRows: OverlapRow[] = astrolabe.palaces.map((p) => ({
    basePalace: p.name,
    cells: layers.map((l) => ({
      layer: l.key,
      label: l.label,
      flowPalace: l.key === 'natal' ? p.name : (l.data?.flowPalaceByBase[p.name] ?? '—'),
    })),
  }));

  const transforms: TransformRow[] = [];
  layers.forEach((l) => {
    if (l.key === 'natal') {
      astrolabe.palaces.forEach((p) => {
        [...p.majorStars, ...p.minorStars].forEach((s) => {
          if (s.mutagen) transforms.push({ layer: 'natal', layerLabel: '本命', star: s.name, mutagen: s.mutagen, basePalace: p.name, flowPalace: p.name });
        });
      });
    } else if (l.data) {
      l.data.mutagenMap.forEach((m) => {
        const base = findLanding(astrolabe, m.star) ?? '—';
        transforms.push({ layer: l.key, layerLabel: l.label, star: m.star, mutagen: m.mutagen, basePalace: base, flowPalace: l.data?.flowPalaceByBase[base] ?? base });
      });
    }
  });

  const domains: DomainInsight[] = DOMAINS.map((d) => {
    const base = baseForFlow(focus, d.flow) ?? d.flow;
    const detail = domainScore(astrolabe, layers, base);
    const levelWord = detail.score >= 62 ? '机会' : detail.score <= 48 ? '压力' : '观察';
    return {
      key: d.key,
      label: d.label,
      basePalace: base,
      score: detail.score,
      level: levelWord,
      stars: detail.stars,
      mutagens: detail.mutagens,
      evidence: detail.evidence,
      advice: d.advice,
      boundary: d.boundary,
    };
  });
  const opportunities = [...domains].sort((a, b) => b.score - a.score).filter((d) => d.score >= 52).slice(0, 3);
  const risks = [...domains].sort((a, b) => a.score - b.score).filter((d) => d.score <= 54).slice(0, 2);
  const top = opportunities[0] ?? domains[0];
  const risk = risks[0] ?? domains[domains.length - 1];
  const periodTitle =
    level === 'decadal'
      ? focus.label.replace(/^大限\s*/, '')
      : level === 'yearly'
        ? `${active.yearly} 年`
        : level === 'monthly'
          ? `${active.yearly} 年 ${active.monthly} 月`
          : active.daily ?? '流日';
  const levelLabel = LEVEL_LABEL[level];
  const theme = `${top.label}为主，${risk.label}留缓冲`;
  const oneLine = `${subject} · ${periodTitle}：${theme}。这是${levelLabel}的结构提示，不是事件判决。`;
  const actions = Array.from(new Set([
    levelActions(level)[0],
    top.advice,
    risk.boundary ? `${risk.label}：${risk.boundary}` : levelActions(level)[1],
  ])).slice(0, 3);
  const boundaries = [
    '可用于自我复盘、沟通准备与日程安排；不可用于医疗诊断、法律、投资、婚姻/雇佣等专业决策。',
    '大限定十年舞台，流年定年度主题，流月定节奏，流日只做当天触发；下层不覆盖上层。',
    '报告不保证事件发生，也不替代现实信息、专业意见与当事人的选择。',
  ];
  const observables = [
    `在${periodTitle}内，记录与「${top.label}」相关的 1 个实际机会和 1 个实际阻力，按时间顺序写下来复盘。`,
    `如果「${risk.label}」出现卡点或冲突，先用报告里的边界处理，再观察结果是否与结构提示一致。`,
    `每月/每季度回看一次：哪些建议被执行、哪些条件没有成立；用现实反馈校准，而不是用报告给自己下结论。`,
  ];
  const parameters = [
    { label: '制作日期', value: new Date().toLocaleDateString('zh-CN') },
    ...(input ? [
      { label: '出生', value: `${input.birthday} ${input.clockTime} · ${input.useTrueSolar ? '真太阳时' : '钟表时间'}` },
      { label: '出生地', value: `经度 ${input.longitude}°E / 纬度 ${input.latitude ?? 30}°N` },
    ] : []),
    { label: '本命', value: `${astrolabe.solarDate} · ${astrolabe.chineseDate}` },
    { label: '五行局', value: astrolabe.fiveElementsClass },
    { label: '命主 / 身主', value: `${astrolabe.soul} / ${astrolabe.body}` },
    { label: '当前大限', value: layers.find((l) => l.key === 'decadal')?.data?.label ?? '未选' },
    { label: '当前流年', value: active.yearly ? `${active.yearly} 年` : '未选' },
    { label: '当前流月', value: active.monthly ? `${active.yearly} 年 ${active.monthly} 月` : '未选' },
    { label: '当前流日', value: active.daily ?? '未选' },
    ...(options ? [{
      label: '排盘口径',
      value: `iztro · ${options.algorithm === 'zhongzhou' ? '中州派' : '默认派'} · 年分${options.yearDivide === 'exact' ? '立春' : '正月初一'} · ${options.horoscopeDivide === 'exact' ? '精确换限' : '常规换限'}`,
    }] : []),
  ];

  return {
    level,
    reportLabel: REPORT_LABEL[level],
    levelLabel,
    periodTitle,
    subject,
    oneLine,
    theme,
    layers,
    chain,
    overlapRows,
    surroundings,
    focusPalace,
    focusStars: focusNatalStars,
    focusFlowStars,
    transforms,
    domains,
    opportunities,
    risks,
    windows: buildWindows(raw, active, level, astrolabe),
    actions,
    observables,
    boundaries,
    parameters,
    evidence: [
      `本命命宫：${astrolabe.palaces.find((p) => p.name === '命宫')?.name ?? '命宫'}；当前${LAYER_NAME[level]}命宫落本命${focusPalace}`,
      ...chain.map((c) => `${c.layerLabel}：${c.flowPalace}叠本命${c.basePalace}`),
      ...transforms.slice(0, 6).map((t) => `${t.layerLabel}${t.star}化${t.mutagen}落${t.basePalace}（${t.flowPalace}）`),
    ],
    caveat: '紫微斗数为传统文化咨询工具，报告只呈现结构与条件，不构成医疗、法律、财务、心理或婚姻决策建议；不作绝对化、恐吓式断语。',
  };
}
