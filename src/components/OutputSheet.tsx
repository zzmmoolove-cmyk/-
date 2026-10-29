import type { ChartOptions } from '../types';
import { DEFAULT_OUTPUT, REFERENCE_META, SECTION_META, type OutputProfile, type OutputSections } from '../lib/output';

export default function OutputSheet({
  open,
  profile,
  onChange,
  onClose,
  onExport,
  hasChart,
  algorithm,
  onAlgorithmChange,
}: {
  open: boolean;
  profile: OutputProfile;
  onChange: (p: OutputProfile) => void;
  onClose: () => void;
  onExport: () => void;
  hasChart: boolean;
  algorithm: ChartOptions['algorithm'];
  onAlgorithmChange: (a: ChartOptions['algorithm']) => void;
}) {
  if (!open) return null;

  const toggleSection = (key: keyof OutputSections) => {
    onChange({ ...profile, sections: { ...profile.sections, [key]: !profile.sections[key] } });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="output-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="output-head">
          <div>
            <div className="inspector-eyebrow">输出设置</div>
            <h2>这次导出什么</h2>
            <p>勾选会同时影响页面展示和 PDF；设置会记住，下次不用再选。</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="output-body">
          <div className="output-section-label">内容章节</div>
          <div className="output-grid">
            {SECTION_META.map((s) => (
              <label key={s.key} className={`output-option ${profile.sections[s.key] ? 'checked' : ''}`}>
                <input type="checkbox" checked={profile.sections[s.key]} onChange={() => toggleSection(s.key)} />
                <span>
                  <b>{s.label}</b>
                  <em>{s.hint}</em>
                </span>
              </label>
            ))}
          </div>

          <div className="output-section-label">参考书目标注</div>
          <div className="output-refs">
            {REFERENCE_META.map((r) => (
              <label key={r.key} className="output-ref">
                <input
                  type="checkbox"
                  checked={profile.references[r.key]}
                  onChange={() => onChange({ ...profile, references: { ...profile.references, [r.key]: !profile.references[r.key] } })}
                />
                {r.label}
              </label>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 4 }}>书籍目前只做引文标注，不改变排盘口径；不同版本的庙旺/四化表仍需按流派数据接入。</p>

          <div className="output-section-label">排盘流派</div>
          <div className="output-school">
            <button className={algorithm === 'default' ? 'active' : ''} onClick={() => onAlgorithmChange('default')}>三合（全书）</button>
            <button className={algorithm === 'zhongzhou' ? 'active' : ''} onClick={() => onAlgorithmChange('zhongzhou')}>中州派</button>
            <span>切换会重排当前盘；不同流派表仍在补齐。</span>
          </div>
        </div>

        <div className="output-actions">
          <button className="btn ghost" onClick={() => onChange(DEFAULT_OUTPUT)}>恢复默认</button>
          <span className="output-actions-spacer" />
          <button className="btn ghost" onClick={onClose}>取消</button>
          <button className="btn" onClick={onExport} disabled={!hasChart}>导出 PDF</button>
        </div>
      </div>
    </div>
  );
}
