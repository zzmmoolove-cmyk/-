// 星曜资料库 v1.0 汇总入口。
// 覆盖顺序：手工档案（full）> 简版条目（lite）> 旧知识库兜底（自动生成 lite）。
import type { Element, FlowMeta, FlowScope, StarCategory, StarGrade, StarProfile } from './types';
import { MAIN_STARS } from './mainStars';
import { ASSIST_STARS } from './assistStars';
import { MISC_STARS, LITE_STARS } from './miscStars';
import { EXTRA_PALACES } from './palaceProjections';
import { STAR_KB } from '../stars';

export * from './types';

const ALL = [...MAIN_STARS, ...ASSIST_STARS, ...MISC_STARS, ...LITE_STARS].map((p) => {
  const extra = EXTRA_PALACES[p.name];
  return extra && !p.palaces ? { ...p, palaces: extra } : p;
});

export const STAR_PROFILES: Record<string, StarProfile> = Object.fromEntries(
  ALL.map((p) => [p.name, p]),
);

export const PROFILE_STATS = {
  total: ALL.length,
  full: ALL.filter((p) => p.tier === 'full').length,
  lite: ALL.filter((p) => p.tier === 'lite').length,
  fallback: Object.keys(STAR_KB).filter((n) => !ALL.some((p) => p.name === n)).length,
};

const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

// 运限流曜：由「作用字 + 本命星简称」构成，六层各十颗
const FLOW_BASE: Record<string, string> = {
  魁: '天魁',
  钺: '天钺',
  昌: '文昌',
  曲: '文曲',
  禄: '禄存',
  羊: '擎羊',
  陀: '陀罗',
  马: '天马',
  鸾: '红鸾',
  喜: '天喜',
};

const FLOW_SCOPE: Record<FlowScope, { label: string; span: string }> = {
  运: { label: '大限', span: '这十年' },
  流: { label: '流年', span: '这一年' },
  月: { label: '流月', span: '这一月' },
  日: { label: '流日', span: '这一日' },
  时: { label: '流时', span: '这一时' },
};

function flowProfile(name: string): StarProfile | undefined {
  const m = /^(运|流|月|日|时)(魁|钺|昌|曲|禄|羊|陀|马|鸾|喜)$/.exec(name);
  if (!m) return undefined;
  const scope = m[1] as FlowScope;
  const base = STAR_PROFILES[FLOW_BASE[m[2]]];
  if (!base) return undefined;
  const meta: FlowMeta = { scope, base: base.name, ...FLOW_SCOPE[scope] };
  return {
    name,
    aliases: [`${meta.label}${base.name}`],
    wuxing: base.wuxing,
    yinyang: base.yinyang,
    grade: base.grade,
    category: base.category,
    huaqi: base.huaqi,
    essence: `${meta.label}引动的${base.name}：不是新的星曜，是${base.name}在${meta.label}这一层的投影——${meta.span}内，它落在哪一宫，就把「${base.keywords.slice(0, 2).join('·')}」的主题带到哪个宫位。`,
    keywords: [meta.label, ...base.keywords.slice(0, 3)],
    root: `流曜不是独立星曜：它把「${base.name}」的象带到运限层，只在该层有效。${base.root}`,
    body: base.body,
    positive: base.positive?.map((t) => `${meta.label}层：${t}`),
    negative: base.negative?.map((t) => `${meta.label}层：${t}`),
    use: {
      field: `看它落在哪一宫：那一宫在${meta.span}内被「${base.name}」的主题引动`,
      risk: `${meta.label}流曜只是引动标记，不单独断吉凶；离开这一层就失效`,
      fix: `先看本命该宫的主星与三方四正，再看${meta.label}四化是否也引动同一颗星`,
      motto: '流曜是行程，不是命——看它把哪一段路照亮。',
    },
    tier: 'lite',
    source: `派生档案：${base.name} 的${meta.label}投射（${meta.span}有效）`,
    flow: meta,
  };
}
const CATS: StarCategory[] = ['主星', '吉星', '煞星', '桃花', '禄存', '天马', '杂曜'];

function kbFallback(name: string): StarProfile | undefined {
  const kb = STAR_KB[name];
  if (!kb) return undefined;
  const wuxing = ELEMENTS.find((e) => kb.wuxing.includes(e)) ?? '土';
  const category = CATS.find((c) => c === kb.category) ?? '杂曜';
  const grade: StarGrade = category === '主星' || category === '吉星' || category === '煞星' ? '甲' : '乙';
  return {
    name: kb.name,
    wuxing,
    yinyang: kb.yinyang === '阳' ? '阳' : kb.yinyang === '阴' ? '阴' : undefined,
    grade,
    category,
    essence: kb.brief,
    keywords: [kb.category],
    root: kb.brief,
    positive: [kb.detail],
    sihua: kb.sihua
      ? {
          禄: kb.sihua.lu,
          权: kb.sihua.quan,
          科: kb.sihua.ke,
          忌: kb.sihua.ji,
        }
      : undefined,
    use: {
      field: '按宫位场景取用',
      risk: '单星资料有限，需与同宫主星、庙旺、四化同看',
      fix: '参考同宫主星与三方四正',
      motto: kb.brief,
    },
    tier: 'lite',
    source: '由旧版星曜知识库自动转换，待人工扩写',
  };
}

/** 50 颗运限流曜（5 层 × 10 颗），由本命星派生，不占手工档案行数 */
export const FLOW_STAR_NAMES: string[] = (['运', '流', '月', '日', '时'] as FlowScope[]).flatMap((scope) =>
  Object.keys(FLOW_BASE).map((short) => `${scope}${short}`),
);

export const FLOW_PROFILES: StarProfile[] = FLOW_STAR_NAMES
  .map((n) => flowProfile(n))
  .filter((p): p is StarProfile => Boolean(p));

export function getProfile(name: string): StarProfile | undefined {
  return STAR_PROFILES[name] ?? flowProfile(name) ?? kbFallback(name);
}

export function hasProfile(name: string): boolean {
  return getProfile(name) !== undefined;
}

/** 是否有十二宫投射（宫位卡「本宫表现」是否可直接引用） */
export function hasPalaceProjection(profile: StarProfile): boolean {
  return Boolean(profile.palaces);
}
