// 盘面层级（运限）数据层：从 iztro 的 horoscope() / decadalList() 提取
// 本命/大限/小限/流年/流月/流日/流时 的流耀与四化，供界面叠加展示。

import type { Palace } from '../types';

export type ScopeKey =
  | 'original'
  | 'decadal'
  | 'age'
  | 'yearly'
  | 'monthly'
  | 'daily'
  | 'hourly';

export const SCOPE_LABELS: Record<ScopeKey, string> = {
  original: '本命',
  decadal: '大限',
  age: '小限',
  yearly: '流年',
  monthly: '流月',
  daily: '流日',
  hourly: '流时',
};

export type ScopeStar = { name: string; type: string };

export type ScopeData = {
  scope: ScopeKey;
  label: string;
  heavenlyStem: string;
  earthlyBranch: string;
  /** 本命星 → 四化（禄/权/科/忌） */
  mutagenMap: { star: string; mutagen: string }[];
  /** 宫位名 → 该宫运限流耀 */
  palaces: Record<string, ScopeStar[]>;
  /** 需要高亮的宫位（如小限宫） */
  highlightPalace?: string;
  /** 小限虚岁（仅小限层级） */
  nominalAge?: number;
  /** 该层运限命宫落在本命盘的宫位 index */
  scopePalaceIndex?: number;
  /** 该层运限命宫落在本命盘的宫位名 */
  scopePalaceName?: string;
  /** 本命宫位名 → 该层运限宫位名（如本命命宫 → 流年财帛） */
  flowPalaceByBase: Record<string, string>;
};

const MUTAGEN_ORDER = ['禄', '权', '科', '忌'];

function extractItem(
  item: Record<string, unknown>,
  scope: ScopeKey,
  label: string,
  basePalaces: Palace[],
  extra: { highlightPalace?: string; nominalAge?: number } = {},
): ScopeData {
  const palaceNames = (item?.palaceNames as string[]) ?? [];
  const stars = (item?.stars as Record<string, unknown>[][]) ?? [];
  const mutagen = (item?.mutagen as string[]) ?? [];
  const scopeIndex = Number(item?.index);

  const mutagenMap = mutagen.map((star, i) => ({ star, mutagen: MUTAGEN_ORDER[i] ?? '禄' }));

  // 注意：palaceNames[i] 是该层「运限宫位名」，stars[i] 落在本命第 i 宫。
  // 因此这里按本命宫位名归档，供盘面/卡片按本命宫名读取流耀。
  const palaces: Record<string, ScopeStar[]> = {};
  const flowPalaceByBase: Record<string, string> = {};
  basePalaces.forEach((p, i) => {
    palaces[p.name] = (stars[i] ?? []).map((s) => ({
      name: String(s.name ?? ''),
      type: String(s.type ?? ''),
    }));
    flowPalaceByBase[p.name] = palaceNames[i] ?? '';
  });

  const scopePalaceName =
    Number.isFinite(scopeIndex) && scopeIndex >= 0 && scopeIndex < basePalaces.length
      ? basePalaces[scopeIndex].name
      : undefined;

  return {
    scope,
    label,
    heavenlyStem: String(item?.heavenlyStem ?? ''),
    earthlyBranch: String(item?.earthlyBranch ?? ''),
    mutagenMap,
    palaces,
    highlightPalace: extra.highlightPalace,
    nominalAge: extra.nominalAge,
    scopePalaceIndex: Number.isFinite(scopeIndex) ? scopeIndex : undefined,
    scopePalaceName,
    flowPalaceByBase,
  };
}

/** 本命盘四化表（从本命宫位星曜的 mutagen 字段汇总） */
export function getBaseMutagenMap(palaces: Palace[]): { star: string; mutagen: string }[] {
  const map: { star: string; mutagen: string }[] = [];
  palaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      if (s.mutagen && s.mutagen !== '') map.push({ star: s.name, mutagen: s.mutagen });
    });
  });
  return map;
}

/** 大限列表（用于大限选择器） */
export function getDecadalOptions(raw: { decadalList: () => Record<string, unknown>[] }): {
  index: number;
  label: string;
}[] {
  try {
    return raw.decadalList().map((d, i) => {
      const r = d as { palaceName?: string; ageRange?: [number, number]; heavenlyStem?: string; earthlyBranch?: string };
      return {
        index: i,
        label: `${r.palaceName ?? ''} ${r.ageRange?.[0] ?? ''}–${r.ageRange?.[1] ?? ''}岁 ${r.heavenlyStem ?? ''}${r.earthlyBranch ?? ''}`,
      };
    });
  } catch {
    return [];
  }
}

/**
 * 提取指定层级的运限数据。
 * - original：本命盘（无流耀，四化取自本命宫位）
 * - decadal：从 decadalList 选第 decadalIndex 个大限
 * - 其余：从 horoscope(targetDate, targetTimeIndex) 取对应层级
 */
