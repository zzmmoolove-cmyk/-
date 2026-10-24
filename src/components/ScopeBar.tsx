import { SCOPE_LABELS, type ScopeKey } from '../lib/scope';

export type ScopeParams = {
  decadalIndex: number;
  targetDate: string;
  targetTime: string;
};

export default function ScopeBar({
  scope,
  onScopeChange,
  params,
  onParamsChange,
  decadalOptions,
}: {
  scope: ScopeKey;
  onScopeChange: (s: ScopeKey) => void;
  params: ScopeParams;
  onParamsChange: (p: ScopeParams) => void;
  decadalOptions: { index: number; label: string }[];
}) {
  const scopes: ScopeKey[] = ['original', 'decadal', 'age', 'yearly', 'monthly', 'daily', 'hourly'];

  return (
    <div className="scope-bar">
      <div className="scope-tabs">
        {scopes.map((s) => (
          <button
            key={s}
            className={`scope-tab ${scope === s ? 'active' : ''}`}
            onClick={() => onScopeChange(s)}
          >
            {SCOPE_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="scope-controls">
        {scope === 'decadal' && (
          <select
            value={params.decadalIndex}
            onChange={(e) => onParamsChange({ ...params, decadalIndex: Number(e.target.value) })}
          >
            {decadalOptions.map((d) => (
              <option key={d.index} value={d.index}>
                第{d.index + 1}限 · {d.label}
              </option>
            ))}
          </select>
        )}

        {scope !== 'original' && scope !== 'decadal' && (
          <>
            <input
              type="date"
              value={params.targetDate}
              onChange={(e) => onParamsChange({ ...params, targetDate: e.target.value })}
            />
            <input
              type="time"
              value={params.targetTime}
              onChange={(e) => onParamsChange({ ...params, targetTime: e.target.value })}
            />
          </>
        )}
      </div>
    </div>
  );
}
