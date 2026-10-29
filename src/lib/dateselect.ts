// 择日参考 v1.0：黄历宜忌 + 生肖冲煞 + 事件关键词评分。
// 只做传统黄历参考，不替代专业择日、医疗、法律或投资意见。

import { solarToCalendar } from './calendar';

export type EventKey = '嫁娶' | '开业' | '搬家' | '签约' | '出行' | '祈福' | '入学';

type EventRule = {
  key: EventKey;
  label: string;
  yi: string[];
  ji: string[];
  weekend?: boolean;
  note: string;
};

export const EVENT_RULES: EventRule[] = [
  { key: '嫁娶', label: '嫁娶 / 订婚', yi: ['嫁娶', '纳采', '订盟', '会亲友'], ji: ['嫁娶', '安葬', '破土'], weekend: true, note: '优先看双方生肖是否相冲，再看宜忌。' },
  { key: '开业', label: '开业 / 开市', yi: ['开市', '交易', '立券', '纳财'], ji: ['开市', '破土', '安葬'], note: '开市、交易、立券优先；避开与主事人生肖相冲。' },
  { key: '搬家', label: '搬家 / 入宅', yi: ['移徙', '入宅', '安床', '会亲友'], ji: ['入宅', '移徙', '破土'], note: '入宅、移徙、安床为关键词；先净宅再入宅。' },
  { key: '签约', label: '签约 / 合作', yi: ['立券', '交易', '纳财', '会亲友', '订盟'], ji: ['立券', '交易'], note: '立券、交易为关键词；重要合同仍建议律师审阅。' },
  { key: '出行', label: '出行 / 赴任', yi: ['出行', '赴任', '移徙'], ji: ['出行', '赴任'], note: '出行、赴任为关键词；长途先看天气与交通。' },
  { key: '祈福', label: '祈福 / 祭祀', yi: ['祈福', '祭祀', '斋醮', '开光'], ji: ['祈福', '祭祀'], note: '祈福、祭祀、开光为关键词。' },
  { key: '入学', label: '入学 / 考试', yi: ['入学', '开光', '求嗣', '会亲友'], ji: ['入学'], note: '入学、开光为关键词；考试仍以复习为准。' },
];

const ZODIAC_BRANCH: Record<string, string> = {
  鼠: '子', 牛: '丑', 虎: '寅', 兔: '卯', 龙: '辰', 蛇: '巳',
  马: '午', 羊: '未', 猴: '申', 鸡: '酉', 狗: '戌', 猪: '亥',
};

export type DayPick = {
  date: string;
  weekday: string;
  score: number;
  level: '上吉' | '吉' | '平' | '慎';
  lunar: string;
  dayGZ: string;
  chong: string;
  sha: string;
  yi: string[];
  ji: string[];
  reasons: string[];
  warnings: string[];
};

export type DateSelectResult = {
  event: EventKey;
  start: string;
  days: number;
  zodiac?: string;
  candidates: DayPick[];
  note: string;
};

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 从 start 起逐日打分，返回前 limit 个候选。 */
export function pickDates(opts: {
  start: string;
  days: number;
  event: EventKey;
  zodiac?: string;
  weekendsOnly?: boolean;
  limit?: number;
}): DateSelectResult {
  const rule = EVENT_RULES.find((r) => r.key === opts.event) ?? EVENT_RULES[0];
  const [sy, sm, sd] = opts.start.split('-').map(Number);
  const startDate = Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(sd)
    ? new Date(sy, sm - 1, sd)
    : new Date();
  const limit = opts.limit ?? 6;
  const candidates: DayPick[] = [];
  const maxDays = Math.max(7, Math.min(120, opts.days || 60));

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const date = isoLocal(d);
    const weekday = WEEK[d.getDay()];
    if (opts.weekendsOnly && d.getDay() !== 0 && d.getDay() !== 6) continue;

    let cal;
    try {
      cal = solarToCalendar(date);
    } catch {
      continue;
    }

    const yiMatches = cal.dayYi.filter((y) => rule.yi.some((k) => y.includes(k)));
    const jiMatches = cal.dayJi.filter((j) => rule.ji.some((k) => j.includes(k)));
    let score = 62;
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (yiMatches.length) {
      score += Math.min(24, yiMatches.length * 8);
      reasons.push(`宜${yiMatches.join('、')}`);
    }
    if (jiMatches.length) {
      score -= Math.min(30, jiMatches.length * 10);
      warnings.push(`忌${jiMatches.join('、')}`);
    }
    if (rule.weekend && (d.getDay() === 0 || d.getDay() === 6)) {
      score += 3;
      reasons.push('周末，便于亲友到场');
    }
    if (opts.zodiac && cal.dayChong.includes(opts.zodiac)) {
      score -= 14;
      warnings.push(`冲${opts.zodiac}（${cal.dayChong}）`);
    }
    if (opts.zodiac && ZODIAC_BRANCH[opts.zodiac] && cal.dayGanZhi.endsWith(ZODIAC_BRANCH[opts.zodiac])) {
      score -= 4;
      warnings.push('日支与生肖相同，传统称值日');
    }
    score = Math.max(30, Math.min(98, score));
    const level: DayPick['level'] = score >= 84 ? '上吉' : score >= 74 ? '吉' : score >= 62 ? '平' : '慎';

    candidates.push({
      date,
      weekday,
      score,
      level,
      lunar: cal.lunar,
      dayGZ: cal.dayGanZhi,
      chong: cal.dayChong,
      sha: cal.daySha,
      yi: cal.dayYi,
      ji: cal.dayJi,
      reasons,
      warnings,
    });
  }

  candidates.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
  return {
    event: rule.key,
    start: opts.start,
    days: maxDays,
    zodiac: opts.zodiac,
    candidates: candidates.slice(0, limit),
    note: '评分只看黄历宜忌、生肖冲煞与周末，不是专业择日；重要事项请结合现实条件与专业人士意见。',
  };
}
