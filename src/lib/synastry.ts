// 双人合盘 v2.0：六维加权 + 星座关系类型 + A 的高分 B 画像。
// 关系参考，不是宿命判断，也不替代沟通与心理咨询。

import type { Astrolabe, Palace, Star } from '../types';
import { elementOf, profileOf, relationOf } from './wuxing';
import { STAR_PROFILES, type Element } from './knowledge/starProfiles';
import type { Relation as WuxingRelation } from './wuxing';

export type SynastrySection = { title: string; body: string };

export type SynastryDimension = {
  key: 'core' | 'attraction' | 'spirit' | 'communication' | 'wuxing' | 'zodiac';
  label: string;
  score: number;
  weight: number;
  contribution: number;
  summary: string;
  evidence: string[];
};

export type SynastryArchetype = {
  key: string;
  title: string;
  subtitle: string;
  description: string;
  strengths: string[];
  watchouts: string[];
};

export type ZodiacInfo = {
  a: string;
  b: string;
  elementA: string;
  elementB: string;
  score: number;
  label: string;
  note: string;
};

export type SynastryResult = {
  score: number;
  grade: string;
  oneLine: string;
  keywords: string[];
  sections: SynastrySection[];
  advice: string[];
  elements: { a: Element; b: Element; relation: WuxingRelation };
  dimensions: SynastryDimension[];
  archetype: SynastryArchetype;
  zodiac: ZodiacInfo;
};

export type IdealPartner = {
  title: string;
  summary: string;
  stars: string[];
  zodiacs: { sign: string; score: number; note: string }[];
  qualities: string[];
  avoid: string[];
  evidence: string[];
};

const REL_WORD: Record<WuxingRelation, string> = {
  生我: '对方生你',
  同我: '同频',
  我生: '你生对方',
  我克: '你克对方',
  克我: '对方克你',
};

const REL_SCORE: Record<WuxingRelation, number> = {
  生我: 88,
  同我: 92,
  我生: 72,
  我克: 52,
  克我: 42,
};

const TOUGH = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);

const ZODIAC_SIGNS = [
  { name: '白羊座', el: '火' },
  { name: '金牛座', el: '土' },
  { name: '双子座', el: '风' },
  { name: '巨蟹座', el: '水' },
  { name: '狮子座', el: '火' },
  { name: '处女座', el: '土' },
  { name: '天秤座', el: '风' },
  { name: '天蝎座', el: '水' },
  { name: '射手座', el: '火' },
  { name: '摩羯座', el: '土' },
  { name: '水瓶座', el: '风' },
  { name: '双鱼座', el: '水' },
];

const ELEMENT_LABEL: Record<string, string> = { 火: '火象', 土: '土象', 风: '风象', 水: '水象' };

const FEEDS: Record<Element, Element> = { 木: '水', 火: '木', 土: '火', 金: '土', 水: '金' };

const ELEMENT_QUALITY: Record<Element, string> = {
  木: '有成长感、愿意沟通、能一起把日子往前推',
  火: '主动、热情、能把气氛和行动力带起来',
  土: '稳定、守边界、能把计划落到现实',
  金: '有原则、执行力强、不拖泥带水',
  水: '能接住情绪、表达细腻、给关系留余地',
};

function clamp(n: number, min = 25, max = 96): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number): number {
  return Math.round(n);
}

function palaceOf(c: Astrolabe, name: string): Palace | undefined {
  return c.palaces.find((p) => p.name === name);
}

function majorOf(p?: Palace): string | undefined {
  return p?.majorStars[0]?.name;
}

function starsOf(p?: Palace): Star[] {
  return p ? [...p.majorStars, ...p.minorStars, ...p.adjectiveStars] : [];
}

function elementOfStar(star?: string): Element | undefined {
  return star ? elementOf(star) : undefined;
}

function keywordsOf(star?: string): string[] {
  return star ? (profileOf(star)?.keywords ?? []) : [];
}

function profileKeywords(star?: string, n = 3): string {
  return star ? (profileOf(star)?.keywords ?? []).slice(0, n).join(' · ') : '';
}

