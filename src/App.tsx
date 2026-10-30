import { useEffect, useMemo, useState } from 'react';
import { astro } from 'iztro';
import type {
  Astrolabe,
  BirthInput,
  ChartOptions,
  HistoryItem,
  ReadingRecord,
  ServiceDraft,
  ServiceRecord,
  ServiceStatus,
  UserProfile,
  UserRecord,
  UserSummary,
} from './types';
import Sigil from './components/Sigil';
import UserPanel from './components/UserPanel';
import ToolsPanel from './components/ToolsPanel';
import ReadingWorkspace from './components/ReadingWorkspace';
import TodayPanel from './components/TodayPanel';
import SidebarToday from './components/SidebarToday';
import DraggableClientPill from './components/DraggableClientPill';
import ClientListPanel from './components/ClientListPanel';
import ClientProfileSheet from './components/ClientProfileSheet';
import ServiceRecordList from './components/ServiceRecordList';
import ServiceRecordSheet from './components/ServiceRecordSheet';
import ClientSwitcher from './components/ClientSwitcher';
import LibraryPage from './components/LibraryPage';
import SettingsSheet, { type SettingsTab } from './components/SettingsSheet';
import OutputSheet from './components/OutputSheet';
import StarProfilePanel from './components/StarProfilePanel';
import { AI_PROVIDERS, type AiConfig, type AiProvider } from './lib/ai';
import { readChart } from './lib/synthesize';
import { buildPalaceSnapshot, snapshotToText } from './lib/report';
import {
  getLayeredData,
  getDecadalOptions,
  getDecadalYearRange,
  type ActiveLayers,
  type LayeredData,
} from './lib/scope';
import { getRelations, type Relations } from './lib/relations';
import { computeTimeIndex } from './lib/truesolar';
import { clientCounts, type ClientFilter } from './lib/clientGroups';
import { seedCelebrityExamples } from './lib/celebrityExamples';
import { loadOutputProfile, saveOutputProfile, type OutputProfile } from './lib/output';
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
  latitude: 39.91,
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
const READINGS_STORAGE_KEY = 'ziwei-readings-v1';
const SERVICES_STORAGE_KEY = 'ziwei-services-v1';
const PRIMARY_CLIENT_KEY = 'ziwei-primary-client-v1';

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

