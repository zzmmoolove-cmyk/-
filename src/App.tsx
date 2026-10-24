import { useEffect, useMemo, useState } from 'react';
import { astro } from 'iztro';
import type { Astrolabe, BirthInput, ChartOptions, HistoryItem } from './types';
import BirthForm from './components/BirthForm';
import ChartPanel from './components/ChartPanel';
import PalaceDetail from './components/PalaceDetail';
import SummaryPanel from './components/SummaryPanel';
import PalaceReportPanel from './components/PalaceReportPanel';
import StarProfilePanel from './components/StarProfilePanel';
import ScopeNav from './components/ScopeNav';
import SettingsPanel from './components/SettingsPanel';
import CalendarPanel from './components/CalendarPanel';
import HistoryPanel from './components/HistoryPanel';
import { AI_PROVIDERS, type AiConfig, type AiProvider } from './lib/ai';
import { readChart } from './lib/synthesize';
import {
  getLayeredData,
  getDecadalOptions,
  getDecadalYearRange,
  type ActiveLayers,
  type LayeredData,
} from './lib/scope';
import { getRelations, type Relations } from './lib/relations';
import { computeTimeIndex } from './lib/truesolar';
import { FLOW_PROFILES, PROFILE_STATS, STAR_PROFILES } from './lib/knowledge/starProfiles';

const DEFAULT_INPUT: BirthInput = {
  birthday: '1990-06-15',
  clockTime: '12:00',
  gender: '男',
  birthdayType: 'solar',
  isLeapMonth: false,
  fixLeap: true,
  useTrueSolar: false,
  longitude: 116.41,
};

const DEFAULT_OPTIONS: ChartOptions = {
  algorithm: 'default',
  yearDivide: 'normal',
  ageDivide: 'normal',
  horoscopeDivide: 'normal',
  dayDivide: 'current',
};

const DEFAULT_AI: AiConfig = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: AI_PROVIDERS.deepseek.baseUrl,
  model: AI_PROVIDERS.deepseek.model,
};

const AI_STORAGE_KEY = 'ziwei-ai-config-v1';
const HISTORY_STORAGE_KEY = 'ziwei-history-v1';

