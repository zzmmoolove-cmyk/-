import { useMemo } from 'react';
import type { Astrolabe } from '../types';
import { getScopeData, type ActiveLayers, type ScopeData } from '../lib/scope';
import { solarToCalendar } from '../lib/calendar';

type Focus = 'decadal' | 'yearly' | 'monthly' | 'daily';

const FOCUS_LABEL: Record<Focus, string> = {
  decadal: '大限报告',
  yearly: '流年报告',
  monthly: '流月报告',
  daily: '流日报告',
};

const FOCUS_PERIOD: Record<Focus, string> = {
  decadal: '这十年',
  yearly: '这一年',
  monthly: '这一月',
  daily: '这一天',
};

const FLOW_FOCUS = ['命宫', '财帛', '官禄', '夫妻', '福德'];

function findLanding(a: Astrolabe, star: string): string | undefined {
  return a.palaces.find((p) => [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star))?.name;
}

function focusLayer(active: ActiveLayers): Focus | null {
  if (active.daily) return 'daily';
  if (active.monthly) return 'monthly';
  if (active.yearly) return 'yearly';
  if (active.decadal != null) return 'decadal';
  return null;
}

export default function ScopeFocusReport({
  astrolabe,
  raw,
  active,
  userLabel,
}: {
  astrolabe: Astrolabe;
  raw: Record<string, unknown> | null;
  active: ActiveLayers;
  userLabel: string;
}) {
  const focus = focusLayer(active);
  const data = useMemo<ScopeData | null>(() => {
    if (!raw || !focus) return null;
    try {
      if (focus === 'decadal') return getScopeData(raw as never, 'decadal', { decadalIndex: active.decadal ?? 0 });
      if (focus === 'yearly') return getScopeData(raw as never, 'yearly', { targetDate: `${active.yearly}-06-15` });
      if (focus === 'monthly') return getScopeData(raw as never, 'monthly', { targetDate: `${active.yearly}-${String(active.monthly).padStart(2, '0')}-15` });
      return getScopeData(raw as never, 'daily', { targetDate: active.daily ?? undefined });
    } catch {
      return null;
    }
  }, [raw, focus, active]);

  const calendar = useMemo(() => {
    if (focus !== 'daily' || !active.daily) return null;
    try { return solarToCalendar(active.daily); } catch { return null; }
  }, [focus, active.daily]);

  if (!focus || !data) {
    return <div className="panel empty-state">先在上方选一个大限 / 流年 / 流月 / 流日，再生成对应报告。</div>;
  }

  const mutagens = data.mutagenMap.map((m) => ({ ...m, landing: findLanding(astrolabe, m.star) }));
  const ji = mutagens.filter((m) => m.mutagen === '忌');
  const lu = mutagens.filter((m) => m.mutagen === '禄');
  const flowPalaces = Object.entries(data.flowPalaceByBase)
    .filter(([, flow]) => FLOW_FOCUS.includes(flow))
    .map(([base, flow]) => {
      const flowStars = (data.palaces[base] ?? []).map((s) => s.name);
      const natal = astrolabe.palaces.find((p) => p.name === base);
      return {
        base,
        flow,
        flowStars,
        natalStars: natal?.majorStars.map((s) => s.name) ?? [],
        focus: flow === '命宫',
      };
    })
    .sort((a, b) => FLOW_FOCUS.indexOf(a.flow) - FLOW_FOCUS.indexOf(b.flow));

  const focusBases = new Set(flowPalaces.filter((p) => ['命宫', '财帛', '官禄', '夫妻'].includes(p.flow)).map((p) => p.base));
  const sha = flowPalaces
    .filter((p) => focusBases.has(p.base))
    .flatMap((p) => p.flowStars)
    .filter((s) => ['擎羊', '陀罗', '火星', '铃星', '地空', '地劫'].includes(s));
  const jiInFocus = ji.filter((m) => m.landing && focusBases.has(m.landing));
  const luInFocus = lu.filter((m) => m.landing && focusBases.has(m.landing));
  const level = jiInFocus.length || sha.length >= 2 ? '守' : luInFocus.length ? '进' : '稳';

  const period = FOCUS_PERIOD[focus];
  const periodLabel =
    focus === 'daily'
      ? active.daily ?? '流日'
      : focus === 'monthly'
        ? `${active.yearly} 年 ${active.monthly} 月`
        : focus === 'yearly'
          ? `${active.yearly} 年`
          : data.label;
  const summary =
    focus === 'decadal'
      ? `${data.label}：先看大限命宫落本命${data.scopePalaceName ?? '—'}，再看四化把${period}的主题带到哪里。`
      : focus === 'yearly'
        ? `${active.yearly} 流年：流年命宫落本命${data.scopePalaceName ?? '—'}，今年先抓一条主线，不要同时开太多战场。`
        : focus === 'monthly'
          ? `${active.yearly} 年 ${active.monthly} 月：流月命宫落本命${data.scopePalaceName ?? '—'}，用来看节奏与时机，不单独断吉凶。`
          : `${active.daily} 流日：流日命宫落本命${data.scopePalaceName ?? '—'}，只做当天提醒，过日即散。`;

  const advice = [
    focus === 'decadal'
      ? '大限是十年底色：先定方向与资源，不要在流年小波动里频繁改长期战略。'
      : focus === 'yearly'
        ? '流年是年度主线：挑一件最重要的事，把大限的方向落到今年。'
        : focus === 'monthly'
          ? '流月是节奏：适合安排启动、推进、收尾的顺序，不适合单凭一个月断关系或事业。'
          : '流日只做当天：先看作息、沟通与情绪，不把一天的感觉当成长期结论。',
    jiInFocus.length
      ? `流日忌落${[...new Set(jiInFocus.map((m) => m.landing))].join('、')}：先守节奏，重大决定延后。`
      : luInFocus.length
        ? `四化禄入重点宫：可以推进一件具体事，但别把「顺」当成「稳赚」。`
        : '重点宫没有明显四化冲击：按计划走，少做临时起意的大改。',
    sha.length
      ? `重点宫见 ${sha.length} 个煞星：疲惫、赶时间时不要谈重要议题；把冲突留到状态好的时候。`
      : '重点宫没有明显煞星：维持边界与日常复盘，比追求一次大转折更重要。',
  ];

  return (
    <div className="panel scope-focus-report">
      <div className="scope-report-head">
        <div>
          <div className="inspector-eyebrow">命理报告 · {focus === 'daily' ? '同万年历' : '运限版'}</div>
          <h2>{FOCUS_LABEL[focus]} <span className="dim">{periodLabel}</span></h2>
          <p>{userLabel ? `${userLabel} · ` : ''}{summary}</p>
        </div>
        <div className="scope-report-actions">
          <button className="btn ghost small" onClick={() => window.print()}>打印 / PDF</button>
          <div className={`scope-level ${level === '进' ? 'good' : level === '守' ? 'careful' : 'flat'}`}>
            <b>{level}</b><span>{period}节奏</span>
          </div>
        </div>
      </div>

      {calendar && (
        <div className="scope-calendar-strip">
          <div><span>公历</span><b>{calendar.solar}</b></div>
          <div><span>农历</span><b>{calendar.lunar}</b></div>
          <div><span>干支</span><b>{calendar.yearGanZhi}年 {calendar.monthGanZhi}月 {calendar.dayGanZhi}日</b></div>
          <div><span>冲煞</span><b>冲{calendar.dayChong} · 煞{calendar.daySha}</b></div>
          <div className="scope-yiji"><span>宜</span><b>{calendar.dayYi.slice(0, 5).join('、') || '—'}</b></div>
          <div className="scope-yiji"><span>忌</span><b>{calendar.dayJi.slice(0, 5).join('、') || '—'}</b></div>
        </div>
      )}

      <div className="scope-report-section">
        <h3>重点宫位</h3>
        <div className="scope-focus-palaces">
          {flowPalaces.map((p) => (
            <div key={p.base} className={`scope-focus-palace ${p.focus ? 'main' : ''}`}>
              <div><em>{p.flow}</em><b>本命{p.base}</b></div>
              <p>本命：{p.natalStars.join('、') || '空宫'}｜流曜：{p.flowStars.join('、') || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="scope-report-section">
        <h3>四化落宫</h3>
        <div className="scope-mutagen-list">
          {mutagens.map((m) => (
            <span key={m.star + m.mutagen} className={`hw hua-${m.mutagen}`}>
              {m.star}化{m.mutagen}{m.landing ? ` · ${m.landing}` : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="scope-report-section">
        <h3>{period}怎么做</h3>
        <ul className="notes">{advice.map((a) => <li key={a}>{a}</li>)}</ul>
      </div>

      <p className="hint">报告只按当前选择的大限/流年/流月/流日叠加；流日只做当天提醒，不替代长期判断。流月/流日不单独断吉凶。</p>
    </div>
  );
}
