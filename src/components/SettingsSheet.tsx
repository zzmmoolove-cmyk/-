import { useEffect, useState } from 'react';
import type { ChartOptions } from '../types';
import { AI_PROVIDERS, type AiConfig, type AiProvider } from '../lib/ai';
import { FLOW_PROFILES, PROFILE_STATS } from '../lib/knowledge/starProfiles';
import SettingsPanel from './SettingsPanel';

export type SettingsTab = 'chart' | 'ai' | 'data';

const TABS: { key: SettingsTab; label: string; hint: string }[] = [
  { key: 'chart', label: '排盘设置', hint: '安星 / 分界 / 岁数' },
  { key: 'ai', label: 'AI 设置', hint: '服务商 / Key / 模型' },
  { key: 'data', label: '数据', hint: '星曜库 / 导出' },
];

export default function SettingsSheet({
  open,
  initialTab,
  options,
  onOptionsChange,
  aiConfig,
  onAiChange,
  onProviderChange,
  hasKey,
  onExportStars,
  onClose,
}: {
  open: boolean;
  initialTab: SettingsTab;
  options: ChartOptions;
  onOptionsChange: (o: ChartOptions) => void;
  aiConfig: AiConfig;
  onAiChange: (c: AiConfig) => void;
  onProviderChange: (p: AiProvider) => void;
  hasKey: boolean;
  onExportStars: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <div>
            <div className="inspector-eyebrow">站点设置</div>
            <h2>设置</h2>
            <p>排盘口径、AI 接入与数据导出都在这里；更改只存本机。</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="settings-body">
          <div className="settings-tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`settings-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <b>{t.label}</b>
                <span>{t.hint}</span>
              </button>
            ))}
          </div>

          <div className="settings-content">
            {tab === 'chart' && <SettingsPanel options={options} onChange={onOptionsChange} />}

            {tab === 'ai' && (
              <div className="settings-section">
                <h3>AI 设置</h3>
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
            )}

            {tab === 'data' && (
              <div className="settings-section">
                <h3>数据</h3>
                <p className="hint">星曜库 {PROFILE_STATS.total} 颗（完整 {PROFILE_STATS.full}）＋ 运限派生 {FLOW_PROFILES.length}。导出 JSON 可用于备份或二次开发。</p>
                <div className="settings-rows">
                  <div><span>星曜</span><b>{PROFILE_STATS.total}</b></div>
                  <div><span>完整档案</span><b>{PROFILE_STATS.full}</b></div>
                  <div><span>运限派生</span><b>{FLOW_PROFILES.length}</b></div>
                </div>
                <button className="btn" onClick={onExportStars}>导出星曜库 JSON</button>
                <p className="hint" style={{ marginTop: 10 }}>命主、解盘记录与服务记录只存在浏览器 localStorage；换浏览器不会自动同步。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
