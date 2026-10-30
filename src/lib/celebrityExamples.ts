// 名人示例盘：用于筛选/查盘/界面演示。
// 生时多数未公开，统一按 12:00 午时占位；仅演示，不作真实命例或学术引用。

import type { ChartOptions, UserRecord } from '../types';

const OPTIONS: ChartOptions = {
  algorithm: 'default',
  yearDivide: 'normal',
  ageDivide: 'normal',
  horoscopeDivide: 'normal',
  dayDivide: 'current',
};

const NOTE = '名人示例 · 生时未公开，按午时占位；仅用于界面演示，不作真实命例。';

function example(id: string, name: string, gender: '男' | '女', birthday: string): UserRecord {
  return {
    id: `demo-celeb-${id}`,
    name,
    relation: '客户',
    note: NOTE,
    savedAt: '示例',
    updatedAt: '示例',
    category: 'celebrity',
    isExample: true,
    payload: {
      birthday,
      clockTime: '12:00',
      gender,
      birthdayType: 'solar',
      isLeapMonth: false,
      fixLeap: true,
      useTrueSolar: false,
      longitude: 116.41,
      ...OPTIONS,
    },
  };
}

export const CELEBRITY_EXAMPLES: UserRecord[] = [
  example('bruce-lee', '李小龙', '男', '1940-11-27'),
  example('leslie-cheung', '张国荣', '男', '1956-09-12'),
  example('anita-mui', '梅艳芳', '女', '1963-10-10'),
  example('teresa-teng', '邓丽君', '女', '1953-01-29'),
  example('jay-chou', '周杰伦', '男', '1979-01-18'),
  example('faye-wong', '王菲', '女', '1969-08-08'),
  example('andy-lau', '刘德华', '男', '1961-09-27'),
  example('lin-ching-hsia', '林青霞', '女', '1954-11-03'),
  example('jack-ma', '马云', '男', '1964-09-10'),
  example('yao-ming', '姚明', '男', '1980-09-12'),
];

export const CELEBRITY_SEED_KEY = 'ziwei-celebrity-seed-v1';

// StrictMode 会重复调用 state 初始化器；缓存保证两次拿到同一批数据。
let seedCache: UserRecord[] | null = null;

/** 首次加载时把 10 个名人示例追加到客户列表；用户删掉后不自动补回。 */
export function seedCelebrityExamples(users: UserRecord[]): UserRecord[] {
  if (seedCache) return seedCache;
  try {
    if (localStorage.getItem(CELEBRITY_SEED_KEY) === '1') {
      seedCache = users;
      return seedCache;
    }
  } catch {
    seedCache = users;
    return seedCache;
  }
  const existing = new Set(users.map((u) => u.id));
  const next = [...users, ...CELEBRITY_EXAMPLES.filter((u) => !existing.has(u.id))];
  try {
    localStorage.setItem(CELEBRITY_SEED_KEY, '1');
  } catch {
    /* ignore */
  }
  seedCache = next;
  return seedCache;
}
