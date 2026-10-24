// 宫位卡 1.0：把「本宫 + 同宫 + 三方四正 + 四化 + 五行链 + 卡点」组装成结构化数据，
// 再渲染成可读报告与可复制的 Prompt。所有结论都带判定依据，缺数据就标缺。

import type { Astrolabe, Palace, Star } from '../types';
import { PALACE_KB, PALACE_ORDER } from './knowledge/palaces';
import type { Element, Mutagen, PalaceKey, StarProfile } from './knowledge/starProfiles';
import { getProfile } from './knowledge/starProfiles';
import {
  buildChains,
  describeSynastry,
  fourTransformsOfStem,
  intensityOf,
  natureOfCategory,
  relationOf,
  RELATION_DETAIL,
  RELATION_VERDICT,
  ZIHUA_FALLBACK,
  type ElementChain,
  type Nature,
  type Relation,
} from './wuxing';

/** 权重：本宫 > 对宫（正照）> 三合（斜照） */
export const WEIGHTS = { self: 1, opposite: 0.6, trine: 0.45 } as const;

export type StarKind = '主星' | '辅星' | '杂曜';

export type StarEntry = {
  name: string;
  kind: StarKind;
  brightness?: string;
  natalMutagen?: Mutagen;
  selfHua?: Mutagen;
  profile?: StarProfile;
  element?: Element;
  nature: Nature;
  /** 本宫表现：来自十二宫投射，或由本体推导 */
  palaceLine: string;
  lineSource: 'kb' | 'derived' | 'missing';
  /** 力度系数（庙旺 0.4–1.7，无庙旺 0.8） */
  intensity: number;
};

export type SynastryEntry = {
  subject: string;
  object: string;
  relation: Relation;
  verdict: string;
  text: string;
  note: string;
};

export type SurroundEntry = {
  role: '对宫' | '三合';
  palace: string;
  weight: number;
  stars: string[];
  synastry: SynastryEntry[];
  natureScore: number;
  ji: number;
  sha: number;
};

export type Blockage = {
  id: string;
  severity: '高' | '中' | '低';
  title: string;
  evidence: string[];
  impact: string;
  fix: string;
  action: string;
};

export type PalaceIndexRow = {
  palace: string;
  majors: string[];
  score: number;
  scoreLabel: string;
  blockages: number;
  keyword: string;
};

export type PalaceSnapshot = {
  chart: {
    gender: string;
    solarDate: string;
    lunarDate: string;
    fiveElementsClass: string;
    soul: string;
    body: string;
  };
  palace: {
    name: string;
    label: string;
    stem: string;
    branch: string;
    isBody: boolean;
    isMing: boolean;
    changsheng: string;
    decadal: string;
    domain: string;
    focus: string[];
  };
  stars: StarEntry[];
  majorCount: number;
  natal: { star: string; mutagen: Mutagen }[];
  selfHua: { star: string; mutagen: Mutagen; text: string }[];
  fly: { star: string; mutagen: Mutagen; to: string }[];
  samePalace: SynastryEntry[];
  surrounding: SurroundEntry[];
  chains: ElementChain[];
  score: { value: number; raw: number; label: string; ji: number; sha: number };
  blockages: Blockage[];
  strategies: { star: string; field: string; risk: string; fix: string; motto: string }[];
  gaps: string[];
  index: PalaceIndexRow[];
};

const LABEL = (name: string) => (name.endsWith('宫') ? name : `${name}宫`);

function starKind(s: Star, palace: Palace): StarKind {
  if (palace.majorStars.includes(s)) return '主星';
  if (palace.minorStars.includes(s)) return '辅星';
  return '杂曜';
}

function allStars(p: Palace): Star[] {
  return [...p.majorStars, ...p.minorStars, ...p.adjectiveStars];
}

