import { useMemo, useState } from 'react';
import type { BirthInput, ChartOptions, Relation, UserProfile, UserSummary } from '../types';
import { CITIES, PROVINCES, searchCities, type City } from '../lib/cities';
import { trueSolarTimeMinutes, minutesToTimeIndex, formatMinutes } from '../lib/truesolar';
import { parseDateInput, parseTimeInput } from '../lib/datetime';
import { encodeChart, decodeChart } from '../lib/chartcode';
import { FLOW_PROFILES, PROFILE_STATS } from '../lib/knowledge/starProfiles';

const RELATIONS: Relation[] = ['本人', '父亲', '母亲', '配偶', '子女', '兄弟', '姐妹', '朋友', '同事', '客户', '其他'];

const TIME_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: '早子时 00:00–01:00' },
  { value: 1, label: '丑时 01:00–03:00' },
  { value: 2, label: '寅时 03:00–05:00' },
  { value: 3, label: '卯时 05:00–07:00' },
  { value: 4, label: '辰时 07:00–09:00' },
  { value: 5, label: '巳时 09:00–11:00' },
  { value: 6, label: '午时 11:00–13:00' },
  { value: 7, label: '未时 13:00–15:00' },
  { value: 8, label: '申时 15:00–17:00' },
  { value: 9, label: '酉时 17:00–19:00' },
  { value: 10, label: '戌时 19:00–21:00' },
  { value: 11, label: '亥时 21:00–23:00' },
  { value: 12, label: '晚子时 23:00–24:00' },
];

function toMinutes(timeStr: string): number {
  const raw = (timeStr ?? '').trim();
  if (!raw) return 720;
  const [h, m] = raw.split(':').map(Number);
  if (Number.isNaN(h)) return 720;
  return h * 60 + (m || 0);
}