function sharedKeywords(a?: string, b?: string): string[] {
  const A = new Set(keywordsOf(a));
  return keywordsOf(b).filter((k) => A.has(k));
}

function countTough(p?: Palace): number {
  return starsOf(p).filter((s) => TOUGH.has(s.name)).length;
}

function countJi(p?: Palace): number {
  return starsOf(p).filter((s) => s.mutagen === '忌').length;
}

function relationSentence(rel: WuxingRelation): string {
  switch (rel) {
    case '生我':
      return '对方的能量会托住你，容易在你累的时候接住你；但别把支持当成理所当然。';
    case '同我':
      return '同频感强，很多话不用解释；也容易一起放大同一种情绪。';
    case '我生':
      return '你更容易主动付出、照顾对方；要留意自己的需求有没有被看见。';
    case '我克':
      return '你容易想主导或修正对方；把「为你好」换成具体请求，会少很多摩擦。';
    case '克我':
      return '对方容易压到你的节奏；冲突时先停一下，别在情绪最高点做决定。';
  }
}

function zodiacCompatibility(aSign: string, bSign: string): ZodiacInfo {
  const ai = ZODIAC_SIGNS.findIndex((s) => s.name === aSign);
  const bi = ZODIAC_SIGNS.findIndex((s) => s.name === bSign);
  if (ai < 0 || bi < 0) {
    return { a: aSign || '未知', b: bSign || '未知', elementA: '—', elementB: '—', score: 58, label: '星座待补', note: '双方星座资料不全，这一项按中性分处理。' };
  }
  const A = ZODIAC_SIGNS[ai];
  const B = ZODIAC_SIGNS[bi];
  const diff = Math.abs(ai - bi);
  const d = Math.min(diff, 12 - diff);
  const same = A.el === B.el;
  const compatible = same || (A.el === '火' && B.el === '风') || (A.el === '风' && B.el === '火') || (A.el === '土' && B.el === '水') || (A.el === '水' && B.el === '土');
  let score = 62;
  let label = '需要磨合';
  let note = `${A.name} × ${B.name}：元素不同，节奏与表达方式需要翻译。`;

  if (d === 0) {
    score = 90; label = '同星座'; note = `${A.name} 与 ${B.name} 同星座：相似度高，容易互相理解，也容易照见彼此的盲区。`;
  } else if (same && (d === 4 || d === 8)) {
    score = 88; label = '同象三合'; note = `${A.name} × ${B.name}：同属${ELEMENT_LABEL[A.el]}，心智与节奏天然靠近。`;
  } else if (compatible && d === 2) {
    score = 84; label = '六合默契'; note = `${A.name} × ${B.name}：${ELEMENT_LABEL[A.el]} × ${ELEMENT_LABEL[B.el]}，互补而不费力。`;
  } else if (d === 6) {
    score = 70; label = '对宫互补'; note = `${A.name} × ${B.name}：对宫关系，强吸引也强差异，适合把对方当镜子。`;
  } else if (d === 3) {
    score = 56; label = '刑相位'; note = `${A.name} × ${B.name}：刑相位，容易在节奏与边界上互相触发。`;
  } else if (compatible) {
    score = 76; label = '元素互补'; note = `${A.name} × ${B.name}：${ELEMENT_LABEL[A.el]} × ${ELEMENT_LABEL[B.el]}，不同但能互相补位。`;
  }
  return { a: A.name, b: B.name, elementA: A.el, elementB: B.el, score, label, note };
}

