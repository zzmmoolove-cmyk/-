import type { AstroSynastry } from '../lib/astroSynastry';

export default function AstroSynastryBoard({ data }: { data: AstroSynastry }) {
  return (
    <section className="astro-board">
      <div className="board-head">
        <div>
          <div className="inspector-eyebrow">星座合盘</div>
          <h4>太阳 · 上升 · 下降</h4>
          <p>{data.summary}</p>
        </div>
        <div className="board-score"><b>{data.score}</b><span>{data.grade}</span></div>
      </div>

      <div className="astro-people">
        {[data.a, data.b].map((p) => (
          <div key={p.name} className="astro-person">
            <div className="astro-person-name">{p.name}</div>
            <div className="astro-big-sign">{p.sun.sign}</div>
            <div className="astro-sign-row"><span>太阳</span><b>{p.sun.sign}</b><em>{p.sun.element}象 · {p.sun.modality}</em></div>
            <div className="astro-sign-row"><span>上升</span><b>{p.rising.sign}</b><em>{p.rising.element}象 · {p.rising.modality}</em></div>
            <div className="astro-sign-row"><span>下降</span><b>{p.descendant.sign}</b><em>关系里容易被吸引</em></div>
            <p className="astro-note">{p.note}</p>
          </div>
        ))}
      </div>

      <div className="astro-aspects">
        <div className="tool-subhead"><h4>相位与吸引力</h4><span>太阳/上升/下降交叉</span></div>
        {data.aspects.map((a) => (
          <div key={a.label} className="astro-aspect">
            <div className="astro-aspect-top"><b>{a.label}</b><span>{a.score}</span></div>
            <div className="astro-aspect-bar"><i style={{ width: `${a.score}%` }} /></div>
            <p>{a.note}</p>
          </div>
        ))}
      </div>

      <div className="astro-advice">
        <div className="tool-subhead"><h4>情感需求与相处建议</h4><span>真实关系里怎么用</span></div>
        <ul>{data.advice.map((a) => <li key={a}>{a}</li>)}</ul>
      </div>
      <p className="hint">{data.caveat}</p>
    </section>
  );
}
