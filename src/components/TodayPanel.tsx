import type { ChartOptions, UserRecord } from '../types';
import { solarToCalendar } from '../lib/calendar';
import { clientKindLabel } from '../lib/clientGroups';
import DailyFortune from './DailyFortune';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TodayPanel({
  users,
  activeUserId,
  primaryId,
  options,
  hasChart,
  onOpenClient,
  onNewClient,
  onOpenServices,
  onOpenLibrary,
  onPrimaryChange,
}: {
  users: UserRecord[];
  activeUserId: string | null;
  primaryId: string | null;
  options: ChartOptions;
  hasChart: boolean;
  onOpenClient: (id: string) => void;
  onNewClient: () => void;
  onOpenServices: () => void;
  onOpenLibrary: () => void;
  onPrimaryChange: (id: string) => void;
}) {
  const today = todayIso();
  let cal: ReturnType<typeof solarToCalendar> | null = null;
  try {
    cal = solarToCalendar(today);
  } catch {
    cal = null;
  }
  const active = users.find((u) => u.id === activeUserId);
  const primary = users.find((u) => u.id === primaryId) ?? null;

  return (
    <div className="today-page">
      <div className="today-date">
        <div>
          <span>今天</span>
          <b>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</b>
        </div>
        {cal && <em>{cal.lunar} · {cal.yearGanZhi}年 · {cal.prevJieQi || '—'}</em>}
      </div>

      <section className="today-section primary-section">
        <div className="today-section-title">
          主客户 <span className="dim">万年历流日按此人的盘</span>
        </div>
        {users.length ? (
          <>
            <div className="primary-row">
              <select value={primaryId ?? ''} onChange={(e) => onPrimaryChange(e.target.value)}>
                <option value="">选择主客户…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {clientKindLabel(u)} · {u.payload.birthday}</option>
                ))}
              </select>
              {primary && <button className="btn ghost small" onClick={() => onOpenClient(primary.id)}>打开解盘</button>}
            </div>
            {primary ? (
              <div className="primary-meta">
                <span className="side-avatar">{Array.from(primary.name)[0] || '客'}</span>
                <div>
                  <b>{primary.name} · {clientKindLabel(primary)}</b>
                  <em>{primary.payload.birthday} {primary.payload.clockTime} · {primary.payload.gender} · 流日以本命盘为底</em>
                </div>
              </div>
            ) : (
              <p className="dim primary-hint">选一位客户，下面万年历会显示他的流日命宫、四化与当天建议。</p>
            )}
          </>
        ) : (
          <p className="dim primary-hint">先新建客户，才能按盘给流日建议。</p>
        )}
      </section>

      <DailyFortune user={primary} options={options} onOpenClient={onOpenClient} />

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
        <div className="today-section-title">快捷</div>
        <div className="today-shortcuts">
          <button onClick={onNewClient}><b>新建命主</b><span>录生辰，起一张盘</span></button>
          <button onClick={onOpenServices}><b>服务</b><span>起名 / 择日 / 合盘</span></button>
          <button onClick={onOpenLibrary}><b>资料</b><span>星曜手册 / 古籍 / 数据</span></button>
        </div>
      </section>
    </div>
  );
}
