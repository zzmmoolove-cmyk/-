import { useMemo, useState } from 'react';
import type { Astrolabe } from '../types';
import { buildPalacePromptText, buildPalaceSnapshot, snapshotToText } from '../lib/report';

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
  onSelectPalace,
  onSelectStar,
}: {
  astrolabe: Astrolabe;
  palaceName: string;
  onSelectPalace: (name: string) => void;
  onSelectStar: (name: string, palace?: string) => void;
}) {
  const snapshot = useMemo(() => buildPalaceSnapshot(astrolabe, palaceName), [astrolabe, palaceName]);
  const [copied, setCopied] = useState<'prompt' | 'text' | null>(null);

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
          宫位卡 1.0 <span className="badge">v1.0</span> · {snapshot.palace.label}
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
        <button className="btn ghost small" onClick={() => doCopy('prompt')}>
          {copied === 'prompt' ? '✓ 已复制 Prompt' : '复制 Prompt（喂给通用大模型）'}
        </button>
        <button className="btn ghost small" onClick={() => doCopy('text')}>
          {copied === 'text' ? '✓ 已复制全文' : '复制宫位卡全文'}
        </button>
        <span className="hint" style={{ margin: 0 }}>
          卡片数据全部来自本地规则与知识库，不含 AI 臆测。
        </span>
      </div>

      <div className="index-grid">
        {snapshot.index.map((row) => (
          <button
            key={row.palace}
            className={`index-cell ${row.palace === palaceName ? 'active' : ''}`}
            onClick={() => onSelectPalace(row.palace)}
            title={`${row.scoreLabel}｜卡点 ${row.blockages}`}
          >
            <span className="idx-name">{LABEL(row.palace)}</span>
            <span className="idx-major">{row.majors.length ? row.majors.join('·') : '空宫'}</span>
            <span className={`idx-score ${row.score >= 0 ? 'plus' : 'minus'}`}>
              {row.score > 0 ? '+' : ''}{row.score}
              {row.blockages > 0 && <em>卡{row.blockages}</em>}
            </span>
          </button>
        ))}
      </div>

      <section>
        <h3 className="section-title">一、宫位定位</h3>
        <p className="brief">{snapshot.palace.domain}</p>
        <p className="dim">
          关注：{snapshot.palace.focus.join('、') || '—'}｜权重：本宫 1.0 ＞ 对宫 0.6 ＞ 三合 0.45｜
          长生十二神：{snapshot.palace.changsheng || '—'}｜大限：{snapshot.palace.decadal || '—'}
        </p>
      </section>

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
    </div>
  );
}