function makeEntry(s: Star, palace: Palace, kind: StarKind, zihua?: Mutagen): StarEntry {
  const profile = getProfile(s.name);
  const line = profile?.palaces?.[palace.name as PalaceKey];
  const domain = PALACE_KB[palace.name]?.brief ?? '';
  const derived = profile
    ? `以「${profile.keywords.slice(0, 3).join('·')}」的本质落入${LABEL(palace.name)}：${domain}`
    : '';
  return {
    name: s.name,
    kind,
    brightness: s.brightness || undefined,
    natalMutagen: (s.mutagen as Mutagen) || undefined,
    selfHua: zihua,
    profile,
    element: profile?.wuxing,
    nature: profile ? natureOfCategory(profile.category) : '平',
    palaceLine: line ?? (profile ? derived : '资料库暂未收录此星，按杂曜处理。'),
    lineSource: line ? 'kb' : profile ? 'derived' : 'missing',
    intensity: intensityOf(s.brightness),
  };
}

function natureScoreOf(entries: StarEntry[], weight: number): number {
  return entries.reduce((sum, e) => {
    if (e.nature === '吉') return sum + e.intensity * weight;
    if (e.nature === '煞') return sum - e.intensity * weight;
    return sum;
  }, 0);
}

/** balance =（吉 - 煞）/（吉 + 煞），范围 -1 ~ 1，避免吉星数量多就天然偏吉 */
function scoreLabel(v: number): string {
  if (v > 0.45) return '偏吉';
  if (v > 0.15) return '中和偏吉';
  if (v >= -0.15) return '中和';
  if (v >= -0.45) return '中和偏煞';
  return '偏煞';
}

function palaceByOffset(astrolabe: Astrolabe, p: Palace, offset: number): Palace | undefined {
  const idx = astrolabe.palaces.findIndex((x) => x.name === p.name);
  if (idx < 0) return undefined;
  return astrolabe.palaces[(idx + offset) % 12];
}

function buildIndex(astrolabe: Astrolabe): PalaceIndexRow[] {
  // astrolabe.palaces 按地支顺序排列；索引按「命宫→兄弟→…→父母」重排，便于阅读
  const ordered = PALACE_ORDER
    .map((name) => astrolabe.palaces.find((p) => p.name === name))
    .filter((p): p is Palace => Boolean(p));
  return ordered.map((p) => {
    const snap = buildPalaceSnapshot(astrolabe, p.name, false);
    const majors = p.majorStars.map((s) => s.name);
    const main = majors[0] ? getProfile(majors[0]) : undefined;
    return {
      palace: p.name,
      majors,
      score: snap.score.value,
      scoreLabel: snap.score.label,
      blockages: snap.blockages.length,
      keyword: main?.keywords[0] ?? (majors.length ? '—' : '空宫借星'),
    };
  });
}

function pairSynastry(a: StarEntry, b: StarEntry): SynastryEntry | null {
  if (!a.element || !b.element || !a.profile || !b.profile) return null;
  const rel = relationOf(a.element, b.element);
  const detail = RELATION_DETAIL[a.element][rel];
  const noteParts: string[] = [];
  if (b.profile.category === '煞星') noteParts.push('对方是煞星，助力/压力都带代价。');
  else if (b.profile.category === '吉星') noteParts.push('对方是吉星，关系偏顺。');
  if (b.brightness) noteParts.push(`对方亮度：${b.brightness}。`);
  const s = describeSynastry(a, b);
  return {
    subject: a.name,
    object: b.name,
    relation: rel,
    verdict: RELATION_VERDICT[rel],
    text: `${b.name}（${b.element}）对 ${a.name}（${a.element}）为「${rel}」：${detail}`,
    note: noteParts.join('') || (s?.note ?? ''),
  };
}

