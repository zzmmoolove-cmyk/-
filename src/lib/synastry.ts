// 双人合盘 v1.0：以命宫/夫妻宫/福德宫的主星五行与星性做结构化比对。
// 这是关系参考，不是宿命判断，也不替代沟通与心理咨询。

import type { Astrolabe, Palace, Star } from '../types';
import { elementOf, profileOf, relationOf } from './wuxing';
import type { Element } from './knowledge/starProfiles';
import type { Relation as WuxingRelation } from './wuxing';

export type SynastrySection = { title: string; body: string };

export type SynastryResult = {
  score: number;
  grade: string;
  oneLine: string;
  keywords: string[];
  sections: SynastrySection[];
  advice: string[];
  elements: { a: Element; b: Element; relation: WuxingRelation };
};

const REL_WORD: Record<WuxingRelation, string> = {
  生我: '对方生你',
  同我: '同频',
  我生: '你生对方',
  我克: '你克对方',
  克我: '对方克你',
};

const REL_WEIGHT: Record<WuxingRelation, number> = {
  生我: 12,
  同我: 16,
  我生: 4,
  我克: -6,
  克我: -10,
};

const TOUGH = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);

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

function profileKeywords(star?: string, n = 3): string {
  if (!star) return '';
  return (profileOf(star)?.keywords ?? []).slice(0, n).join(' · ');
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

export function compareCharts(
  a: Astrolabe,
  b: Astrolabe,
  aName: string,
  bName: string,
): SynastryResult {
  const aSoul = majorOf(palaceOf(a, '命宫'));
  const bSoul = majorOf(palaceOf(b, '命宫'));
  const aSpouse = majorOf(palaceOf(a, '夫妻'));
  const bSpouse = majorOf(palaceOf(b, '夫妻'));
  const aFu = majorOf(palaceOf(a, '福德'));
  const bFu = majorOf(palaceOf(b, '福德'));

  const aEl = elementOfStar(aSoul) ?? elementOf(a.soul) ?? '土';
  const bEl = elementOfStar(bSoul) ?? elementOf(b.soul) ?? '土';
  const rel = relationOf(aEl, bEl);
  const relBack = relationOf(bEl, aEl);

  let score = 50 + (REL_WEIGHT[rel] + REL_WEIGHT[relBack]) / 2;

  if (aSpouse && bSoul && aSpouse === bSoul) score += 8;
  if (bSpouse && aSoul && bSpouse === aSoul) score += 8;
  if (aSpouse && bSpouse && aSpouse === bSpouse) score += 4;

  const aSpouseEl = elementOfStar(aSpouse);
  const bSoulEl = elementOfStar(bSoul);
  if (aSpouseEl && bSoulEl) score += REL_WEIGHT[relationOf(aSpouseEl, bSoulEl)] * 0.5;
  const bSpouseEl = elementOfStar(bSpouse);
  const aSoulEl = elementOfStar(aSoul);
  if (bSpouseEl && aSoulEl) score += REL_WEIGHT[relationOf(bSpouseEl, aSoulEl)] * 0.5;

  const aSpouseCat = aSpouse ? profileOf(aSpouse)?.category : undefined;
  if (aSpouseCat === '桃花') score += 4;
  if (aSpouseCat === '煞星') score -= 4;
  if (bSpouse && profileOf(bSpouse)?.category === '煞星') score -= 4;

  const tough = [
    ...starsOf(palaceOf(a, '夫妻')).map((s) => s.name),
    ...starsOf(palaceOf(b, '夫妻')).map((s) => s.name),
  ].filter((n) => TOUGH.has(n));
  score -= tough.length * 3;

  const ji = [
    ...starsOf(palaceOf(a, '命宫')),
    ...starsOf(palaceOf(a, '夫妻')),
    ...starsOf(palaceOf(b, '命宫')),
    ...starsOf(palaceOf(b, '夫妻')),
  ].filter((s) => s.mutagen === '忌');
  score -= ji.length * 5;

  score = Math.max(32, Math.min(96, Math.round(score)));
  const grade =
    score >= 86 ? '高度同频' : score >= 76 ? '同频互补' : score >= 64 ? '可磨合' : '张力型';

  const keywords = Array.from(
    new Set(
      [
        REL_WORD[rel],
        aSpouseCat === '桃花' ? '吸引力' : '',
        tough.length ? '磨合' : score < 64 ? '张力' : '节奏合',
        ...profileKeywords(aSpouse, 2).split(' · '),
        ...profileKeywords(bSoul, 2).split(' · '),
      ].filter(Boolean),
    ),
  ).slice(0, 4);

  const oneLine =
    score >= 76
      ? `${aName} 与 ${bName} 的结构有互相托举的地方，适合把默契变成共同计划。`
      : score >= 64
        ? `${aName} 与 ${bName} 有吸引力，也有需要说清楚的节奏与边界。`
        : `${aName} 与 ${bName} 的结构差异明显，张力也是吸引力；先对齐节奏，再谈长期安排。`;

  const spouseRel = aSpouseEl && bSoulEl ? relationOf(aSpouseEl, bSoulEl) : undefined;
  const spouseNote =
    spouseRel === '我克' || spouseRel === '克我'
      ? '夫妻宫与对方命宫之间带一点「克」：吸引与摩擦并存，越靠近越要把边界说清楚。'
      : spouseRel === '生我' || spouseRel === '同我'
        ? '夫妻宫对对方命宫有托举/同频，靠近时容易感到被接住。'
        : '';

  const sections: SynastrySection[] = [
    {
      title: '吸引力',
      body: [
        `${aName} 的夫妻宫主星是「${aSpouse ?? '空宫'}」${profileKeywords(aSpouse) ? `（${profileKeywords(aSpouse)}）` : ''}，`,
        `${bName} 的命宫主星是「${bSoul ?? '空宫'}」${profileKeywords(bSoul) ? `（${profileKeywords(bSoul)}）` : ''}。`,
        aSpouse && bSoul && aSpouse === bSoul
          ? '同一颗星照进彼此，容易一眼认出对方，也容易把对方当成自己。'
          : relationSentence(rel),
        spouseNote,
      ].join(''),
    },
    {
      title: '沟通方式',
      body: `${aName} 的命宫${aSoul ? `主星「${aSoul}」${profileKeywords(aSoul) ? `，关键词是 ${profileKeywords(aSoul)}` : ''}` : `无主星（借对宫；以命主${a.soul}参看）`}；${bName} 的命宫主星「${bSoul ?? '空宫'}」${profileKeywords(bSoul) ? `，关键词是 ${profileKeywords(bSoul)}` : ''}。${relationSentence(rel)} 沟通时先说感受，再说请求，比直接给结论更容易被接住。`,
    },
    {
      title: '容易卡住的地方',
      body:
        tough.length || ji.length
          ? `${tough.length ? `双方夫妻宫出现 ${[...new Set(tough)].join('、')}，` : '双方夫妻宫没有明显煞星，'}${ji.length ? `命宫/夫妻宫带 ${ji.length} 个生年忌` : '也没有明显的生年忌'}。这些是分数的主要扣分项：压力大时容易把「我需要」说成「你总是」，建议把具体事件、感受、请求分开说。`
          : '结构上没有明显的硬冲突，更多是节奏差异：一方快、一方慢时，先约定决策时限，而不是催对方立刻表态。',
    },
    {
      title: '共同课题',
      body: `福德宫一边是「${aFu ?? '空宫'}」，一边是「${bFu ?? '空宫'}」。${aFu && bFu && aFu === bFu ? '两边取悦自己的方式很像，容易一起放松，也容易一起逃避。' : '各自恢复能量的方式不同，需要给彼此留独处和社交的空间。'}`,
    },
  ];

  const advice = [
    rel === '我克' || rel === '克我'
      ? '冲突升级时先停 24 小时，再用「我感到…我希望…」的句式重开对话。'
      : rel === '我生'
        ? '你容易多做，定期问对方「这件事你想自己来，还是需要我帮？」'
        : '把默契落到具体安排：钱、时间、家务、边界各写一条可执行的约定。',
    tough.length
      ? '煞星在夫妻宫时，别在疲惫、饥饿、赶时间时谈重要话题。'
      : '没有硬冲突时，也要主动创造「无手机」的共处时间。',
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
  };
}

export function synastryText(r: SynastryResult, aName: string, bName: string): string {
  return [
    `【紫微合盘】${aName} × ${bName}`,
    `契合度 ${r.score} · ${r.grade}｜五行：${r.elements.a} × ${r.elements.b}（${REL_WORD[r.elements.relation]}）`,
    `关键词：${r.keywords.join(' · ')}`,
    '',
    ...r.sections.map((s) => `【${s.title}】\n${s.body}`),
    '',
    '【相处建议】',
    ...r.advice.map((a) => `· ${a}`),
    '',
    '分数看结构匹配与张力，不是感情好坏；低分也可能代表高吸引。',
    '传统命理参考，不构成情感、心理、法律建议。',
  ].join('\n');
}
