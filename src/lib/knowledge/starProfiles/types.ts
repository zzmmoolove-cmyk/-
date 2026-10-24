// 星曜档案 v1.0 的数据结构与通用工具。
// 设计原则：
// 1) 能由排盘引擎得到的（庙旺、生年四化、宫干支）不写死在资料里；
// 2) 资料库只写「星曜本体」与「同源推导」，场景化的落宫表现交给宫位卡组装；
// 3) 缺失就标记缺失，不硬编（见 tier: 'lite' 与 source 字段）。

export type Element = '木' | '火' | '土' | '金' | '水';
export type YinYang = '阳' | '阴';
export type StarGrade = '甲' | '乙' | '丙' | '丁';
export type StarCategory = '主星' | '吉星' | '煞星' | '禄存' | '天马' | '桃花' | '杂曜' | '神煞';
export type Mutagen = '禄' | '权' | '科' | '忌';

/** 十二宫（与 iztro 的宫名一致，仆役即交友） */
export const PALACE_KEYS = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '仆役', '官禄', '田宅', '福德', '父母',
] as const;
export type PalaceKey = (typeof PALACE_KEYS)[number];

export type FlowScope = '运' | '流' | '月' | '日' | '时';

/** 运限流曜：不是独立星曜，而是本命星在某一层的投影 */
export type FlowMeta = {
  scope: FlowScope;
  base: string;
  label: string;
  span: string;
};

export type ComboHint = {
  /** 对方星曜名 */
  with: string;
  kind: 'good' | 'caution' | 'depends';
  verdict: string;
};

export type StarProfile = {
  name: string;
  aliases?: string[];
  wuxing: Element;
  yinyang?: YinYang;
  grade: StarGrade;
  category: StarCategory;
  /** 斗分，如「北斗」「南斗」「中天」 */
  doufen?: string;
  /** 化气，如「化气为财」 */
  huaqi?: string;

  /** 一句话本质：五行根性 + 化气 + 气质 + 课题 */
  essence: string;
  keywords: string[];
  /** 五行根性：为什么是这些象，供「同源推导」用 */
  root: string;
  /** 身体对应 */
  body?: string;

  positive?: string[];
  negative?: string[];

  /** 本星参与的四化含义（不参与的星留空） */
  sihua?: Partial<Record<Mutagen, string>>;
  /** 自化时能量怎么走（外泄/内收） */
  zihua?: Partial<Record<Mutagen, string>>;

  /** 十二宫投射：同一本质 × 宫位领域，每宫一句 */
  palaces?: Partial<Record<PalaceKey, string>>;

  /** 固定组合提示（同宫生效） */
  combos?: ComboHint[];

  use: {
    field: string;
    risk: string;
    fix: string;
    motto: string;
  };

  /** full = 手工整理；lite = 单行条目，待扩写 */
  tier: 'full' | 'lite';
  /** 资料出处/口径说明 */
  source?: string;
  /** 运限流曜的派生信息（本命星为空） */
  flow?: FlowMeta;
};

/** 给 lite 条目用的紧凑结构 */
export type LiteStar = {
  name: string;
  wuxing: Element;
  category: StarCategory;
  grade: StarGrade;
  essence: string;
  keywords: string[];
  note?: string;
};

export const CATEGORY_NATURE: Record<StarCategory, '吉' | '煞' | '平'> = {
  主星: '平',
  吉星: '吉',
  煞星: '煞',
  禄存: '吉',
  天马: '平',
  桃花: '平',
  杂曜: '平',
  神煞: '平',
};

/** 庙旺的强弱刻度：仅用于「力度」比较，不用于断吉凶 */
export const BRIGHTNESS_SCORE: Record<string, number> = {
  庙: 5,
  旺: 4,
  得: 3,
  利: 3,
  平: 2,
  不: 1,
  陷: 1,
};

export const BRIGHTNESS_LABEL: Record<string, string> = {
  庙: '庙（最充盈）',
  旺: '旺（有力）',
  得: '得（得地）',
  利: '利（中上）',
  平: '平（中等）',
  不: '不（偏弱）',
  陷: '陷（最弱）',
};

export function buildLiteProfile(l: LiteStar): StarProfile {
  return {
    name: l.name,
    wuxing: l.wuxing,
    grade: l.grade,
    category: l.category,
    essence: l.essence,
    keywords: l.keywords,
    root: l.note ?? '单星资料（简版）：以五行属性与类别取象，落宫时叠加同宫主星与三方四正判断。',
    use: {
      field: '按所在宫位领域取用，不宜单星断事',
      risk: '单星力量有限，需与同宫主星、庙旺、四化同看',
      fix: '以同宫主星与三方四正为准，单星只作修饰',
      motto: '单星只作修饰，场景与主星才是主轴。',
    },
    tier: 'lite',
    source: '简版条目：待按「五行根性→化气→四化→十二宫」扩写',
  };
}
