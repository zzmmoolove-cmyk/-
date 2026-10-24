// 五行生克引擎：把「谁生谁、谁克谁、谁被放大、谁被牵制」从手工解释变成可计算的结构。
// 只负责能量关系，不单独断吉凶——吉凶要叠加星曜性质、庙旺、四化与宫位场景。

import type { Element, Mutagen, StarCategory, StarProfile } from './knowledge/starProfiles';
import { CATEGORY_NATURE, getProfile } from './knowledge/starProfiles';

export type Relation = '生我' | '同我' | '我生' | '我克' | '克我';
export const RELATION_ORDER: Relation[] = ['生我', '同我', '我生', '我克', '克我'];

/** 相生：木→火→土→金→水→木 */
export const GENERATES: Record<Element, Element> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

/** 相克：木→土→水→火→金→木 */
export const RESTRAINS: Record<Element, Element> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

export function isGenerating(a: Element, b: Element): boolean {
  return GENERATES[a] === b;
}

export function isRestraining(a: Element, b: Element): boolean {
  return RESTRAINS[a] === b;
}

/** self 为主体，other 为遇星 */
export function relationOf(self: Element, other: Element): Relation {
  if (self === other) return '同我';
  if (GENERATES[other] === self) return '生我';
  if (GENERATES[self] === other) return '我生';
  if (RESTRAINS[self] === other) return '我克';
  return '克我';
}

export const RELATION_VERDICT: Record<Relation, string> = {
  生我: '得助',
  同我: '增强',
  我生: '泄耗',
  我克: '掌控',
  克我: '受制',
};

/** 关系 × 本星五行的取象（同源推导，换星不换框架） */
export const RELATION_DETAIL: Record<Element, Record<Relation, string>> = {
  木: {
    生我: '水生木：得滋养，才华与生机被柔化，孤高之中生出韧性与文思。',
    同我: '木遇木：才华与孤高加倍；但木多则丛，容易更难合群。',
    我生: '木生火：才华外显，秀气被点亮；过旺则焚耗，灵性变自负。',
    我克: '木克土：才华为地基所用，能承载落地，但过程费力。',
    克我: '金克木：被修剪塑形——旺则成器，弱则受斫。',
  },
  火: {
    生我: '木生火：得助燃，能量与名声被托起。',
    同我: '火遇火：热度叠加，明暗并起，急与燥加倍。',
    我生: '火生土：能量落地为成果与信誉，泄而有成。',
    我克: '火克金：能炼金成器，也易刑伤；掌控要看火候。',
    克我: '水克火：被压制浇熄——旺则制衡，弱则失声。',
  },
  土: {
    生我: '火生土：得暖得托，格局与信誉被点亮。',
    同我: '土遇土：厚重加倍，稳则更稳，滞则更滞。',
    我生: '土生金：资源转化为实际价值，泄而有用。',
    我克: '土克水：能筑堤控流，掌控资源但费力。',
    克我: '木克土：被松动——吉木给弹性，煞木撬根基。',
  },
  金: {
    生我: '土生金：得根得助，资源与名分托底。',
    同我: '金遇金：锋利加倍，专业更硬，也更孤更冲。',
    我生: '金生水：价值流通为人脉与现金流，泄而有通。',
    我克: '金克木：能修剪塑形，成器但劳心。',
    克我: '火克金：受炼——旺则成器，弱则刑伤。',
  },
  水: {
    生我: '金生水：得源得助，智慧与助力有根。',
    同我: '水遇水：流动加倍，人脉与情绪都更盛。',
    我生: '水生木：滋养他人与创意，付出多而耗。',
    我克: '水克火：能制衡降温，掌控节奏但费力。',
    克我: '土克水：被筑堤约束——有边界成渠，无边界成困。',
  },
};

export type Nature = '吉' | '煞' | '平';

export function natureOfCategory(category: StarCategory): Nature {
  return CATEGORY_NATURE[category];
}

/** 吉/煞性质对生克结果的修正（不改变关系，只改变代价） */
export function natureModifier(relation: Relation, otherNature: Nature): string {
  if (otherNature === '平') return '';
  if (otherNature === '吉') {
    switch (relation) {
      case '生我':
        return '吉星生我：助力明显，是最舒服的得助。';
      case '同我':
        return '吉星同我：本星能力被加强，成器更快。';
      case '我生':
        return '吉星受我生：付出有回报，泄中有通。';
      case '我克':
        return '吉星被我克：能驾驭资源，劳心有成。';
      case '克我':
        return '吉星克我：压力中带磨练，旺则成器。';
    }
  }
  switch (relation) {
    case '生我':
      return '煞星生我：有助但带煞，助力里藏着代价。';
    case '同我':
      return '煞星同我：煞性叠加，刚硬、冲动或孤克加倍。';
    case '我生':
      return '煞星受我生：耗神泄气，越付出越被拖累。';
    case '我克':
      return '煞星被我克：制煞费力，容易两败俱伤。';
    case '克我':
      return '煞星克我：受制受伤，波折与刑克更重。';
  }
}