function loadServices(): ServiceRecord[] {
  try {
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ServiceRecord[];
      if (Array.isArray(parsed)) return parsed.filter((r) => r && r.id);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadReadings(): ReadingRecord[] {
  try {
    const raw = localStorage.getItem(READINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReadingRecord[];
      if (Array.isArray(parsed)) return parsed.filter((r) => r && r.clientId);
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
  latitude: p.latitude ?? 30,
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
      decadal: dec ?? { range: [0, 0] as [number, number], heavenlyStem: '', earthlyBranch: '' },
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
  const [users, setUsers] = useState<UserRecord[]>(() => seedCelebrityExamples(loadUsers()));
  const [readings, setReadings] = useState<ReadingRecord[]>(loadReadings);
  const [services, setServices] = useState<ServiceRecord[]>(loadServices);
  const [serviceOpenId, setServiceOpenId] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>({ name: '', relation: '本人', note: '' });
  const [dirty, setDirty] = useState(false);
  const [section, setSection] = useState<'master' | 'today' | 'clients' | 'services' | 'library'>('master');
  const [view, setView] = useState<'chart' | 'card' | 'summary' | 'report'>('chart');
  const [showClientList, setShowClientList] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('chart');
  const [clientFilter, setClientFilter] = useState<ClientFilter>('all');
  const [primaryId, setPrimaryId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PRIMARY_CLIENT_KEY);
    } catch {
      return null;
    }
  });
  const [outputProfile, setOutputProfile] = useState<OutputProfile>(loadOutputProfile);
  const [exportOpen, setExportOpen] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [starFocus, setStarFocus] = useState<{ name: string; palace?: string } | null>(null);
  const [theme, setTheme] = useState<'mystic' | 'paper'>(() => {
    try {
      return localStorage.getItem('ziwei-theme') === 'paper' ? 'paper' : 'mystic';
    } catch {
      return 'mystic';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ziwei-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

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

  useEffect(() => {
    try {
      localStorage.setItem(READINGS_STORAGE_KEY, JSON.stringify(readings));
    } catch {
      /* ignore */
    }
  }, [readings]);

  useEffect(() => {
    saveOutputProfile(outputProfile);
  }, [outputProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
    } catch {
      /* ignore */
    }
  }, [services]);

  useEffect(() => {
    try {
      if (primaryId) localStorage.setItem(PRIMARY_CLIENT_KEY, primaryId);
      else localStorage.removeItem(PRIMARY_CLIENT_KEY);
    } catch {
      /* ignore */
    }
  }, [primaryId]);

  useEffect(() => {
    if (primaryId && !users.some((u) => u.id === primaryId)) setPrimaryId(null);
  }, [users, primaryId]);

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

  const profileUser = useMemo(() => users.find((u) => u.id === profileId) ?? null, [users, profileId]);
  const filterCounts = useMemo(() => clientCounts(users), [users]);
  const primary = users.find((u) => u.id === primaryId) ?? null;
  const openService = useMemo(() => services.find((s) => s.id === serviceOpenId) ?? null, [services, serviceOpenId]);

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
      setView('chart');
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
    setSection('clients');
    setShowClientList(false);
  };

  const saveUser = (next: BirthInput, profile: UserProfile): string => {
    const displayName = profile.name.trim() || '未命名';
    const now = new Date().toLocaleString('zh-CN');
    const id = activeUserId ?? String(Date.now());
    const payload = { ...next, ...options };
    const existing = users.find((u) => u.id === id);
    const record: UserRecord = {
      id,
      name: displayName,
      relation: profile.relation,
      note: profile.note,
      savedAt: existing?.savedAt ?? now,
      updatedAt: now,
      category: existing?.category,
      isExample: existing?.isExample,
      payload,
    };
    setUsers((prev) => [record, ...prev.filter((u) => u.id !== id)].slice(0, 100));
    setActiveUserId(id);
    if (!primaryId) setPrimaryId(id);
    setCurrentProfile({ ...profile, name: displayName });
    setDirty(false);
    setSection('clients');
    setShowClientList(false);
    flash('✓ 已保存');
    return id;
  };

  const loadUser = (id: string) => {
    const record = users.find((u) => u.id === id);
    if (!record) return;
    setActiveUserId(record.id);
    setCurrentProfile({ name: record.name, relation: record.relation, note: record.note });
    setDirty(false);
    setFormKey((k) => k + 1);
    setSection('clients');
    setShowClientList(false);
    setProfileOpen(false);
    setSwitcherOpen(false);
    setEditorOpen(false);
    generate(inputFromPayload(record.payload), optionsFromPayload(record.payload));
  };

  const createClient = (next: BirthInput, profile: UserProfile): string => {
    const id = String(Date.now());
    const now = new Date().toLocaleString('zh-CN');
    const record: UserRecord = {
      id,
      name: profile.name.trim() || '未命名',
      relation: profile.relation,
      note: profile.note,
      savedAt: now,
      updatedAt: now,
      payload: { ...next, ...options },
    };
    setUsers((prev) => [record, ...prev].slice(0, 100));
    flash('✓ 已新建客户');
    return id;
  };

  const saveService = (draft: ServiceDraft) => {
    const record: ServiceRecord = {
      ...draft,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientIds: draft.clientIds ?? (activeUserId ? [activeUserId] : []),
      clientNames: draft.clientNames ?? (currentProfile.name ? [currentProfile.name] : []),
      createdAt: new Date().toLocaleString('zh-CN'),
      status: 'draft',
    };
    setServices((prev) => [record, ...prev].slice(0, 300));
    flash('✓ 服务记录已保存');
  };

  const setServiceStatus = (id: string, status: ServiceStatus) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    setServiceOpenId(null);
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setReadings((prev) => prev.filter((r) => r.clientId !== id));
    setServices((prev) => prev.flatMap((s) => {
      const idx = s.clientIds.indexOf(id);
      if (idx < 0) return [s];
      const clientIds = s.clientIds.filter((x) => x !== id);
      const clientNames = s.clientNames.filter((_, i) => i !== idx);
      return clientIds.length ? [{ ...s, clientIds, clientNames }] : [];
    }));
    setServiceOpenId((prev) => (prev ? null : prev));
    if (primaryId === id) setPrimaryId(null);
    if (profileId === id) {
      setProfileOpen(false);
      setProfileId(null);
    }
    if (activeUserId === id) {
      setActiveUserId(null);
      setCurrentProfile({ name: '', relation: '本人', note: '' });
      setAstrolabe(null);
      setRaw(null);
      setDirty(false);
      setSection('master');
      setShowClientList(false);
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
    setSection('clients');
    setShowClientList(false);
    setView('chart');
    setStarFocus(null);
    setFormKey((k) => k + 1);
  };

  const newClient = () => {
    newUser();
    setClientFilter('all');
    setEditorOpen(true);
    setSwitcherOpen(false);
    setProfileOpen(false);
  };

  const openClient = (id: string) => {
    loadUser(id);
    setSection('clients');
    setShowClientList(false);
  };

  const openProfile = (id: string) => {
    setProfileId(id);
    setProfileOpen(true);
    setSwitcherOpen(false);
  };

  const openReading = (r: ReadingRecord) => {
    loadUser(r.clientId);
    setActiveLayers(r.layers);
    setSelectedPalace(r.palace);
    setView(r.view);
    setSection('clients');
    setShowClientList(false);
    setProfileOpen(false);
  };

  const saveReading = () => {
    if (!astrolabe) return;
    let clientId = activeUserId;
    if (!clientId) {
      if (!currentProfile.name.trim()) {
        flash('先给客户起个名字，再保存解盘记录');
        setEditorOpen(true);
        return;
      }
      clientId = saveUser(input, currentProfile);
    }
    const rangeLabel =
      activeLayers.daily != null
        ? `${activeLayers.daily} 流日`
        : activeLayers.monthly != null
          ? `${activeLayers.yearly}.${String(activeLayers.monthly).padStart(2, '0')} 流月`
          : activeLayers.yearly != null
            ? `${activeLayers.yearly} 流年`
            : activeLayers.decadal != null
              ? `大限 ${decadalOptions.find((d) => d.index === activeLayers.decadal)?.label ?? ''}`
              : '本命盘';
    let text = summary;
    if (selectedPalace) {
      try {
        const snap = buildPalaceSnapshot(astrolabe, selectedPalace, false);
        text = snapshotToText(snap).slice(0, 1200);
      } catch {
        /* keep summary */
      }
    }
    const record: ReadingRecord = {
      id: String(Date.now()),
      clientId,
      clientName: currentProfile.name || '未命名',
      createdAt: new Date().toLocaleString('zh-CN'),
      rangeLabel,
      view,
      palace: selectedPalace ?? '命宫',
      layers: activeLayers,
      summary: text,
    };
    setReadings((prev) => [record, ...prev].slice(0, 300));
    flash('✓ 解盘记录已保存');
  };

  const handleImport = (next: BirthInput, opts: ChartOptions) => {
    setActiveUserId(null);
    setCurrentProfile({ name: '', relation: '本人', note: '' });
    setDirty(false);
    setFormKey((k) => k + 1);
    generate(next, opts);
    setSection('clients');
    setShowClientList(false);
    setEditorOpen(false);
  };

  const changeProvider = (provider: AiProvider) => {
    const preset = AI_PROVIDERS[provider];
    setAiConfig((c) => ({ ...c, provider, baseUrl: preset.baseUrl, model: preset.model }));
  };

  const openExport = () => {
    if (!astrolabe) return;
    if (!selectedPalace) setSelectedPalace('命宫');
    setSection('clients');
    setShowClientList(false);
    setView('card');
    setExportOpen(true);
  };

  const changeAlgorithm = (algorithm: ChartOptions['algorithm']) => {
    if (options.algorithm === algorithm) return;
    const next = { ...options, algorithm };
    setOptions(next);
    if (astrolabe) {
      generate(input, next);
      setView('card');
    }
  };

  const handleExport = () => {
    setExportOpen(false);
    setView('card');
    window.setTimeout(() => {
      document.querySelectorAll<HTMLDetailsElement>('details.report-fold').forEach((d) => { d.open = true; });
      window.print();
    }, 180);
  };

  const topState = activeUserId ? (dirty ? '已修改' : '已保存') : currentProfile.name ? '未保存' : '';
  const topProfile = currentProfile.name
    ? { name: currentProfile.name, relation: currentProfile.relation }
    : primary
      ? { name: primary.name, relation: primary.relation }
      : null;

  return (
    <div className="app">
      <header className="app-topbar">
        <div className="topbar-brand" onClick={() => setSection('master')}>
          <Sigil />
          <div>
            <h1>紫微斗数</h1>
            <span>观星 · 察象 · 知机</span>
          </div>
        </div>

        <div className="topbar-spacer" />

        <div className="topbar-actions">
          <button className="topbar-btn" onClick={openExport} disabled={!astrolabe} title="选择输出内容并打印 / 另存为 PDF">导出 PDF</button>
          <button className="topbar-btn" onClick={() => { setSettingsTab('chart'); setSettingsOpen(true); }}>设置</button>
          <button className="topbar-btn" onClick={() => setTheme(theme === 'mystic' ? 'paper' : 'mystic')}>
            {theme === 'mystic' ? '宣纸' : '玄夜'}
          </button>
        </div>
      </header>

      <DraggableClientPill
        name={topProfile?.name}
        relation={topProfile?.relation}
        state={topState}
        isPrimary={Boolean(primary && (activeUserId ? primary.id === activeUserId : true))}
        onOpen={() => setSwitcherOpen(true)}
      />

      <div className="app-body">
        <aside className="sidebar">
          <div className="side-section">
            <div className="side-label">工作台</div>
            <div className="side-nav">
              <button className={`side-nav-item ${section === 'master' || section === 'clients' ? 'active' : ''}`} onClick={() => setSection('master')}>
                <span className="side-icon">◉</span>命主
              </button>
              <button className={`side-nav-item ${section === 'services' ? 'active' : ''}`} onClick={() => setSection('services')}>
                <span className="side-icon">◇</span>服务
              </button>
              <button className={`side-nav-item ${section === 'library' ? 'active' : ''}`} onClick={() => setSection('library')}>
                <span className="side-icon">▤</span>资料
              </button>
            </div>
          </div>

          <div className="side-section">
            <div className="side-label">主客户</div>
            {primary ? (
              <button className="side-primary" onClick={() => setSection('master')} title="前往命主页面切换主客户">
                <span className="side-avatar">{Array.from(primary.name)[0] || '客'}</span>
                <span className="side-primary-main">
                  <b>{primary.name}</b>
                  <em>主客户开关已打开 · 管理命主</em>
                </span>
                <span className="side-primary-arrow">→</span>
              </button>
            ) : (
              <button className="side-primary empty" onClick={() => setSection('master')}>
                <span className="side-primary-main">
                  <b>还没有主客户</b>
                  <em>去命主页打开开关</em>
                </span>
                <span className="side-primary-arrow">→</span>
              </button>
            )}
          </div>

          <SidebarToday
            primary={primary}
            options={options}
            onOpenToday={() => setSection('today')}
            onOpenMasters={() => setSection('master')}
          />

          <div className="side-foot">
            本地优先 · 数据只存本机<br />
            解读仅供传统文化研究
          </div>
        </aside>

        <main className="content">
          {section === 'today' && (
            <TodayPanel
              users={users}
              activeUserId={activeUserId}
              primaryId={primaryId}
              options={options}
              hasChart={Boolean(astrolabe)}
              onOpenClient={openClient}
              onNewClient={newClient}
              onOpenServices={() => setSection('services')}
              onOpenLibrary={() => setSection('library')}
              onOpenMasters={() => setSection('master')}
              onPrimaryChange={setPrimaryId}
            />
          )}

          {section === 'master' && (
            <ClientListPanel
              users={users}
              activeUserId={activeUserId}
              primaryId={primaryId}
              clientFilter={clientFilter}
              filterCounts={filterCounts}
              onClientFilter={setClientFilter}
              onPrimaryChange={setPrimaryId}
              onOpen={openClient}
              onProfile={openProfile}
              onNew={newClient}
              onDelete={deleteUser}
            />
          )}

          {section === 'clients' &&
            (showClientList || !astrolabe ? (
              <ClientListPanel
                users={users}
                activeUserId={activeUserId}
                primaryId={primaryId}
                clientFilter={clientFilter}
                filterCounts={filterCounts}
                onClientFilter={setClientFilter}
                onPrimaryChange={setPrimaryId}
                onOpen={openClient}
                onProfile={openProfile}
                onNew={newClient}
                onDelete={deleteUser}
              />
            ) : (
              <ReadingWorkspace
                astrolabe={astrolabe}
                raw={raw}
                input={input}
                options={options}
                timeIndex={timeIndex}
                layered={layered}
                active={activeLayers}
                selectedPalace={selectedPalace}
                userLabel={currentProfile.name ? `${currentProfile.name} · ${currentProfile.relation}` : ''}
                userName={currentProfile.name}
                view={view}
                onViewChange={setView}
                onSelectPalace={setSelectedPalace}
                onSelectStar={openStar}
                decadalOptions={decadalOptions}
                yearRange={yearRange}
                onActiveChange={setActiveLayers}
                onOpenProfile={() => (activeUserId ? openProfile(activeUserId) : setEditorOpen(true))}
                onOpenEditor={() => setEditorOpen(true)}
                onSaveReading={saveReading}
                onOpenExport={openExport}
                saveMsg={saveMsg}
                summary={summary}
                relations={relations}
                aiConfig={hasKey ? aiConfig : null}
                hasKey={hasKey}
                output={outputProfile}
              />
            ))}

          {section === 'services' && (
            <div className="services-page">
              <div className="page-head">
                <div>
                  <h2>服务</h2>
                  <p className="dim">
                    {currentProfile.name ? `当前客户：${currentProfile.name} · ${currentProfile.relation}` : '起名可独立择日；合盘需要 A/B 两位客户'}
                  </p>
                </div>
                <button
                  className="btn"
                  onClick={() => document.getElementById('service-new')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  + 新建服务
                </button>
              </div>

              <section className="service-history">
                <div className="service-history-head">
                  <h3>服务记录</h3>
                  <span className="dim">{services.length} 条 · 点开可标记交付 / 复制</span>
                </div>
                <ServiceRecordList records={services} onOpen={setServiceOpenId} />
              </section>

              <div id="service-new" className="service-new-block">
                <ToolsPanel
                  astrolabe={astrolabe}
                  raw={raw}
                  users={users}
                  activeUserId={activeUserId}
                  userName={currentProfile.name}
                  userLabel={currentProfile.name ? `${currentProfile.name} · ${currentProfile.relation}` : ''}
                  options={options}
                  onSaveService={saveService}
                  onCreateClient={createClient}
                />
              </div>
            </div>
          )}

          {section === 'library' && (
            <LibraryPage
              onOpenData={() => { setSettingsTab('data'); setSettingsOpen(true); }}
            />
          )}

          <footer className="app-foot">
            基于 iztro（MIT）与自建知识库 · 解读仅供传统文化研究与娱乐参考，不构成医疗、法律、投资建议。
          </footer>
        </main>
      </div>

      {profileOpen && profileUser && (
        <ClientProfileSheet
          user={profileUser}
          readings={readings}
          services={services}
          onClose={() => setProfileOpen(false)}
          onOpenChart={() => openClient(profileUser.id)}
          onEdit={() => {
            loadUser(profileUser.id);
            setProfileOpen(false);
            setEditorOpen(true);
          }}
          onNewService={() => {
            setSection('services');
            setProfileOpen(false);
          }}
          onOpenReading={openReading}
          onOpenService={(id) => { setProfileOpen(false); setServiceOpenId(id); }}
          onDelete={() => {
            deleteUser(profileUser.id);
            setProfileOpen(false);
          }}
        />
      )}

      {switcherOpen && (
        <ClientSwitcher
          users={users}
          activeUserId={activeUserId}
          onSelect={openClient}
          onNew={newClient}
          onClose={() => setSwitcherOpen(false)}
        />
      )}

      {editorOpen && (
        <div className="modal-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="modal client-editor" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>客户资料</h2>
                <div className="modal-sub">出生信息、真太阳时与保存</div>
              </div>
              <button className="modal-close" onClick={() => setEditorOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <UserPanel
                key={formKey}
                initial={input}
                initialProfile={currentProfile}
                users={userSummaries}
                activeUserId={activeUserId}
                options={options}
                saveMsg={saveMsg}
                onGenerate={(next, profile) => {
                  handleGenerate(next, profile);
                  saveUser(next, profile);
                  setEditorOpen(false);
                }}
                onSave={(next, profile) => {
                  saveUser(next, profile);
                  generate(next);
                  setEditorOpen(false);
                }}
                onNew={newUser}
                onSelectUser={(id) => {
                  loadUser(id);
                  setEditorOpen(false);
                }}
                onDeleteUser={(id) => {
                  deleteUser(id);
                  setEditorOpen(false);
                }}
                onImport={(next, opts) => {
                  handleImport(next, opts);
                  setEditorOpen(false);
                }}
                onExportStars={exportStarDB}
              />
            </div>
          </div>
        </div>
      )}

      {openService && (
        <ServiceRecordSheet
          record={openService}
          onClose={() => setServiceOpenId(null)}
          onStatus={(status) => setServiceStatus(openService.id, status)}
          onDelete={() => deleteService(openService.id)}
        />
      )}

      <SettingsSheet
        open={settingsOpen}
        initialTab={settingsTab}
        options={options}
        onOptionsChange={changeOptions}
        aiConfig={aiConfig}
        onAiChange={setAiConfig}
        onProviderChange={changeProvider}
        hasKey={hasKey}
        onExportStars={exportStarDB}
        onClose={() => setSettingsOpen(false)}
      />

      <OutputSheet
        open={exportOpen}
        profile={outputProfile}
        onChange={setOutputProfile}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        hasChart={Boolean(astrolabe)}
        algorithm={options.algorithm}
        onAlgorithmChange={changeAlgorithm}
      />

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
