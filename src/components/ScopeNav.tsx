import { useMemo } from 'react';
import { daysInMonth, type ActiveLayers } from '../lib/scope';

const MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];

export default function ScopeNav({
  decadalOptions,
  yearRange,
  active,
  onActiveChange,
}: {
  decadalOptions: { index: number; label: string }[];
  yearRange: [number, number] | null;
  active: ActiveLayers;
  onActiveChange: (a: ActiveLayers) => void;
}) {
  const years = useMemo(() => {
    if (!yearRange) return [];
    const list: number[] = [];
    for (let y = yearRange[0]; y <= yearRange[1]; y++) list.push(y);
    return list;
  }, [yearRange]);

  const dayCount = useMemo(() => {
    if (active.yearly == null || active.monthly == null) return 0;
    return daysInMonth(active.yearly, active.monthly);
  }, [active.yearly, active.monthly]);

  return (
    <div className="scope-nav">
      <Section title="大限">
        <div className="chip-wrap">
          {decadalOptions.map((d) => (
            <button
              key={d.index}
              className={`chip ${active.decadal === d.index ? 'active' : ''}`}
              onClick={() => onActiveChange({ ...active, decadal: d.index, yearly: null, monthly: null, daily: null })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Section>

      {active.decadal != null && (
        <Section title="流年">
          <div className="chip-wrap">
            {years.map((y) => (
              <button
                key={y}
                className={`chip chip-yearly ${active.yearly === y ? 'active' : ''}`}
                onClick={() => onActiveChange({ ...active, yearly: y, monthly: null, daily: null })}
              >
                {y}
              </button>
            ))}
          </div>
        </Section>
      )}

      {active.yearly != null && (
        <Section title="流月">
          <div className="chip-wrap">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                className={`chip chip-monthly ${active.monthly === i + 1 ? 'active' : ''}`}
                onClick={() => onActiveChange({ ...active, monthly: i + 1, daily: null })}
              >
                {m}
              </button>
            ))}
          </div>
        </Section>
      )}

      {active.monthly != null && (
        <Section title="流日">
          <div className="day-grid">
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
              const dateStr = `${active.yearly}-${String(active.monthly).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isActive = active.daily === dateStr;
              return (
                <button
                  key={day}
                  className={`chip chip-daily ${isActive ? 'active' : ''}`}
                  onClick={() => onActiveChange({ ...active, daily: dateStr })}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {active.decadal == null && (
        <p className="hint">点击上方「大限」开始，逐级选择流年 → 流月 → 流日。</p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="scope-nav-section">
      <div className="scope-nav-title">{title}</div>
      {children}
    </div>
  );
}
