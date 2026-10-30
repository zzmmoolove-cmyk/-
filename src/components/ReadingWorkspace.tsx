import type { Astrolabe, BirthInput, ChartOptions } from '../types';
import type { AiConfig } from '../lib/ai';
import {
  daysInMonth,
  type ActiveLayers,
  type LayeredData,
} from '../lib/scope';
import type { Relations } from '../lib/relations';
import type { OutputProfile } from '../lib/output';
import ChartPanel from './ChartPanel';
import PalaceReportPanel from './PalaceReportPanel';
import SummaryPanel from './SummaryPanel';
import ScopeReportPanel from './ScopeReportPanel';
import PalaceDetail from './PalaceDetail';
import PalaceInspector from './PalaceInspector';
import ScopeFocusReport from './ScopeFocusReport';

type RangeKey = 'natal' | 'decadal' | 'yearly' | 'monthly' | 'daily';
type ViewKey = 'chart' | 'card' | 'summary' | 'report';

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'chart', label: '命盘' },
  { key: 'card', label: '宫位卡' },
  { key: 'summary', label: '综述' },
  { key: 'report', label: '运限报告' },
];

function rangeOf(active: ActiveLayers): RangeKey {
  if (active.daily != null) return 'daily';
  if (active.monthly != null) return 'monthly';
  if (active.yearly != null) return 'yearly';
  if (active.decadal != null) return 'decadal';
  return 'natal';
}

