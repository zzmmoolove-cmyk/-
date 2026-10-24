import { useState } from 'react';
import type { Astrolabe } from '../types';
import { readChart } from '../lib/synthesize';
import { askAI, buildChartPrompt, type AiConfig } from '../lib/ai';

const TYPE_LABEL: Record<string, string> = {
  吉: '吉格',
  凶: '凶格',
  中: '特殊',
};

export default function SummaryPanel({
  astrolabe,
  aiConfig,
}: {
  astrolabe: Astrolabe;
  aiConfig: AiConfig | null;
}) {
  const [aiText, setAiText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chart = readChart(astrolabe);

  const runAI = async () => {
    if (!aiConfig) return;
    setLoading(true);
    setError(null);
    setAiText(null);
    try {
      const text = await askAI(
        aiConfig,
        '你是一位严谨、客观的紫微斗数研习者，只做传统文化探讨，语气平实克制，不迷信宿命，不作医疗/法律/投资建议。',
        buildChartPrompt(chart.summary),
      );
      setAiText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel summary-panel">
      <h2>命格综述</h2>

      <div className="basic-grid">
        <div><span className="dim">五行局</span><br /><b>{astrolabe.fiveElementsClass}</b></div>
        <div><span className="dim">生肖</span><br /><b>{astrolabe.zodiac}</b></div>
        <div><span className="dim">命主</span><br /><b>{astrolabe.soul}</b></div>
        <div><span className="dim">身主</span><br /><b>{astrolabe.body}</b></div>
        <div><span className="dim">农历</span><br /><b>{astrolabe.lunarDate}</b></div>
      </div>

      <pre className="summary-text">{chart.summary}</pre>

      {chart.patterns.length > 0 && (
        <>
          <h3 className="section-title">命中格局</h3>
          <div className="pattern-list">
            {chart.patterns.map((p) => (
              <div key={p.name} className={`pattern-card type-${p.type}`}>
                <div className="pattern-head">
                  <b>{p.name}</b>
                  <span className={`badge type-${p.type}`}>{TYPE_LABEL[p.type]}</span>
                </div>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {chart.fourTransforms.length > 0 && (
        <>
          <h3 className="section-title">四化飞星</h3>
          <div className="four-transform-list">
            {chart.fourTransforms.map((f) => (
              <div key={`${f.star}-${f.mutagen}`} className="four-transform">
                <b>{f.star}化{f.mutagen}</b>
                <span className="dim">在{f.palace}宫</span>
                <p>{f.meaning}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="ai-box">
        {aiConfig ? (
          <>
            <button className="btn ghost" onClick={runAI} disabled={loading}>
              {loading ? 'AI 综合分析中…' : '✨ AI 整盘综合分析'}
            </button>
            {error && <p className="ai-error">{error}</p>}
            {aiText && <div className="ai-result">{aiText}</div>}
          </>
        ) : (
          <p className="dim">在「AI 设置」中填写 API Key 后，可对整盘进行 AI 综合分析。</p>
        )}
      </div>
    </div>
  );
}
