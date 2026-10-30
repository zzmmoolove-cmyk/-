import { useMemo } from 'react';
import type { Astrolabe } from '../types';
import { buildPalaceSnapshot } from '../lib/report';
import { weightedPalace } from '../lib/scopePalace';
import type { ActiveLayers, LayeredData } from '../lib/scope';

export default function PalaceInspector({
  astrolabe,
  palaceName,
  onExpand,
  onSelectStar,
  active,
  layered,
  onSelectPalace,
}: {
  astrolabe: Astrolabe;
  palaceName: string;
  onExpand: () => void;
  onSelectStar: (name: string, palace?: string) => void;
  active?: ActiveLayers;
  layered?: LayeredData | null;
  onSelectPalace?: (name: string) => void;
}) {
  const snap = useMemo(() => buildPalaceSnapshot(astrolabe, palaceName, false), [astrolabe, palaceName]);
  const weighted = useMemo(
    () => (active ? weightedPalace(astrolabe, palaceName, layered ?? null, active) : null),
    [astrolabe, palaceName, active, layered],
  );
  const flowStars = layered?.palaces[palaceName] ?? [];
  const huaTags = weighted?.layers.flatMap((l) => l.mutagens.map((m) => ({ layer: l.label, text: m }))) ?? [];

  return (
    <aside className="inspector panel">
      <div className="inspector-head">
        <div>
          <div className="inspector-eyebrow">当前宫位</div>
          <h2>{snap.palace.label}</h2>
          <div className="inspector-sub">
            {snap.palace.stem}{snap.palace.branch} · {snap.palace.isBody ? '身宫 · ' : ''}大限 {snap.palace.decadal || '—'}
          </div>
        </div>
        <div className="inspector-head-side">
          <button className="inspector-card-link" onClick={onExpand} title="展开完整十二宫报告">
            十二宫 <span>↗</span>
          </button>
          <span className={`inspector-score ${snap.score.value >= 0 ? 'plus' : 'minus'}`}>
            {snap.score.value >= 0 ? '+' : ''}{snap.score.value}
          </span>
        </div>
      </div>

      {weighted && (
        <div className="inspector-weighted">
          <span>本限加权</span>
          <b>{weighted.total}</b>
          <em>{weighted.label}</em>
        </div>
      )}

      <div className="inspector-stars">
        {snap.stars.slice(0, 9).map((s) => (
          <button key={s.name} className="inspector-star" onClick={() => onSelectStar(s.name, palaceName)}>
            <b>{s.name}</b>
            <span>{s.brightness || '—'}{s.natalMutagen ? ` · ${s.natalMutagen}` : ''}</span>
          </button>
        ))}
        {snap.stars.length === 0 && <p className="dim">空宫，借对宫参看。</p>}
      </div>

      {flowStars.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-label">本限流曜</div>
          <div className="inspector-flow-stars">
            {flowStars.map((s, i) => (
              <span key={s.name + i} className={`inspector-flow-tag layer-${s.scope}`}>
                {s.name}
              </span>
            ))}
          </div>
          {huaTags.length > 0 && (
            <div className="inspector-flow-hua">
              {huaTags.map((h, i) => <span key={h.text + i}>{h.layer} · {h.text}</span>)}
            </div>
          )}
        </div>
      )}

      <div className="inspector-section">
        <div className="inspector-label">三方四正</div>
        <div className="inspector-surround">
          {snap.surrounding.map((g) => (
            <button key={g.role + g.palace} onClick={() => onSelectPalace?.(g.palace)}>
              <em>{g.role}</em>
              <b>{g.palace}</b>
              <span>{g.stars.slice(0, 3).join('、') || '空宫'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">卡点</div>
        {snap.blockages.length ? (
          snap.blockages.slice(0, 3).map((b) => (
            <div key={b.id} className="inspector-blockage">
              <span className={`sev-tag sev-${b.severity}`}>{b.severity}</span>
              <span>{b.title}</span>
            </div>
          ))
        ) : (
          <p className="dim">未触发 v1.0 规则卡点。</p>
        )}
      </div>

      <p className="inspector-domain">{snap.palace.domain}</p>

    </aside>
  );
}