export function buildPalaceSnapshot(
  astrolabe: Astrolabe,
  palaceName: string,
  withIndex = true,
): PalaceSnapshot {
  const palace = astrolabe.palaces.find((p) => p.name === palaceName) ?? astrolabe.palaces[0];
  const info = PALACE_KB[palace.name] ?? { name: palace.name, brief: '', focus: [], detail: '' };
  const domain = info.detail || info.brief;

  const transforms = fourTransformsOfStem(palace.heavenlyStem);
  const selfHua: { star: string; mutagen: Mutagen; text: string }[] = [];
  const fly: { star: string; mutagen: Mutagen; to: string }[] = [];
  const zihuaMap = new Map<string, Mutagen>();
  const inPalace = (name: string) =>
    palace.majorStars.some((s) => s.name === name) ||
    palace.minorStars.some((s) => s.name === name) ||
    palace.adjectiveStars.some((s) => s.name === name);

  transforms.forEach(({ star, mutagen }) => {
    if (inPalace(star)) {
      zihuaMap.set(star, mutagen);
      const prof = getProfile(star);
      const rawText = prof?.zihua?.[mutagen] ?? ZIHUA_FALLBACK[mutagen];
      selfHua.push({
        star,
        mutagen,
        text: rawText.replace(new RegExp(`^自化${mutagen}[：:]`), ''),
      });
    } else {
      const target = astrolabe.palaces.find(
        (p) =>
          p.majorStars.some((s) => s.name === star) ||
          p.minorStars.some((s) => s.name === star) ||
          p.adjectiveStars.some((s) => s.name === star),
      );
      if (target) fly.push({ star, mutagen, to: target.name });
    }
  });

  const stars = allStars(palace).map((s) => makeEntry(s, palace, starKind(s, palace), zihuaMap.get(s.name)));

  const natal = stars
    .filter((s) => s.natalMutagen)
    .map((s) => ({ star: s.name, mutagen: s.natalMutagen as Mutagen }));

  // 同宫联动：以主星为主体，主星之间两两、主星对辅星各一条（避免组合爆炸）
  const samePalace: SynastryEntry[] = [];
  const majors = stars.filter((s) => s.kind === '主星');
  const others = stars.filter((s) => s.kind !== '主星');
  const subjects = majors.length ? majors : stars.slice(0, 1);
  subjects.forEach((a) => {
    const partners = [...majors.filter((m) => m.name !== a.name), ...others];
    partners.slice(0, 5).forEach((b) => {
      const s = pairSynastry(a, b);
      if (s) samePalace.push(s);
    });
  });

  // 三方四正
  const surrounding: SurroundEntry[] = [];
  ([['对宫', 6, WEIGHTS.opposite], ['三合', 4, WEIGHTS.trine], ['三合', 8, WEIGHTS.trine]] as const).forEach(
    ([role, offset, weight]) => {
      const q = palaceByOffset(astrolabe, palace, offset);
      if (!q) return;
      const qStars = allStars(q).map((s) => makeEntry(s, q, starKind(s, q)));
      const syn: SynastryEntry[] = [];
      subjects.forEach((a) => {
        qStars.slice(0, 4).forEach((b) => {
          const s = pairSynastry(a, b);
          if (s) syn.push(s);
        });
      });
      const qJi = qStars.filter((x) => x.nature === '吉').reduce((n, x) => n + x.intensity, 0);
      const qSha = qStars.filter((x) => x.nature === '煞').reduce((n, x) => n + x.intensity, 0);
      surrounding.push({
        role,
        palace: q.name,
        weight,
        stars: qStars.map((s) => s.name + (s.brightness ? `（${s.brightness}）` : '')),
        synastry: syn.slice(0, 4),
        natureScore: Number(natureScoreOf(qStars, weight).toFixed(2)),
        ji: Number((qJi * weight).toFixed(2)),
        sha: Number((qSha * weight).toFixed(2)),
      });
    },
  );

  const chains = buildChains(stars.map((s) => ({ name: s.name, element: s.element })));

  const selfJi = stars.filter((s) => s.nature === '吉').reduce((n, s) => n + s.intensity, 0);
  const selfSha = stars.filter((s) => s.nature === '煞').reduce((n, s) => n + s.intensity, 0);
  const ji = Number((selfJi + surrounding.reduce((n, g) => n + g.ji, 0)).toFixed(2));
  const sha = Number((selfSha + surrounding.reduce((n, g) => n + g.sha, 0)).toFixed(2));
  let rawScore = natureScoreOf(stars, WEIGHTS.self);
  surrounding.forEach((s) => {
    rawScore += s.natureScore;
  });
  const balance = ji + sha === 0 ? 0 : (ji - sha) / (ji + sha);
  const scoreValue = Number(balance.toFixed(2));

  // —— 卡点规则（v1.0：可解释、可追溯，不做宿命断语） ——
  const blockages: Blockage[] = [];
  const shaStars = stars.filter((s) => s.nature === '煞');
  const weakMain = stars.filter((s) => s.kind === '主星' && (s.brightness === '陷' || s.brightness === '不'));

  if (stars.length === 0) {
    blockages.push({
      id: 'empty-palace',
      severity: '低',
      title: '空宫',
      evidence: ['本宫无主星、无辅星'],
      impact: '本宫主题不直接显化，需借对宫星曜参看，容易「跟着对面的力量走」。',
      fix: '借对宫主星定调；本宫只做场景与修饰，不硬断。',
      action: '打开对宫，把对宫主星当作本宫的主轴来读。',
    });
  }

  if (stars.length > 0 && majors.length === 0) {
    blockages.push({
      id: 'no-major',
      severity: '中',
      title: '有星无主星（空宫）',
      evidence: [stars.map((s) => s.name).join('、')],
      impact: '缺少主轴，力量分散，容易受三方四正牵引而摇摆。',
      fix: '借对宫主星定主轴；把本宫辅星当「修饰与执行方式」。',
      action: '先读对宫，再回到本宫看这些辅星是怎么被带动的。',
    });
  }

  if (shaStars.length) {
    blockages.push({
      id: 'sha-in-palace',
      severity: shaStars.length >= 2 ? '高' : '中',
      title: `煞星入宫：${shaStars.map((s) => s.name).join('、')}`,
      evidence: shaStars.map(
        (s) => `${s.name}${s.brightness ? `（${s.brightness}）` : '（无庙旺数据）'}：${s.profile?.keywords.slice(0, 2).join('·') ?? ''}`,
      ),
      impact: '该领域容易出现摩擦、破耗或反覆；煞星不是「凶」，是「代价与磨砺」。',
      fix: shaStars.map((s) => s.profile?.use.fix).filter(Boolean).slice(0, 2).join('；') || '给该领域设规则与止损。',
      action: '为这个宫位设一条硬规则（上限/复核/隔离带），把煞气导流成纪律。',
    });
  }

  if (weakMain.length) {
    blockages.push({
      id: 'weak-main',
      severity: '中',
      title: '主星落陷',
      evidence: weakMain.map((s) => `${s.name}（${s.brightness}）`),
      impact: '主星能量弱，正面特质发挥不出，容易被环境与煞星带着走。',
      fix: '先补环境与制度，再谈发挥；用吉星与辅佐替它「加底座」。',
      action: '在该宫位先做「保底动作」，不追高。',
    });
  }

  const weakAuspice = stars.filter((s) => s.nature === '吉' && (s.brightness === '陷' || s.brightness === '不'));
  if (weakAuspice.length) {
    blockages.push({
      id: 'weak-auspice',
      severity: '中',
      title: `吉星落陷：${weakAuspice.map((s) => s.name).join('、')}`,
      evidence: weakAuspice.map((s) => `${s.name}（${s.brightness}）`),
      impact: '助力星本身力量不足，想帮也帮不到点上；容易「有名无实」。',
      fix: '用制度与复核替它补力；不把关键环节押在它身上。',
      action: '为这颗星负责的环节设复核或备份方案。',
    });
  }

  selfHua
    .filter((h) => h.mutagen === '忌')
    .forEach((h) => {
      blockages.push({
        id: `zihua-ji-${h.star}`,
        severity: '高',
        title: `自化忌：${h.star}`,
        evidence: [`本宫宫干${palace.heavenlyStem}引动 ${h.star} 化忌，落在本宫`],
        impact: '能量向内收，不是没力量，是力量在内部消耗；容易得而复失、做了很多仍觉得不够。',
        fix: h.text,
        action: '给这股内收一个「往里钻」的容器：专业深度、可交付成果、外部刹车。',
      });
    });

  natal
    .filter((h) => h.mutagen === '忌')
    .forEach((h) => {
      blockages.push({
        id: `natal-ji-${h.star}`,
        severity: '中',
        title: `生年忌：${h.star}`,
        evidence: [`${h.star}带生年化忌，落在${LABEL(palace.name)}`],
        impact: '先天在这个领域带着执念与课题，容易用力过猛或反复。',
        fix: '把执念转成专业与纪律；忌不是不能碰，是要「有方法地碰」。',
        action: '为这个领域写一条长期规则，而不是每次靠意志硬扛。',
      });
    });

  const luJiSame = natal.find((n) => n.mutagen === '禄') && selfHua.find((h) => h.mutagen === '忌');
  if (luJiSame) {
    blockages.push({
      id: 'lu-ji-same',
      severity: '中',
      title: '禄忌同宫（得中有失）',
      evidence: [`生年禄与自化忌同时落在${LABEL(palace.name)}`],
      impact: '先得到再泄出，容易出现「看起来有、实际留不住」的落差。',
      fix: '把「得到」尽快固化成制度、作品或资产，不让它停在感觉上。',
      action: '设一个「落袋为安」的动作：合同、存档、复盘三选一。',
    });
  }

  const oppositeSha = surrounding.find((s) => s.role === '对宫' && s.natureScore < -0.8);
  if (oppositeSha) {
    blockages.push({
      id: 'opposite-sha',
      severity: '中',
      title: '对宫冲照带煞',
      evidence: [`对宫${LABEL(oppositeSha.palace)}：${oppositeSha.stars.join('、')}`],
      impact: '外在环境对本宫形成压力，容易「人在家中坐，事从对面来」。',
      fix: '把对宫当镜子：外面反复出现的冲突，正是本宫要补的规则或边界。',
      action: '列出最近三次外部冲突，找出同一个模式，为它设一条边界。',
    });
  }

  const gaps: string[] = [];
  stars.forEach((s) => {
    if (!s.profile) gaps.push(`${s.name}：资料库未收录，按杂曜处理，建议补档案。`);
    else if (s.profile.tier === 'lite') gaps.push(`${s.name}：仅有简版档案，十二宫投射待补。`);
    if (s.kind !== '主星' && !s.brightness) gaps.push(`${s.name}：排盘未提供庙旺，力度按中性（0.8）计算。`);
  });
  if (!chains.length) gaps.push('本宫未形成长度 ≥3 的顺生/相克链，改用两两生克判读。');
  gaps.push('本卡为本命盘（静态）；大限、流年、流曜尚未叠加。');

  const SEVERITY_RANK: Record<Blockage['severity'], number> = { 高: 3, 中: 2, 低: 1 };
  blockages.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  const strategies = stars
    .filter((s) => s.profile)
    .slice(0, 4)
    .map((s) => ({
      star: s.name,
      field: s.profile!.use.field,
      risk: s.profile!.use.risk,
      fix: s.profile!.use.fix,
      motto: s.profile!.use.motto,
    }));

  return {
    chart: {
      gender: astrolabe.gender,
      solarDate: astrolabe.solarDate,
      lunarDate: astrolabe.lunarDate,
      fiveElementsClass: astrolabe.fiveElementsClass,
      soul: astrolabe.soul,
      body: astrolabe.body,
    },
    palace: {
      name: palace.name,
      label: LABEL(palace.name),
      stem: palace.heavenlyStem,
      branch: palace.earthlyBranch,
      isBody: palace.isBodyPalace,
      isMing: palace.name === '命宫',
      changsheng: palace.changsheng12,
      decadal: palace.decadal ? `${palace.decadal.range[0]}–${palace.decadal.range[1]}岁（${palace.decadal.heavenlyStem}${palace.decadal.earthlyBranch}）` : '',
      domain,
      focus: info.focus,
    },
    stars,
    majorCount: majors.length,
    natal,
    selfHua,
    fly,
    samePalace,
    surrounding,
    chains,
    score: { value: scoreValue, raw: Number(rawScore.toFixed(2)), label: scoreLabel(scoreValue), ji, sha },
    blockages,
    strategies,
    gaps,
    index: withIndex ? buildIndex(astrolabe) : [],
  };
}

