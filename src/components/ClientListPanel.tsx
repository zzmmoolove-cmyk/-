import { useMemo, useState } from 'react';
import type { UserRecord } from '../types';
import { clientKindLabel } from '../lib/clientGroups';

export default function ClientListPanel({
  users,
  activeUserId,
  onOpen,
  onProfile,
  onNew,
  onDelete,
}: {
  users: UserRecord[];
  activeUserId: string | null;
  onOpen: (id: string) => void;
  onProfile: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return users;
    return users.filter((u) => `${u.name}${u.relation}${u.note}${u.payload.birthday}`.includes(q));
  }, [users, query]);

  return (
    <div className="client-list-page">
      <div className="page-head">
        <div>
          <h2>客户</h2>
          <p className="dim">共 {users.length} 位 · 点客户进入解盘；档案查看记录</p>
        </div>
        <button className="btn" onClick={onNew}>+ 新建客户</button>
      </div>

      <div className="client-toolbar">
        <input value={query} placeholder="搜索姓名 / 关系 / 生日" onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length ? (
        <div className="client-list">
          {filtered.map((u) => (
            <div
              key={u.id}
              className={`client-row ${u.id === activeUserId ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(u.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpen(u.id); }}
            >
              <span className="client-avatar">{Array.from(u.name)[0] || '客'}</span>
              <div className="client-main">
                <b>{u.name}</b>
                <span>{clientKindLabel(u)} · {u.payload.birthday || '生辰未填'} {u.payload.clockTime || ''}</span>
              </div>
              <div className="client-side">
                <span>{u.updatedAt || u.savedAt}</span>
                <div className="client-actions">
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
                      if (window.confirm(`删除客户「${u.name}」？`)) onDelete(u.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="client-list-empty">
          <p>{users.length ? '没有符合条件的客户。' : '还没有客户。'}</p>
          {!users.length && <button className="btn" onClick={onNew}>新建第一位客户</button>}
        </div>
      )}
    </div>
  );
}
