import { useMemo, useState } from 'react';
import type { BirthInput, ChartOptions } from '../types';
import { CITIES, PROVINCES, searchCities, type City } from '../lib/cities';
import { trueSolarTimeMinutes, minutesToTimeIndex, formatMinutes } from '../lib/truesolar';
import { parseDateInput, parseTimeInput } from '../lib/datetime';
import { encodeChart, decodeChart } from '../lib/chartcode';

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
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return 720;
  return h * 60 + (m || 0);
}

export default function BirthForm({
  initial,
  options,
  onGenerate,
  onImport,
}: {
  initial: BirthInput;
  options: ChartOptions;
  onGenerate: (input: BirthInput) => void;
  onImport: (input: BirthInput, options: ChartOptions) => void;
}) {
  const initialCity = useMemo(
    () => CITIES.find((c) => Math.abs(c.longitude - initial.longitude) < 0.05),
    [initial.longitude],
  );

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
    if (!useTrueSolar) {
      const idx = minutesToTimeIndex(clock);
      return { idx, label: TIME_OPTIONS.find((t) => t.value === idx)?.label ?? '', tsText: '' };
    }
    const [y, m, d] = birthday.split('-').map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    const ts = trueSolarTimeMinutes(clock, longitude, date);
    const idx = minutesToTimeIndex(ts);
    return {
      idx,
      label: TIME_OPTIONS.find((t) => t.value === idx)?.label ?? '',
      tsText: `真太阳时 ${formatMinutes(ts)}`,
    };
  }, [clockTime, useTrueSolar, longitude, birthday]);

  const cityMatches = useMemo(
    () => searchCities(cityQuery, province || undefined, 40),
    [cityQuery, province],
  );
  const showCityList = cityOpen && (cityQuery.trim().length > 0 || Boolean(province));

  const commitDate = (): boolean => {
    const r = parseDateInput(birthdayText, birthdayType);
    if (!r.ok) {
      setBirthdayErr(r.error);
      return false;
    }
    setBirthday(r.value);
    setBirthdayText(r.value);
    setBirthdayErr(null);
    return true;
  };

  const commitTime = (): boolean => {
    const r = parseTimeInput(clockText);
    if (!r.ok) {
      setClockErr(r.error);
      return false;
    }
    setClockTime(r.value);
    setClockText(r.value);
    setClockErr(null);
    return true;
  };

  const pickCity = (c: City) => {
    setProvince(c.province);
    setCityName(c.name);
    setCityQuery(c.name);
    setLongitude(c.longitude);
    setCityOpen(false);
  };

  const buildInput = (): BirthInput => ({
    birthday,
    clockTime,
    gender,
    birthdayType,
    isLeapMonth,
    fixLeap,
    useTrueSolar,
    longitude,
  });

  const submit = () => {
    const dateOk = commitDate();
    const timeOk = commitTime();
    if (!dateOk || !timeOk) return;
    const d = parseDateInput(birthdayText, birthdayType);
    const t = parseTimeInput(clockText);
    if (!d.ok || !t.ok) return;
    onGenerate({ ...buildInput(), birthday: d.value, clockTime: t.value });
  };

  const copyCode = async () => {
    try {
      const d = parseDateInput(birthdayText, birthdayType);
      const t = parseTimeInput(clockText);
      const base = buildInput();
      const code = encodeChart({
        ...base,
        birthday: d.ok ? d.value : base.birthday,
        clockTime: t.ok ? t.value : base.clockTime,
        ...options,
      });
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
    <div className="panel">
      <h2>出生信息</h2>

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
          <option value="solar">公历（阳历）</option>
          <option value="lunar">农历（阴历）</option>
        </select>
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
          onBlur={commitDate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDate();
            }
          }}
        />
        {birthdayErr ? (
          <p className="field-error">{birthdayErr}</p>
        ) : (
          <p className="hint" style={{ marginTop: 4 }}>支持 19980527 / 1998-05-27 / 1998年5月27日，离开输入框自动识别</p>
        )}
      </div>

      {birthdayType === 'lunar' && (
        <div className="field">
          <label>
            <input type="checkbox" checked={isLeapMonth} onChange={(e) => setIsLeapMonth(e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />
            是闰月出生
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
          onBlur={commitTime}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitTime();
            }
          }}
        />
        {clockErr ? (
          <p className="field-error">{clockErr}</p>
        ) : (
          <p className="hint" style={{ marginTop: 4 }}>支持 0930 / 9:30 / 9点30 / 下午3点 / 9:30 PM，统一转 24 小时</p>
        )}
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
        推算为 <b>{timeInfo.label}</b>
        {timeInfo.tsText && <> · {timeInfo.tsText}</>}
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
          <label>闰月修正</label>
          <select value={fixLeap ? '1' : '0'} onChange={(e) => setFixLeap(e.target.value === '1')}>
            <option value="1">修正（前15天算上月）</option>
            <option value="0">不修正</option>
          </select>
        </div>
      </div>

      <button className="btn" onClick={submit}>排盘</button>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
        <label>安星码（分享 / 导入排盘）</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={codeInput} placeholder="粘贴安星码" onChange={(e) => setCodeInput(e.target.value)} />
          <button className="btn ghost" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={importCode}>导入</button>
        </div>
        <button className="btn ghost" onClick={copyCode}>复制当前安星码</button>
        {codeMsg && <p className="hint" style={{ color: codeMsg.startsWith('✓') ? 'var(--ok)' : 'var(--warn)' }}>{codeMsg}</p>}
      </div>
    </div>
  );
}
