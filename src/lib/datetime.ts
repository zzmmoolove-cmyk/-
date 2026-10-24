// 日期 / 时间的宽松输入解析：
// 日期支持 19980527、1998-05-27、1998/5/27、1998.5.27、1998年5月27日；
// 时间支持 0930、930、9:30、9点30、下午3点、9:30 PM 等，统一转 24 小时制 HH:MM。

export type ParseResult = { ok: true; value: string } | { ok: false; error: string };

function normalizeDigits(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[：]/g, ':')
    .replace(/[．]/g, '.')
    .replace(/[／]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function parseDateInput(raw: string, type: 'solar' | 'lunar'): ParseResult {
  const s = normalizeDigits(raw);
  if (!s) return { ok: false, error: '请填写出生日期' };

  let y: number, m: number, d: number;
  let match = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!match) match = /^(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?$/.exec(s);
  if (!match) {
    return { ok: false, error: '日期格式：19980527 或 1998-05-27（也可写 1998年5月27日）' };
  }
  y = Number(match[1]);
  m = Number(match[2]);
  d = Number(match[3]);

  if (y < 1900 || y > 2100) return { ok: false, error: '年份需在 1900–2100 之间' };
  if (m < 1 || m > 12) return { ok: false, error: '月份需在 1–12 之间' };
  if (d < 1 || d > 31) return { ok: false, error: '日期不正确' };

  if (type === 'solar') {
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
      return { ok: false, error: '公历没有这一天，请检查（如 2 月 30 日）' };
    }
  } else if (d > 30) {
    return { ok: false, error: '农历每月最多 30 天' };
  }

  return { ok: true, value: `${y}-${pad2(m)}-${pad2(d)}` };
}

const CN_PREFIX: Record<string, number> = {
  凌晨: 0,
  早上: 0,
  上午: 0,
  中午: 0,
  下午: 12,
  晚上: 12,
  夜里: 12,
  夜晚: 12,
};

function buildTime(h: number, m: number, meridiem?: 'am' | 'pm', prefix?: string): ParseResult {
  if (Number.isNaN(h) || Number.isNaN(m)) return { ok: false, error: '时间格式不正确' };
  if (m < 0 || m > 59) return { ok: false, error: '分钟需在 0–59 之间' };
  if (h < 0 || h > 23) return { ok: false, error: '小时需在 0–23 之间（24 小时制）' };

  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;

  if (prefix) {
    if (prefix === '中午') {
      if (h > 0 && h < 11) h += 12;
    } else if (prefix === '凌晨') {
      if (h === 12) h = 0;
    } else if (CN_PREFIX[prefix] === 12) {
      if (h < 12) h += 12;
      if (h === 12 && prefix === '晚上') h = 12;
    }
  }

  if (h > 23) return { ok: false, error: '小时需在 0–23 之间（24 小时制）' };
  return { ok: true, value: `${pad2(h)}:${pad2(m)}` };
}

export function parseTimeInput(raw: string): ParseResult {
  const s = normalizeDigits(raw);
  if (!s) return { ok: false, error: '请填写出生时间' };

  // 下午3点 / 晚上9点30 / 上午 9:30
  let match = /^(凌晨|早上|上午|中午|下午|晚上|夜里|夜晚)\s*(\d{1,2})(?:\s*[:点時时]\s*(半|\d{1,2})?)?\s*分?$/.exec(s);
  if (match) {
    const min = match[3] === '半' ? 30 : match[3] ? Number(match[3]) : 0;
    return buildTime(Number(match[2]), min, undefined, match[1]);
  }

  // 9:30 PM / 9:30pm / 9 pm
  match = /^(\d{1,2})(?:\s*[:：]\s*(\d{1,2}))?\s*(am|pm|a\.m\.|p\.m\.)$/i.exec(s);
  if (match) {
    const mer = match[3].toLowerCase().replace(/\./g, '') as 'am' | 'pm';
    return buildTime(Number(match[1]), match[2] ? Number(match[2]) : 0, mer);
  }

  // 9点30 / 9点半 / 9时
  match = /^(\d{1,2})\s*[点時时]\s*(半|\d{1,2})?\s*分?$/.exec(s);
  if (match) {
    const min = match[2] === '半' ? 30 : match[2] ? Number(match[2]) : 0;
    return buildTime(Number(match[1]), min);
  }

  // 09:30 / 9:30 / 9:30:00
  match = /^(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*\d{1,2})?$/.exec(s);
  if (match) return buildTime(Number(match[1]), Number(match[2]));

  // 0930 / 930
  match = /^(\d{3,4})$/.exec(s);
  if (match) {
    const digits = match[1];
    const h = Number(digits.slice(0, digits.length - 2));
    const m = Number(digits.slice(-2));
    return buildTime(h, m);
  }

  // 9 / 09
  match = /^(\d{1,2})$/.exec(s);
  if (match) return buildTime(Number(match[1]), 0);

  return { ok: false, error: '时间格式：0930、9:30、9点30、下午3点 或 9:30 PM' };
}
