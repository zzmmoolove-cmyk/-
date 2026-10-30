import { useMemo, useState } from 'react';
import type { Astrolabe } from '../types';
import { buildPalacePromptText, buildPalaceSnapshot, snapshotToText } from '../lib/report';
import { referenceLabel, type OutputProfile, type OutputSections } from '../lib/output';
import { weightedPalace } from '../lib/scopePalace';
import type { ActiveLayers, LayeredData } from '../lib/scope';
import { quotesForStars } from '../lib/classics';

const LABEL = (n: string) => (n.endsWith('宫') ? n : `${n}宫`);

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* 退回到 execCommand */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

export default function PalaceReportPanel({
  astrolabe,
  palaceName,
  onSelectStar,
  output,
  active,
  layered,
}: {
  astrolabe: Astrolabe;
  palaceName: string;
  onSelectStar: (name: string, palace?: string) => void;
  output?: OutputProfile;
  active?: ActiveLayers;
  layered?: LayeredData | null;
}) {
  const snapshot = useMemo(() => buildPalaceSnapshot(astrolabe, palaceName), [astrolabe, palaceName]);
  const [copied, setCopied] = useState<'prompt' | 'text' | null>(null);
  const show = (key: keyof OutputSections) => (output ? output.sections[key] : true);
  const refs = output ? referenceLabel(output) : '';
  const secondary = show('stars') || show('synastry') || show('surround') || show('wuxing') || show('four');
  const anyContent = show('position') || secondary || show('blockages') || show('strategies') || show('classics') || show('gaps');
  const weighted = useMemo(
    () => (active ? weightedPalace(astrolabe, palaceName, layered ?? null, active) : null),
    [astrolabe, palaceName, active, layered],
  );
  const classicQuotes = useMemo(
    () => (output ? quotesForStars(snapshot.stars.map((s) => s.name), 4) : []),
    [snapshot, output],
  );

  const doCopy = async (kind: 'prompt' | 'text') => {
    const text = kind === 'prompt' ? buildPalacePromptText(snapshot) : snapshotToText(snapshot);
    await copyText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="panel report-panel">
      <div className="report-head">
        <h2>
          十二宫 <span className="badge">v1.0</span> · {snapshot.palace.label}
          <span className="dim">　{snapshot.palace.stem}{snapshot.palace.branch}</span>
          {snapshot.palace.isBody && <span className="badge badge-body">身宫</span>}
        </h2>
        <div className="report-score">
          <span className={`score-pill ${snapshot.score.value >= 0 ? 'plus' : 'minus'}`}>
            吉煞分 {snapshot.score.value}
          </span>
          <span className="dim">{snapshot.score.label}</span>
        </div>
      </div>

      <div className="copy-row">
        <button className="btn ghost small" onClick={() => doCopy('prompt')} title="结构说明 + 本宫数据 + 输出格式 + 质量红线">
          {copied === 'prompt' ? '✓ 已复制' : '复制 Prompt'}
        </button>
        <button className="btn ghost small" onClick={() => doCopy('text')}>
          {copied === 'text' ? '✓ 已复制' : '复制全文'}
        </button>
        <span className="hint" style={{ margin: 0 }}>本地规则生成，不含 AI 臆测。</span>
        {refs && <span className="source-note">参考：{refs}（仅引文标注）</span>}
      </div>

      {weighted && (
        <section className="scope-weight-card">
          <div className="scope-weight-head">
            <div>
              <div className="inspector-eyebrow">本限十二宫 · 加权</div>
              <h3>本命之后，再看当前选中的运限层</h3>
            </div>
            <div className="scope-weight-total"><b>{weighted.total}</b><span>{weighted.label}</span></div>
          </div>
          <div className="scope-weight-rows">
            {weighted.layers.map((l) => (
              <div key={l.scope} className="scope-weight-row">
                <span>{l.label}</span>
                <b>{l.score}</b>
                <em>{l.weight}%</em>
                <p>{l.note}</p>
              </div>
            ))}
          </div>
          <p className="hint">本命 50% + 大限 20% + 流年 15% + 流月 10% + 流日 5%，按当前已选层归一化；这是结构权重，不是吉凶总分。</p>
        </section>
      )}

      {show('position') && (
        <section>
          <h3 className="section-title">一、宫位定位</h3>
          <p className="brief">{snapshot.palace.domain}</p>
          <div className="report-meta">
            <span><em>关注</em>{snapshot.palace.focus.join('、') || '—'}</span>
            <span><em>权重</em>本宫 1.0 / 对宫 0.6 / 三合 0.45</span>
            <span><em>长生</em>{snapshot.palace.changsheng || '—'}</span>
            <span><em>大限</em>{snapshot.palace.decadal || '—'}</span>
          </div>
        </section>
      )}

      {secondary && (
      <details className="report-fold">
        <summary>
          <span>二～六 · 星曜与推演</span>
          <em>本宫星曜 / 同宫联动 / 三方四正 / 五行链 / 四化</em>
        </summary>
        {show('stars') && (
          <section>
            <h3 className="section-title">二、本宫星曜</h3>
            {snapshot.stars.length === 0 && <p className="dim">空宫，借对宫星曜参看。</p>}
            {snapshot.stars.map((s) => (
              <div key={s.name} className={`star-row kind-${s.kind}`}>
                <div className="star-row-head">
                  <button className="star-link" onClick={() => onSelectStar(s.name, palaceName)}>
                    {s.name}
                  </button>
                  <span className="badge">{s.kind}</span>
                  {s.element && <span className="badge">{s.element}</span>}
                  <span className="badge">{s.brightness ?? '亮度未提供'}</span>
                  {s.natalMutagen && <span className="badge badge-mutagen">生年{s.natalMutagen}</span>}
                  {s.selfHua && <span className="badge badge-mutagen">自化{s.selfHua}</span>}
                  {s.profile ? (
                    <span className="dim">{s.profile.keywords.slice(0, 3).join(' · ')}</span>
                  ) : (
                    <span className="dim">资料待补</span>
                  )}
                </div>
                <p className="star-row-line">{s.palaceLine}</p>
              </div>
            ))}
          </section>
        )}

        {show('synastry') && (
          <section>
            <h3 className="section-title">三、同宫联动</h3>
            {snapshot.samePalace.length === 0 && <p className="dim">星曜资料不足，暂无联动判读。</p>}
            <div className="syn-list">
              {snapshot.samePalace.map((x, i) => (
                <div key={`${x.subject}-${x.object}-${i}`} className="syn-item">
                  <span className={`syn-rel rel-${x.relation}`}>{x.relation}·{x.verdict}</span>
                  <span className="syn-body">
                    以 <b>{x.subject}</b> 为主体：{x.text}
                    {x.note && <em className="syn-note">{x.note}</em>}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {show('surround') && (
          <section>
            <h3 className="section-title">四、三方四正（会照）</h3>
            <div className="surround-grid">
              {snapshot.surrounding.map((g) => (
                <div key={g.role + g.palace} className="surround-card">
                  <div className="surround-head">
                    <b>{g.role === '对宫' ? '正照' : '斜照'}·{LABEL(g.palace)}</b>
                    <span className={`idx-score ${g.natureScore >= 0 ? 'plus' : 'minus'}`}>
                      权重 {g.weight}｜{g.natureScore > 0 ? '+' : ''}{g.natureScore}
                    </span>
                  </div>
                  <div className="surround-stars">{g.stars.join('、') || '空宫'}</div>
                  {g.synastry.map((y, i) => (
                    <p key={i} className="surround-line">{y.text}</p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {show('wuxing') && (
          <section>
            <h3 className="section-title">五、五行链</h3>
            {snapshot.chains.length === 0 ? (
              <p className="dim">未形成长度 ≥3 的链，按上面的两两生克判读。</p>
            ) : (
              <ul className="chain-list">
                {snapshot.chains.map((c) => (
                  <li key={c.text} className={c.kind === '生' ? 'chain-sheng' : 'chain-ke'}>
                    <span className="chain-kind">{c.kind === '生' ? '顺生' : '相克'}</span>
                    {c.path.join(' → ')}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {show('four') && (
          <section>
            <h3 className="section-title">六、四化</h3>
            <div className="four-block">
              <p>
                <b>生年四化落本宫：</b>
                {snapshot.natal.length ? snapshot.natal.map((n) => `${n.star}化${n.mutagen}`).join('、') : '无'}
              </p>
              <p>
                <b>宫干自化：</b>
                {snapshot.selfHua.length ? snapshot.selfHua.map((h) => `${h.star}自化${h.mutagen}`).join('、') : '无'}
              </p>
              {snapshot.selfHua.map((h) => (
                <p key={h.star + h.mutagen} className="dim">{h.star}自化{h.mutagen}：{h.text}</p>
              ))}
              <p>
                <b>本宫宫干飞化：</b>
                {snapshot.fly.length
                  ? snapshot.fly.map((f) => `${f.star}化${f.mutagen} → ${LABEL(f.to)}`).join('、')
                  : '无'}
              </p>
            </div>
          </section>
        )}

      </details>
      )}

      {show('blockages') && (
      <section>
        <h3 className="section-title">七、卡点与策略</h3>
        {snapshot.blockages.length === 0 && <p className="dim">未触发 v1.0 规则卡点。</p>}
        <div className="blockage-list">
          {snapshot.blockages.map((b) => (
            <div key={b.id} className={`blockage sev-${b.severity}`}>
              <div className="blockage-head">
                <span className={`sev-tag sev-${b.severity}`}>{b.severity}</span>
                <b>{b.title}</b>
              </div>
              <p><em>依据</em>{b.evidence.join('；')}</p>
              <p><em>影响</em>{b.impact}</p>
              <p><em>解法</em>{b.fix}</p>
              <p><em>动作</em>{b.action}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {show('strategies') && (
      <section>
        <h3 className="section-title">八、用星建议</h3>
        <div className="strategy-list">
          {snapshot.strategies.map((t) => (
            <div key={t.star} className="strategy-card">
              <div className="strategy-head">
                <button className="star-link" onClick={() => onSelectStar(t.star, palaceName)}>{t.star}</button>
                <span className="dim">{t.field}</span>
              </div>
              <p><em>风险</em>{t.risk}</p>
              <p><em>修正</em>{t.fix}</p>
              <p className="motto">「{t.motto}」</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {show('classics') && (
        <section>
          <h3 className="section-title">附：古籍摘录</h3>
          <p className="hint">整理本检索，非影印原文；逐字引用前请核对原书。</p>
          {classicQuotes.length ? (
            <div className="classic-quotes">
              {classicQuotes.map((q) => (
                <div key={q.paragraphId} className="classic-quote">
                  <div className="classic-hit-source">{q.bookTitle} · {q.chapterTitle}</div>
                  <p>{q.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="dim">本宫星曜暂未在这三本整理本中检索到直接段落。</p>
          )}
        </section>
      )}

      {show('gaps') && (
      <details className="report-fold">
        <summary>
          <span>九、数据缺口</span>
          <em>缺数据标注与复盘自检</em>
        </summary>
        <section>
          <h3 className="section-title">九、数据缺口</h3>
          <ul className="notes">
            {snapshot.gaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <p className="hint">
            已自检：先定宫位再解星｜区分本宫（1.0）与会照（0.6/0.45）｜庙旺叠加四化｜缺数据标注不硬编｜未作宿命断语。
          </p>
        </section>
      </details>
      )}

      {!anyContent && <p className="dim">当前没有勾选任何展示章节，去「导出」里打开需要的部分。</p>}
    </div>
  );
}
