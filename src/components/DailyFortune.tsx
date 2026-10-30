import { useMemo, useState } from 'react';
import type { ChartOptions, UserRecord } from '../types';
import { solarToCalendar } from '../lib/calendar';
import { computeDailyFortune } from '../lib/daily';
import { buildBaziProfile, baziDaily } from '../lib/bazi';
import { buildAstroPerson, astroDaily, sunSignOfDate } from '../lib/astroSynastry';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DailyFortune({
  user,
  options,
  onOpenClient,
}: {
  user: UserRecord | null;
  options: ChartOptions;
  onOpenClient: (id: string) => void;
}) {
  const [date, setDate] = useState(todayIso);
  const cal = useMemo(() => {
    try {
      return solarToCalendar(date);
    } catch {
      return null;
    }
  }, [date]);
  const fortune = useMemo(() => (user ? computeDailyFortune(user, date, options) : null), [user, date, options]);

  const baziProfile = useMemo(() => {
    if (!user) return null;
    try {
      return buildBaziProfile(user.payload, user.name, user.payload.gender);
    } catch {
      return null;
    }
  }, [user]);

  const baziDay = useMemo(() => (baziProfile ? baziDaily(baziProfile, date) : null), [baziProfile, date]);

  const astroPerson = useMemo(() => {
    if (!user) return null;
    try {
      return buildAstroPerson({
        name: user.name,
        date: user.payload.birthday,
        time: user.payload.clockTime || '12:00',
        longitude: user.payload.longitude,
        latitude: user.payload.latitude ?? 30,
        useTrueSolar: user.payload.useTrueSolar,
        sign: sunSignOfDate(user.payload.birthday).sign,
      });
    } catch {
      return null;
    }
  }, [user]);

  const astroDay = useMemo(
    () => (user && astroPerson ? astroDaily({
      name: user.name,
      date: user.payload.birthday,
      time: user.payload.clockTime || '12:00',
      longitude: user.payload.longitude,
      latitude: user.payload.latitude ?? 30,
      useTrueSolar: user.payload.useTrueSolar,
      sign: sunSignOfDate(user.payload.birthday).sign,
    }, date) : null),
    [user, astroPerson, date],
  );

  return (
    <section className="daily-section">
      <div className="daily-head">
        <div>
          <div className="today-section-title" style={{ marginBottom: 3 }}>三系统今日 · 万年历</div>
          <p>紫微流日 + 八字日柱 + 星座过境，同一日期交叉看；只做当天提醒，不预测市场或长期吉凶。</p>
        </div>
        <input type="date" className="daily-date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="daily-grid">
        <div className="daily-calendar">
          {cal ? (
            <>
              <div className="daily-cal-top">
                <b>{cal.solar}</b>
                <span>{cal.lunar}</span>
              </div>
              <div className="daily-cal-rows">
                <div><span>干支</span><b>{cal.yearGanZhi}年 {cal.monthGanZhi}月 {cal.dayGanZhi}日</b></div>
                <div><span>生肖</span><b>{cal.shengxiao}</b></div>
                <div><span>八字</span><b>{cal.eightChar}</b></div>
                <div><span>节气</span><b>{cal.prevJieQi || '—'} → {cal.nextJieQi || '—'}</b></div>
                <div><span>冲煞</span><b>冲{cal.dayChong} · 煞{cal.daySha}</b></div>
              </div>
              <div className="daily-yiji">
                <p><em className="yi">宜</em>{cal.dayYi.slice(0, 8).join('、') || '—'}</p>
                <p><em className="ji">忌</em>{cal.dayJi.slice(0, 8).join('、') || '—'}</p>
              </div>
            </>
          ) : (
            <p className="dim">日期无效。</p>
          )}
        </div>

        <div className="daily-fortune">
          {!user ? (
            <div className="daily-fortune-empty">
              <div className="inspector-eyebrow">流日运势</div>
              <h3>先选主命主</h3>
              <p className="dim">选择一位命主作为主命主后，这里按他的本命盘计算流日命宫、流日四化与当天建议。</p>
            </div>
          ) : !fortune ? (
            <div className="daily-fortune-empty">
              <div className="inspector-eyebrow">流日运势</div>
              <h3>这张盘还算不了</h3>
              <p className="dim">请检查「{user.name}」的出生日期、时间与历法；补全后再回来。</p>
              <button className="btn ghost small" onClick={() => onOpenClient(user.id)}>打开命主解盘</button>
            </div>
          ) : (
            <>
              <div className="daily-fortune-head">
                <div>
                  <div className="inspector-eyebrow">主命主 · {user.name}</div>
                  <h3>流日运势 <span className={`daily-level ${fortune.level === '顺' ? 'good' : fortune.level === '慎' ? 'careful' : 'flat'}`}>{fortune.level}</span></h3>
                </div>
                <button className="text-btn" onClick={() => onOpenClient(user.id)}>打开解盘 →</button>
              </div>

              <p className="daily-theme">{fortune.theme}</p>

              <div className="daily-mutagens">
                {fortune.mutagens.length ? fortune.mutagens.map((m) => (
                  <span key={m.star + m.mutagen} className={`hw hua-${m.mutagen}`}>
                    {m.star}化{m.mutagen}{m.landing ? ` · ${m.landing}` : ''}
                  </span>
                )) : <span className="dim">流日四化未取到</span>}
              </div>

              <div className="daily-advice">
                <div className="sub-title">今天怎么做</div>
                <ul className="notes">
                  {cal && (
                    <li>
                      黄历：宜「{cal.dayYi.slice(0, 5).join('、') || '—'}」，忌「{cal.dayJi.slice(0, 5).join('、') || '—'}」；
                      {fortune.level === '顺'
                        ? '可把要推进的事放在宜项里，忌项仍避开。'
                        : fortune.level === '慎'
                          ? '即使黄历有宜，也建议减量，先守作息与情绪。'
                          : '按黄历宜忌安排，重要决定另择日。'}
                    </li>
                  )}
                  {fortune.advice.map((a) => <li key={a}>{a}</li>)}
                  <li>流日只做当天提醒；需要定长期方向，回到本命/大限/流年看。</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {user && fortune && baziDay && astroDay && baziProfile && (
        <div className="daily-three-grid">
          <article className="daily-three-card ziwei">
            <div className="daily-three-label">紫微</div>
            <b>{fortune.level} · 流日命宫{fortune.scopePalace}</b>
            <p>{fortune.advice[0] ?? '按自己的节奏走。'}</p>
            <em>{fortune.theme}</em>
          </article>
          <article className="daily-three-card bazi">
            <div className="daily-three-label">八字</div>
            <b>{baziDay.dayPillar} · {baziDay.tenGod}</b>
            <p>{baziDay.advice}</p>
            <em>{baziProfile.strength} · 用神初判 {baziProfile.usefulGods.join('、') || '—'} · {baziDay.relation}</em>
          </article>
          <article className="daily-three-card astro">
            <div className="daily-three-label">星座</div>
            <b>太阳入{astroDay.transitSun.sign} · {astroDay.aspect.label}</b>
            <p>{astroDay.advice[0]}</p>
            <em>本命太阳{astroDay.natalSun.sign} / 上升{astroDay.natalRising.sign}（近似）</em>
          </article>
        </div>
      )}
    </section>
  );
}
