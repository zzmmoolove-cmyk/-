// 流日运势：以主命主本命盘为底，取 iztro horoscope 的流日层。
// 只做当日触发与作息/沟通提醒，不断长期吉凶。

import { astro } from 'iztro';
import type { BirthInput, ChartOptions, UserRecord } from '../types';
import { buildRawAstrolabe } from './buildChart';
import { getScopeData } from './scope';

type RawStar = { name: string };
type RawPalace = {
  name: string;
  majorStars: RawStar[];
  minorStars: RawStar[];
  adjectiveStars: RawStar[];
};

export type DailyMutagen = { star: string; mutagen: string; landing?: string };

export type DailyFortune = {
  scopePalace: string;
  natalStars: string[];
  flowStars: string[];
  mutagens: DailyMutagen[];
  level: '顺' | '平' | '慎';
  theme: string;
  advice: string[];
};

const PALACE_ADVICE: Record<string, string> = {
  命宫: '把注意力收回自己：先定今天最重要的一件事，不接多余社交。',
  财帛: '钱的事宜算清不宜冲动：先对账、再决定要不要花。',
  官禄: '工作推进适合做减法：交付一个可验收的结果，比开新坑重要。',
  夫妻: '关系里先听后说：把「你应该」换成「我需要」，避免情绪对撞。',
  疾厄: '身体是今天的优先项：睡眠、饮食、久坐后的活动先补上。',
  福德: '给情绪留缓冲：不把临时感受当成长期结论。',
  迁移: '外出/沟通容易起波动：重要信息留文字确认。',
  田宅: '家里/空间的事先处理一个最小项，不把全家议题一次摊开。',
  子女: '与晚辈/创作相关的事放慢半拍，先确认对方真实需求。',
  父母: '长辈/上级的沟通留余地，不在情绪高点争对错。',
  兄弟: '同辈/合作先划边界：钱与情分开谈。',
  仆役: '人际圈少承诺、多观察；不替别人做决定。',
};

function inputFromUser(u: UserRecord): BirthInput {
  const p = u.payload;
  return {
    birthday: p.birthday,
    clockTime: p.clockTime,
    gender: p.gender,
    birthdayType: p.birthdayType,
    isLeapMonth: p.isLeapMonth,
    fixLeap: p.fixLeap,
    useTrueSolar: p.useTrueSolar,
    longitude: p.longitude,
  };
}

function optionsFromUser(u: UserRecord): ChartOptions {
  const p = u.payload;
  return {
    algorithm: p.algorithm ?? 'default',
    yearDivide: p.yearDivide ?? 'normal',
    ageDivide: p.ageDivide ?? 'normal',
    horoscopeDivide: p.horoscopeDivide ?? 'normal',
    dayDivide: p.dayDivide ?? 'current',
  };
}

function findLanding(palaces: RawPalace[], star: string): string | undefined {
  return palaces.find((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star))?.name;
}

export function computeDailyFortune(
  user: UserRecord,
  date: string,
  appOptions: ChartOptions,
): DailyFortune | null {
  try {
    const raw = buildRawAstrolabe(inputFromUser(user), optionsFromUser(user));
    const daily = getScopeData(raw as never, 'daily', { targetDate: date });
    const palaces = (raw.palaces as RawPalace[] | undefined) ?? [];
    const scopePalace = daily.scopePalaceName ?? '命宫';
    const palace = palaces.find((p) => p.name === scopePalace);
    const natalStars = palace ? [...palace.majorStars, ...palace.minorStars].map((s) => s.name).slice(0, 4) : [];
    const flowStars = (daily.palaces[scopePalace] ?? []).map((s) => s.name).slice(0, 6);
    const mutagens = daily.mutagenMap.map((m) => ({ ...m, landing: findLanding(palaces, m.star) }));
    const ji = mutagens.find((m) => m.mutagen === '忌');
    const lu = mutagens.find((m) => m.mutagen === '禄');
    const quan = mutagens.find((m) => m.mutagen === '权');
    const ke = mutagens.find((m) => m.mutagen === '科');

    let level: DailyFortune['level'] = '平';
    if (ji?.landing === '命宫' || ji?.landing === '疾厄') level = '慎';
    else if (lu && ['命宫', '财帛', '官禄', '福德'].includes(lu.landing ?? '')) level = '顺';

    const advice: string[] = [];
    advice.push(
      level === '顺'
        ? '今天适合推进一件具体事：先交付，再扩张。'
        : level === '慎'
          ? '今天先守节奏：不做不可逆决定，先处理身体、情绪与手头收尾。'
          : '按计划走：重要沟通放到自己状态最好的时段。',
    );

    if (ji?.landing) {
      advice.push(`流日忌落${ji.landing}（${ji.star}）：${PALACE_ADVICE[ji.landing] ?? '相关领域少做硬碰硬的决定。'}`);
    } else if (ji) {
      advice.push(`流日忌在${ji.star}，本命盘未定位落宫：今天少做情绪化决定。`);
    }

    if (lu?.landing) {
      advice.push(`流日禄落${lu.landing}（${lu.star}）：可在这个方向做一件有积累的小事。`);
    }
    if (quan?.landing && level !== '慎') {
      advice.push(`流日权落${quan.landing}：适合主动定方向、拍板一个小决定。`);
    }
    if (ke?.landing) {
      advice.push(`流日科落${ke.landing}：表达、文书、复盘比硬推更顺。`);
    }

    const theme = `流日命宫落本命${scopePalace}${natalStars.length ? ` · ${natalStars.join('、')}` : ' · 空宫'}${flowStars.length ? `｜流日星：${flowStars.join('、')}` : ''}`;

    return { scopePalace, natalStars, flowStars, mutagens, level, theme, advice };
  } catch (e) {
    console.warn('daily fortune failed', e);
    return null;
  } finally {
    try {
      astro.config({
        algorithm: appOptions.algorithm,
        yearDivide: appOptions.yearDivide,
        ageDivide: appOptions.ageDivide,
        horoscopeDivide: appOptions.horoscopeDivide,
        dayDivide: appOptions.dayDivide,
      });
    } catch {
      /* ignore */
    }
  }
}
