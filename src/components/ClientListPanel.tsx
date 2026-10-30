import { useMemo, useState } from 'react';
import type { ClientCategory, UserRecord } from '../types';
import { CLIENT_GROUPS, clientGroup, clientKindLabel, type ClientFilter } from '../lib/clientGroups';

export default function ClientListPanel({
  users,
  activeUserId,
  primaryId,
  clientFilter,
  filterCounts,
  onClientFilter,
  onPrimaryChange,
  onOpen,
  onProfile,
  onNew,
  onDelete,
}: {
  users: UserRecord[];
  activeUserId: string | null;
  primaryId: string | null;
  clientFilter: ClientFilter;
  filterCounts: Record<ClientCategory, number>;
  onClientFilter: (f: ClientFilter) => void;
  onPrimaryChange: (id: string) => void;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const byGroup = clientFilter === 'all' ? users : users.filter((u) => clientGroup(u) === clientFilter);
    const q = query.trim();
    if (!q) return byGroup;
    return byGroup.filter((u) => `${u.name}${u.relation}${u.note}${u.payload.birthday}`.includes(q));
  }, [users, query, clientFilter]);
  return (
    <div className="client-list-page master-page">
      <div className="client-toolbar master-toolbar">
        <input value={query} placeholder="搜索姓名 / 关系 / 生日" onChange={(e) => setQuery(e.target.value)} />
        <select value={clientFilter} onChange={(e) => onClientFilter(e.target.value as ClientFilter)} aria-label="筛选命主">
          <option value="all">全部 · {users.length}</option>
          {CLIENT_GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label} · {filterCounts[g.key]}</option>)}
        </select>
        <span className="hint">共 {filtered.length} 位</span>
        <button className="btn master-new" onClick={onNew}>+ 新建命主</button>
      </div>

      {filtered.length ? (
        <div className="client-list">
          {filtered.map((u) => {
            const isPrimary = u.id === primaryId;
            return (
              <div
                key={u.id}
                className={`client-row master-row ${u.id === activeUserId ? 'active' : ''} ${isPrimary ? 'is-primary' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(u.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onOpen(u.id); }}
              >
                <span className="client-avatar">{Array.from(u.name)[0] || '客'}</span>
                <div className="client-main">
                  <b>{u.name} {isPrimary && <span className="master-badge">主命主</span>}</b>
                  <span>{clientKindLabel(u)} · {u.payload.birthday || '生辰未填'} {u.payload.clockTime || ''}</span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrimary}
                  aria-label={isPrimary ? `${u.name} 是当前主命主` : `设 ${u.name} 为主命主`}
                  className={`master-switch ${isPrimary ? 'on' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onPrimaryChange(u.id); }}
                  title={isPrimary ? '当前主命主' : `设 ${u.name} 为主命主`}
                >
                  <span className="master-switch-track"><i /></span>
                  <em>{isPrimary ? '已开' : '设为主'}</em>
                </button>

                <div className="client-side">
                  <div className="client-actions">
                    <button
                      className="btn small primary"
                      onClick={(e) => { e.stopPropagation(); onOpen(u.id); }}
                    >
                      排盘 →
                    </button>
                    <button
                      className="text-btn"
                      onClick={(e) => { e.stopPropagation(); onProfile(u.id); }}
                    >
                      档案
                    </button>
                    <button
                      className="text-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`删除命主「${u.name}」？`)) onDelete(u.id);
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="client-list-empty">
          <p>{users.length ? '没有符合条件的命主。' : '还没有命主。'}</p>
          {!users.length && <button className="btn" onClick={onNew}>新建第一位命主</button>}
        </div>
      )}

      <p className="hint master-foot">开关只改变「主命主」，不会删除或重置任何人的命盘；点「排盘 →」才进入命盘页面。</p>
    </div>
  );
}