function zodiacArchetype(z: ZodiacInfo): SynastryArchetype {
  const pair = [z.elementA, z.elementB].sort().join('');
  const same = z.elementA === z.elementB;
  if (same && z.elementA === '风') {
    return {
      key: 'air-air', title: '风象同频型', subtitle: '像双子 × 天秤：先聊得来，再谈长久',
      description: '你们都重交流、社交与心智刺激，关系里最怕无聊，也最容易被对方的表达吸引。',
      strengths: ['话题不断，能一起玩、一起见朋友', '给彼此空间，不靠黏人来确认爱', '冲突时讲道理比讲情绪更有效'],
      watchouts: ['容易停留在「聊得很好」而回避落地', '情绪被理性覆盖，真正难受时反而不说', '选择太多，容易犹豫或把关系悬着'],
    };
  }
  if (same && z.elementA === '火') {
    return { key: 'fire-fire', title: '双火共振型', subtitle: '热烈、直接、一起往前冲', description: '你们互相点火，行动力和热情都很强；关系推进快，但需要有人负责降温。', strengths: ['互相鼓励，敢一起冒险', '不绕弯子，冲突后恢复快'], watchouts: ['火气上来时话太冲', '容易一起冲动做决定'] };
  }
  if (same && z.elementA === '土') {
    return { key: 'earth-earth', title: '双土稳建型', subtitle: '稳定、务实、把日子过起来', description: '你们重视承诺与现实安排，关系像盖房子；稳，但也要防止太闷。', strengths: ['责任感和执行力强', '价值观与生活秩序容易对齐'], watchouts: ['容易把浪漫排在待办之后', '固执时谁也不先低头'] };
  }
  if (same && z.elementA === '水') {
    return { key: 'water-water', title: '双水共感型', subtitle: '情绪同频，温柔但容易内耗', description: '你们对情绪的感知都很细，容易互相理解；也容易一起沉进情绪里。', strengths: ['共情力强，能接住彼此', '关系有柔软与想象力'], watchouts: ['不舒服时容易猜，而不是问', '边界模糊，容易互相拖累'] };
  }
  if (pair === '火风') {
    return { key: 'fire-air', title: '火风点火型', subtitle: '一个点火，一个送风', description: '火象给行动，风象给想法与社交，组合很有活力；要防止热度来得快去得也快。', strengths: ['互相激发，玩得来也做得动', '一个人提想法，一个人敢推进'], watchouts: ['承诺容易停在口头', '注意力转移太快，忽略收尾'] };
  }
  if (pair === '水土') {
    return { key: 'earth-water', title: '水土互养型', subtitle: '土给安全感，水给情绪滋养', description: '土象的稳定接住水象的敏感，水象的柔软让土象不那么硬；是很容易过日子的组合。', strengths: ['一个能落地，一个能共情', '对家庭与长期关系有耐心'], watchouts: ['土象容易嫌水象情绪多', '水象容易觉得土象不够表达'] };
  }
  if (pair === '火土') {
    return { key: 'fire-earth', title: '火土磨合型', subtitle: '一个要快，一个要稳', description: '火象想马上行动，土象要先看风险；磨合好了是执行力，磨合不好是互相拖。', strengths: ['火象带来突破，土象负责兜底', '能把冲动变成可执行计划'], watchouts: ['节奏冲突时容易互相否定', '一个嫌慢，一个嫌冒进'] };
  }
  if (pair === '风水') {
    return { key: 'air-water', title: '风水拉扯型', subtitle: '一个讲道理，一个讲感受', description: '风象想分析，水象想被理解；不是不相配，而是需要先接情绪再讲逻辑。', strengths: ['风象能帮水象抽离，水象能帮风象落地感受', '关系有深度也有话题'], watchouts: ['一方觉得对方冷，一方觉得对方情绪化', '容易在沟通方式上绕圈'] };
  }
  return { key: 'mixed', title: '互补张力型', subtitle: '不同，所以有吸引力', description: '你们的元素组合差异较大，吸引力来自不同；长期靠边界与翻译能力。', strengths: ['能补足彼此的盲区', '关系有新鲜感'], watchouts: ['默认对方和自己一样', '冲突时容易升级为价值观之争'] };
}

function archetypeFor(z: ZodiacInfo, aSoul?: string, sameStar?: boolean): SynastryArchetype {
  const base = zodiacArchetype(z);
  if (sameStar && aSoul) {
    return {
      ...base,
      subtitle: `${base.subtitle} · 同主星共振`,
      strengths: [`双方命宫同为「${aSoul}」，容易一眼认出彼此`, ...base.strengths].slice(0, 3),
      watchouts: ['同星会放大同一种盲区，别把对方当成自己的延伸', ...base.watchouts].slice(0, 3),
    };
  }
  return base;
}

