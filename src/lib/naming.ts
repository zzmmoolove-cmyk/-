// 起名参考 v1.0：四柱五行粗算 + 字库筛选 + 音律/笔画/字义打分。
// 注意：不是专业起名服务，五行按天干地支主气粗算，笔画为常用笔画，正式使用请核对。

import type { Element } from './knowledge/starProfiles';

export type NamingStyle = '文雅' | '清朗' | '大气' | '温润';

type NamingChar = {
  c: string;
  py: string;
  el: Element;
  st: number;
  tone: number;
  g: '男' | '女' | '中';
  styles: NamingStyle[];
  mean: string;
};

const C = (
  c: string,
  py: string,
  el: Element,
  st: number,
  tone: number,
  g: NamingChar['g'],
  styles: NamingStyle[],
  mean: string,
): NamingChar => ({ c, py, el, st, tone, g, styles, mean });

const CHARS: NamingChar[] = [
  // 木
  C('林', 'lín', '木', 8, 2, '中', ['文雅', '清朗'], '树林，生机与包容'),
  C('森', 'sēn', '木', 12, 1, '男', ['大气'], '森林，蓬勃与根基'),
  C('桐', 'tóng', '木', 10, 2, '中', ['文雅'], '梧桐，高洁与引凤'),
  C('楠', 'nán', '木', 13, 2, '中', ['大气'], '楠木，坚实与贵重'),
  C('柏', 'bǎi', '木', 9, 3, '男', ['文雅'], '柏树，长青与守正'),
  C('枫', 'fēng', '木', 8, 1, '中', ['文雅'], '枫叶，秋意与热烈'),
  C('栩', 'xǔ', '木', 10, 3, '中', ['文雅'], '栩栩，生动与灵气'),
  C('棠', 'táng', '木', 12, 2, '女', ['文雅'], '海棠，明艳与温柔'),
  C('芸', 'yún', '木', 7, 2, '女', ['文雅'], '芸香，书卷与清芬'),
  C('芷', 'zhǐ', '木', 7, 3, '女', ['文雅'], '白芷，芳洁与端雅'),
  C('芮', 'ruì', '木', 7, 4, '女', ['清朗'], '草初生，柔韧与希望'),
  C('茉', 'mò', '木', 8, 4, '女', ['清朗'], '茉莉，清芬与素净'),
  C('槿', 'jǐn', '木', 15, 3, '女', ['文雅'], '木槿，朝华与坚韧'),
  C('柯', 'kē', '木', 9, 1, '男', ['清朗'], '枝柯，端正与担当'),
  C('楚', 'chǔ', '木', 13, 3, '中', ['大气'], '清楚，楚楚与明朗'),
  C('若', 'ruò', '木', 8, 4, '女', ['文雅'], '若木，从容与谦和'),
  C('茜', 'qiàn', '木', 9, 4, '女', ['清朗'], '茜草，明丽与热烈'),
  C('荷', 'hé', '木', 10, 2, '女', ['文雅'], '荷花，清雅与自持'),
  C('菡', 'hàn', '木', 11, 4, '女', ['文雅'], '菡萏，含苞与含蓄'),
  C('薇', 'wēi', '木', 16, 1, '女', ['文雅'], '蔷薇，柔美与坚韧'),
  // 火
  C('煜', 'yù', '火', 13, 4, '男', ['大气'], '光耀，明亮与进取'),
  C('炜', 'wěi', '火', 8, 3, '男', ['大气'], '光彩，鲜明与磊落'),
  C('烨', 'yè', '火', 10, 4, '男', ['大气'], '火光，盛明与热烈'),
  C('昕', 'xīn', '火', 8, 1, '中', ['清朗'], '黎明，新开始'),
  C('晴', 'qíng', '火', 12, 2, '女', ['清朗'], '晴朗，开阔与明亮'),
  C('曦', 'xī', '火', 20, 1, '女', ['文雅'], '晨光，温暖与希望'),
  C('晨', 'chén', '火', 11, 2, '中', ['清朗'], '清晨，朝气与秩序'),
  C('旭', 'xù', '火', 6, 4, '男', ['大气'], '朝阳，上升与果决'),
  C('昊', 'hào', '火', 8, 4, '男', ['大气'], '广阔天空，气度'),
  C('昭', 'zhāo', '火', 9, 1, '中', ['大气'], '光明，昭示与坦荡'),
  C('晖', 'huī', '火', 13, 1, '男', ['大气'], '日光，温暖与照耀'),
  C('明', 'míng', '火', 8, 2, '中', ['清朗'], '明亮，通达与清醒'),
  C('晗', 'hán', '火', 11, 2, '中', ['清朗'], '天将明，含蓄与盼头'),
  C('彤', 'tóng', '火', 7, 2, '女', ['清朗'], '红色，朝气与热忱'),
  C('丹', 'dān', '火', 4, 1, '女', ['文雅'], '丹心，赤诚与明艳'),
  C('南', 'nán', '火', 9, 2, '中', ['清朗'], '南方，温暖与方向'),
  // 土
  C('安', 'ān', '土', 6, 1, '中', ['温润'], '平安，安定与从容'),
  C('宇', 'yǔ', '土', 6, 3, '男', ['大气'], '宇宙，格局与气度'),
  C('辰', 'chén', '土', 7, 2, '男', ['大气'], '星辰，时运与光'),
  C('岳', 'yuè', '土', 8, 4, '男', ['大气'], '山岳，稳重与担当'),
  C('峰', 'fēng', '土', 10, 1, '男', ['大气'], '山峰，登临与志向'),
  C('岚', 'lán', '土', 7, 2, '女', ['文雅'], '山间雾气，朦胧与灵秀'),
  C('坤', 'kūn', '土', 8, 1, '男', ['大气'], '大地，厚德与承载'),
  C('培', 'péi', '土', 11, 2, '男', ['温润'], '培育，积累与耐心'),
  C('城', 'chéng', '土', 9, 2, '男', ['大气'], '城池，守成与边界'),
  C('圣', 'shèng', '土', 5, 4, '男', ['大气'], '圣明，通达与理想'),
  C('岩', 'yán', '土', 8, 2, '男', ['大气'], '岩石，坚定与质朴'),
  C('峥', 'zhēng', '土', 11, 1, '男', ['大气'], '峥嵘，卓越与棱角'),
  C('嵘', 'róng', '土', 12, 2, '男', ['大气'], '峥嵘，兴盛与格局'),
  C('远', 'yuǎn', '土', 7, 3, '中', ['大气'], '远大，视野与志向'),
  C('逸', 'yì', '土', 11, 4, '中', ['文雅'], '安逸，洒脱与从容'),
  C('雍', 'yōng', '土', 13, 1, '男', ['大气'], '雍容，和穆与气度'),
  C('阳', 'yáng', '土', 6, 2, '男', ['大气'], '阳光，明朗与生机'),
  // 金
  C('铭', 'míng', '金', 11, 2, '男', ['大气'], '铭记，记录与自省'),
  C('钧', 'jūn', '金', 9, 1, '男', ['大气'], '钧衡，权衡与公正'),
  C('锐', 'ruì', '金', 12, 4, '男', ['大气'], '锐利，锋芒与进取'),
  C('鑫', 'xīn', '金', 24, 1, '男', ['大气'], '多金，兴旺与丰足'),
  C('钰', 'yù', '金', 10, 4, '中', ['文雅'], '珍宝，珍贵与温润'),
  C('锦', 'jǐn', '金', 13, 3, '中', ['文雅'], '锦绣，美好与丰盛'),
  C('铎', 'duó', '金', 10, 2, '男', ['文雅'], '铃铎，警醒与声名'),
  C('铠', 'kǎi', '金', 11, 3, '男', ['大气'], '铠甲，保护与担当'),
  C('铮', 'zhēng', '金', 11, 1, '男', ['大气'], '铮铮，刚正与有声'),
  C('瑞', 'ruì', '金', 13, 4, '中', ['温润'], '祥瑞，吉庆与美好'),
  C('琛', 'chēn', '金', 12, 1, '男', ['文雅'], '珍宝，贵重与内敛'),
  C('瑜', 'yú', '金', 13, 2, '中', ['文雅'], '美玉，优点与光泽'),
  C('璟', 'jǐng', '金', 16, 3, '中', ['文雅'], '玉光，光彩与温润'),
  C('璐', 'lù', '金', 17, 4, '女', ['文雅'], '美玉，清亮与珍贵'),
  C('珊', 'shān', '金', 9, 1, '女', ['文雅'], '珊瑚，美好与珍贵'),
  C('玥', 'yuè', '金', 8, 4, '女', ['文雅'], '神珠，珍贵与灵秀'),
  C('诗', 'shī', '金', 8, 1, '女', ['文雅'], '诗意，文采与情致'),
  C('诚', 'chéng', '金', 8, 2, '男', ['温润'], '诚信，真实与可靠'),
  C('信', 'xìn', '金', 9, 4, '男', ['温润'], '信用，守诺与笃定'),
  C('谦', 'qiān', '金', 12, 1, '男', ['温润'], '谦逊，低调与修养'),
  C('仁', 'rén', '金', 4, 2, '男', ['温润'], '仁爱，宽厚与恻隐'),
  C('礼', 'lǐ', '金', 5, 3, '中', ['温润'], '礼敬，分寸与教养'),
  // 水
  C('清', 'qīng', '水', 11, 1, '中', ['清朗'], '清澈，干净与清醒'),
  C('涵', 'hán', '水', 11, 2, '中', ['温润'], '涵养，包容与深度'),
  C('沐', 'mù', '水', 7, 4, '中', ['温润'], '沐浴，润泽与新生'),
  C('润', 'rùn', '水', 10, 4, '男', ['温润'], '滋润，温润与滋养'),
  C('源', 'yuán', '水', 13, 2, '男', ['大气'], '源头，根本与长远'),
  C('洋', 'yáng', '水', 9, 2, '男', ['大气'], '海洋，开阔与包容'),
  C('海', 'hǎi', '水', 10, 3, '男', ['大气'], '大海，宽广与深沉'),
  C('涛', 'tāo', '水', 10, 1, '男', ['大气'], '波涛，力量与起伏'),
  C('泽', 'zé', '水', 8, 2, '男', ['温润'], '恩泽，润物与善意'),
  C('川', 'chuān', '水', 3, 1, '中', ['大气'], '山川，流动与格局'),
  C('溪', 'xī', '水', 13, 1, '女', ['文雅'], '溪流，清浅与灵动'),
  C('淇', 'qí', '水', 11, 2, '女', ['文雅'], '淇水，柔美与清澈'),
  C('洛', 'luò', '水', 9, 4, '女', ['文雅'], '洛水，神采与灵秀'),
  C('湘', 'xiāng', '水', 12, 1, '女', ['文雅'], '湘水，清远与情致'),
  C('洁', 'jié', '水', 9, 2, '女', ['清朗'], '洁净，自持与清爽'),
  C('淳', 'chún', '水', 11, 2, '男', ['温润'], '淳厚，质朴与宽和'),
  C('淼', 'miǎo', '水', 12, 3, '男', ['大气'], '水广，浩渺与包容'),
  C('霖', 'lín', '水', 16, 2, '中', ['大气'], '甘霖，滋养与及时'),
  C('雨', 'yǔ', '水', 8, 3, '中', ['清朗'], '雨水，润泽与自然'),
  C('露', 'lù', '水', 21, 4, '女', ['文雅'], '露珠，清透与短暂之美'),
  C('雪', 'xuě', '水', 11, 3, '女', ['清朗'], '白雪，纯净与清冷'),
  C('云', 'yún', '水', 4, 2, '中', ['文雅'], '云彩，自在与变化'),
  C('文', 'wén', '水', 4, 2, '中', ['文雅'], '文采，修养与表达'),
  C('言', 'yán', '水', 7, 2, '中', ['文雅'], '言语，表达与承诺'),
  C('知', 'zhī', '水', 8, 1, '中', ['清朗'], '知慧，明白与求知'),
];

