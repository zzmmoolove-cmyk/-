import { useState } from 'react';
import type { Astrolabe, BirthInput, ChartOptions } from '../types';
import type { AiConfig } from '../lib/ai';
import {
  getDecadalYearRange,
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
import ScopeNav from './ScopeNav';

type RangeKey = 'natal' | 'decadal' | 'yearly' | 'monthly' | 'daily';
type ViewKey = 'chart' | 'card' | 'summary';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'natal', label: '本命' },
  { key: 'decadal', label: '大限' },
  { key: 'yearly', label: '流年' },
  { key: 'monthly', label: '流月' },
  { key: 'daily', label: '流日' },
];

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: 'chart', label: '命盘' },
  { key: 'card', label: '宫位卡' },
  { key: 'summary', label: '综述' },
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
  const [timeOpen, setTimeOpen] = useState(false);
  const range = rangeOf(active);
  const currentYear = new Date().getFullYear();

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

  const setRange = (next: RangeKey) => {
    if (next === 'natal') {
      onActiveChange({ decadal: null, yearly: null, monthly: null, daily: null });
      return;
    }
    if (!raw) return;
    const dec = active.decadal ?? decadalOptions[0]?.index ?? 0;
    if (next === 'decadal') {
      onActiveChange({ decadal: dec, yearly: null, monthly: null, daily: null });
      return;
    }
    const years = getDecadalYearRange(raw as never, dec) ?? [currentYear, currentYear];
    const year = active.yearly ?? Math.min(Math.max(currentYear, years[0]), years[1]);
    if (next === 'yearly') {
      onActiveChange({ decadal: dec, yearly: year, monthly: null, daily: null });
      return;
    }
    const month = active.monthly ?? 1;
    if (next === 'monthly') {
      onActiveChange({ decadal: dec, yearly: year, monthly: month, daily: null });
      return;
    }
    onActiveChange({
      decadal: dec,
      yearly: year,
      monthly: month,
      daily: active.daily ?? `${year}-${String(month).padStart(2, '0')}-01`,
    });
  };

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

      <div className="range-view-bars">
        <div className="range-bar" role="group" aria-label="时间范围">
          {RANGES.map((r) => (
            <button key={r.key} className={range === r.key ? 'active' : ''} onClick={() => setRange(r.key)} disabled={!astrolabe && r.key !== 'natal'}>
              {r.label}
            </button>
          ))}
          <button className="range-time" onClick={() => setTimeOpen(true)} disabled={!astrolabe}>选择时间…</button>
          <span className="range-current">{rangeText}</span>
        </div>
        <div className="view-bar" role="group" aria-label="视图">
          {VIEWS.map((v) => (
            <button key={v.key} className={view === v.key ? 'active' : ''} onClick={() => onViewChange(v.key)} disabled={!astrolabe}>
              {v.label}
            </button>
          ))}
        </div>
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
        <div className={`reading-grid ${selectedPalace && view !== 'card' ? 'has-inspector' : ''}`}>
          <div className="reading-main">
            {view === 'chart' && (
              <ChartPanel
                astrolabe={astrolabe}
                input={input}
                options={options}
                timeIndex={timeIndex}
                layered={layered}
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
          </div>

          {selectedPalace && view !== 'card' && (
            <PalaceInspector
              astrolabe={astrolabe}
              palaceName={selectedPalace}
              onExpand={() => onViewChange('card')}
              onSelectStar={onSelectStar}
            />
          )}
        </div>
      )}

      {timeOpen && (
        <div className="modal-backdrop" onClick={() => setTimeOpen(false)}>
          <div className="modal time-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>选择时间范围</h2>
                <div className="modal-sub">按大限 → 流年 → 流月 → 流日逐级选择</div>
              </div>
              <button className="modal-close" onClick={() => setTimeOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <ScopeNav
                decadalOptions={decadalOptions}
                yearRange={yearRange}
                active={active}
                onActiveChange={onActiveChange}
              />
            </div>
            <div className="client-sheet-actions">
              <button className="btn" onClick={() => setTimeOpen(false)}>完成</button>
              <button className="btn ghost" onClick={() => { onActiveChange({ decadal: null, yearly: null, monthly: null, daily: null }); }}>回到本命</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
