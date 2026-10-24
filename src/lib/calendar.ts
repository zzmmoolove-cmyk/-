// 万年历：公历 ↔ 农历、干支、生肖、八字、节气查询（基于 lunar-typescript）。

import { Solar, Lunar } from 'lunar-typescript';

export type CalendarInfo = {
  solar: string;
  lunar: string;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  shengxiao: string;
  eightChar: string;
  prevJieQi: string;
  nextJieQi: string;
  dayYi: string[];
  dayJi: string[];
};

export function solarToCalendar(dateStr: string): CalendarInfo {
  const [y, m, d] = dateStr.split('-').map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  const prev = lunar.getPrevJieQi();
  const next = lunar.getNextJieQi();

  return {
    solar: `${y}年${m}月${d}日`,
    lunar: lunar.toString(),
    yearGanZhi: lunar.getYearInGanZhi(),
    monthGanZhi: lunar.getMonthInGanZhi(),
    dayGanZhi: lunar.getDayInGanZhi(),
    shengxiao: lunar.getYearShengXiao(),
    eightChar: lunar.getEightChar().toString(),
    prevJieQi: prev ? `${prev.getName()} ${prev.getSolar().toYmdHms().slice(0, 10)}` : '',
    nextJieQi: next ? `${next.getName()} ${next.getSolar().toYmdHms().slice(0, 10)}` : '',
    dayYi: lunar.getDayYi(),
    dayJi: lunar.getDayJi(),
  };
}

export function lunarToSolar(year: number, month: number, day: number): string {
  const lunar = Lunar.fromYmd(year, month, day);
  const solar = lunar.getSolar();
  return solar.toYmd();
}