const STEM_EL: Record<string, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const BRANCH_EL: Record<string, Element> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

const ELEMENTS: Element[] = ['木', '火', '土', '金', '水'];

/** 对某个「需补」五行有生扶/承接关系的元素 */
const SUPPORT: Record<Element, Element[]> = {
  木: ['水', '火'],
  火: ['木', '土'],
  土: ['火', '金'],
  金: ['土', '水'],
  水: ['金', '木'],
};

export type ElementBalance = {
  counts: Record<Element, number>;
  need: Element[];
  avoid: Element[];
  dayMaster: string;
  dayMasterElement?: Element;
  label: string;
};

/** 四柱主气粗算：不计藏干、纳音、旺衰，只做「缺什么/多什么」的入门参考。 */
export function analyzeElements(chineseDate: string): ElementBalance {
  const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 } as Record<Element, number>;
  const tokens = (chineseDate || '').trim().split(/\s+/).filter(Boolean);
  tokens.forEach((t) => {
    const stem = t[0];
    const branch = t[1];
    if (STEM_EL[stem]) counts[STEM_EL[stem]]++;
    if (BRANCH_EL[branch]) counts[BRANCH_EL[branch]]++;
  });
  const total = ELEMENTS.reduce((n, e) => n + counts[e], 0);
  if (total === 0) {
    return { counts, need: [], avoid: [], dayMaster: '', dayMasterElement: undefined, label: '未取到四柱' };
  }
  const min = Math.min(...ELEMENTS.map((e) => counts[e]));
  const need = ELEMENTS.filter((e) => counts[e] === min && counts[e] <= 1);
  const avoid = ELEMENTS.filter((e) => counts[e] >= 3);
  const dayMaster = tokens[2]?.[0] ?? '';
  return {
    counts,
    need: need.length ? need : [ELEMENTS.reduce((a, b) => (counts[a] <= counts[b] ? a : b))],
    avoid,
    dayMaster,
    dayMasterElement: dayMaster ? STEM_EL[dayMaster] : undefined,
    label: ELEMENTS.map((e) => `${e}${counts[e]}`).join(' · '),
  };
}

