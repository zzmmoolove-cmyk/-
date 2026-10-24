import { useState } from 'react';
import type { Astrolabe } from '../types';
import type { Relations } from '../lib/relations';
import { readPalace } from '../lib/synthesize';
import { askAI, buildPalacePrompt, type AiConfig } from '../lib/ai';

function palaceToText(palaceName: string, astrolabe: Astrolabe): string {
  const p = astrolabe.palaces.find((x) => x.name === palaceName);
  if (!p) return '';
  const majors = p.majorStars.map((s) => `${s.name}${s.brightness ? `（亮度${s.brightness}）` : ''}${s.mutagen ? `化${s.mutagen}` : ''}`).join('、');
  const minors = p.minorStars.map((s) => s.name).join('、');
  return [
    `宫位：${p.name}（${p.heavenlyStem}${p.earthlyBranch}）`,
    `主星：${majors || '无（空宫）'}`,
    `辅星：${minors || '无'}`,
    `身宫：${p.isBodyPalace ? '是' : '否'}`,
    `大限：${p.decadal.range[0]}–${p.decadal.range[1]}岁`,
  ].join('\n');
}

export default function PalaceDetail({
  astrolabe,
  palaceName,
  summary,
  aiConfig,
  relations,
  onSelectStar,
}: {
  astrolabe: Astrolabe;
  palaceName: string;
  summary: string;
  aiConfig: AiConfig | null;
  relations: Relations | null;
  onSelectStar: (name: string, palace?: string) => void;
}) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const palace = astrolabe.palaces.find((p) => p.name === palaceName);
  if (!palace) return null;
  const reading = readPalace(palace);

  const runAI = async () => {
    if (!aiConfig) return;
    setLoading(true);
    setError(null);
    setAiText(null);
    try {
      const text = await askAI(
        aiConfig,
        '你是一位严谨、客观的紫微斗数研习者，只做传统文化探讨，语气平实克制，不迷信宿命，不作医疗/法律/投资建议。',
        buildPalacePrompt(summary, palaceToText(palaceName, astrolabe), palaceName),
      );
      setAiText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const relSection = (title: string, b: { name: string; majorStars: string[]; minorStars: string[] } | null) => {
    if (!b) return null;
    const stars = [...b.majorStars, ...b.minorStars];
    return (
      <div className="rel-card">
        <b>{title}·{b.name}</b>
        <span className="dim">　{stars.length ? stars.join('、') : '空宫'}</span>
      </div>
    );
  };

  return (
    <div className="panel detail-panel">
      <h2>
        {palace.name.endsWith('宫') ? palace.name : `${palace.name}宫`}解读
        {palace.isBodyPalace && <span className="badge badge-body">身宫</span>}
        <span className="dim">　{palace.heavenlyStem}{palace.earthlyBranch}</span>
      </h2>

      <p className="brief">{reading.palaceInfo.detail}</p>

      {reading.majorStars.length > 0 && (
        <>
          <h3 className="section-title">主星</h3>
          {reading.majorStars.map((s) => (
            <div key={s.info.name} className="star-block">
              <div className="star-block-head">
                <button className="star-name star-name-btn" onClick={() => onSelectStar(s.info.name, palaceName)}>
                  {s.info.name}
                </button>
                {s.brightness && <span className="badge">亮度·{s.brightness}</span>}
                {s.mutagen && <span className="badge badge-mutagen">化{s.mutagen}</span>}
                <span className="dim">　{s.info.wuxing} · {s.info.yinyang}</span>
              </div>
              <p className="star-detail">{s.info.detail}</p>
              {s.mutagen && s.info.sihua?.[s.mutagen as 'lu' | 'quan' | 'ke' | 'ji'] && (
                <p className="star-sihua">{s.info.sihua[s.mutagen as 'lu' | 'quan' | 'ke' | 'ji']}</p>
              )}
            </div>
          ))}
        </>
      )}

      {reading.minorStars.length > 0 && (
        <>
          <h3 className="section-title">辅星</h3>
          {reading.minorStars.map((s) => (
            <div key={s.info.name} className="star-block">
              <div className="star-block-head">
                <button className="star-name star-name-btn" onClick={() => onSelectStar(s.info.name, palaceName)}>
                  {s.info.name}
                </button>
                {s.brightness && <span className="badge">亮度·{s.brightness}</span>}
                {s.mutagen && <span className="badge badge-mutagen">化{s.mutagen}</span>}
                <span className="dim">　{s.info.wuxing} · {s.info.yinyang}</span>
              </div>
              <p className="star-detail">{s.info.detail}</p>
            </div>
          ))}
        </>
      )}

      {reading.otherStars.length > 0 && (
        <>
          <h3 className="section-title">杂曜</h3>
          <p className="dim">{reading.otherStars.join('、')}</p>
        </>
      )}

      {relations && (
        <>
          <h3 className="section-title">三方四正</h3>
          <div className="rel-grid">
            {relSection('本宫', relations.target)}
            {relSection('对宫', relations.opposite)}
            {relSection('三合·财帛', relations.wealth)}
            {relSection('三合·官禄', relations.career)}
          </div>
          {(relations.previous || relations.next) && (
            <>
              <h3 className="section-title">夹宫</h3>
              <div className="rel-grid">
                {relSection('前', relations.previous)}
                {relSection('后', relations.next)}
              </div>
            </>
          )}
          {(relations.flyOut.length > 0 || relations.flyIn.length > 0) && (
            <>
              <h3 className="section-title">四化飞星</h3>
              {relations.flyOut.length > 0 && (
                <p className="dim">本宫四化飞入：{relations.flyOut.map((f) => f.to).join('、')}</p>
              )}
              {relations.flyIn.length > 0 && (
                <p className="dim">四化飞入本宫：{relations.flyIn.map((f) => f.from).join('、')}</p>
              )}
            </>
          )}
        </>
      )}

      {reading.notes.length > 0 && (
        <>
          <h3 className="section-title">备注</h3>
          <ul className="notes">
            {reading.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}

      <div className="ai-box">
        {aiConfig ? (
          <>
            <button className="btn ghost" onClick={runAI} disabled={loading}>
              {loading ? 'AI 解读中…' : '✨ AI 解读此宫位'}
            </button>
            {error && <p className="ai-error">{error}</p>}
            {aiText && <div className="ai-result">{aiText}</div>}
          </>
        ) : (
          <p className="dim">在「AI 设置」中填写 API Key 后，可对宫位进行 AI 辅助解读。</p>
        )}
      </div>
    </div>
  );
}