/** 纯文本版宫位卡：给复制、存档、喂给通用大模型 */
export function snapshotToText(s: PalaceSnapshot): string {
  const L: string[] = [];
  const push = (t = '') => L.push(t);

  push(`━━ 宫位卡 1.0 · ${s.palace.label}（${s.palace.stem}${s.palace.branch}）━━`);
  push(
    `命主 ${s.chart.soul} · 身主 ${s.chart.body} · ${s.chart.fiveElementsClass} · ${s.chart.lunarDate}（${s.chart.solarDate}）· ${s.chart.gender}`,
  );
  push(
    `身宫：${s.palace.isBody ? '是（此宫为后天重心）' : '否'}｜长生十二神：${s.palace.changsheng || '—'}｜大限：${s.palace.decadal || '—'}`,
  );
  push();

  push('【一、宫位定位】');
  push(`领域：${s.palace.domain}`);
  push(`关注：${s.palace.focus.join('、') || '—'}`);
  push(
    `权重：本宫 1.0 ＞ 对宫 0.6 ＞ 三合 0.45；吉煞比 ${s.score.value > 0 ? '+' : ''}${s.score.value}（${s.score.label}），吉星权重 ${s.score.ji}，煞星权重 ${s.score.sha}。`,
  );
  push('吉煞比 =（吉−煞）/（吉+煞），只描述环境强弱，不作吉凶断言。');
  push();

  push('【二、本宫星曜】');
  if (!s.stars.length) push('无星（空宫），借对宫参看。');
  s.stars.forEach((x) => {
    const tags = [
      x.element ? `${x.element}` : null,
      x.brightness ? `亮度${x.brightness}` : '亮度未提供',
      x.natalMutagen ? `生年${x.natalMutagen}` : null,
      x.selfHua ? `自化${x.selfHua}` : null,
    ].filter(Boolean);
    push(`· ${x.name}（${x.kind}｜${tags.join('·')}）`);
    if (x.profile) push(`  本质：${x.profile.essence}`);
    push(`  本宫表现：${x.palaceLine}${x.lineSource === 'derived' ? '（由本体推导）' : ''}`);
  });
  push();

  push('【三、同宫联动】');
  if (!s.samePalace.length) push('无可用联动（星曜资料不足）。');
  s.samePalace.forEach((x) => {
    push(`· 以「${x.subject}」为主体：${x.text}【${x.verdict}】`);
    if (x.note) push(`  注：${x.note}`);
  });
  push();

  push('【四、三方四正（会照）】');
  if (!s.surrounding.length) push('待补。');
  s.surrounding.forEach((x) => {
    push(
      `· ${x.role}·${LABEL(x.palace)}（权重 ${x.weight}，吉煞分 ${x.natureScore}）：${x.stars.join('、') || '空宫'}`,
    );
    x.synastry.forEach((y) => push(`  - ${y.text}`));
  });
  push();

  push('【五、五行链】');
  if (!s.chains.length) push('未形成 ≥3 环的链，见上两两生克。');
  s.chains.forEach((c) => push(`· ${c.text}`));
  push();

  push('【六、四化】');
  push(
    `生年四化落本宫：${s.natal.length ? s.natal.map((n) => `${n.star}化${n.mutagen}`).join('、') : '无'}`,
  );
  push(
    `宫干自化：${s.selfHua.length ? s.selfHua.map((h) => `${h.star}自化${h.mutagen}`).join('、') : '无'}`,
  );
  s.selfHua.forEach((h) => push(`  - ${h.star}自化${h.mutagen}：${h.text}`));
  push(`本宫宫干飞化：${s.fly.length ? s.fly.map((f) => `${f.star}化${f.mutagen}→${LABEL(f.to)}`).join('、') : '无'}`);
  push();

  push('【七、卡点与策略】');
  if (!s.blockages.length) push('未触发 v1.0 规则卡点；仍以五行联动为主。');
  s.blockages.forEach((b, i) => {
    push(`${i + 1}. [${b.severity}] ${b.title}`);
    push(`   依据：${b.evidence.join('；')}`);
    push(`   影响：${b.impact}`);
    push(`   解法：${b.fix}`);
    push(`   动作：${b.action}`);
  });
  push();

  push('【八、用星建议】');
  s.strategies.forEach((t) => {
    push(`· ${t.star}：适合 ${t.field}｜风险 ${t.risk}｜修正 ${t.fix}`);
    push(`  一句话：${t.motto}`);
  });
  push();

  push('【九、数据缺口】');
  s.gaps.forEach((g) => push(`· ${g}`));
  push();
  push('（本卡为结构化数据；意象图画与化煞为权由下方 Prompt 生成，不在本地硬编。）');

  return L.join('\n');
}