export default function UserPanel({
  initial,
  initialProfile,
  users,
  activeUserId,
  options,
  saveMsg,
  onGenerate,
  onSave,
  onNew,
  onSelectUser,
  onDeleteUser,
  onImport,
  onExportStars,
}: {
  initial: BirthInput;
  initialProfile: UserProfile;
  users: UserSummary[];
  activeUserId: string | null;
  options: ChartOptions;
  saveMsg: string | null;
  onGenerate: (input: BirthInput, profile: UserProfile) => void;
  onSave: (input: BirthInput, profile: UserProfile) => void;
  onNew: () => void;
  onSelectUser: (id: string) => void;
  onDeleteUser: (id: string) => void;
  onImport: (input: BirthInput, options: ChartOptions) => void;
  onExportStars: () => void;
}) {
  const initialCity = useMemo(
    () => CITIES.find((c) => Math.abs(c.longitude - initial.longitude) < 0.05),
    [initial.longitude],
  );

  const [name, setName] = useState(initialProfile.name);
  const [relation, setRelation] = useState<Relation>(initialProfile.relation);
  const [note, setNote] = useState(initialProfile.note);
  const [birthday, setBirthday] = useState(initial.birthday);
  const [birthdayText, setBirthdayText] = useState(initial.birthday);
  const [birthdayErr, setBirthdayErr] = useState<string | null>(null);
  const [clockTime, setClockTime] = useState(initial.clockTime);
  const [clockText, setClockText] = useState(initial.clockTime);
  const [clockErr, setClockErr] = useState<string | null>(null);
  const [gender, setGender] = useState<BirthInput['gender']>(initial.gender);
  const [birthdayType, setBirthdayType] = useState<BirthInput['birthdayType']>(initial.birthdayType);
  const [isLeapMonth, setIsLeapMonth] = useState(initial.isLeapMonth);
  const [fixLeap, setFixLeap] = useState(initial.fixLeap);
  const [useTrueSolar, setUseTrueSolar] = useState(initial.useTrueSolar);
  const [province, setProvince] = useState(initialCity?.province ?? '');
  const [cityName, setCityName] = useState(initialCity?.name ?? '');
  const [cityQuery, setCityQuery] = useState(initialCity?.name ?? '');
  const [cityOpen, setCityOpen] = useState(false);
  const [longitude, setLongitude] = useState(initial.longitude);
  const [codeInput, setCodeInput] = useState('');
  const [codeMsg, setCodeMsg] = useState<string | null>(null);

  const timeInfo = useMemo(() => {
    const clock = toMinutes(clockTime);
    const [y, m, d] = birthday.split('-').map(Number);
    if (!clockTime.trim()) return { idx: -1, label: '', tsText: '' };
    const idx = minutesToTimeIndex(clock);
    const label = TIME_OPTIONS.find((t) => t.value === idx)?.label ?? '';
    if (!useTrueSolar || !y) return { idx, label, tsText: '' };
    const date = new Date(y, (m || 1) - 1, d || 1);
    const ts = trueSolarTimeMinutes(clock, longitude, date);
    const tsIdx = minutesToTimeIndex(ts);
    return {
      idx: tsIdx,
      label: TIME_OPTIONS.find((t) => t.value === tsIdx)?.label ?? '',
      tsText: `真太阳时 ${formatMinutes(ts)}`,
    };
  }, [clockTime, useTrueSolar, longitude, birthday]);

  const cityMatches = useMemo(
    () => searchCities(cityQuery, province || undefined, 40),
    [cityQuery, province],
  );
  const showCityList = cityOpen && (cityQuery.trim().length > 0 || Boolean(province));

  const profile = (): UserProfile => ({
    name: name.trim(),
    relation,
    note: note.trim(),
  });

  const parseForm = () => {
    const d = parseDateInput(birthdayText, birthdayType);
    const t = parseTimeInput(clockText);
    if (!d.ok) setBirthdayErr(d.error);
    else {
      setBirthday(d.value);
      setBirthdayText(d.value);
      setBirthdayErr(null);
    }
    if (!t.ok) setClockErr(t.error);
    else {
      setClockTime(t.value);
      setClockText(t.value);
      setClockErr(null);
    }
    if (!d.ok || !t.ok) return null;
    const input: BirthInput = {
      birthday: d.value,
      clockTime: t.value,
      gender,
      birthdayType,
      isLeapMonth,
      fixLeap,
      useTrueSolar,
      longitude,
    };
    return input;
  };

  const submit = () => {
    const input = parseForm();
    if (!input) return;
    onGenerate(input, profile());
  };

  const save = () => {
    const input = parseForm();
    if (!input) return;
    onSave(input, profile());
  };

  const pickCity = (c: City) => {
    setProvince(c.province);
    setCityName(c.name);
    setCityQuery(c.name);
    setLongitude(c.longitude);
    setCityOpen(false);
  };

  const copyCode = async () => {
    try {
      const input = parseForm();
      const code = encodeChart({ ...(input ?? { birthday, clockTime, gender, birthdayType, isLeapMonth, fixLeap, useTrueSolar, longitude }), ...options });
      await navigator.clipboard.writeText(code);
      setCodeMsg('✓ 安星码已复制');
    } catch {
      setCodeMsg('复制失败，请手动复制');
    }
  };

  const importCode = () => {
    const decoded = decodeChart(codeInput.trim());
    if (!decoded) {
      setCodeMsg('✗ 安星码无效');
      return;
    }
    const input: BirthInput = {
      birthday: decoded.birthday,
      clockTime: decoded.clockTime,
      gender: decoded.gender,
      birthdayType: decoded.birthdayType,
      isLeapMonth: decoded.isLeapMonth,
      fixLeap: decoded.fixLeap,
      useTrueSolar: decoded.useTrueSolar,
      longitude: decoded.longitude,
    };
    const opts: ChartOptions = {
      algorithm: decoded.algorithm,
      yearDivide: decoded.yearDivide,
      ageDivide: decoded.ageDivide,
      horoscopeDivide: decoded.horoscopeDivide,
      dayDivide: decoded.dayDivide,
    };
    setCodeMsg('✓ 已导入，点「排盘」生效');
    onImport(input, opts);
  };

  return (
    <div className="panel user-panel">
      <div className="user-panel-head">
        <h2>用户信息</h2>
        <span className="dim">{name.trim() || '未命名'} · {relation}</span>
      </div>

      <div className="user-load">
        <select
          value={activeUserId ?? ''}
          onChange={(e) => {
            if (e.target.value) onSelectUser(e.target.value);
          }}
        >
          <option value="">已保存用户（{users.length}）</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.relation} · {u.birthday}
            </option>
          ))}
        </select>
        <button
          className="btn ghost small"
          disabled={!activeUserId}
          onClick={() => {
            if (activeUserId && window.confirm('删除这位用户的档案？')) onDeleteUser(activeUserId);
          }}
        >
          删除
        </button>
      </div>

      <div className="user-row">
        <div className="field">
          <label>姓名</label>
          <input value={name} placeholder="如 张三" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>关系</label>
          <select value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>备注（可选）</label>
        <input value={note} placeholder="客户来源 / 关注点" onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="row">
        <div className="field">
          <label>性别</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as '男' | '女')}>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div className="field">
          <label>历法</label>
          <select
            value={birthdayType}
            onChange={(e) => {
              const next = e.target.value as 'solar' | 'lunar';
              setBirthdayType(next);
              setBirthdayErr(null);
              const r = parseDateInput(birthdayText, next);
              if (r.ok) setBirthday(r.value);
            }}
          >
            <option value="solar">公历</option>
            <option value="lunar">农历</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>出生日期</label>
        <input
          type="text"
          inputMode="numeric"
          value={birthdayText}
          placeholder="19980527 或 1998-05-27"
          onChange={(e) => {
            setBirthdayText(e.target.value);
            setBirthdayErr(null);
          }}
          onBlur={() => {
            const r = parseDateInput(birthdayText, birthdayType);
            if (r.ok) {
              setBirthday(r.value);
              setBirthdayText(r.value);
              setBirthdayErr(null);
            } else if (birthdayText.trim()) {
              setBirthdayErr(r.error);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        {birthdayErr ? <p className="field-error">{birthdayErr}</p> : null}
      </div>

      {birthdayType === 'lunar' && (
        <div className="field">
          <label>
            <input type="checkbox" checked={isLeapMonth} onChange={(e) => setIsLeapMonth(e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />
            是闰月出生
          </label>
          <label style={{ marginTop: 6 }}>
            <input type="checkbox" checked={fixLeap} onChange={(e) => setFixLeap(e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />
            闰月修正（前 15 天算上月）
          </label>
        </div>
      )}

      <div className="field">
        <label>出生时间（24 小时制）</label>
        <input
          type="text"
          value={clockText}
          placeholder="0930 / 9:30 / 9:30 PM"
          onChange={(e) => {
            setClockText(e.target.value);
            setClockErr(null);
          }}
          onBlur={() => {
            const r = parseTimeInput(clockText);
            if (r.ok) {
              setClockTime(r.value);
              setClockText(r.value);
              setClockErr(null);
            } else if (clockText.trim()) {
              setClockErr(r.error);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        {clockErr ? <p className="field-error">{clockErr}</p> : null}
      </div>

      <div className="field">
        <label>
          <input type="checkbox" checked={useTrueSolar} onChange={(e) => setUseTrueSolar(e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />
          真太阳时校正
        </label>
      </div>

      {useTrueSolar && (
        <div className="field">
          <label>出生地</label>
          <div className="city-picker">
            <select
              className="city-province"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setCityName('');
                setCityQuery('');
                setCityOpen(true);
              }}
            >
              <option value="">全部省份</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className="city-search">
              <input
                value={cityQuery}
                placeholder="输入城市，如 杭州"
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  setCityName('');
                  setCityOpen(true);
                }}
                onFocus={() => setCityOpen(true)}
                onBlur={() => window.setTimeout(() => setCityOpen(false), 120)}
              />
              {showCityList && (
                <div className="city-pop">
                  {cityMatches.length === 0 && <div className="city-empty">没有匹配的城市</div>}
                  {cityMatches.map((c) => (
                    <button
                      key={c.province + c.name}
                      type="button"
                      className="city-option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCity(c)}
                    >
                      <b>{c.name}</b>
                      <span>{c.province === c.name ? '直辖市' : c.province} · 东经 {c.longitude}°</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>经度（可手动修正）</label>
            <input
              type="number"
              step="0.01"
              value={longitude}
              onChange={(e) => {
                setLongitude(Number(e.target.value));
                setCityName('');
              }}
            />
            <p className="hint" style={{ marginTop: 4 }}>
              {cityName
                ? `已选：${province === cityName ? cityName : `${province} · ${cityName}`}（东经 ${longitude}°）`
                : `当前经度 ${longitude}°，可直接输入城市名搜索`}
            </p>
          </div>
        </div>
      )}

      <div className="hint">
        推算为 <b>{timeInfo.label || '—'}</b>
        {timeInfo.tsText && <> · {timeInfo.tsText}</>}
      </div>

      <div className="user-actions">
        <button className="btn" onClick={submit}>排盘</button>
        <button className="btn ghost" onClick={save}>保存命盘</button>
        <button className="btn ghost" onClick={onNew}>新建</button>
      </div>
      {saveMsg && <p className="hint" style={{ color: 'var(--ok)' }}>{saveMsg}</p>}

      <details className="user-more">
        <summary>更多操作（安星码 / 数据）</summary>
        <div className="stack-sm">
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={codeInput} placeholder="粘贴安星码" onChange={(e) => setCodeInput(e.target.value)} />
            <button className="btn ghost small" onClick={importCode}>导入</button>
          </div>
          <button className="btn ghost small" onClick={copyCode}>复制当前安星码</button>
          {codeMsg && <p className="hint">{codeMsg}</p>}
          <button className="btn ghost small" onClick={onExportStars}>导出星曜库 JSON</button>
          <p className="hint" style={{ margin: 0 }}>
            星曜库 {PROFILE_STATS.total} 颗（完整 {PROFILE_STATS.full}）＋ 运限派生 {FLOW_PROFILES.length}
          </p>
        </div>
      </details>


    </div>
  );
}
