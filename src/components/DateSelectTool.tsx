import { useState } from 'react';
import type { Astrolabe, ServiceDraft } from '../types';
import { EVENT_RULES, pickDates, type DateSelectResult, type EventKey } from '../lib/dateselect';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pretty(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

function dateDetail(result: DateSelectResult, userLabel?: string): string {
  return [
    `【择日参考】${result.event}${userLabel ? ` · ${userLabel}` : ''}`,
    `范围：${result.start} 起 ${result.days} 天${result.zodiac ? `｜生肖：${result.zodiac}` : ''}`,
    '',
    ...result.candidates.map(
      (c) => `${c.date}（${c.weekday}）${c.level} ${c.score}分\n${c.lunar} · ${c.dayGZ} · 冲${c.chong} 煞${c.sha}\n宜${c.yi.slice(0, 6).join('、')}\n忌${c.ji.slice(0, 6).join('、')}\n${[...c.reasons, ...c.warnings].join(' · ')}`,
    ),
    '',
    result.note,
  ].join('\n');
}

export default function DateSelectTool({
  astrolabe,
  userLabel,
  onSaveService,
}: {
  astrolabe: Astrolabe | null;
  userLabel?: string;
  onSaveService?: (draft: ServiceDraft) => void;
}) {
  const [event, setEvent] = useState<EventKey>('嫁娶');
  const [start, setStart] = useState(today);
  const [days, setDays] = useState(60);
  const [weekendsOnly, setWeekendsOnly] = useState(false);
  const [result, setResult] = useState<DateSelectResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const run = () => {
    setResult(
      pickDates({
        start,
        days,
        event,
        zodiac: astrolabe?.zodiac,
        weekendsOnly,
        limit: 6,
      }),
    );
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* ignore */
    }
  };

  const copyAll = () => {
    if (!result) return;
    copy(dateDetail(result, userLabel), 'all');
  };

  return (
    <div className="tool-pane">
      <div className="tool-intro">
        <h3>择日参考</h3>
        <p>按事项关键词、黄历宜忌、生肖冲煞与周末权重，从未来一段时间里排出候选日。明确交付：首选日 + 备选日 + 理由。</p>
      </div>

      <div className="tool-form">
        <div className="field">
          <label>事项</label>
          <select value={event} onChange={(e) => setEvent(e.target.value as EventKey)}>
            {EVENT_RULES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>起始日期</label>
          <input
            type="text"
            inputMode="numeric"
            value={start}
            placeholder="2026-10-29"
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="field">
          <label>看多久</label>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={30}>未来 30 天</option>
            <option value={60}>未来 60 天</option>
            <option value={90}>未来 90 天</option>
          </select>
        </div>
        <div className="field">
          <label>只看周末</label>
          <select value={weekendsOnly ? '1' : '0'} onChange={(e) => setWeekendsOnly(e.target.value === '1')}>
            <option value="0">不限</option>
            <option value="1">只看周六日</option>
          </select>
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" onClick={run}>开始择日</button>
        {result && <button className="btn ghost" onClick={copyAll}>{copied === 'all' ? '✓ 已复制' : '复制全部'}</button>}
        {result && (
          <button
            className="btn ghost"
            onClick={() => onSaveService?.({
              type: 'dates',
              title: `${userLabel || '客户'} · 择日 · ${result.event}`,
              summary: `首选 ${result.candidates[0]?.date ?? '—'} · ${result.candidates[0]?.level ?? ''}`,
              detail: dateDetail(result, userLabel),
            })}
          >
            保存为服务记录
          </button>
        )}
        {astrolabe && <span className="hint" style={{ margin: 0 }}>已带入当前用户生肖：{astrolabe.zodiac}</span>}
      </div>

      {result && (
        <div className="date-result">
          <div className="date-summary">
            <span className="date-summary-label">首选</span>
            <b>{result.candidates[0]?.date ?? '—'}</b>
            <span>{result.candidates[0]?.weekday}</span>
            <em>{result.candidates[0]?.level} · {result.candidates[0]?.score} 分</em>
          </div>

          <div className="date-list">
            {result.candidates.map((c) => {
              const text = `${c.date}（${c.weekday}）${c.level} ${c.score}分\n${c.lunar} · ${c.dayGZ} · 冲${c.chong} 煞${c.sha}\n宜${c.yi.join('、')}\n忌${c.ji.join('、')}\n${[...c.reasons, ...c.warnings].join(' · ')}`;
              return (
                <article key={c.date} className={`date-card level-${c.level}`}>
                  <div className="date-card-head">
                    <div>
                      <b>{pretty(c.date)}</b>
                      <span>{c.weekday} · {c.score} 分</span>
                    </div>
                    <em>{c.level}</em>
                  </div>
                  <div className="date-meta">
                    <span>{c.lunar}</span>
                    <span>{c.dayGZ}</span>
                    <span>冲{c.chong}</span>
                    <span>煞{c.sha}</span>
                  </div>
                  <div className="date-yiji">
                    <p><em>宜</em>{c.yi.slice(0, 7).join('、') || '—'}</p>
                    <p><em>忌</em>{c.ji.slice(0, 7).join('、') || '—'}</p>
                    {(c.reasons.length > 0 || c.warnings.length > 0) && (
                      <p className="date-reasons">
                        {[...c.reasons, ...c.warnings].join(' · ')}
                      </p>
                    )}
                  </div>
                  <button className="btn ghost small" onClick={() => copy(text, c.date)}>
                    {copied === c.date ? '✓ 已复制' : '复制这个日子'}
                  </button>
                </article>
              );
            })}
          </div>

          <p className="tool-note">{result.note}</p>
        </div>
      )}
    </div>
  );
}