/** 给通用大模型的复制 Prompt：结构说明 + 本宫数据 + 输出格式 + 质量红线 */
export function buildPalacePromptText(s: PalaceSnapshot): string {
  const data = snapshotToText(s);
  return `# 角色
你是一名紫微斗数宫位解构助手。请按下面的固定结构，为「${s.palace.label}」生成一张宫位卡。
你不做宿命断言，不预测具体事件，不提供医疗、法律、投资建议。

# 解构原则
1. 宫位是场景滤镜：同一颗星在本宫，五行不变，作用领域变了。先定本宫管什么，再解星曜在此宫的表现。
2. 先看本宫（权重 1.0）定质地，再看对宫（0.6）与三合（0.45）定格局；本宫决定「是什么」，会照决定「在什么环境里」。
3. 五行生克只决定能量关系（生我/同我/我生/我克/克我），不单独断吉凶；必须叠加吉煞性质、庙旺、四化与宫位场景。
4. 庙旺是力度，四化是方向：庙旺放大四化力度，但不改变四化的性质。
5. 自化是能量外泄或内收：自化禄偏露白、自化权偏硬推、自化科偏疏离、自化忌偏内耗；自化不等于凶。
6. 五行遇星口诀：生我者贵，同我者强；我生者泄，我克者劳；克我者压，旺则成器，弱则受伤。
7. 星曜无庙旺数据时按中性处理，并明确标注「未提供」，不得臆造。
8. 一切结论必须落到：发挥方向、风险盲点、修正课题、可执行动作。

# 输入数据（宫位卡 1.0）
${data}

# 输出格式（严格按此结构）
【一句话本质】本宫的核心矛盾，一句话。
【宫位定位】本宫管什么、与命宫/身宫的关系、权重判断。
【本宫星曜】逐星：五行阴阳·庙旺·四化 → 在此宫的具体表现（场景化，不写通用象义）。
【同宫联动】谁生谁、谁克谁、谁被放大、谁被牵制；给出 1–3 条化合结论。
【三方四正】对宫与三合带来的格局与压力；吉煞会照如何托举或拉扯本宫。
【五行链】用「A → B → C」写出本宫的主生链与主克链，并解释这条链把能量送到哪里、卡在哪里。
【卡点清单】逐条：依据（星/宫/规则）→ 影响 → 解法 → 一个本周可做的动作。
【用星策略】逐星：适合怎么用、容易卡在哪、修正方向。
【意象图画】用一幅具体画面承载本宫五行生克与联动：构图（左/右/中）、元素逐一对应星曜、动作对应生克、一句话读画。不要写成抒情散文。
【化煞为权】本宫的煞星/落陷/自化忌如何导流成能力：路径 → 前提条件 → 达到权柄的标志。
【一句话总结】本宫最值得记住的一句话。
【已自检】逐项确认：是否先定宫位场景？是否区分本宫与会照？是否叠加庙旺与四化？是否避免宿命断语？

# 质量红线
- 不得把命宫的解释直接套到其他宫位。
- 不得在数据缺失时虚构会照、庙旺或四化。
- 不得只写星曜通用象义而不写本宫场景。
- 不得把「化煞为权」写成口号，必须给导流路径。
- 不得输出绝对化、恐吓式断语。`;
}