export type NameCandidate = {
  full: string;
  given: string;
  pinyin: string;
  elements: Element[];
  strokes: number[];
  tones: number[];
  meanings: string[];
  score: number;
  reasons: string[];
};

export type NamingResult = {
  surname: string;
  balance: ElementBalance;
  candidates: NameCandidate[];
  note: string;
};

function charScore(c: NamingChar, balance: ElementBalance, style: NamingStyle, gender: '男' | '女'): number {
  let s = 50;
  if (balance.need.includes(c.el)) s += 20;
  if (balance.need.some((e) => SUPPORT[e].includes(c.el))) s += 7;
  if (balance.avoid.includes(c.el)) s -= 14;
  if (c.g === gender || c.g === '中') s += 6;
  if (c.styles.includes(style)) s += 8;
  if (c.st >= 6 && c.st <= 18) s += 3;
  return s;
}

/** 生成名字。seed 用于「换一批」，不改变命盘结论。 */
export function generateNames(opts: {
  surname: string;
  chineseDate: string;
  gender: '男' | '女';
  style: NamingStyle;
  singleChar?: boolean;
  forbidden?: string;
  count?: number;
  seed?: number;
}): NamingResult {
  const surname = opts.surname.trim() || '李';
  const balance = analyzeElements(opts.chineseDate);
  const forbidden = new Set((opts.forbidden ?? '').split('').filter(Boolean));
  const allow = CHARS.filter(
    (c) =>
      !forbidden.has(c.c) &&
      !surname.includes(c.c) &&
      (c.g === opts.gender || c.g === '中'),
  );
  const scored = allow.map((c) => ({ c, s: charScore(c, balance, opts.style, opts.gender) }));
  const pool = scored.sort((a, b) => b.s - a.s).slice(0, 44);
  const candidates: NameCandidate[] = [];

  const push = (chars: NamingChar[], baseScore: number, extra: string[]) => {
    const given = chars.map((c) => c.c).join('');
    const score = Math.max(35, Math.min(98, Math.round(baseScore)));
    candidates.push({
      full: surname + given,
      given,
      pinyin: chars.map((c) => c.py).join(' '),
      elements: chars.map((c) => c.el),
      strokes: chars.map((c) => c.st),
      tones: chars.map((c) => c.tone),
      meanings: chars.map((c) => `${c.c}：${c.mean}`),
      score,
      reasons: extra,
    });
  };

  if (opts.singleChar) {
    pool.slice(0, 8).forEach(({ c, s }) => {
      const reasons: string[] = [];
      if (balance.need.includes(c.el)) reasons.push(`补${c.el}`);
      if (balance.avoid.includes(c.el)) reasons.push(`${c.el}偏旺`);
      if (c.styles.includes(opts.style)) reasons.push(opts.style);
      reasons.push(`${c.st}画 · ${c.tone}声`);
      push([c], s + 8, reasons);
    });
  } else {
    for (let i = 0; i < pool.length; i++) {
      for (let j = 0; j < pool.length; j++) {
        if (i === j) continue;
        const a = pool[i];
        const b = pool[j];
        if (a.c.c === b.c.c) continue;
        let s = (a.s + b.s) / 2;
        const reasons: string[] = [];
        const tones = new Set([a.c.tone, b.c.tone]);
        if (tones.size === 2) {
          s += 6;
          reasons.push('声调有起伏');
        } else {
          s -= 4;
        }
        const totalStrokes = a.c.st + b.c.st;
        if (totalStrokes >= 15 && totalStrokes <= 31) {
          s += 4;
          reasons.push('笔画均衡');
        }
        if (a.c.el !== b.c.el) {
          s += 4;
          reasons.push('五行不偏');
        } else {
          s -= 5;
        }
        if (balance.need.includes(a.c.el) && balance.need.includes(b.c.el)) {
          s += 2;
          reasons.push(`双补${a.c.el}`);
        }
        if (balance.need.includes(a.c.el)) reasons.push(`补${a.c.el}`);
        if (balance.need.includes(b.c.el)) reasons.push(`补${b.c.el}`);
        if (balance.need.length && !balance.need.includes(a.c.el) && SUPPORT[balance.need[0]]?.includes(a.c.el)) {
          reasons.push(`${a.c.el}生${balance.need[0]}`);
        }
        if (balance.need.length && !balance.need.includes(b.c.el) && SUPPORT[balance.need[0]]?.includes(b.c.el)) {
          reasons.push(`${b.c.el}生${balance.need[0]}`);
        }
        if (a.c.styles.includes(opts.style) || b.c.styles.includes(opts.style)) reasons.push(opts.style);
        if (balance.avoid.includes(a.c.el) && balance.avoid.includes(b.c.el)) s -= 8;
        push([a.c, b.c], s, reasons.slice(0, 4));
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  // 同一批里避免五个名字都用同一个字开头，先按首字去重
  const diverse: NameCandidate[] = [];
  const seenFirst = new Set<string>();
  const seenSecond = new Set<string>();
  const seenPair = new Set<string>();
  for (const c of candidates) {
    if (!opts.singleChar) {
      const first = c.given[0];
      const second = c.given[1];
      const pairKey = [first, second].sort().join('');
      if (seenFirst.has(first) || seenSecond.has(second) || seenPair.has(pairKey)) continue;
      seenFirst.add(first);
      seenSecond.add(second);
      seenPair.add(pairKey);
    }
    diverse.push(c);
    if (diverse.length >= 12) break;
  }
  const top = diverse.length >= (opts.count ?? 5) ? diverse : candidates.slice(0, 12);
  const seed = opts.seed ?? 0;
  const rotated = top.length ? [...top.slice(seed % top.length), ...top.slice(0, seed % top.length)] : [];
  return {
    surname,
    balance,
    candidates: rotated.slice(0, opts.count ?? 5),
    note: '五行按四柱天干地支主气粗算，未计藏干、旺衰与格局；笔画为常用笔画，非康熙字典严格笔画。起名参考不替代专业命名服务。',
  };
}
