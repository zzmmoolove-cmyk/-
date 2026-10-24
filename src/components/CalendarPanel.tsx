import { useMemo, useState } from 'react';
import { solarToCalendar } from '../lib/calendar';

export default function CalendarPanel() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const info = useMemo(() => {
    try {
      return solarToCalendar(date);
    } catch {
      return null;
    }
  }, [date]);

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>万年历</h2>
      <div className="field">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {info && (
        <div className="calendar-info">
          <div className="cal-line"><span className="dim">公历</span><b>{info.solar}</b></div>
          <div className="cal-line"><span className="dim">农历</span><b>{info.lunar}</b></div>
          <div className="cal-line"><span className="dim">干支</span><b>{info.yearGanZhi}年 {info.monthGanZhi}月 {info.dayGanZhi}日</b></div>
          <div className="cal-line"><span className="dim">生肖</span><b>{info.shengxiao}</b></div>
          <div className="cal-line"><span className="dim">八字</span><b>{info.eightChar}</b></div>
          {info.prevJieQi && <div className="cal-line"><span className="dim">上一节气</span><b>{info.prevJieQi}</b></div>}
          {info.nextJieQi && <div className="cal-line"><span className="dim">下一节气</span><b>{info.nextJieQi}</b></div>}
          <div className="cal-line"><span className="dim">宜</span><span>{info.dayYi.join('、') || '—'}</span></div>
          <div className="cal-line"><span className="dim">忌</span><span>{info.dayJi.join('、') || '—'}</span></div>
        </div>
      )}
    </div>
  );
}
