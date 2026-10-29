import type { UserRecord } from '../types';
import { solarToCalendar } from '../lib/calendar';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TodayPanel({
  users,
  activeUserId,
  hasChart,
  onOpenClient,
  onNewClient,
  onOpenServices,
  onOpenLibrary,
}: {
  users: UserRecord[];
  activeUserId: string | null;
  hasChart: boolean;
  onOpenClient: (id: string) => void;
  onNewClient: () => void;
  onOpenServices: () => void;
  onOpenLibrary: () => void;
}) {
  const today = todayIso();
  let cal: ReturnType<typeof solarToCalendar> | null = null;
  try {
    cal = solarToCalendar(today);
  } catch {
    cal = null;
  }
  const active = users.find((u) => u.id === activeUserId);
  const recent = users.slice(0, 5);

  return (
    <div className="today-page">
      <div className="today-date">
        <div>
          <span>今天</span>
          <b>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</b>
        </div>
        {cal && <em>{cal.lunar} · {cal.yearGanZhi}年 · {cal.prevJieQi || '—'}</em>}
      </div>

      {active && (
        <section className="today-section">
          <div className="today-section-title">继续</div>
          <button className="today-resume" onClick={() => onOpenClient(active.id)}>
            <div>
              <b>{active.name}</b>
              <span>{active.relation} · {active.payload.birthday}</span>
            </div>
            <em>{hasChart ? '回到上次解盘' : '开始解盘'} →</em>
          </button>
        </section>
      )}

      <section className="today-section">
        <div className="today-section-title">
          最近客户 <span className="dim">{users.length} 位</span>
        </div>
        {recent.length ? (
          <div className="today-clients">
            {recent.map((u) => (
              <button key={u.id} className="today-client" onClick={() => onOpenClient(u.id)}>
                <span className="today-avatar">{Array.from(u.name)[0] || '客'}</span>
                <span className="today-client-main">
                  <b>{u.name}</b>
                  <em>{u.relation} · {u.payload.birthday || '生辰未填'}</em>
                </span>
                <span className="today-client-arrow">→</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="today-empty">
            <p>今天还没有客户。</p>
            <button className="btn" onClick={onNewClient}>新建第一位客户</button>
          </div>
        )}
      </section>

      <section className="today-section">
        <div className="today-section-title">快捷</div>
        <div className="today-shortcuts">
          <button onClick={onNewClient}><b>新建客户</b><span>录生辰，起一张盘</span></button>
          <button onClick={onOpenServices}><b>服务</b><span>起名 / 择日 / 合盘</span></button>
          <button onClick={onOpenLibrary}><b>资料</b><span>星曜手册 / 万年历 / 设置</span></button>
        </div>
      </section>
    </div>
  );
}
