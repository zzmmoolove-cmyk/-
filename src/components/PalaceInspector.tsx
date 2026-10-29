import { useMemo } from 'react';
import type { Astrolabe } from '../types';
import { buildPalaceSnapshot } from '../lib/report';

export default function PalaceInspector({
  astrolabe,
  palaceName,
  onExpand,
  onSelectStar,
}: {
  astrolabe: Astrolabe;
  palaceName: string;
  onExpand: () => void;
  onSelectStar: (name: string, palace?: string) => void;
}) {
  const snap = useMemo(() => buildPalaceSnapshot(astrolabe, palaceName, false), [astrolabe, palaceName]);

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
        <span className={`inspector-score ${snap.score.value >= 0 ? 'plus' : 'minus'}`}>
          {snap.score.value >= 0 ? '+' : ''}{snap.score.value}
        </span>
      </div>

      <div className="inspector-stars">
        {snap.stars.slice(0, 6).map((s) => (
          <button key={s.name} className="inspector-star" onClick={() => onSelectStar(s.name, palaceName)}>
            <b>{s.name}</b>
            <span>{s.brightness || '—'}{s.natalMutagen ? ` · ${s.natalMutagen}` : ''}</span>
          </button>
        ))}
        {snap.stars.length === 0 && <p className="dim">空宫，借对宫参看。</p>}
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

      <button className="btn ghost small inspector-expand" onClick={onExpand}>
        展开完整宫位卡 →
      </button>
    </aside>
  );
}
