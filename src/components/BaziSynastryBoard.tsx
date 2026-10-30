import type { BaziPerson, BaziSynastry } from '../lib/baziSynastry';

const LABELS = ['年柱', '月柱', '日柱', '时柱'];

function PersonRow({ p }: { p: BaziPerson }) {
  return (
    <div className="bazi-person-row">
      <div className="bazi-person-name">
        <b>{p.name}</b>
        <span>{p.gender} · 日主 {p.dayMaster}{p.dayMasterEl}</span>
      </div>
      {p.pillars.map((pillar, i) => (
        <div key={i} className={`bazi-pillar ${i === 2 ? 'day-pillar' : ''}`}>
          <em>{LABELS[i]}</em>
          <b>{pillar.stem}{pillar.branch}</b>
          <span>{pillar.stemEl} / {pillar.branchEl}</span>
        </div>
      ))}
    </div>
  );
}

export default function BaziSynastryBoard({ data }: { data: BaziSynastry }) {
  return (
    <section className="bazi-board">
      <div className="board-head">
        <div>
          <div className="inspector-eyebrow">八字合盘</div>
          <h4>四柱 · 日主 · 夫妻宫</h4>
          <p>{data.summary}</p>
        </div>
        <div className="board-score"><b>{data.score}</b><span>{data.grade}</span></div>
      </div>

      <div className="bazi-pillars">
        <div className="bazi-pillar-head"><span>四柱</span>{LABELS.map((l) => <em key={l}>{l}</em>)}</div>
        <PersonRow p={data.a} />
        <PersonRow p={data.b} />
      </div>

      <div className="bazi-meta">
        <span>缺失：{data.a.name} {data.a.missing.join('、') || '无'}｜{data.b.name} {data.b.missing.join('、') || '无'}</span>
        <span>配偶星：{data.a.name} {data.a.spouseStar}（{data.a.spouseStars.length}）｜{data.b.name} {data.b.spouseStar}（{data.b.spouseStars.length}）</span>
      </div>

      <div className="bazi-interactions">
        <div className="tool-subhead"><h4>合冲关系</h4><span>日支优先，其余四柱交叉</span></div>
        <div className="bazi-tags">
          {data.interactions.length
            ? data.interactions.map((i, idx) => <span key={idx} className={`bazi-tag ${i.type === '六冲' || i.type === '相害' ? 'bad' : 'good'}`}>{i.type} · {i.a} × {i.b}</span>)
            : <span className="dim">未见明显合冲，关系更依赖日常经营。</span>}
        </div>
      </div>

      <div className="bazi-dimensions">
        <div className="tool-subhead"><h4>分项</h4><span>结构参考，不是吉凶判决</span></div>
        {data.dimensions.map((d) => (
          <div key={d.label} className="bazi-dim">
            <div className="bazi-dim-top"><b>{d.label}</b><span>{d.score}/100 · 权重 {d.weight}%</span></div>
            <div className="bazi-bar"><i style={{ width: `${d.score}%` }} /></div>
            <p>{d.note}</p>
          </div>
        ))}
      </div>

      <div className="bazi-advice">
        <div className="tool-subhead"><h4>相处建议</h4><span>从日主与夫妻宫出发</span></div>
        <ul>{data.advice.map((a) => <li key={a}>{a}</li>)}</ul>
      </div>
      <p className="hint">{data.caveat}</p>
    </section>
  );
}
