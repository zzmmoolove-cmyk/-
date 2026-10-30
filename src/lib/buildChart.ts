// 由 BirthInput + ChartOptions 生成纯数据命盘（供合盘/工具复用）。

import { astro } from 'iztro';
import type { Astrolabe, BirthInput, ChartOptions } from '../types';
import { computeTimeIndex } from './truesolar';


/** 生成 iztro 原始盘对象（保留 horoscope/decadalList 方法），供流日/运限计算。 */
export function buildRawAstrolabe(input: BirthInput, options: ChartOptions): Record<string, unknown> {
  astro.config({
    algorithm: options.algorithm,
    yearDivide: options.yearDivide,
    ageDivide: options.ageDivide,
    horoscopeDivide: options.horoscopeDivide,
    dayDivide: options.dayDivide,
  });
  const ti = computeTimeIndex(input);
  const a =
    input.birthdayType === 'lunar'
      ? astro.byLunar(input.birthday, ti, input.gender, input.isLeapMonth, input.fixLeap, 'zh-CN')
      : astro.bySolar(input.birthday, ti, input.gender, input.fixLeap, 'zh-CN');
  return a as unknown as Record<string, unknown>;
}

export function buildAstrolabe(input: BirthInput, options: ChartOptions): Astrolabe {
  astro.config({
    algorithm: options.algorithm,
    yearDivide: options.yearDivide,
    ageDivide: options.ageDivide,
    horoscopeDivide: options.horoscopeDivide,
    dayDivide: options.dayDivide,
  });
  const ti = computeTimeIndex(input);
  const a =
    input.birthdayType === 'lunar'
      ? astro.byLunar(input.birthday, ti, input.gender, input.isLeapMonth, input.fixLeap, 'zh-CN')
      : astro.bySolar(input.birthday, ti, input.gender, input.fixLeap, 'zh-CN');
  const palaces = a.palaces.map((p) => {
    const stars = (arr: typeof p.majorStars) =>
      (arr ?? []).map((s) => ({
        name: String(s.name ?? ''),
        type: String(s.type ?? ''),
        brightness: s.brightness ? String(s.brightness) : undefined,
        mutagen: s.mutagen ? String(s.mutagen) : undefined,
      }));
    const dec = p.decadal;
    return {
      index: Number(p.index ?? 0),
      name: String(p.name ?? ''),
      isBodyPalace: Boolean(p.isBodyPalace),
      isOriginalPalace: Boolean(p.isOriginalPalace),
      heavenlyStem: String(p.heavenlyStem ?? ''),
      earthlyBranch: String(p.earthlyBranch ?? ''),
      majorStars: stars(p.majorStars),
      minorStars: stars(p.minorStars),
      adjectiveStars: stars(p.adjectiveStars),
      changsheng12: String(p.changsheng12 ?? ''),
      boshi12: String(p.boshi12 ?? ''),
      decadal: dec
        ? { range: dec.range, heavenlyStem: dec.heavenlyStem, earthlyBranch: dec.earthlyBranch }
        : { range: [0, 0] as [number, number], heavenlyStem: '', earthlyBranch: '' },
      ages: (p.ages as number[]) ?? [],
    };
  });
  return {
    gender: String(a.gender ?? ''),
    solarDate: String(a.solarDate ?? ''),
    lunarDate: String(a.lunarDate ?? ''),
    chineseDate: String(a.chineseDate ?? ''),
    sign: String(a.sign ?? ''),
    zodiac: String(a.zodiac ?? ''),
    fiveElementsClass: String(a.fiveElementsClass ?? ''),
    soul: String(a.soul ?? ''),
    body: String(a.body ?? ''),
    palaces,
    decadalList: [],
  };
}
