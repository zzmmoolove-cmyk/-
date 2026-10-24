import type { ChartOptions } from '../types';

export default function SettingsPanel({
  options,
  onChange,
}: {
  options: ChartOptions;
  onChange: (o: ChartOptions) => void;
}) {
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>排盘设置（流派）</h2>

      <div className="field">
        <label>安星算法</label>
        <select
          value={options.algorithm}
          onChange={(e) => onChange({ ...options, algorithm: e.target.value as ChartOptions['algorithm'] })}
        >
          <option value="default">三合（默认）</option>
          <option value="zhongzhou">中州派</option>
        </select>
      </div>

      <div className="row">
        <div className="field">
          <label>年份分界</label>
          <select
            value={options.yearDivide}
            onChange={(e) => onChange({ ...options, yearDivide: e.target.value as ChartOptions['yearDivide'] })}
          >
            <option value="normal">立春分界</option>
            <option value="exact">精确分界</option>
          </select>
        </div>
        <div className="field">
          <label>大限分界</label>
          <select
            value={options.horoscopeDivide}
            onChange={(e) => onChange({ ...options, horoscopeDivide: e.target.value as ChartOptions['horoscopeDivide'] })}
          >
            <option value="normal">常规</option>
            <option value="exact">精确</option>
          </select>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>岁数分界</label>
          <select
            value={options.ageDivide}
            onChange={(e) => onChange({ ...options, ageDivide: e.target.value as ChartOptions['ageDivide'] })}
          >
            <option value="normal">虚岁</option>
            <option value="birthday">周岁（生日分界）</option>
          </select>
        </div>
        <div className="field">
          <label>流日分界</label>
          <select
            value={options.dayDivide}
            onChange={(e) => onChange({ ...options, dayDivide: e.target.value as ChartOptions['dayDivide'] })}
          >
            <option value="current">当日</option>
            <option value="forward">次日</option>
          </select>
        </div>
      </div>

      <p className="hint">
        中州派算法为 iztro 内置；四化/庙旺流派表可后续按权威资料扩充。
      </p>
    </div>
  );
}
