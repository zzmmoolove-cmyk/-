// 星座合盘：太阳 / 上升 / 下降 / 元素 / 宫位整宫制。
// 上升按北纬 30°、北京时间近似；精确上升需要出生地纬度与准确出生时间。

import { zodiacCompatibility } from './synastry';

export type AstroBirth = {
  name: string;
  date: string;
  time: string;
  longitude: number;
  sign: string;
};

export type AstroSign = {
  sign: string;
  element: '火' | '土' | '风' | '水';
  modality: '基本' | '固定' | '变动';
};

export type AstroPerson = {
  name: string;
  sun: AstroSign;
  rising: AstroSign;
  descendant: AstroSign;
  sunHouse: number;
  descendantHouse: number;
  note: string;
};

export type AstroAspect = { label: string; score: number; note: string };

export type AstroSynastry = {
  score: number;
  grade: string;
  a: AstroPerson;
  b: AstroPerson;
  aspects: AstroAspect[];
  advice: string[];
  summary: string;
  caveat: string;
};

const SIGNS: AstroSign[] = [
  { sign: '白羊座', element: '火', modality: '基本' },
  { sign: '金牛座', element: '土', modality: '固定' },
  { sign: '双子座', element: '风', modality: '变动' },
  { sign: '巨蟹座', element: '水', modality: '基本' },
  { sign: '狮子座', element: '火', modality: '固定' },
  { sign: '处女座', element: '土', modality: '变动' },
  { sign: '天秤座', element: '风', modality: '基本' },
  { sign: '天蝎座', element: '水', modality: '固定' },
  { sign: '射手座', element: '火', modality: '变动' },
  { sign: '摩羯座', element: '土', modality: '基本' },
  { sign: '水瓶座', element: '风', modality: '固定' },
  { sign: '双鱼座', element: '水', modality: '变动' },
];

const TRAITS: Record<string, string> = {
  白羊座: '直接、行动快、要新鲜感',
  金牛座: '稳定、重感官与安全感、慢热',
  双子座: '会聊、好奇、需要心智刺激',
  巨蟹座: '照顾、念旧、要情绪安全',
  狮子座: '热情、要被看见、有担当',
  处女座: '务实、重细节、用行动表达',
  天秤座: '重关系、讲公平、审美好',
  天蝎座: '深度、忠诚、边界感强',
  射手座: '自由、探索、乐观直接',
  摩羯座: '责任、长期、慢热现实',
  水瓶座: '独立、理念、需要空间',
  双鱼座: '共情、浪漫、边界易模糊',
};

function signOf(name: string): AstroSign {
  return SIGNS.find((s) => s.sign === name) ?? SIGNS[0];
}

function opposite(s: AstroSign): AstroSign {
  const i = SIGNS.findIndex((x) => x.sign === s.sign);
  return SIGNS[(i + 6) % 12] ?? SIGNS[0];
}

function julianDay(y: number, m: number, d: number, utHours: number): number {
  let yy = y;
  let mm = m;
  if (mm <= 2) { yy -= 1; mm += 12; }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5 + utHours / 24;
}

