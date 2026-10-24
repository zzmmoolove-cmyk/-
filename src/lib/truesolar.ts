// 真太阳时校正：地方平太阳时 + 均时差。
// 北京时间以东经 120° 为基准，每差 1° 经度相差 4 分钟。

/** 均时差（分钟），近似公式，精度约 ±1 分钟 */
export function equationOfTime(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const n = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const b = ((2 * Math.PI) / 365) * (n - 81);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * 由钟表时间（北京时间）与出生地经度，计算真太阳时（返回分钟数，以午夜 0 点为基准）。
 * @param clockMinutes 钟表时间（分钟，0-1440）
 * @param longitude 出生地经度
 */
export function trueSolarTimeMinutes(clockMinutes: number, longitude: number, date: Date): number {
  const lmt = clockMinutes + (longitude - 120) * 4;
  const eot = equationOfTime(date);
  return lmt + eot;
}

/** 由真太阳时（分钟）推导时辰索引（0-12，含早晚子时） */
export function minutesToTimeIndex(minutes: number): number {
  let m = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  return Math.floor((hour + 1) / 2);
}

/** 由出生信息推算最终时辰索引（是否真太阳时校正） */
export function computeTimeIndex(input: {
  birthday: string;
  clockTime: string;
  useTrueSolar: boolean;
  longitude: number;
}): number {
  const raw = (input.clockTime ?? '').trim();
  const [h, m] = raw.split(':').map(Number);
  const minutes = raw ? (Number.isNaN(h) ? 12 : h) * 60 + (Number.isNaN(m) ? 0 : m) : 720;
  if (input.useTrueSolar && input.birthday) {
    const [y, mo, d] = input.birthday.split('-').map(Number);
    const date = new Date(y, (mo || 1) - 1, d || 1);
    return minutesToTimeIndex(trueSolarTimeMinutes(minutes, input.longitude, date));
  }
  return minutesToTimeIndex(minutes);
}

/** 将真太阳时分钟格式化为 HH:MM */
export function formatMinutes(minutes: number): string {
  let m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
