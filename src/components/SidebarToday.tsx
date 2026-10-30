import { useMemo } from 'react';
import type { ChartOptions, UserRecord } from '../types';
import { solarToCalendar } from '../lib/calendar';
import { computeDailyFortune } from '../lib/daily';
import { buildBaziProfile, baziDaily } from '../lib/bazi';
import { buildAstroPerson, astroDaily, sunSignOfDate } from '../lib/astroSynastry';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SidebarToday({
  primary,
  options,
  onOpenToday,
  onOpenMasters,
}: {
  primary: UserRecord | null;
  options: ChartOptions;
  onOpenToday: () => void;
  onOpenMasters: () => void;
}) {
  const date = todayIso();
  const calendar = useMemo(() => {
    try { return solarToCalendar(date); } catch { return null; }
  }, [date]);

  const fortune = useMemo(() => {
    if (!primary) return null;
    try { return computeDailyFortune(primary, date, options); } catch { return null; }
  }, [primary, date, options]);

  const bazi = useMemo(() => {
    if (!primary) return null;
    try { return buildBaziProfile(primary.payload, primary.name, primary.payload.gender); } catch { return null; }
  }, [primary]);
  const baziDay = useMemo(() => (bazi ? baziDaily(bazi, date) : null), [bazi, date]);

  const astro = useMemo(() => {
    if (!primary) return null;
    try {
      return buildAstroPerson({
        name: primary.name,
        date: primary.payload.birthday,
        time: primary.payload.clockTime || '12:00',
        longitude: primary.payload.longitude,
        latitude: primary.payload.latitude ?? 30,
        useTrueSolar: primary.payload.useTrueSolar,
        sign: sunSignOfDate(primary.payload.birthday).sign,
      });
    } catch { return null; }
  }, [primary]);
  const astroDay = useMemo(() => (astro ? astroDaily({
    name: astro.name,
    date: primary?.payload.birthday ?? date,
    time: primary?.payload.clockTime || '12:00',
    longitude: primary?.payload.longitude ?? 116.41,
    latitude: primary?.payload.latitude ?? 30,
    useTrueSolar: primary?.payload.useTrueSolar,
    sign: astro.sun.sign,
  }, date) : null), [astro, primary, date]);

  return (
    <div className="side-section side-today">
      <div className="side-label"><span>今日</span><span className="side-today-dow">{new Date().toLocaleDateString('zh-CN', { weekday: 'short' })}</span></div>
      <div className="side-today-date">
        <b>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</b>
        {calendar && <em>{calendar.lunar} · {calendar.yearGanZhi}年</em>}
      </div>

      {primary ? (
        <>
          <div className="side-today-systems">
            <div className="side-today-row ziwei">
              <div><em>紫微</em><b>{fortune?.level ?? '—'} · {fortune?.scopePalace ?? '—'}</b></div>
              <p>{fortune?.advice[0] ?? '今日流日待算。'}</p>
            </div>
            {baziDay && (
              <div className="side-today-row bazi">
                <div><em>八字</em><b>{baziDay.dayPillar} · {baziDay.tenGod}</b></div>
                <p>{baziDay.advice}</p>
              </div>
            )}
            {astroDay && (
              <div className="side-today-row astro">
                <div><em>星座</em><b>太阳入{astroDay.transitSun.sign} · {astroDay.aspect.label}</b></div>
                <p>{astroDay.advice[0]}</p>
              </div>
            )}
          </div>
          <button className="side-today-more" onClick={onOpenToday}>展开今日 · 万年历 →</button>
        </>
      ) : (
        <button className="side-today-empty" onClick={onOpenMasters}>
          <b>还没有主客户</b>
          <span>去命主页打开开关，主客户下方直接显示今日 →</span>
        </button>
      )}
    </div>
  );
}
