import { useState } from 'react';
import type { BirthInput, Relation, UserProfile } from '../types';

const RELATIONS: Relation[] = ['客户', '配偶', '朋友', '同事', '本人', '其他'];

export default function QuickClientSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: BirthInput, profile: UserProfile) => void;
}) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState<Relation>('客户');
  const [gender, setGender] = useState<'男' | '女'>('女');
  const [birthday, setBirthday] = useState('');
  const [clockTime, setClockTime] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) { setError('请填写姓名'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) { setError('请选择出生日期'); return; }
    if (!/^\d{2}:\d{2}$/.test(clockTime)) { setError('请选择出生时间'); return; }
    setError('');
    onSave(
      {
        birthday,
        clockTime,
        gender,
        birthdayType: 'solar',
        isLeapMonth: false,
        fixLeap: true,
        useTrueSolar: false,
        longitude: 116.41,
        latitude: 39.91,
      },
      { name: name.trim(), relation, note: '' },
    );
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="quick-client" onClick={(e) => e.stopPropagation()}>
        <div className="quick-client-head">
          <div>
            <div className="inspector-eyebrow">合盘 · 新建 B</div>
            <h2>先有 B 盘，才能合盘</h2>
            <p>只创建客户档案，不会切换或覆盖当前 A 盘。农历、真太阳时可保存后在客户档案里补。</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="quick-client-body">
          <div className="quick-row two">
            <div className="field"><label>姓名</label><input autoFocus value={name} placeholder="如 李四" onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>关系</label><select value={relation} onChange={(e) => setRelation(e.target.value as Relation)}>{RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
          </div>
          <div className="quick-row two">
            <div className="field"><label>性别</label><select value={gender} onChange={(e) => setGender(e.target.value as '男' | '女')}><option value="女">女</option><option value="男">男</option></select></div>
            <div className="field"><label>出生日期（公历）</label><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} /></div>
          </div>
          <div className="quick-row two">
            <div className="field"><label>出生时间</label><input type="time" value={clockTime} onChange={(e) => setClockTime(e.target.value)} /></div>
            <div className="field"><label>时区</label><div className="quick-fixed">北京时间</div></div>
          </div>
          {error && <p className="field-error">{error}</p>}
          <p className="hint">详细校正：保存后到「客户档案 → 编辑资料」改农历、真太阳时与城市。</p>
        </div>
        <div className="quick-client-actions">
          <button className="btn" onClick={submit}>保存 B 并用于合盘</button>
          <button className="btn ghost" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
