import { useMemo } from 'react';
import type { Astrolabe, BirthInput, ChartOptions } from '../types';
import type { ActiveLayers } from '../lib/scope';
import { buildScopeReport } from '../lib/scopeReport';
import { solarToCalendar } from '../lib/calendar';

const SEMANTIC = {
  机会: 'opportunity',
  观察: 'watch',
  压力: 'pressure',
} as const;

export default function ScopeFocusReport({
  astrolabe,
  raw,
  active,
  userLabel,
  input,
  options,
}: {
  astrolabe: Astrolabe;
  raw: Record<string, unknown> | null;
  active: ActiveLayers;
  userLabel: string;
  input: BirthInput;
  options: ChartOptions;
}) {
  const report = useMemo(
    () => buildScopeReport(astrolabe, raw, active, userLabel || '命主', input, options),
    [astrolabe, raw, active, userLabel, input, options],
  );
  const calendar = useMemo(() => {
    if (active.daily == null) return null;
    try { return solarToCalendar(active.daily); } catch { return null; }
  }, [active.daily]);

  if (!report) {
    return <div className="panel empty-state">先在上方选一个大限 / 流年 / 流月 / 流日，再生成对应报告。</div>;
  }

  const printReport = () => {
    document.querySelectorAll<HTMLDetailsElement>('.scope-focus-report details').forEach((d) => { d.open = true; });
    window.print();
  };

  const groupedTransforms = report.layers.map((l) => ({
    layer: l,
    rows: report.transforms.filter((t) => t.layer === l.key),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="panel scope-focus-report">
      <div className="scope-report-head">
        <div>
          <div className="inspector-eyebrow">紫微命理报告 · {report.levelLabel}</div>
          <h2>{report.reportLabel} <span className="dim">{report.periodTitle}</span></h2>
          <p>{report.oneLine}</p>
        </div>
        <div className="scope-report-actions">
          <button className="btn ghost small" onClick={printReport}>打印 / PDF</button>
          <div className="scope-report-badge">{report.levelLabel}</div>
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

      <section className="scope-report-summary">
        <div className="scope-summary-main">
          <div className="scope-kicker">一页摘要 · {report.theme}</div>
          <div className="scope-summary-cols">
            <div>
              <em className="semantic-label opportunity">机会</em>
              <ul>{report.opportunities.length ? report.opportunities.map((d) => <li key={d.key}><b>{d.label}</b><span>{d.advice}</span></li>) : <li>本层没有突出的高分领域，先按既定节奏走。</li>}</ul>
            </div>
            <div>
              <em className="semantic-label pressure">风险边界</em>
              <ul>{report.risks.length ? report.risks.map((d) => <li key={d.key}><b>{d.label}</b><span>{d.boundary}</span></li>) : <li>未触发明显低分领域，仍按下面边界执行。</li>}</ul>
            </div>
          </div>
        </div>
        <div className="scope-summary-side">
          <div className="scope-kicker">结构权重</div>
          <div className="scope-weight-pills">
            {report.layers.map((l) => <span key={l.key}>{l.label} <b>{l.weight}%</b></span>)}
          </div>
          <p>按当前已选层归一化；本命是底色，大限/流年/流月/流日依次叠加，不是简单覆盖。</p>
          <div className="scope-action-list">
            {report.actions.map((a, i) => <div key={a}><i>{String(i + 1).padStart(2, '0')}</i><span>{a}</span></div>)}
          </div>
        </div>
      </section>

      <section className="scope-report-section">
        <div className="scope-section-head">
          <h3>时间定位与叠宫</h3>
          <span className="dim">本命 → 大限 → 流年 → 流月 → 流日</span>
        </div>
        <div className="scope-params">
          {report.parameters.map((p) => <div key={p.label}><span>{p.label}</span><b>{p.value || '—'}</b></div>)}
        </div>
        <div className="scope-chain">
          {report.chain.map((c, i) => (
            <div key={c.layer} className={c.layer === report.level ? 'focus' : ''}>
              <em>{c.layerLabel}</em>
              <b>{c.flowPalace}</b>
              <span>叠本命 {c.basePalace}</span>
              {i < report.chain.length - 1 && <i className="chain-arrow">→</i>}
            </div>
          ))}
        </div>

        <details className="scope-overlap">
          <summary>十二宫叠合表 <span>本命宫位 × 各层运限宫位</span></summary>
          <div className="scope-overlap-scroll">
            <table>
              <thead>
                <tr>
                  <th>本命宫位</th>
                  {report.layers.map((l) => <th key={l.key}>{l.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {report.overlapRows.map((row) => (
                  <tr key={row.basePalace} className={row.basePalace === report.focusPalace ? 'focus' : ''}>
                    <th>{row.basePalace}</th>
                    {row.cells.map((c) => <td key={c.layer}>{c.flowPalace}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="scope-report-section">
        <div className="scope-section-head">
          <h3>本层结构</h3>
          <span className="dim">{report.focusPalace} · 本命星 + 流曜</span>
        </div>
        <div className="scope-structure">
          <div>
            <em>本命星</em>
            <p>{report.focusStars.join('、') || '空宫，借对宫参看'}</p>
          </div>
          <div>
            <em>本层流曜</em>
            <p>{report.focusFlowStars.join('、') || '本层无流曜落此宫'}</p>
          </div>
          <div>
            <em>判断层级</em>
            <p>{report.levelLabel}只回答这一层的主题；不把当日提醒放大成人生命题。</p>
          </div>
        </div>
        <div className="scope-surround">
          <span className="scope-surround-label">三方四正</span>
          {report.surroundings.map((s) => (
            <div key={s.role + s.basePalace}>
              <em>{s.role}</em>
              <b>{s.flowPalace} · 本命{s.basePalace}</b>
              <span>{s.stars.join('、') || '空宫'}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="scope-report-section">
        <div className="scope-section-head">
          <h3>四化链条</h3>
          <span className="dim">只列与本层相关的四化落宫</span>
        </div>
        <div className="scope-transform-groups">
          {groupedTransforms.map((g) => (
            <div key={g.layer.key} className="scope-transform-group">
              <div className="scope-transform-label">{g.layer.label} <span>{g.layer.weight}%</span></div>
              <div className="scope-mutagen-list">
                {g.rows.map((t, i) => (
                  <span key={`${t.star}${t.mutagen}${i}`} className={`hw hua-${t.mutagen}`}>
                    {t.star}化{t.mutagen} · 落{t.basePalace}
                    {t.flowPalace !== t.basePalace ? `（${t.flowPalace}）` : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="scope-report-section">
        <div className="scope-section-head">
          <h3>分领域解读</h3>
          <span className="dim">结构关注度，不是吉凶总分</span>
        </div>
        <div className="scope-domain-grid">
          {report.domains.map((d) => (
            <article key={d.key} className={`scope-domain-card ${SEMANTIC[d.level]}`}>
              <div className="scope-domain-head">
                <div><em>{d.label}</em><b>{d.basePalace}</b></div>
                <span className={`semantic-pill ${SEMANTIC[d.level]}`}>{d.level} · {d.score}</span>
              </div>
              <p className="scope-domain-evidence">{d.evidence}</p>
              {d.mutagens.length > 0 && <div className="scope-domain-hua">{d.mutagens.map((m) => <span key={m}>{m}</span>)}</div>}
              <p className="scope-domain-advice">→ {d.advice}</p>
              <p className="scope-domain-boundary">边界：{d.boundary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="scope-report-section">
        <div className="scope-section-head">
          <h3>关键窗口</h3>
          <span className="dim">{report.level === 'daily' ? '流日不做流时断言' : '按本层内下一级时间粒度扫描'}</span>
        </div>
        {report.windows.length ? (
          <div className="scope-window-grid">
            {report.windows.map((w) => (
              <div key={w.label} className={`scope-window ${SEMANTIC[w.type]}`}>
                <div><b>{w.label}</b><span className={`semantic-pill ${SEMANTIC[w.type]}`}>{w.type}</span></div>
                <p>{w.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="dim">流日只做当天提醒，不细分上午/下午/晚间的吉凶；按实际日程留缓冲即可。</p>
        )}
      </section>

      <section className="scope-report-section scope-authority">
        <div className="scope-section-head">
          <h3>建议权限与边界</h3>
          <span className="dim">可以怎么用，不能怎么用</span>
        </div>
        <div className="scope-authority-grid">
          <div><em>可用于</em><p>自我复盘、沟通准备、日程安排、观察与记录。</p></div>
          <div><em>不可用于</em><p>医疗诊断、法律判断、投资决策、婚姻/雇佣等专业或不可逆决定。</p></div>
          <div><em>阅读方法</em><p>先看摘要，再看叠宫与证据；不要把流日/流月的小触发当成人生定论。</p></div>
        </div>
        <ul className="notes">{report.boundaries.map((b) => <li key={b}>{b}</li>)}</ul>
        <div className="scope-observables">
          <div className="scope-kicker">可验证观察点</div>
          <ul>{report.observables.map((o) => <li key={o}>{o}</li>)}</ul>
        </div>
      </section>

      <details className="scope-evidence">
        <summary>证据链与术语 <span>展开核对推断依据</span></summary>
        <div className="scope-evidence-body">
          <div>
            <h4>推断证据</h4>
            <ul className="notes">{report.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
          <div>
            <h4>术语简释</h4>
            <dl>
              <dt>叠宫</dt><dd>本层命宫落在本命哪一宫，表示这一层主题落在哪个现实领域。</dd>
              <dt>四化</dt><dd>禄/权/科/忌分别表示资源、推动、名声与课题；必须结合落宫与叠宫。</dd>
              <dt>三方四正</dt><dd>本宫、对宫与两个三合宫，用来判断资源与压力来源。</dd>
              <dt>权重</dt><dd>本命 50%、大限 20%、流年 15%、流月 10%、流日 5%，按已选层归一化。</dd>
            </dl>
          </div>
        </div>
        <p className="hint">{report.caveat}</p>
      </details>

      <p className="scope-report-foot">{report.subject} · {report.periodTitle} · 结构参考，不是事件预测；不作医疗、法律、财务或婚姻决策依据。</p>
    </div>
  );
}