function zodiacRank(aSign: string, limit = 4): { sign: string; score: number; note: string }[] {
  return ZODIAC_SIGNS
    .filter((s) => s.name !== aSign)
    .map((s) => {
      const z = zodiacCompatibility(aSign, s.name);
      return { sign: s.name, score: z.score, note: z.note };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function compareCharts(a: Astrolabe, b: Astrolabe, aName: string, bName: string): SynastryResult {
  const aSoul = majorOf(palaceOf(a, '命宫'));
  const bSoul = majorOf(palaceOf(b, '命宫'));
  const aSpouse = majorOf(palaceOf(a, '夫妻'));
  const bSpouse = majorOf(palaceOf(b, '夫妻'));
  const aFu = majorOf(palaceOf(a, '福德'));
  const bFu = majorOf(palaceOf(b, '福德'));
  const aSoulPalace = palaceOf(a, '命宫');
  const bSoulPalace = palaceOf(b, '命宫');
  const aSpousePalace = palaceOf(a, '夫妻');
  const bSpousePalace = palaceOf(b, '夫妻');
  const aFuPalace = palaceOf(a, '福德');
  const bFuPalace = palaceOf(b, '福德');

  const aEl = elementOfStar(aSoul) ?? elementOf(a.soul) ?? '土';
  const bEl = elementOfStar(bSoul) ?? elementOf(b.soul) ?? '土';
  const rel = relationOf(aEl, bEl);
  const relBack = relationOf(bEl, aEl);
  const zodiac = zodiacCompatibility(a.sign, b.sign);
  const sameStar = Boolean(aSoul && bSoul && aSoul === bSoul);
  const shared = sharedKeywords(aSoul, bSoul);

  const coreRaw =
    60 +
    (sameStar ? 8 : 0) +
    (REL_SCORE[rel] - 65) * 0.3 +
    Math.min(6, shared.length * 2) -
    countTough(aSoulPalace) * 4 -
    countTough(bSoulPalace) * 4 -
    countJi(aSoulPalace) * 3 -
    countJi(bSoulPalace) * 3;

  const spouseRelationScore = (spouseStar?: string, soulStar?: string, spouseEl?: Element, soulEl?: Element): number => {
    if (!spouseStar || !soulStar) return 58;
    let s = 58;
    if (spouseStar === soulStar) s += 14;
    if (spouseEl && soulEl) s += (REL_SCORE[relationOf(spouseEl, soulEl)] - 65) * 0.35;
    if (profileOf(spouseStar)?.category === '桃花') s += 6;
    if (profileOf(spouseStar)?.category === '煞星') s -= 5;
    return s;
  };

  const aSpouseEl = elementOfStar(aSpouse);
  const bSpouseEl = elementOfStar(bSpouse);
  const attractionRaw =
    58 +
    spouseRelationScore(aSpouse, bSoul, aSpouseEl, elementOfStar(bSoul)) * 0.28 +
    spouseRelationScore(bSpouse, aSoul, bSpouseEl, elementOfStar(aSoul)) * 0.28 -
    countTough(aSpousePalace) * 3 -
    countTough(bSpousePalace) * 3 -
    countJi(aSpousePalace) * 3 -
    countJi(bSpousePalace) * 3;

  const spiritRaw =
    58 +
    (aFu && bFu && aFu === bFu ? 12 : 0) +
    (aFu && bFu ? (REL_SCORE[relationOf(elementOfStar(aFu) ?? aEl, elementOfStar(bFu) ?? bEl)] - 65) * 0.25 : 0) +
    Math.min(6, sharedKeywords(aFu, bFu).length * 2) -
    countTough(aFuPalace) * 3 -
    countTough(bFuPalace) * 3;

  const communicationRaw =
    58 +
    (sameStar ? 10 : 0) +
    Math.min(8, shared.length * 2) +
    (REL_SCORE[rel] - 65) * 0.2 -
    countJi(aSoulPalace) * 2 -
    countJi(bSoulPalace) * 2;

  const wuxingRaw = (REL_SCORE[rel] + REL_SCORE[relBack]) / 2;

  const dimensions: SynastryDimension[] = [
    {
      key: 'core', label: '核心性格', score: round(clamp(coreRaw)), weight: 22,
      contribution: 0,
      summary: `命宫 ${aSoul ? `${aSoul}（${aEl}）` : `空宫（命主${a.soul}·${aEl}）`} × ${bSoul ? `${bSoul}（${bEl}）` : `空宫（命主${b.soul}·${bEl}）`}：${REL_WORD[rel]}；${shared.length ? `共同关键词 ${shared.slice(0, 3).join('、')}` : '关键词交集不多'}。`,
      evidence: [`${aName}命宫：${aSoul ?? `空宫，命主${a.soul}`}${profileKeywords(aSoul) ? `（${profileKeywords(aSoul)}）` : ''}`, `${bName}命宫：${bSoul ?? `空宫，命主${b.soul}`}${profileKeywords(bSoul) ? `（${profileKeywords(bSoul)}）` : ''}`],
    },
    {
      key: 'attraction', label: '情感吸引', score: round(clamp(attractionRaw)), weight: 20,
      contribution: 0,
      summary: `夫妻宫与对方命宫互相照见：${aSpouse ?? '空宫'} × ${bSoul ?? '空宫'}；${bSpouse ?? '空宫'} × ${aSoul ?? '空宫'}。`,
      evidence: [`${aName}夫妻宫：${aSpouse ?? '空宫'}${aSpouseEl ? `（${aSpouseEl}）` : ''}`, `${bName}夫妻宫：${bSpouse ?? '空宫'}${bSpouseEl ? `（${bSpouseEl}）` : ''}`],
    },
    {
      key: 'spirit', label: '精神共鸣', score: round(clamp(spiritRaw)), weight: 15,
      contribution: 0,
      summary: `福德宫 ${aFu ?? '空宫'} × ${bFu ?? '空宫'}：${aFu && bFu && aFu === bFu ? '取悦自己的方式很像' : '恢复能量的方式不同，需要留空间'}。`,
      evidence: [`${aName}福德宫：${aFu ?? '空宫'}`, `${bName}福德宫：${bFu ?? '空宫'}`],
    },
    {
      key: 'communication', label: '沟通节奏', score: round(clamp(communicationRaw)), weight: 15,
      contribution: 0,
      summary: `${REL_WORD[rel]}；${shared.length ? `能共享 ${shared.slice(0, 3).join('、')} 的语言` : '表达方式需要互相翻译'}。`,
      evidence: [`命宫五行：${aEl} × ${bEl}`, `共同关键词：${shared.length ? shared.join('、') : '较少'}`],
    },
    {
      key: 'wuxing', label: '五行互补', score: round(clamp(wuxingRaw)), weight: 16,
      contribution: 0,
      summary: `${aEl} × ${bEl}：${REL_WORD[rel]} / ${REL_WORD[relBack]}；${REL_SCORE[rel] >= 80 ? '相互生扶' : REL_SCORE[rel] >= 60 ? '有补有耗' : '需要主动调频'}。`,
      evidence: [`${aName}：${aEl}`, `${bName}：${bEl}`, `关系：${rel} / ${relBack}`],
    },
    {
      key: 'zodiac', label: '星座默契', score: round(zodiac.score), weight: 12,
      contribution: 0,
      summary: `${zodiac.a} × ${zodiac.b}：${zodiac.label}。${zodiac.note}`,
      evidence: [zodiac.note],
    },
  ];

  dimensions.forEach((d) => { d.contribution = Number(((d.score * d.weight) / 100).toFixed(1)); });
  const score = round(clamp(dimensions.reduce((sum, d) => sum + (d.score * d.weight) / 100, 0), 30, 95));
  const grade = score >= 85 ? '高度同频' : score >= 72 ? '同频互补' : score >= 58 ? '可磨合' : '张力型';
  const archetype = archetypeFor(zodiac, aSoul, sameStar);

  const keywords = Array.from(new Set([
    archetype.title,
    zodiac.label,
    REL_WORD[rel],
    attractionRaw >= 72 ? '吸引力' : '需磨合',
    ...profileKeywords(aSpouse, 2).split(' · '),
    ...profileKeywords(bSoul, 2).split(' · '),
  ].filter(Boolean))).slice(0, 5);

  const oneLine =
    score >= 78
      ? `${aName} 与 ${bName} 属于「${archetype.title}」：有互相托举的地方，适合把默契变成共同计划。`
      : score >= 62
        ? `${aName} 与 ${bName} 属于「${archetype.title}」：有吸引力，也有需要说清楚的节奏与边界。`
        : `${aName} 与 ${bName} 属于「${archetype.title}」：差异明显，张力也是吸引力；先对齐节奏，再谈长期安排。`;

  const sections: SynastrySection[] = [
    {
      title: '吸引力',
      body: [
        `${aName} 的夫妻宫主星是「${aSpouse ?? '空宫'}」${profileKeywords(aSpouse) ? `（${profileKeywords(aSpouse)}）` : ''}，`,
        `${bName} 的命宫主星是「${bSoul ?? '空宫'}」${profileKeywords(bSoul) ? `（${profileKeywords(bSoul)}）` : ''}。`,
        aSpouse && bSoul && aSpouse === bSoul
          ? '同一颗星照进彼此，容易一眼认出对方，也容易把对方当成自己。'
          : relationSentence(rel),
        aSpouseEl && elementOfStar(bSoul) && ['我克', '克我'].includes(relationOf(aSpouseEl, elementOfStar(bSoul) as Element))
          ? '夫妻宫与对方命宫之间带一点「克」：吸引与摩擦并存，越靠近越要把边界说清楚。'
          : '',
      ].join(''),
    },
    {
      title: '沟通方式',
      body: `${aName} 的命宫${aSoul ? `主星「${aSoul}」${profileKeywords(aSoul) ? `，关键词是 ${profileKeywords(aSoul)}` : ''}` : `无主星（借对宫；以命主${a.soul}参看）`}；${bName} 的命宫主星「${bSoul ?? '空宫'}」${profileKeywords(bSoul) ? `，关键词是 ${profileKeywords(bSoul)}` : ''}。${relationSentence(rel)} 沟通时先说感受，再说请求，比直接给结论更容易被接住。`,
    },
    {
      title: '容易卡住的地方',
      body:
        countTough(aSpousePalace) || countTough(bSpousePalace) || countJi(aSoulPalace) || countJi(bSoulPalace)
          ? `夫妻宫煞星与命宫生年忌是主要扣分项：${[
            countTough(aSpousePalace) ? `${aName}夫妻宫煞星 ${countTough(aSpousePalace)} 个` : '',
            countTough(bSpousePalace) ? `${bName}夫妻宫煞星 ${countTough(bSpousePalace)} 个` : '',
            countJi(aSoulPalace) || countJi(bSoulPalace) ? `生年忌 ${countJi(aSoulPalace) + countJi(bSoulPalace)} 个` : '',
          ].filter(Boolean).join('、')}。压力大时容易把「我需要」说成「你总是」，建议把具体事件、感受、请求分开说。`
          : '结构上没有明显的硬冲突，更多是节奏差异：一方快、一方慢时，先约定决策时限，而不是催对方立刻表态。',
    },
    {
      title: '共同课题',
      body: `福德宫一边是「${aFu ?? '空宫'}」，一边是「${bFu ?? '空宫'}」。${aFu && bFu && aFu === bFu ? '两边取悦自己的方式很像，容易一起放松，也容易一起逃避。' : '各自恢复能量的方式不同，需要给彼此留独处和社交的空间。'}`,
    },
  ];

  const advice = [
    ...archetype.watchouts.slice(0, 1),
    rel === '我克' || rel === '克我'
      ? '冲突升级时先停 24 小时，再用「我感到…我希望…」的句式重开对话。'
      : rel === '我生'
        ? '你容易多做，定期问对方「这件事你想自己来，还是需要我帮？」'
        : '把默契落到具体安排：钱、时间、家务、边界各写一条可执行的约定。',
    '合盘只显示结构倾向，不替你们做决定；真正的关系质量在每一次具体沟通里。',
  ];

  return {
    score,
    grade,
    oneLine,
    keywords,
    sections,
    advice,
    elements: { a: aEl, b: bEl, relation: rel },
    dimensions,
    archetype,
    zodiac,
  };
}

export function idealPartnerProfile(a: Astrolabe, aName: string): IdealPartner {
  const soul = majorOf(palaceOf(a, '命宫'));
  const spouse = majorOf(palaceOf(a, '夫妻'));
  const fu = majorOf(palaceOf(a, '福德'));
  const baseEl = elementOfStar(spouse) ?? elementOfStar(soul) ?? elementOf(a.soul) ?? '土';
  const feed = FEEDS[baseEl];
  const idealEls: Element[] = [feed, baseEl];
  const stars = Object.values(STAR_PROFILES)
    .filter((p) => p.category === '主星' && idealEls.includes(p.wuxing))
    .map((p) => p.name)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 5);
  const spouseSha = starsOf(palaceOf(a, '夫妻')).filter((s) => TOUGH.has(s.name) || s.mutagen === '忌').map((s) => s.name);
  const qualities = [ELEMENT_QUALITY[feed], ...(spouse ? (profileOf(spouse)?.keywords ?? []).slice(0, 2) : [])]
    .filter((x, i, arr) => arr.indexOf(x) === i)
    .slice(0, 3);
  const zodiacs = a.sign ? zodiacRank(a.sign, 4) : [];
  const avoid = [
    spouseSha.length ? `少碰把「${[...new Set(spouseSha)].join('、')}」特质放大的人：控制、拉扯或情绪忽冷忽热。` : '少碰过度控制、只会消耗你边界的人。',
    '不需要找和你完全相同的人；高分 B 是能补位，而不是复制你。',
  ];
  const title = spouse ? `${feed}${baseEl}相生型` : `${baseEl}象同频型`;
  return {
    title,
    summary: `${aName} 的夫妻宫主星是「${spouse ?? '空宫'}」，${spouse ? `五行属${baseEl}，更适合找能生扶${baseEl}的${feed}型，或同${baseEl}型` : `本命${baseEl}气偏重，适合找能承接你节奏的人`}。`,
    stars,
    zodiacs,
    qualities,
    avoid,
    evidence: [
      `夫妻宫：${spouse ?? '空宫'}${profileKeywords(spouse, 2) ? `（${profileKeywords(spouse, 2)}）` : ''}`,
      `福德宫：${fu ?? '空宫'}`,
      `太阳星座：${a.sign || '未知'}`,
    ],
  };
}

export function synastryText(r: SynastryResult, aName: string, bName: string): string {
  return [
    `【紫微合盘 v2】${aName} × ${bName}`,
    `加权总分 ${r.score} · ${r.grade}｜关系类型：${r.archetype.title}`,
    `星座：${r.zodiac.a} × ${r.zodiac.b}（${r.zodiac.label}）`,
    `五行：${r.elements.a} × ${r.elements.b}（${REL_WORD[r.elements.relation]}）`,
    `关键词：${r.keywords.join(' · ')}`,
    '',
    '【分维度】',
    ...r.dimensions.map((d) => `· ${d.label}：${d.score}/100 × ${d.weight}% → ${d.contribution}｜${d.summary}`),
    '',
    '【关系类型】',
    `${r.archetype.title}：${r.archetype.description}`,
    `优势：${r.archetype.strengths.join('；')}`,
    `注意：${r.archetype.watchouts.join('；')}`,
    '',
    ...r.sections.map((s) => `【${s.title}】\n${s.body}`),
    '',
    '【相处建议】',
    ...r.advice.map((a) => `· ${a}`),
    '',
    '总分是六维加权，不是感情好坏；低分也可能代表高吸引。',
    '传统命理参考，不构成情感、心理、法律建议。',
  ].join('\n');
}
