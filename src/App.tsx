import { useEffect, useMemo, useState } from 'react';
import { astro } from 'iztro';
import type {
  Astrolabe,
  BirthInput,
  ChartOptions,
  HistoryItem,
  UserProfile,
  UserRecord,
  UserSummary,
} from './types';
import UserPanel from './components/UserPanel';
import ToolBox from './components/ToolBox';
import ChartPanel from './components/ChartPanel';
import PalaceDetail from './components/PalaceDetail';
import SummaryPanel from './components/SummaryPanel';
import PalaceReportPanel from './components/PalaceReportPanel';
import StarProfilePanel from './components/StarProfilePanel';
import ScopeNav from './components/ScopeNav';
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

const NEW_USER_INPUT: BirthInput = { ...DEFAULT_INPUT, birthday: '', clockTime: '' };

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
const USERS_STORAGE_KEY = 'ziwei-users-v2';
const LEGACY_HISTORY_KEY = 'ziwei-history-v1';

function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_STORAGE_KEY);
    if (raw) return { ...DEFAULT_AI, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_AI;
}

function loadUsers(): UserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserRecord[];
      if (Array.isArray(parsed)) return parsed.filter((u) => u && u.payload);
    }
  } catch {
    /* ignore */
  }
  try {
    const legacy = localStorage.getItem(LEGACY_HISTORY_KEY);
    if (legacy) {
      const items = JSON.parse(legacy) as HistoryItem[];
      return items.map((h, i) => ({
        id: h.id || `legacy-${i}`,
        name: '未命名',
        relation: '客户',
        note: '',
        savedAt: h.savedAt,
        updatedAt: h.savedAt,
        payload: h.payload,
      }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

const inputFromPayload = (p: BirthInput & ChartOptions): BirthInput => ({
  birthday: p.birthday,
  clockTime: p.clockTime,
  gender: p.gender,
  birthdayType: p.birthdayType,
  isLeapMonth: p.isLeapMonth,
  fixLeap: p.fixLeap,
  useTrueSolar: p.useTrueSolar,
  longitude: p.longitude,
});

const optionsFromPayload = (p: BirthInput & ChartOptions): ChartOptions => ({
  algorithm: p.algorithm ?? 'default',
  yearDivide: p.yearDivide ?? 'normal',
  ageDivide: p.ageDivide ?? 'normal',
  horoscopeDivide: p.horoscopeDivide ?? 'normal',
  dayDivide: p.dayDivide ?? 'current',
});

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
  const [users, setUsers] = useState<UserRecord[]>(loadUsers);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>({ name: '', relation: '本人', note: '' });
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<'chart' | 'card' | 'summary'>('chart');
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
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  }, [users]);

  const timeIndex = useMemo(() => computeTimeIndex(input), [input]);

  const userSummaries: UserSummary[] = useMemo(
    () =>
      users.map((u) => ({
        id: u.id,
        name: u.name,
        relation: u.relation,
        birthday: u.payload.birthday,
        savedAt: u.savedAt,
      })),
    [users],
  );

  const flash = (msg: string) => {
    setSaveMsg(msg);
    window.setTimeout(() => setSaveMsg(null), 2200);
  };

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
      setTab('chart');
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
    flash('✓ 星曜库已导出');
  };

  const handleGenerate = (next: BirthInput, profile: UserProfile) => {
    setCurrentProfile(profile);
    if (activeUserId) setDirty(true);
    generate(next);
  };

  const saveUser = (next: BirthInput, profile: UserProfile) => {
    const displayName = profile.name.trim() || '未命名';
    const now = new Date().toLocaleString('zh-CN');
    const id = activeUserId ?? String(Date.now());
    const payload = { ...next, ...options };
    const record: UserRecord = {
      id,
      name: displayName,
      relation: profile.relation,
      note: profile.note,
      savedAt: users.find((u) => u.id === id)?.savedAt ?? now,
      updatedAt: now,
      payload,
    };
    setUsers((prev) => [record, ...prev.filter((u) => u.id !== id)].slice(0, 100));
    setActiveUserId(id);
    setCurrentProfile({ ...profile, name: displayName });
    setDirty(false);
    flash('✓ 已保存');
  };

  const loadUser = (id: string) => {
    const record = users.find((u) => u.id === id);
    if (!record) return;
    setActiveUserId(record.id);
    setCurrentProfile({ name: record.name, relation: record.relation, note: record.note });
    setDirty(false);
    setFormKey((k) => k + 1);
    generate(inputFromPayload(record.payload), optionsFromPayload(record.payload));
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (activeUserId === id) {
      setActiveUserId(null);
      setCurrentProfile({ name: '', relation: '本人', note: '' });
      setDirty(false);
    }
  };

  const newUser = () => {
    setInput(NEW_USER_INPUT);
    setAstrolabe(null);
    setRaw(null);
    setSelectedPalace('命宫');
    setActiveUserId(null);
    setCurrentProfile({ name: '', relation: '本人', note: '' });
    setDirty(false);
    setTab('chart');
    setStarFocus(null);
    setFormKey((k) => k + 1);
  };

  const handleImport = (next: BirthInput, opts: ChartOptions) => {
    setActiveUserId(null);
    setCurrentProfile({ name: '', relation: '本人', note: '' });
    setDirty(false);
    setFormKey((k) => k + 1);
    generate(next, opts);
  };

  const changeProvider = (provider: AiProvider) => {
    const preset = AI_PROVIDERS[provider];
    setAiConfig((c) => ({ ...c, provider, baseUrl: preset.baseUrl, model: preset.model }));
  };

  const paletteLabel = selectedPalace
    ? selectedPalace.endsWith('宫')
      ? selectedPalace
      : `${selectedPalace}宫`
    : '宫位卡';

  return (
    <div className="app">
      <header>
        <h1>紫微斗数 · AI 查盘</h1>
        <span className="sub">用户 · 命盘 · 宫位卡 · 运限</span>
      </header>
      <p className="disclaimer">
        本工具基于开源排盘引擎 iztro（MIT）与自建知识库。解读内容仅供传统文化研究与娱乐参考，不构成医疗、法律、投资等任何专业建议。
      </p>

      <div className="layout">
        {/* 左列：用户信息 + 折叠工具 */}
        <div className="left">
          <UserPanel
            key={formKey}
            initial={input}
            initialProfile={currentProfile}
            users={userSummaries}
            activeUserId={activeUserId}
            options={options}
            saveMsg={saveMsg}
            onGenerate={handleGenerate}
            onSave={saveUser}
            onNew={newUser}
            onSelectUser={loadUser}
            onDeleteUser={deleteUser}
            onImport={handleImport}
            onExportStars={exportStarDB}
          />
          <ToolBox
            options={options}
            onOptionsChange={changeOptions}
            aiConfig={aiConfig}
            onAiChange={setAiConfig}
            onProviderChange={changeProvider}
            hasKey={hasKey}
          />
        </div>

        {/* 中列：一次只看一件事 */}
        <div className="center">
          <div className="center-tabs">
            <button className={`tab ${tab === 'chart' ? 'active' : ''}`} onClick={() => setTab('chart')}>
              命盘
            </button>
            <button
              className={`tab ${tab === 'card' ? 'active' : ''}`}
              disabled={!astrolabe}
              onClick={() => setTab('card')}
            >
              宫位卡 · {paletteLabel}
            </button>
            <button
              className={`tab ${tab === 'summary' ? 'active' : ''}`}
              disabled={!astrolabe}
              onClick={() => setTab('summary')}
            >
              综述
            </button>
            <span className={`current-user ${activeUserId && !dirty ? 'saved' : ''}`}>
              <b>{currentProfile.name || '未命名'}</b>
              <em>{currentProfile.relation}</em>
              <i>{activeUserId ? (dirty ? '已修改' : '已保存') : '未保存'}</i>
            </span>
          </div>

          {tab === 'chart' && (
            <ChartPanel
              astrolabe={astrolabe}
              input={input}
              options={options}
              timeIndex={timeIndex}
              layered={layered}
              selectedPalace={selectedPalace}
              userLabel={currentProfile.name ? `${currentProfile.name} · ${currentProfile.relation}` : ''}
              onSelectPalace={(name) => {
                setSelectedPalace(name);
                setTab('card');
              }}
              onSelectStar={openStar}
            />
          )}

          {tab === 'card' &&
            (astrolabe && selectedPalace ? (
              <>
                <PalaceReportPanel
                  astrolabe={astrolabe}
                  palaceName={selectedPalace}
                  onSelectPalace={setSelectedPalace}
                  onSelectStar={openStar}
                />
                <details className="panel legacy-wrap">
                  <summary>传统解读与 AI（旧版）</summary>
                  <PalaceDetail
                    astrolabe={astrolabe}
                    palaceName={selectedPalace}
                    summary={summary}
                    aiConfig={hasKey ? aiConfig : null}
                    relations={relations}
                    onSelectStar={openStar}
                  />
                </details>
              </>
            ) : (
              <div className="panel empty-state">先排盘，再看宫位卡。</div>
            ))}

          {tab === 'summary' &&
            (astrolabe ? (
              <SummaryPanel astrolabe={astrolabe} aiConfig={hasKey ? aiConfig : null} />
            ) : (
              <div className="panel empty-state">先排盘，再看综述。</div>
            ))}
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