/** 近似上升：北纬 30°、北京时间（UTC+8）。 */
function approximateRising(date: string, time: string, longitude: number): AstroSign {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '12:00').split(':').map(Number);
  if (!y || !m || !d) return SIGNS[0];
  const ut = (hh || 12) + (mm || 0) / 60 - 8;
  const jd = julianDay(y, m, d, ut);
  const T = (jd - 2451545) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - T * T * T / 38710000;
  const lst = ((gmst + longitude) % 360 + 360) % 360;
  const theta = (lst * Math.PI) / 180;
  const eps = (23.4392911 * Math.PI) / 180;
  const phi = (30 * Math.PI) / 180;
  let asc = (Math.atan2(Math.cos(theta), -(Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * 180) / Math.PI;
  asc = ((asc % 360) + 360) % 360;
  return SIGNS[Math.floor(asc / 30) % 12] ?? SIGNS[0];
}

function aspect(a: AstroSign, b: AstroSign): { d: number; score: number; label: string; note: string } {
  const ai = SIGNS.findIndex((s) => s.sign === a.sign);
  const bi = SIGNS.findIndex((s) => s.sign === b.sign);
  const diff = Math.abs(ai - bi);
  const d = Math.min(diff, 12 - diff);
  if (d === 0) return { d, score: 86, label: '合相', note: `${a.sign} × ${b.sign}：同一落点，容易互相看见，也容易放大同一种盲区。` };
  if (d === 4 || d === 8) return { d, score: 88, label: '三合', note: `${a.sign} × ${b.sign}：同元素三合，节奏与底层需求接近。` };
  if (d === 2 || d === 10) return { d, score: 82, label: '六合', note: `${a.sign} × ${b.sign}：六合，互动顺，容易聊到一起。` };
  if (d === 6) return { d, score: 70, label: '对宫', note: `${a.sign} × ${b.sign}：对宫，强吸引也强差异，适合把对方当镜子。` };
  if (d === 3 || d === 9) return { d, score: 56, label: '刑', note: `${a.sign} × ${b.sign}：刑相位，容易在节奏与边界上互相触发。` };
  return { d, score: 62, label: '邻位', note: `${a.sign} × ${b.sign}：相邻元素不同，需要翻译彼此的表达。` };
}

function elementBonus(a: AstroSign, b: AstroSign): number {
  if (a.element === b.element) return 88;
  const pair = [a.element, b.element].sort().join('');
  if (pair === '火风' || pair === '水土') return 82;
  if (pair === '火土' || pair === '风水') return 54;
  if (pair === '火水' || pair === '土风') return 48;
  return 62;
}

function buildPerson(input: AstroBirth): AstroPerson {
  const sun = signOf(input.sign);
  const rising = approximateRising(input.date, input.time, input.longitude);
  const descendant = opposite(rising);
  const sunHouse = ((SIGNS.findIndex((s) => s.sign === sun.sign) - SIGNS.findIndex((s) => s.sign === rising.sign) + 12) % 12) + 1;
  return {
    name: input.name,
    sun,
    rising,
    descendant,
    sunHouse,
    descendantHouse: 7,
    note: `${input.time || '12:00'} · 经度 ${input.longitude}°E · 上升近似`,
  };
}

export function compareAstro(a: AstroBirth, b: AstroBirth): AstroSynastry {
  const pa = buildPerson(a);
  const pb = buildPerson(b);
  const sunSun = zodiacCompatibility(pa.sun.sign, pb.sun.sign);
  const risingRising = aspect(pa.rising, pb.rising);
  const aSunBRising = aspect(pa.sun, pb.rising);
  const bSunARising = aspect(pb.sun, pa.rising);
  const aDescBSun = aspect(pa.descendant, pb.sun);
  const bDescASun = aspect(pb.descendant, pa.sun);
  const element = elementBonus(pa.sun, pb.sun);

  const score = Math.round(
    sunSun.score * 0.2 +
    risingRising.score * 0.24 +
    ((aSunBRising.score + bSunARising.score) / 2) * 0.18 +
    ((aDescBSun.score + bDescASun.score) / 2) * 0.22 +
    element * 0.16,
  );
  const clamped = Math.max(30, Math.min(96, score));
  const grade = clamped >= 84 ? '高度协同' : clamped >= 72 ? '舒服互补' : clamped >= 58 ? '需要磨合' : '张力吸引';

  const aspects: AstroAspect[] = [
    { label: `太阳 × 太阳 · ${sunSun.label}`, score: sunSun.score, note: sunSun.note },
    { label: `上升 × 上升 · ${risingRising.label}`, score: risingRising.score, note: risingRising.note },
    { label: `A 太阳 × B 上升 · ${aSunBRising.label}`, score: aSunBRising.score, note: aSunBRising.note },
    { label: `B 太阳 × A 上升 · ${bSunARising.label}`, score: bSunARising.score, note: bSunARising.note },
    { label: `A 下降 × B 太阳 · ${aDescBSun.label}`, score: aDescBSun.score, note: `你容易被「${TRAITS[pb.sun.sign]}」的人吸引；${aDescBSun.note}` },
    { label: `B 下降 × A 太阳 · ${bDescASun.label}`, score: bDescASun.score, note: `对方容易被「${TRAITS[pa.sun.sign]}」的你吸引；${bDescASun.note}` },
    { label: `元素 · ${pa.sun.element} × ${pb.sun.element}`, score: element, note: `${pa.sun.element}象 × ${pb.sun.element}象：${element >= 80 ? '同频/互补，情绪语言接近' : element >= 60 ? '可以互补，但表达方式不同' : '需要主动翻译彼此的情绪语言'}` },
  ];

  const advice = [
    `你的下降星座是${pa.descendant.sign}：你容易被「${TRAITS[pa.descendant.sign]}」的人吸引。长期关系里，除了心动，还要看对方能不能稳定提供这种气质。`,
    `${pb.name}的太阳在${pb.sun.sign}、上升在${pb.rising.sign}：${TRAITS[pb.sun.sign]}；外在节奏是${TRAITS[pb.rising.sign]}。先看你能不能接住对方的「上升」，再看太阳是否同频。`,
    clamped >= 72
      ? '你们的星座结构有天然的舒服区：多一起做具体事，比反复讨论「爱不爱」更能加深关系。'
      : '你们的吸引力与差异同时存在：冲突时先复述对方的需求，再表达自己的请求，避免把差异上升为「不合适」。',
    '上升按北纬 30°、北京时间近似；如果出生时间差 1 小时以上，上升与下降可能换座，结论要重算。',
  ];

  return {
    score: clamped,
    grade,
    a: pa,
    b: pb,
    aspects,
    advice,
    summary: `${pa.name} 太阳${pa.sun.sign} / 上升${pa.rising.sign} / 下降${pa.descendant.sign}；${pb.name} 太阳${pb.sun.sign} / 上升${pb.rising.sign} / 下降${pb.descendant.sign}。${clamped >= 72 ? '星座结构偏顺，适合把吸引力落到日常相处。' : '星座结构有张力，先处理节奏差异，再谈长期。'}`,
    caveat: '上升为近似值；未校正出生地纬度与真太阳时。示例名人盘按午时占位，不能当作真实上升。',
  };
}

export function astroSynastryText(r: AstroSynastry): string {
  return [
    `【星座合盘】${r.a.name} × ${r.b.name}`,
    `星座分 ${r.score} · ${r.grade}`,
    `${r.a.name}：太阳${r.a.sun.sign}｜上升${r.a.rising.sign}｜下降${r.a.descendant.sign}`,
    `${r.b.name}：太阳${r.b.sun.sign}｜上升${r.b.rising.sign}｜下降${r.b.descendant.sign}`,
    '',
    '【相位】',
    ...r.aspects.map((a) => `· ${a.label}：${a.score}｜${a.note}`),
    '',
    '【建议】',
    ...r.advice.map((a) => `· ${a}`),
    '',
    r.caveat,
  ].join('\n');
}
