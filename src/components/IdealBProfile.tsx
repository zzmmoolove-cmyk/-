import type { IdealPartner } from '../lib/synastry';

export default function IdealBProfile({ ideal }: { ideal: IdealPartner }) {
  return (
    <section className="ideal-b-card">
      <div className="ideal-b-head">
        <div>
          <div className="inspector-eyebrow">先看 A · 高分 B 画像</div>
          <h4>{ideal.title}</h4>
          <p>{ideal.summary}</p>
        </div>
        <span className="ideal-b-badge">参考画像</span>
      </div>

      <div className="ideal-b-grid">
        <div>
          <em>命宫主星偏向</em>
          <div className="ideal-tags">
            {ideal.stars.length ? ideal.stars.map((s) => <span key={s}>{s}</span>) : <span>—</span>}
          </div>
        </div>
        <div>
          <em>星座高分区</em>
          <div className="ideal-tags">
            {ideal.zodiacs.length
              ? ideal.zodiacs.map((z) => <span key={z.sign}>{z.sign} {z.score}</span>)
              : <span>星座资料待补</span>}
          </div>
        </div>
        <div>
          <em>你需要的特质</em>
          <ul className="ideal-list">
            {ideal.qualities.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
        <div>
          <em>避雷</em>
          <ul className="ideal-list warn">
            {ideal.avoid.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </div>

      <p className="ideal-evidence">{ideal.evidence.join(' · ')}</p>
      <p className="hint" style={{ margin: '4px 0 0' }}>这是从 A 的夫妻宫、福德宫与太阳星座推出来的「更适合你的类型」，不是具体某个人；具体合盘仍要看 B 的真实命盘。</p>
    </section>
  );
}
