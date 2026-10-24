// 排盘结果的「检索优先」解读层：
// 1) 宫位解读（纯知识库检索 + 模板组装，0 成本）
// 2) 命格综述（格局命中 + 四化表 + 关键宫位拼装）
// 3) 生成供 AI 兜底层使用的结构化上下文

import type { Astrolabe, Palace, Star } from '../types';
import { STAR_KB, type StarInfo } from './knowledge/stars';
import { PALACE_KB, type PalaceInfo } from './knowledge/palaces';
import { PATTERNS } from './knowledge/patterns';

export type FourTransform = {
  star: string;
  mutagen: string;
  palace: string;
  meaning: string;
};

export type HitPattern = {
  name: string;
  type: '吉' | '凶' | '中';
  desc: string;
};

export type PalaceReading = {
  palaceName: string;
  palaceInfo: PalaceInfo;
  majorStars: { info: StarInfo; brightness?: string; mutagen?: string }[];
  minorStars: { info: StarInfo; brightness?: string; mutagen?: string }[];
  otherStars: string[];
  notes: string[];
};

const MUTAGEN_MEANING: Record<string, string> = {
  禄: '化禄——财禄、机缘、福气',
  权: '化权——权力、掌控、执行力',
  科: '化科——名声、才华、贵人',
  忌: '化忌——困扰、执念、波折',
};

export function getFourTransforms(astrolabe: Astrolabe): FourTransform[] {
  const result: FourTransform[] = [];
  astrolabe.palaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      if (s.mutagen && s.mutagen !== '') {
        const info = STAR_KB[s.name];
        result.push({
          star: s.name,
          mutagen: s.mutagen,
          palace: p.name,
          meaning: info?.sihua?.[s.mutagen as 'lu' | 'quan' | 'ke' | 'ji'] ??
            `${s.name}${MUTAGEN_MEANING[s.mutagen] ?? ''}`,
        });
      }
    });
  });
  return result;
}

function starToInfo(s: Star): { info?: StarInfo; brightness?: string; mutagen?: string } {
  return {
    info: STAR_KB[s.name],
    brightness: s.brightness,
    mutagen: s.mutagen,
  };
}

export function readPalace(palace: Palace): PalaceReading {
  const palaceInfo = PALACE_KB[palace.name] ?? {
    name: palace.name,
    brief: '',
    focus: [],
    detail: '',
  };

  const majorStars = palace.majorStars
    .map(starToInfo)
    .filter((s) => s.info) as { info: StarInfo; brightness?: string; mutagen?: string }[];

  const minorStars = palace.minorStars
    .map(starToInfo)
    .filter((s) => s.info) as { info: StarInfo; brightness?: string; mutagen?: string }[];

  const knownNames = new Set([
    ...palace.majorStars.map((s) => s.name),
    ...palace.minorStars.map((s) => s.name),
  ]);
  const otherStars = palace.adjectiveStars
    .map((s) => s.name)
    .filter((n) => STAR_KB[n] === undefined && !knownNames.has(n));

  const notes: string[] = [];
  if (palace.isBodyPalace) notes.push('此宫为身宫（后半生重心所在）');
  if (palace.majorStars.length === 0) notes.push('此宫无主星（空宫），须借对宫主星参看');
  if (palace.changsheng12) notes.push(`长生十二神：${palace.changsheng12}`);
  if (palace.decadal) {
    notes.push(`大限：${palace.decadal.range[0]}–${palace.decadal.range[1]} 岁（${palace.decadal.heavenlyStem}${palace.decadal.earthlyBranch}）`);
  }

  return { palaceName: palace.name, palaceInfo, majorStars, minorStars, otherStars, notes };
}

export function hitPatterns(astrolabe: Astrolabe): HitPattern[] {
  const palaces = astrolabe.palaces;
  return PATTERNS.filter((p) => {
    try {
      return p.match(palaces);
    } catch {
      return false;
    }
  }).map((p) => ({ name: p.name, type: p.type, desc: p.desc }));
}

export function readChart(astrolabe: Astrolabe) {
  const fourTransforms = getFourTransforms(astrolabe);
  const patterns = hitPatterns(astrolabe);

  const mingPalace = astrolabe.palaces.find((p) => p.name === '命宫');
  const shenPalace = astrolabe.palaces.find((p) => p.isBodyPalace);
  const caiPalace = astrolabe.palaces.find((p) => p.name === '财帛');
  const guanPalace = astrolabe.palaces.find((p) => p.name === '官禄');
  const fuqiPalace = astrolabe.palaces.find((p) => p.name === '夫妻');

  const basic = {
    gender: astrolabe.gender,
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    zodiac: astrolabe.zodiac,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soul: astrolabe.soul,
    body: astrolabe.body,
  };

  const summary = buildSummary(astrolabe, mingPalace, shenPalace, caiPalace, guanPalace, fuqiPalace, patterns, fourTransforms);

  return { basic, fourTransforms, patterns, summary, mingPalace, shenPalace, caiPalace, guanPalace, fuqiPalace };
}

function starsStr(p: Palace | undefined): string {
  if (!p) return '—';
  const majors = p.majorStars.map((s) => s.name + (s.mutagen ? `[${s.mutagen}]` : '')).join('、');
  const minors = p.minorStars.length ? `；辅：${p.minorStars.map((s) => s.name).join('、')}` : '';
  return (majors || '无主星') + minors;
}

function buildSummary(
  astrolabe: Astrolabe,
  ming?: Palace,
  shen?: Palace,
  cai?: Palace,
  guan?: Palace,
  fuqi?: Palace,
  patterns: HitPattern[] = [],
  fourTransforms: FourTransform[] = [],
): string {
  const lines: string[] = [];

  lines.push(`命主${astrolabe.soul}，身主${astrolabe.body}，五行局${astrolabe.fiveElementsClass}，属${astrolabe.zodiac}。`);

  if (ming) {
    lines.push(`命宫${ming.heavenlyStem}${ming.earthlyBranch}：主星 ${starsStr(ming)}。`);
    const r = readPalace(ming);
    const brief = r.majorStars.map((s) => s.info.brief).join(' ');
    if (brief) lines.push(`命宫特质：${brief}`);
  }
  if (shen) {
    lines.push(`身宫在${shen.name}（${starsStr(shen)}），为后半生重心。`);
  }
  if (cai) lines.push(`财帛宫：${starsStr(cai)}，主求财与理财方式。`);
  if (guan) lines.push(`官禄宫：${starsStr(guan)}，主事业与成就。`);
  if (fuqi) lines.push(`夫妻宫：${starsStr(fuqi)}，主婚姻与情感。`);

  if (patterns.length) {
    const ji = patterns.filter((p) => p.type === '吉').map((p) => p.name);
    const xiong = patterns.filter((p) => p.type === '凶').map((p) => p.name);
    const zhong = patterns.filter((p) => p.type === '中').map((p) => p.name);
    if (ji.length) lines.push(`命中吉格：${ji.join('、')}。`);
    if (xiong.length) lines.push(`命中凶格：${xiong.join('、')}。`);
    if (zhong.length) lines.push(`命中特殊格局：${zhong.join('、')}。`);
  }

  if (fourTransforms.length) {
    lines.push(`四化：${fourTransforms.map((f) => `${f.star}化${f.mutagen}（在${f.palace}）`).join('；')}。`);
  }

  lines.push('（以上为基于排盘结构的概要综述，仅供传统文化研究与娱乐参考。）');

  return lines.join('\n');
}