/** 庙旺的力度刻度：仅用于比较强弱，不用于断吉凶 */
export function brightnessScore(brightness?: string): number {
  if (!brightness) return 0;
  switch (brightness) {
    case '庙':
      return 5;
    case '旺':
      return 4;
    case '得':
    case '利':
      return 3;
    case '平':
      return 2;
    default:
      return 1;
  }
}

/** 0.4–1.7 之间的力度系数，用于吉煞加权 */
export function intensityOf(brightness?: string): number {
  const s = brightnessScore(brightness);
  return s === 0 ? 0.8 : 0.4 + (s / 5) * 1.3;
}

export function elementOf(name: string): Element | undefined {
  return getProfile(name)?.wuxing;
}

export function profileOf(name: string): StarProfile | undefined {
  return getProfile(name);
}

// —— 四化 ——

/** 十天干四化表（顺序：禄、权、科、忌） */
export const MUTAGEN_TABLE: Record<string, [string, string, string, string]> = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '太阴', '天同'],
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};

export const MUTAGENS: Mutagen[] = ['禄', '权', '科', '忌'];

export function fourTransformsOfStem(stem: string): { star: string; mutagen: Mutagen }[] {
  const row = MUTAGEN_TABLE[stem];
  if (!row) return [];
  return row.map((star, i) => ({ star, mutagen: MUTAGENS[i] }));
}

/** 通用自化语义：星曜没有专门自化说明时的兜底 */
export const ZIHUA_FALLBACK: Record<Mutagen, string> = {
  禄: '自化禄：能量随缘外泄，容易露白、得中有失，守成力减弱。',
  权: '自化权：掌控欲外显，固执硬推，容易因强势起冲突。',
  科: '自化科：平和疏离，名声与回报不易稳固，似有似无。',
  忌: '自化忌：能量向内收束，内耗、执念与自我否定，得而复失。',
};

// —— 生克链 ——

export type ChainCandidate = { name: string; element?: Element };

export type ElementChain = {
  kind: '生' | '克';
  path: string[];
  text: string;
};

/**
 * 在同宫星曜中寻找长度 ≥2 的顺生链 / 克链。
 * 不追求穷举，只取最长、最有解释力的几条。
 */
export function buildChains(nodes: ChainCandidate[]): ElementChain[] {
  const valid = nodes.filter((n): n is { name: string; element: Element } => Boolean(n.element));
  if (valid.length < 2) return [];

  const out: ElementChain[] = [];
  const seen = new Set<string>();

  const walk = (kind: '生' | '克') => {
    const next = (e: Element): Element | undefined => (kind === '生' ? GENERATES[e] : RESTRAINS[e]);
    const paths: { path: string[]; el: Element }[] = [];

    const extend = (path: string[], el: Element) => {
      const target = next(el);
      if (!target) return;
      const candidates = valid.filter((v) => v.element === target && !path.includes(v.name));
      if (!candidates.length) {
        if (path.length >= 3) paths.push({ path, el });
        return;
      }
      for (const c of candidates) {
        extend([...path, c.name], c.element);
      }
    };

    for (const start of valid) {
      extend([start.name], start.element);
    }

    paths.sort((a, b) => b.path.length - a.path.length);
    paths.slice(0, 3).forEach((p) => {
      const key = kind + p.path.join('>');
      if (seen.has(key) || p.path.length < 3) return;
      seen.add(key);
      out.push({
        kind,
        path: p.path,
        text: `${p.path.join(' → ')}（${kind === '生' ? '顺生' : '相克'}）`,
      });
    });
  };

  walk('生');
  walk('克');
  return out;
}

/** 两星之间的完整判词（供宫位卡同宫联动使用） */
export function describeSynastry(
  self: { name: string; brightness?: string },
  other: { name: string; brightness?: string },
): { relation: Relation | null; verdict: string; text: string; note: string } | null {
  const a = getProfile(self.name);
  const b = getProfile(other.name);
  if (!a || !b) return null;
  const relation = relationOf(a.wuxing, b.wuxing);
  const note = natureModifier(relation, natureOfCategory(b.category));
  return {
    relation,
    verdict: RELATION_VERDICT[relation],
    text: `${a.name}（${a.wuxing}）遇 ${b.name}（${b.wuxing}）：${RELATION_DETAIL[a.wuxing][relation]}`,
    note,
  };
}