function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) return { ...DEFAULT_AI, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_AI;
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

/** 将 iztro 返回的类实例抽成纯数据对象 */
function toPlain(a: Record<string, unknown>): Astrolabe {
  const palaces = (a.palaces as Record<string, unknown>[]).map((p) => {
    const stars = (arr: unknown[]) =>
      ((arr ?? []) as Record<string, unknown>[]).map((s) => ({
        name: String(s.name ?? ''),
        type: String(s.type ?? ''),
        brightness: s.brightness ? String(s.brightness) : undefined,
        mutagen: s.mutagen ? String(s.mutagen) : undefined,
      }));
    const dec = p.decadal as { range: [number, number]; heavenlyStem: string; earthlyBranch: string } | undefined;
    return {
      index: Number(p.index ?? 0),
      name: String(p.name ?? ''),
      isBodyPalace: Boolean(p.isBodyPalace),
      isOriginalPalace: Boolean(p.isOriginalPalace),
      heavenlyStem: String(p.heavenlyStem ?? ''),
      earthlyBranch: String(p.earthlyBranch ?? ''),
      majorStars: stars(p.majorStars as unknown[]),
      minorStars: stars(p.minorStars as unknown[]),
      adjectiveStars: stars(p.adjectiveStars as unknown[]),
      changsheng12: String(p.changsheng12 ?? ''),
      boshi12: String(p.boshi12 ?? ''),
      decadal: dec ?? { range: [0, 0], heavenlyStem: '', earthlyBranch: '' },
      ages: (p.ages as number[]) ?? [],
    };
  });

  return {
    gender: String(a.gender ?? ''),
    solarDate: String(a.solarDate ?? ''),
    lunarDate: String(a.lunarDate ?? ''),
    chineseDate: String(a.chineseDate ?? ''),
    sign: String(a.sign ?? ''),
    zodiac: String(a.zodiac ?? ''),
    fiveElementsClass: String(a.fiveElementsClass ?? ''),
    soul: String(a.soul ?? ''),
    body: String(a.body ?? ''),
    palaces,
    decadalList: [],
  };
}

export default function App() {
  const [input, setInput] = useState<BirthInput>(DEFAULT_INPUT);
  const [options, setOptions] = useState<ChartOptions>(DEFAULT_OPTIONS);
  const [formKey, setFormKey] = useState(0);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [astrolabe, setAstrolabe] = useState<Astrolabe | null>(null);
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({ decadal: null, yearly: null, monthly: null, daily: null });
  const [selectedPalace, setSelectedPalace] = useState<string | null>('命宫');
  const [aiConfig, setAiConfig] = useState<AiConfig>(loadAiConfig);
  const [showAi, setShowAi] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [starFocus, setStarFocus] = useState<{ name: string; palace?: string } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(aiConfig));
    } catch {
      /* ignore */
    }
  }, [aiConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }, [history]);

  const timeIndex = useMemo(() => computeTimeIndex(input), [input]);

  const generate = (next: BirthInput, opts: ChartOptions = options) => {
    const ti = computeTimeIndex(next);
    setInput(next);
    setOptions(opts);
    try {
      astro.config({
        algorithm: opts.algorithm,
        yearDivide: opts.yearDivide,
        ageDivide: opts.ageDivide,
        horoscopeDivide: opts.horoscopeDivide,
        dayDivide: opts.dayDivide,
      });
      const a =
        next.birthdayType === 'lunar'
          ? astro.byLunar(next.birthday, ti, next.gender, next.isLeapMonth, next.fixLeap, 'zh-CN')
          : astro.bySolar(next.birthday, ti, next.gender, next.fixLeap, 'zh-CN');
      setRaw(a as unknown as Record<string, unknown>);
      setAstrolabe(toPlain(a as unknown as Record<string, unknown>));
      setSelectedPalace('命宫');
      setActiveLayers({ decadal: null, yearly: null, monthly: null, daily: null });
    } catch (e) {
      console.error(e);
      setRaw(null);
      setAstrolabe(null);
    }
  };

  const changeOptions = (next: ChartOptions) => {
    setOptions(next);
    if (astrolabe) generate(input, next);
  };

  const decadalOptions = useMemo(() => (raw ? getDecadalOptions(raw as never) : []), [raw]);

  const yearRange = useMemo(
    () => (raw && activeLayers.decadal != null ? getDecadalYearRange(raw as never, activeLayers.decadal) : null),
    [raw, activeLayers.decadal],
  );

  const layered: LayeredData | null = useMemo(() => {
    if (!raw) return null;
    return getLayeredData(raw as never, activeLayers);
  }, [raw, activeLayers]);

  const relations: Relations | null = useMemo(() => {
    if (!raw || !selectedPalace) return null;
    try {
      return getRelations(raw as never, selectedPalace);
    } catch {
      return null;
    }
  }, [raw, selectedPalace]);

  const summary = astrolabe ? readChart(astrolabe).summary : '';
  const hasKey = aiConfig.apiKey.trim().length > 0;

  const openStar = (name: string, palace?: string) => {
    // 星曜在一张盘里只出现一次：没传宫位时自动反查，保证弹层能带上场景
    const found =
      palace ??
      astrolabe?.palaces.find((p) =>
        [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === name),
      )?.name ??
      selectedPalace ??
      undefined;
    setStarFocus({ name, palace: found });
  };

  const exportStarDB = () => {
    const payload = {
      schema: 'ziwei-star-profile/1.0',
      exportedAt: new Date().toISOString(),
      stats: { ...PROFILE_STATS, flow: FLOW_PROFILES.length },
      stars: Object.values(STAR_PROFILES),
      flowStars: FLOW_PROFILES,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ziwei-stars-v1.0-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveMsg('✓ 星曜库已导出');
    setTimeout(() => setSaveMsg(null), 2200);
  };

  const saveChart = () => {
    if (!astrolabe) return;
    const label = `${input.gender} · ${input.birthday} · ${input.birthdayType === 'lunar' ? '农历' : '公历'} · 时辰${computeTimeIndex(input)}`;
    const item: HistoryItem = {
      id: String(Date.now()),
      savedAt: new Date().toLocaleString('zh-CN'),
      label,
      payload: { ...input, ...options },
    };
    setHistory((h) => [item, ...h].slice(0, 50));
    setSaveMsg('✓ 已保存');
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const loadHistoryItem = (item: HistoryItem) => {
    const p = item.payload;
    const inp: BirthInput = {
      birthday: p.birthday,
      clockTime: p.clockTime,
      gender: p.gender,
      birthdayType: p.birthdayType,
      isLeapMonth: p.isLeapMonth,
      fixLeap: p.fixLeap,
      useTrueSolar: p.useTrueSolar,
      longitude: p.longitude,
    };
    const opts: ChartOptions = {
      algorithm: p.algorithm,
      yearDivide: p.yearDivide,
      ageDivide: p.ageDivide,
      horoscopeDivide: p.horoscopeDivide,
      dayDivide: p.dayDivide,
    };
    setFormKey((k) => k + 1);
    generate(inp, opts);
  };

  const handleImport = (inp: BirthInput, opts: ChartOptions) => {
    setFormKey((k) => k + 1);
    generate(inp, opts);
  };

  const changeProvider = (provider: AiProvider) => {
    const preset = AI_PROVIDERS[provider];
    setAiConfig((c) => ({ ...c, provider, baseUrl: preset.baseUrl, model: preset.model }));
  };

  return (
    <div className="app">
      <header>
        <h1>紫微斗数 · AI 查盘</h1>
        <span className="sub">排盘 · 运限 · 知识库优先 · AI 兜底</span>
      </header>
      <p className="disclaimer">
        本工具基于开源排盘引擎 iztro（MIT）与自建知识库。解读内容仅供传统文化研究与娱乐参考，不构成医疗、法律、投资等任何专业建议。
      </p>

      <div className="layout">
        {/* 左列：排盘 / 设置 / 万年历 / 客户信息 */}
        <div className="left">
          <BirthForm key={formKey} initial={input} options={options} onGenerate={(i) => generate(i)} onImport={handleImport} />
          <SettingsPanel options={options} onChange={changeOptions} />

          <div className="panel" style={{ marginTop: 16 }}>
            <h2 onClick={() => setShowAi((v) => !v)} style={{ cursor: 'pointer' }}>
              AI 设置 {showAi ? '▾' : '▸'}
            </h2>
            {showAi && (
              <>
                <div className="field">
                  <label>服务商</label>
                  <select value={aiConfig.provider} onChange={(e) => changeProvider(e.target.value as AiProvider)}>
                    {(Object.keys(AI_PROVIDERS) as AiProvider[]).map((k) => (
                      <option key={k} value={k}>
                        {AI_PROVIDERS[k].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>API Key</label>
                  <input type="password" value={aiConfig.apiKey} placeholder="sk-..." onChange={(e) => setAiConfig((c) => ({ ...c, apiKey: e.target.value }))} />
                </div>
                <div className="field">
                  <label>接口地址（OpenAI 兼容）</label>
                  <input value={aiConfig.baseUrl} onChange={(e) => setAiConfig((c) => ({ ...c, baseUrl: e.target.value }))} />
                </div>
                <div className="field">
                  <label>模型</label>
                  <input value={aiConfig.model} onChange={(e) => setAiConfig((c) => ({ ...c, model: e.target.value }))} />
                </div>
                <p className="hint">Key 仅存本机浏览器 localStorage，浏览器直连服务商。若遇 CORS 拦截可加代理。</p>
                {hasKey && <p className="hint" style={{ color: 'var(--ok)' }}>✓ 已配置</p>}
              </>
            )}
          </div>

          <CalendarPanel />
          <HistoryPanel items={history} onLoad={loadHistoryItem} onDelete={(id) => setHistory((h) => h.filter((x) => x.id !== id))} />
        </div>

        {/* 中列：盘 + 解读 */}
        <div className="center">
          <div className="panel toolbar">
            <button className="btn ghost" style={{ width: 'auto' }} onClick={saveChart}>保存此盘</button>
            <button className="btn ghost" style={{ width: 'auto' }} onClick={exportStarDB} title="导出星曜资料库 JSON（本地备份）">
              导出星曜库
            </button>
            <span className="hint">
              星曜库 {PROFILE_STATS.total} 颗（完整 {PROFILE_STATS.full}）＋ 运限派生 {FLOW_PROFILES.length}
            </span>
            {saveMsg && <span className="hint" style={{ color: 'var(--ok)' }}>{saveMsg}</span>}
          </div>

          <ChartPanel
            astrolabe={astrolabe}
            input={input}
            options={options}
            timeIndex={timeIndex}
            layered={layered}
            selectedPalace={selectedPalace}
            onSelectPalace={setSelectedPalace}
            onSelectStar={openStar}
          />

          {astrolabe && selectedPalace && (
            <PalaceReportPanel
              astrolabe={astrolabe}
              palaceName={selectedPalace}
              onSelectPalace={setSelectedPalace}
              onSelectStar={openStar}
            />
          )}

          {astrolabe && selectedPalace && (
            <PalaceDetail
              astrolabe={astrolabe}
              palaceName={selectedPalace}
              summary={summary}
              aiConfig={hasKey ? aiConfig : null}
              relations={relations}
              onSelectStar={openStar}
            />
          )}

          {astrolabe && <SummaryPanel astrolabe={astrolabe} aiConfig={hasKey ? aiConfig : null} />}
        </div>

        {/* 右列：运限点选导航 */}
        <div className="right">
          <div className="panel">
            <h2>运限导航</h2>
            {astrolabe && raw ? (
              <ScopeNav
                decadalOptions={decadalOptions}
                yearRange={yearRange}
                active={activeLayers}
                onActiveChange={setActiveLayers}
              />
            ) : (
              <p className="hint">排盘后在此点选大限 → 流年 → 流月 → 流日。</p>
            )}
          </div>
        </div>
      </div>

      {starFocus && (
        <StarProfilePanel
          astrolabe={astrolabe}
          starName={starFocus.name}
          palaceName={starFocus.palace}
          onClose={() => setStarFocus(null)}
          onSelectStar={openStar}
        />
      )}
    </div>
  );
}
