import type { SynastryResult } from '../lib/synastry';

export default function SynastryBreakdown({ result }: { result: SynastryResult }) {
  return (
    <div className="synastry-breakdown">
      <section className="synastry-archetype">
        <div className="synastry-archetype-head">
          <div>
            <div className="inspector-eyebrow">关系类型</div>
            <h4>{result.archetype.title}</h4>
            <p>{result.archetype.subtitle}</p>
          </div>
          <span className="synastry-zodiac">{result.zodiac.a} × {result.zodiac.b}</span>
        </div>
        <p className="synastry-archetype-desc">{result.archetype.description}</p>
        <div className="synastry-archetype-grid">
          <div><em>优势</em><ul>{result.archetype.strengths.map((s) => <li key={s}>{s}</li>)}</ul></div>
          <div><em>注意</em><ul>{result.archetype.watchouts.map((s) => <li key={s}>{s}</li>)}</ul></div>
        </div>
      </section>

      <section className="synastry-dimensions">
        <div className="synastry-dim-head">
          <div>
            <div className="inspector-eyebrow">加权总分</div>
            <h4>分数怎么来的</h4>
          </div>
          <div className="synastry-formula">Σ（维度分 × 权重）≈ {result.score}</div>
        </div>
        <div className="dim-list">
          {result.dimensions.map((d) => (
            <div key={d.key} className="dim-row">
              <div className="dim-top">
                <b>{d.label}</b>
                <span>{d.score} / 100 · 权重 {d.weight}% · 贡献 {d.contribution}</span>
              </div>
              <div className="dim-bar"><i style={{ width: `${d.score}%` }} /></div>
              <p>{d.summary}</p>
              {d.evidence.length > 0 && <div className="dim-evidence">{d.evidence.join(' · ')}</div>}
            </div>
          ))}
        </div>
        <p className="hint" style={{ margin: '8px 0 0' }}>
          总分 = 核心性格 22% + 情感吸引 20% + 精神共鸣 15% + 沟通节奏 15% + 五行互补 16% + 星座默契 12%；各项贡献相加后四舍五入。
        </p>
      </section>
    </div>
  );
}
