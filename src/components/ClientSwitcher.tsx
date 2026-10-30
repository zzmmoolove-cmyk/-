import { useMemo, useState } from 'react';
import type { UserRecord } from '../types';

export default function ClientSwitcher({
  users,
  activeUserId,
  onSelect,
  onNew,
  onClose,
}: {
  users: UserRecord[];
  activeUserId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const query = q.trim();
    return query ? users.filter((u) => `${u.name}${u.relation}${u.payload.birthday}`.includes(query)) : users;
  }, [users, q]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="switcher-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="switcher-head">
          <input autoFocus value={q} placeholder="搜索命主…" onChange={(e) => setQ(e.target.value)} />
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="switcher-list">
          {list.map((u) => (
            <button
              key={u.id}
              className={`switcher-row ${u.id === activeUserId ? 'active' : ''}`}
              onClick={() => onSelect(u.id)}
            >
              <span className="client-avatar">{Array.from(u.name)[0] || '客'}</span>
              <span className="switcher-main">
                <b>{u.name}</b>
                <em>{u.relation === '客户' ? '服务对象' : u.relation} · {u.payload.birthday}</em>
              </span>
              <span className="dim">{u.id === activeUserId ? '当前' : '打开'}</span>
            </button>
          ))}
          {!list.length && <p className="dim" style={{ padding: 16 }}>没有匹配命主。</p>}
        </div>
        <button className="switcher-new" onClick={onNew}>+ 新建命主</button>
      </div>
    </div>
  );
}