export function getScopeData(
  raw: {
    palaces: Palace[];
    decadalList: () => Record<string, unknown>[];
    horoscope: (date?: string | Date, timeIndex?: number) => Record<string, unknown>;
  },
  scope: ScopeKey,
  opts: { decadalIndex?: number; targetDate?: string; targetTimeIndex?: number } = {},
): ScopeData {
  if (scope === 'original') {
    return {
      scope,
      label: '本命盘',
      heavenlyStem: '',
      earthlyBranch: '',
      mutagenMap: getBaseMutagenMap(raw.palaces),
      palaces: {},
      flowPalaceByBase: {},
    };
  }

  if (scope === 'decadal') {
    const list = raw.decadalList();
    const idx = opts.decadalIndex ?? 0;
    const item = list[idx] ?? list[0];
    const d = item as { palaceName?: string; ageRange?: [number, number]; heavenlyStem?: string; earthlyBranch?: string };
    const label = `大限 ${d.palaceName ?? ''} ${d.ageRange?.[0] ?? ''}–${d.ageRange?.[1] ?? ''}岁 ${d.heavenlyStem ?? ''}${d.earthlyBranch ?? ''}`;
    return extractItem(item, scope, label, raw.palaces);
  }

  const h = raw.horoscope(opts.targetDate, opts.targetTimeIndex);
  const item = h[scope] as Record<string, unknown> | undefined;
  if (!item) {
    return {
      scope,
      label: SCOPE_LABELS[scope],
      heavenlyStem: '',
      earthlyBranch: '',
      mutagenMap: [],
      palaces: {},
      flowPalaceByBase: {},
    };
  }
  if (scope === 'age') {
    const agePalace = (h as { agePalace?: () => { name?: string } }).agePalace?.();
    const nominalAge = (item as { nominalAge?: number }).nominalAge;
    const label = `小限 ${nominalAge ?? ''}岁 · ${agePalace?.name ?? ''}`;
    return extractItem(item, scope, label, raw.palaces, { highlightPalace: agePalace?.name, nominalAge });
  }
  return extractItem(item, scope, SCOPE_LABELS[scope], raw.palaces);
}

// —— 多层叠加（大限 + 流年 + 流月 + 流日 同时显示） ——

export type LayerScope = 'decadal' | 'yearly' | 'monthly' | 'daily' | 'age' | 'hourly';

export type LayerStar = { name: string; type: string; scope: LayerScope };

export type ActiveLayers = {
  decadal: number | null;
  yearly: number | null;
  monthly: number | null;
  daily: string | null;
};

export type LayeredData = {
  /** 宫位名 → 该宫所有层级的运限星曜 */
  palaces: Record<string, LayerStar[]>;
  /** 各层级四化（本命星 → 四化），用于标记颜色与文字 */
  mutagens: { scope: LayerScope; star: string; mutagen: string }[];
};

/** 层级的颜色/短标元信息 */
export const LAYER_META: Record<LayerScope, { label: string; short: string }> = {
  decadal: { label: '大限', short: '运' },
  yearly: { label: '流年', short: '年' },
  monthly: { label: '流月', short: '月' },
  daily: { label: '流日', short: '日' },
  age: { label: '小限', short: '限' },
  hourly: { label: '流时', short: '时' },
};

export function getLayeredData(
  raw: {
    palaces: Palace[];
    decadalList: () => Record<string, unknown>[];
    horoscope: (date?: string | Date, timeIndex?: number) => Record<string, unknown>;
  },
  active: ActiveLayers,
): LayeredData {
  const palaces: Record<string, LayerStar[]> = {};
  const mutagens: { scope: LayerScope; star: string; mutagen: string }[] = [];

  const merge = (d: ScopeData, scope: LayerScope) => {
    Object.entries(d.palaces).forEach(([name, stars]) => {
      (palaces[name] ??= []).push(...stars.map((s) => ({ name: s.name, type: s.type, scope })));
    });
    d.mutagenMap.forEach((m) => mutagens.push({ scope, star: m.star, mutagen: m.mutagen }));
  };

  if (active.decadal != null) {
    merge(getScopeData(raw, 'decadal', { decadalIndex: active.decadal }), 'decadal');
  }
  if (active.yearly != null) {
    merge(getScopeData(raw, 'yearly', { targetDate: `${active.yearly}-06-15` }), 'yearly');
  }
  if (active.monthly != null && active.yearly != null) {
    const m = String(active.monthly).padStart(2, '0');
    merge(getScopeData(raw, 'monthly', { targetDate: `${active.yearly}-${m}-15` }), 'monthly');
  }
  if (active.daily != null) {
    merge(getScopeData(raw, 'daily', { targetDate: active.daily }), 'daily');
  }

  return { palaces, mutagens };
}

/** 大限列表项的年区间（用于流年选择） */
export function getDecadalYearRange(raw: { decadalList: () => Record<string, unknown>[] }, index: number): [number, number] | null {
  try {
    const item = raw.decadalList()[index] as { yearRange?: [number, number] };
    return item?.yearRange ?? null;
  } catch {
    return null;
  }
}

/** 某年某月的天数 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
