// 宫位在本限中的加权：本命 50% + 大限 20% + 流年 15% + 流月 10% + 流日 5%。
// 只做结构加权，不替代四化/煞忌的人工判断。

import type { Astrolabe } from '../types';
import { buildPalaceSnapshot } from './report';
import { LAYER_META, type ActiveLayers, type LayeredData, type LayerScope } from './scope';

export type WeightedLayer = {
  scope: LayerScope | 'natal';
  label: string;
  weight: number;
  score: number;
  stars: string[];
  mutagens: string[];
  note: string;
};

export type WeightedPalace = {
  palace: string;
  total: number;
  label: string;
  layers: WeightedLayer[];
};

const BASE_WEIGHT = 0.5;
const LAYER_WEIGHTS: Record<LayerScope, number> = { decadal: 0.2, yearly: 0.15, monthly: 0.1, daily: 0.05, age: 0, hourly: 0 };

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function findLanding(a: Astrolabe, star: string): string | undefined {
  return a.palaces.find((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star))?.name;
}

function luckyName(name: string): boolean {
  return ['昌', '曲', '魁', '钺', '禄', '喜', '辅', '弼', '马'].some((x) => name.includes(x));
}

function shaName(name: string): boolean {
  return ['羊', '陀', '火', '铃', '空', '劫'].some((x) => name.includes(x));
}

export function weightedPalace(
  astrolabe: Astrolabe,
  palace: string,
  layered: LayeredData | null,
  active: ActiveLayers,
): WeightedPalace | null {
  if (!layered) return null;
  const snapshot = buildPalaceSnapshot(astrolabe, palace, false);
  const baseScore = clamp(50 + snapshot.score.value * 30);
  const layers: WeightedLayer[] = [{
    scope: 'natal',
    label: '本命',
    weight: BASE_WEIGHT,
    score: baseScore,
    stars: snapshot.stars.slice(0, 5).map((s) => s.name),
    mutagens: snapshot.natal.map((n) => `${n.star}化${n.mutagen}`),
    note: `本命宫位基础：${snapshot.palace.label}，吉煞分 ${snapshot.score.value}`,
  }];

  const scopes: LayerScope[] = [];
  if (active.decadal != null) scopes.push('decadal');
  if (active.yearly != null) scopes.push('yearly');
  if (active.monthly != null) scopes.push('monthly');
  if (active.daily != null) scopes.push('daily');

  scopes.forEach((scope) => {
    const stars = (layered.palaces[palace] ?? []).filter((s) => s.scope === scope).map((s) => s.name);
    const mutagens = layered.mutagens.filter((m) => m.scope === scope && findLanding(astrolabe, m.star) === palace);
    let score = 50;
    stars.forEach((s) => { if (luckyName(s)) score += 3; if (shaName(s)) score -= 4; });
    mutagens.forEach((m) => {
      score += m.mutagen === '禄' ? 8 : m.mutagen === '权' ? 5 : m.mutagen === '科' ? 4 : -8;
    });
    layers.push({
      scope,
      label: LAYER_META[scope].label,
      weight: LAYER_WEIGHTS[scope],
      score: clamp(score),
      stars,
      mutagens: mutagens.map((m) => `${m.star}化${m.mutagen}`),
      note: stars.length || mutagens.length
        ? `${LAYER_META[scope].label}落${palace}：流曜 ${stars.join('、') || '—'}${mutagens.length ? `；四化 ${mutagens.map((m) => `${m.star}化${m.mutagen}`).join('、')}` : ''}`
        : `${LAYER_META[scope].label}未直接落在${palace}，此层按中性处理。`,
    });
  });

  const totalWeight = layers.reduce((s, l) => s + l.weight, 0);
  const total = Math.round(layers.reduce((s, l) => s + l.score * l.weight, 0) / totalWeight);
  const label = total >= 68 ? '偏强' : total >= 52 ? '中性' : '偏弱';
  return {
    palace,
    total,
    label,
    layers: layers.map((l) => ({ ...l, weight: Math.round((l.weight / totalWeight) * 100) })),
  };
}