export default function ReadingWorkspace({
  astrolabe,
  raw,
  input,
  options,
  timeIndex,
  layered,
  active,
  selectedPalace,
  userLabel,
  userName,
  view,
  onViewChange,
  onSelectPalace,
  onSelectStar,
  decadalOptions,
  yearRange,
  onActiveChange,
  onOpenProfile,
  onOpenEditor,
  onSaveReading,
  onOpenExport,
  saveMsg,
  summary,
  relations,
  aiConfig,
  hasKey,
  output,
}: {
  astrolabe: Astrolabe | null;
  raw: Record<string, unknown> | null;
  input: BirthInput;
  options: ChartOptions;
  timeIndex: number;
  layered: LayeredData | null;
  active: ActiveLayers;
  selectedPalace: string | null;
  userLabel: string;
  userName: string;
  view: ViewKey;
  onViewChange: (v: ViewKey) => void;
  onSelectPalace: (name: string) => void;
  onSelectStar: (name: string, palace?: string) => void;
  decadalOptions: { index: number; label: string }[];
  yearRange: [number, number] | null;
  onActiveChange: (a: ActiveLayers) => void;
  onOpenProfile: () => void;
  onOpenEditor: () => void;
  onSaveReading: () => void;
  onOpenExport: () => void;
  saveMsg: string | null;
  summary: string;
  relations: Relations | null;
  aiConfig: AiConfig | null;
  hasKey: boolean;
  output: OutputProfile;
}) {
  const range = rangeOf(active);
  const years = yearRange ? Array.from({ length: yearRange[1] - yearRange[0] + 1 }, (_, i) => yearRange[0] + i) : [];
  const days = active.yearly != null && active.monthly != null ? daysInMonth(active.yearly, active.monthly) : 0;

  const rangeText =
    range === 'decadal'
      ? `大限 · ${decadalOptions.find((d) => d.index === active.decadal)?.label ?? '—'}`
      : range === 'yearly'
        ? `${active.yearly} 流年`
        : range === 'monthly'
          ? `${active.yearly}.${String(active.monthly).padStart(2, '0')} 流月`
          : range === 'daily'
            ? `${active.daily} 流日`
            : '本命盘';

  return (
    <div className="reading-workspace">
      <div className="workspace-head">
        <div className="workspace-title">
          <div className="inspector-eyebrow">解盘</div>
          <h2>{userLabel || '未命名客户'}</h2>
          <p>{astrolabe ? `${astrolabe.solarDate} · ${astrolabe.chineseDate}` : '尚未排盘'}</p>
        </div>
        <div className="workspace-actions">
          <button className="btn ghost small" onClick={onOpenProfile}>客户档案</button>
          <button className="btn ghost small" onClick={onSaveReading} disabled={!astrolabe}>保存解盘记录</button>
          <button className="btn ghost small" onClick={onOpenExport} disabled={!astrolabe}>导出 PDF</button>
        </div>
      </div>

      <div className="scope-filter panel">
        <div className="scope-filter-row">
          <span className="scope-filter-label">时间</span>
          <button
            className={`scope-chip ${range === 'natal' ? 'active' : ''}`}
            onClick={() => onActiveChange({ decadal: null, yearly: null, monthly: null, daily: null })}
          >
            本命
          </button>
          <span className="scope-filter-sep" />
          <span className="scope-filter-label">大限</span>
          {decadalOptions.map((d) => (
            <button
              key={d.index}
              className={`scope-chip ${active.decadal === d.index ? 'active' : ''}`}
              onClick={() => onActiveChange({ decadal: d.index, yearly: null, monthly: null, daily: null })}
              title={d.label}
            >
              {d.label.split(' ')[0]} <em>{d.label.match(/\d+–\d+岁/)?.[0] ?? ''}</em>
            </button>
          ))}
          <span className="scope-current">{rangeText}</span>
        </div>

        {active.decadal != null && (
          <div className="scope-filter-row">
            <span className="scope-filter-label">流年</span>
            {years.map((year) => (
              <button
                key={year}
                className={`scope-chip ${active.yearly === year ? 'active' : ''}`}
                onClick={() => onActiveChange({ decadal: active.decadal, yearly: year, monthly: null, daily: null })}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {active.yearly != null && (
          <div className="scope-filter-row">
            <span className="scope-filter-label">流月</span>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <button
                key={month}
                className={`scope-chip ${active.monthly === month ? 'active' : ''}`}
                onClick={() => onActiveChange({ decadal: active.decadal, yearly: active.yearly, monthly: month, daily: null })}
              >
                {month}月
              </button>
            ))}
          </div>
        )}

        {active.monthly != null && (
          <div className="scope-filter-row">
            <span className="scope-filter-label">流日</span>
            {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
              const date = `${active.yearly}-${String(active.monthly).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              return (
                <button
                  key={day}
                  className={`scope-chip ${active.daily === date ? 'active' : ''}`}
                  onClick={() => onActiveChange({ decadal: active.decadal, yearly: active.yearly, monthly: active.monthly, daily: date })}
                >
                  {day}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="view-bar scope-view-bar" role="group" aria-label="视图">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            className={view === v.key ? 'active' : ''}
            onClick={() => onViewChange(v.key)}
            disabled={!astrolabe || (v.key === 'report' && range === 'natal')}
          >
            {v.label}
          </button>
        ))}
      </div>

      {saveMsg && <p className="hint workspace-msg">{saveMsg}</p>}

      {!astrolabe ? (
        <div className="workspace-empty panel">
          <div className="empty-sigil" aria-hidden="true">
            <span className="empty-sigil-ring" />
            <span className="empty-sigil-star">✦</span>
          </div>
          <p className="empty-kicker">还没有命盘</p>
          <p className="dim">补全出生信息并排盘，开始为 {userName || '这位客户'} 解盘。</p>
          <button className="btn" onClick={onOpenEditor}>补全出生信息 → 排盘</button>
        </div>
      ) : (
        <div className={`reading-grid ${selectedPalace && view !== 'card' && view !== 'report' ? 'has-inspector' : ''}`}>
          <div className="reading-main">
            {view === 'chart' && (
              <ChartPanel
                astrolabe={astrolabe}
                input={input}
                options={options}
                timeIndex={timeIndex}
                layered={layered}
                active={active}
                selectedPalace={selectedPalace}
                userLabel={userLabel}
                onSelectPalace={onSelectPalace}
                onOpenPalaceCard={(name) => { onSelectPalace(name); onViewChange('card'); }}
                onSelectStar={onSelectStar}
              />
            )}

            {view === 'card' &&
              (selectedPalace ? (
                <>
                  <PalaceReportPanel
                    astrolabe={astrolabe}
                    palaceName={selectedPalace}
                    onSelectPalace={onSelectPalace}
                    onSelectStar={onSelectStar}
                    output={output}
                    active={active}
                    layered={layered}
                  />
                  <details className="panel legacy-wrap">
                    <summary>传统解读与 AI（旧版）</summary>
                    <PalaceDetail
                      astrolabe={astrolabe}
                      palaceName={selectedPalace}
                      summary={summary}
                      aiConfig={hasKey ? aiConfig : null}
                      relations={relations}
                      onSelectStar={onSelectStar}
                    />
                  </details>
                </>
              ) : (
                <div className="panel empty-state">先在命盘点一个宫位。</div>
              ))}

            {view === 'summary' && (
              <>
                {range !== 'natal' && raw && (
                  <ScopeReportPanel
                    astrolabe={astrolabe}
                    raw={raw}
                    active={active}
                    userLabel={userLabel}
                    onSelectPalace={onSelectPalace}
                  />
                )}
                <SummaryPanel astrolabe={astrolabe} aiConfig={hasKey ? aiConfig : null} />
              </>
            )}

            {view === 'report' && (
              raw && range !== 'natal'
                ? <ScopeFocusReport astrolabe={astrolabe} raw={raw} active={active} userLabel={userLabel} />
                : <div className="panel empty-state">先在上方选一个大限、流年、流月或流日，再生成对应报告。</div>
            )}
          </div>

          {selectedPalace && view !== 'card' && view !== 'report' && (
            <PalaceInspector
              astrolabe={astrolabe}
              palaceName={selectedPalace}
              onExpand={() => onViewChange('card')}
              onSelectStar={onSelectStar}
              active={active}
              layered={layered}
              onSelectPalace={onSelectPalace}
            />
          )}
        </div>
      )}

    </div>
  );
}
