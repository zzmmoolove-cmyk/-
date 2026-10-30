import type { ClientCategory, UserRecord } from '../types';

export type ClientFilter = 'all' | ClientCategory;

export const CLIENT_GROUPS: { key: ClientCategory; label: string }[] = [
  { key: 'family', label: '家人' },
  { key: 'friend', label: '朋友' },
  { key: 'work', label: '同事' },
  { key: 'client', label: '服务对象' },
  { key: 'celebrity', label: '名人' },
  { key: 'other', label: '其他' },
];

const FAMILY_RELATIONS = new Set(['本人', '父亲', '母亲', '配偶', '子女', '兄弟', '姐妹']);

export function clientGroup(user: UserRecord): ClientCategory {
  if (user.category) return user.category;
  if (FAMILY_RELATIONS.has(user.relation)) return 'family';
  if (user.relation === '朋友') return 'friend';
  if (user.relation === '同事') return 'work';
  if (user.relation === '客户' || user.relation === '服务对象') return 'client';
  return 'other';
}

export function clientKindLabel(user: UserRecord): string {
  return user.category === 'celebrity' ? '名人示例' : user.relation === '客户' ? '服务对象' : user.relation;
}

export function clientCounts(users: UserRecord[]): Record<ClientCategory, number> {
  const counts: Record<ClientCategory, number> = { family: 0, friend: 0, work: 0, client: 0, celebrity: 0, other: 0 };
  users.forEach((u) => { counts[clientGroup(u)] += 1; });
  return counts;
}
