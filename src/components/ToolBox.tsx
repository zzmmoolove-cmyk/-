import type { ChartOptions } from '../types';
import { AI_PROVIDERS, type AiConfig, type AiProvider } from '../lib/ai';
import SettingsPanel from './SettingsPanel';
import CalendarPanel from './CalendarPanel';

export default function ToolBox({
  options,
  onOptionsChange,
  aiConfig,
  onAiChange,
  onProviderChange,
  hasKey,
}: {
  options: ChartOptions;
  onOptionsChange: (o: ChartOptions) => void;
  aiConfig: AiConfig;
  onAiChange: (c: AiConfig) => void;
  onProviderChange: (p: AiProvider) => void;
  hasKey: boolean;
}) {
  return (
    <details className="panel tool-box">
      <summary>更多工具（流派 / AI / 万年历）</summary>
      <div className="tool-stack">
        <SettingsPanel options={options} onChange={onOptionsChange} />

        <div className="tool-block">
          <h3>AI 设置</h3>
          <div className="field">
            <label>服务商</label>
            <select value={aiConfig.provider} onChange={(e) => onProviderChange(e.target.value as AiProvider)}>
              {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((k) => (
                <option key={k} value={k}>{AI_PROVIDERS[k].label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>API Key</label>
            <input
              type="password"
              value={aiConfig.apiKey}
              placeholder="sk-..."
              onChange={(e) => onAiChange({ ...aiConfig, apiKey: e.target.value })}
            />
          </div>
          <div className="field">
            <label>接口地址（OpenAI 兼容）</label>
            <input value={aiConfig.baseUrl} onChange={(e) => onAiChange({ ...aiConfig, baseUrl: e.target.value })} />
          </div>
          <div className="field">
            <label>模型</label>
            <input value={aiConfig.model} onChange={(e) => onAiChange({ ...aiConfig, model: e.target.value })} />
          </div>
          <p className="hint">Key 仅存本机浏览器 localStorage，浏览器直连服务商。若遇 CORS 拦截可加代理。</p>
          {hasKey && <p className="hint" style={{ color: 'var(--ok)' }}>✓ 已配置，宫位卡下方可直接 AI 解读</p>}
        </div>

        <CalendarPanel />
      </div>
    </details>
  );
}
