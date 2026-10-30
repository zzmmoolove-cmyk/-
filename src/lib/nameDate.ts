// 起名择日：对同一天的 12 个时辰各排一张盘，给出结构评分与五行走势。
// 评分只用于同日时辰之间的比较，不是命运优劣，也不构成医疗/生育建议。

import type { Astrolabe, BirthInput, ChartOptions } from '../types';
import { buildAstrolabe } from './buildChart';
import { analyzeElements, type ElementBalance } from './naming';

export type TimeSlot = {
  index: number;
  name: string;
  range: string;
  clock: string;
  astrolabe: Astrolabe;
  score: number;
  grade: '上' | '中' | '下';
  balance: ElementBalance;
  reasons: string[];
};

const SLOT_DEFS: { name: string; range: string; clock: string }[] = [
  { name: '子时', range: '23:00–00:59', clock: '00:00' },
  { name: '丑时', range: '01:00–02:59', clock: '02:00' },
  { name: '寅时', range: '03:00–04:59', clock: '04:00' },
  { name: '卯时', range: '05:00–06:59', clock: '06:00' },
  { name: '辰时', range: '07:00–08:59', clock: '08:00' },
  { name: '巳时', range: '09:00–10:59', clock: '10:00' },
  { name: '午时', range: '11:00–12:59', clock: '12:00' },
  { name: '未时', range: '13:00–14:59', clock: '14:00' },
  { name: '申时', range: '15:00–16:59', clock: '16:00' },
  { name: '酉时', range: '17:00–18:59', clock: '18:00' },
  { name: '戌时', range: '19:00–20:59', clock: '20:00' },
  { name: '亥时', range: '21:00–22:59', clock: '22:00' },
];

const LUCKY = new Set(['左辅', '右弼', '文昌', '文曲', '天魁', '天钺', '禄存', '天马', '天喜', '天官', '天福', '恩光', '天贵', '台辅', '封诰']);
const SHA = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫', '天刑', '天姚', '破碎', '孤辰', '寡宿']);
const FOCUS = ['命宫', '财帛', '官禄', '迁移'];
const BRIGHT_SCORE: Record<string, number> = { 庙: 4, 旺: 3, 得: 1, 利: 1, 平: 0, 不: -2, 陷: -3 };

function brightnessScore(brightness?: string): number {
  return brightness ? (BRIGHT_SCORE[brightness] ?? 0) : 0;
}

function scoreChart(astrolabe: Astrolabe): Omit<TimeSlot, 'index' | 'name' | 'range' | 'clock' | 'astrolabe'> {
  let score = 50;
  const reasons: string[] = [];
  const focusPalaces = astrolabe.palaces.filter((p) => FOCUS.includes(p.name));
  const ming = focusPalaces.find((p) => p.name === '命宫');
  const luckyNames: string[] = [];
  const shaNames: string[] = [];
  const huaNames: string[] = [];

  focusPalaces.forEach((p) => {
    [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].forEach((s) => {
      if (LUCKY.has(s.name)) { score += 4; luckyNames.push(s.name); }
      if (SHA.has(s.name)) { score -= 5; shaNames.push(s.name); }
      if (s.name === p.majorStars[0]?.name) score += brightnessScore(s.brightness);
      if (s.mutagen) {
        huaNames.push(`${s.name}化${s.mutagen}`);
        score += s.mutagen === '禄' ? 7 : s.mutagen === '权' ? 5 : s.mutagen === '科' ? 4 : -8;
      }
    });
  });

  if (ming) {
    const stars = ming.majorStars.map((s) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}`);
    reasons.push(stars.length ? `命宫：${stars.join('、')}` : '命宫：空宫，借对宫参看');
  } else {
    score -= 3;
  }

  const balance = analyzeElements(astrolabe.chineseDate);
  const counts = Object.values(balance.counts);
  const spread = Math.max(...counts) - Math.min(...counts);
  score += Math.max(0, 6 - spread * 2);

  if (luckyNames.length) reasons.push(`三方吉星：${[...new Set(luckyNames)].slice(0, 5).join('、')}`);
  if (shaNames.length) reasons.push(`三方煞星：${[...new Set(shaNames)].slice(0, 5).join('、')}`);
  if (huaNames.length) reasons.push(`四化：${huaNames.slice(0, 5).join('、')}`);
  reasons.push(`五行：${balance.label}`);

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const grade: TimeSlot['grade'] = finalScore >= 78 ? '上' : finalScore >= 62 ? '中' : '下';
  return { score: finalScore, grade, balance, reasons };
}

export function analyzeNameDate(
  birthday: string,
  gender: '男' | '女',
  options: ChartOptions,
): { slots: TimeSlot[]; best: TimeSlot | null } {
  if (!birthday) return { slots: [], best: null };
  const slots = SLOT_DEFS.map((def, index) => {
    const input: BirthInput = {
      birthday,
      clockTime: def.clock,
      gender,
      birthdayType: 'solar',
      isLeapMonth: false,
      fixLeap: true,
      useTrueSolar: false,
      longitude: 116.41,
    };
    try {
      const astrolabe = buildAstrolabe(input, options);
      const scored = scoreChart(astrolabe);
      return { index, ...def, astrolabe, ...scored };
    } catch {
      return null;
    }
  }).filter((s): s is TimeSlot => Boolean(s));

  if (!slots.length) return { slots: [], best: null };
  const best = [...slots].sort((a, b) => b.score - a.score || a.index - b.index)[0];
  return { slots, best };
}
