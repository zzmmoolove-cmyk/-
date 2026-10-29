import { useEffect, useMemo, useState } from 'react';
import type { ChartOptions } from '../types';
import { AI_PROVIDERS, type AiConfig, type AiProvider } from '../lib/ai';
import { FLOW_PROFILES, PROFILE_STATS, STAR_PROFILES } from '../lib/knowledge/starProfiles';
import CalendarPanel from './CalendarPanel';
import SettingsPanel from './SettingsPanel';

export type LibraryTab = 'manual' | 'calendar' | 'settings' | 'ai' | 'data';

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'manual', label: '星曜手册' },
  { key: 'calendar', label: '万年历' },
  { key: 'settings', label: '排盘设置' },
  { key: 'ai', label: 'AI 设置' },
  { key: 'data', label: '数据' },
];

export default function LibraryPage({
  initialTab,
  options,
  onOptionsChange,
  aiConfig,
  onAiChange,
  onProviderChange,
  hasKey,
  onExportStars,
}: {
  initialTab: LibraryTab;
  options: ChartOptions;
  onOptionsChange: (o: ChartOptions) => void;
  aiConfig: AiConfig;
  onAiChange: (c: AiConfig) => void;
  onProviderChange: (p: AiProvider) => void;
  hasKey: boolean;
  onExportStars: () => void;
}) {
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const stars = useMemo(() => Object.values(STAR_PROFILES), []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(stars[0]?.name ?? '');
  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? stars.filter((s) => `${s.name}${s.keywords.join('')}${s.essence}`.includes(q)) : stars;
  }, [stars, query]);
  const profile = STAR_PROFILES[selected] ?? filtered[0];

  return (
    <div className="library-page">
      <div className="page-head">
        <div>
          <h2>资料</h2>
          <p className="dim">星曜手册、万年历、排盘口径、AI 与数据</p>
        </div>
      </div>

      <div className="library-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tool-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <b>{t.label}</b>
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div className="manual-page">
          <div className="manual-list">
            <input value={query} placeholder="搜索星曜 / 关键词" onChange={(e) => setQuery(e.target.value)} />
            <div className="manual-stars">
              {filtered.map((s) => (
                <button
                  key={s.name}
                  className={`manual-star ${profile?.name === s.name ? 'active' : ''}`}
                  onClick={() => setSelected(s.name)}
                >
                  <span>{s.name}</span>
                  <em>{s.category}</em>
                </button>
              ))}
            </div>
          </div>
          <div className="manual-detail">
            {profile ? (
              <>
                <div className="manual-title">
                  <h3>{profile.name}</h3>
                  <span>{profile.wuxing} · {profile.category} · {profile.grade}级</span>
                </div>
                <p className="essence">{profile.essence}</p>
                <div className="kw-row">{profile.keywords.map((k) => <span key={k} className="kw">{k}</span>)}</div>
                {profile.positive?.length ? <><div className="sub-title ok">正面</div><ul className="notes">{profile.positive.map((x) => <li key={x}>{x}</li>)}</ul></> : null}
                {profile.negative?.length ? <><div className="sub-title danger">风险</div><ul className="notes">{profile.negative.map((x) => <li key={x}>{x}</li>)}</ul></> : null}
                <p className="hint">资料库 {PROFILE_STATS.total} 颗（完整 {PROFILE_STATS.full}）＋ 运限派生 {FLOW_PROFILES.length}。来源：{profile.source || '自建知识库'}。</p>
              </>
            ) : <p className="dim">没有匹配星曜。</p>}
          </div>
        </div>
      )}

      {tab === 'calendar' && <div className="library-body"><CalendarPanel /></div>}
      {tab === 'settings' && <div className="library-body"><SettingsPanel options={options} onChange={onOptionsChange} /></div>}
      {tab === 'ai' && (
        <div className="library-body">
          <div className="panel">
            <h2>AI 设置</h2>
            <div className="field">
              <label>服务商</label>
              <select value={aiConfig.provider} onChange={(e) => onProviderChange(e.target.value as AiProvider)}>
                {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((k) => <option key={k} value={k}>{AI_PROVIDERS[k].label}</option>)}
              </select>
            </div>
            <div className="field"><label>API Key</label><input type="password" value={aiConfig.apiKey} placeholder="sk-..." onChange={(e) => onAiChange({ ...aiConfig, apiKey: e.target.value })} /></div>
            <div className="field"><label>接口地址</label><input value={aiConfig.baseUrl} onChange={(e) => onAiChange({ ...aiConfig, baseUrl: e.target.value })} /></div>
            <div className="field"><label>模型</label><input value={aiConfig.model} onChange={(e) => onAiChange({ ...aiConfig, model: e.target.value })} /></div>
            <p className="hint">Key 仅存本机 localStorage；浏览器直连服务商。没有 Key 也可以用本地知识库和复制 Prompt。</p>
            {hasKey && <p className="hint" style={{ color: 'var(--ok)' }}>✓ 已配置</p>}
          </div>
        </div>
      )}
      {tab === 'data' && (
        <div className="library-body">
          <div className="panel">
            <h2>数据</h2>
            <p className="hint">星曜库 {PROFILE_STATS.total} 颗（完整 {PROFILE_STATS.full}）＋ 运限派生 {FLOW_PROFILES.length}。导出 JSON 可用于备份或二次开发。</p>
            <button className="btn" onClick={onExportStars}>导出星曜库 JSON</button>
          </div>
        </div>
      )}
    </div>
  );
}
