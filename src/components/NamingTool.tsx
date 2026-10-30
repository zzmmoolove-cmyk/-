import { useEffect, useState } from 'react';
import type { Astrolabe, ServiceDraft } from '../types';
import { generateNames, type NamingResult, type NamingStyle } from '../lib/naming';

const STYLES: NamingStyle[] = ['文雅', '清朗', '大气', '温润'];

function namingDetail(result: NamingResult, userLabel: string | undefined, chineseDate: string): string {
  return [
    `【起名参考】${userLabel ? `${userLabel} · ` : ''}${chineseDate}`,
    `五行粗算：${result.balance.label}｜日主：${result.balance.dayMaster || '—'} ${result.balance.dayMasterElement ?? ''}`,
    `建议补：${result.balance.need.join('、') || '—'}｜偏旺：${result.balance.avoid.join('、') || '—'}`,
    '',
    ...result.candidates.map(
      (c) => `${c.full}（${c.pinyin}）｜${c.elements.join('·')}｜${c.strokes.join('+')}画｜${c.score}分\n${c.meanings.join('；')}\n${c.reasons.join(' · ')}`,
    ),
    '',
    result.note,
  ].join('\n');
}

export default function NamingTool({
  astrolabe,
  userLabel,
  defaultSurname,
  onSaveService,
}: {
  astrolabe: Astrolabe | null;
  userLabel?: string;
  defaultSurname?: string;
  onSaveService?: (draft: ServiceDraft) => void;
}) {
  const [surname, setSurname] = useState(defaultSurname ?? '');
  const [single, setSingle] = useState(false);
  const [style, setStyle] = useState<NamingStyle>('文雅');
  const [forbidden, setForbidden] = useState('');
  const [result, setResult] = useState<NamingResult | null>(null);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setResult(null);
    setSeed(0);
    if (defaultSurname) setSurname(defaultSurname);
  }, [astrolabe?.chineseDate, defaultSurname]);

  if (!astrolabe) {
    return (
      <div className="tool-empty">
        <div className="empty-sigil" aria-hidden="true">
          <span className="empty-sigil-ring" />
          <span className="empty-sigil-star">✦</span>
        </div>
        <p className="empty-kicker">先起一张盘</p>
        <p className="dim">起名要参考四柱五行。先在左侧排盘或选择一个已保存用户。</p>
      </div>
    );
  }

  const run = (nextSeed = seed) => {
    if (!surname.trim()) {
      setError('请先填写姓氏');
      return;
    }
    setError('');
    const r = generateNames({
      surname,
      chineseDate: astrolabe.chineseDate,
      gender: astrolabe.gender === '女' ? '女' : '男',
      style,
      singleChar: single,
      forbidden,
      seed: nextSeed,
      count: 5,
    });
    setResult(r);
  };

  const copyAll = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(namingDetail(result, userLabel, astrolabe.chineseDate));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="tool-pane">
      <div className="tool-intro">
        <h3>起名参考</h3>
        <p>按四柱五行粗算「缺什么/多什么」，从字库里挑字、配声调与笔画，给出 5 个候选和理由。明确交付：可直接拿去用的名字清单。</p>
      </div>

      <div className="tool-form">
        <div className="field">
          <label>姓氏</label>
          <input value={surname} placeholder="如 张" onChange={(e) => setSurname(e.target.value)} />
        </div>
        <div className="field">
          <label>字数</label>
          <select value={single ? '1' : '2'} onChange={(e) => setSingle(e.target.value === '1')}>
            <option value="2">双字名</option>
            <option value="1">单字名</option>
          </select>
        </div>
        <div className="field">
          <label>风格</label>
          <select value={style} onChange={(e) => setStyle(e.target.value as NamingStyle)}>
            {STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>避讳字</label>
          <input value={forbidden} placeholder="家中长辈名讳，可留空" onChange={(e) => setForbidden(e.target.value)} />
        </div>
      </div>

      {error && <p className="field-error" style={{ marginBottom: 4 }}>{error}</p>}
      <div className="tool-actions">
        <button className="btn" onClick={() => run(0)}>生成名字</button>
        {result && (
          <>
            <button className="btn ghost" onClick={() => { const s = seed + 1; setSeed(s); run(s); }}>换一批</button>
            <button className="btn ghost" onClick={copyAll}>{copied ? '✓ 已复制' : '复制全部'}</button>
            <button
              className="btn ghost"
              onClick={() => {
                if (!result) return;
                onSaveService?.({
                  type: 'naming',
                  title: `${userLabel || '客户'} · 起名`,
                  summary: `候选：${result.candidates.map((c) => c.full).join('、')}`,
                  detail: namingDetail(result, userLabel, astrolabe.chineseDate),
                });
              }}
            >
              保存为服务记录
            </button>
          </>
        )}
      </div>

      {result && (
        <div className="naming-result">
          <div className="tool-balance">
            <span><em>四柱</em>{astrolabe.chineseDate}</span>
            <span><em>五行</em>{result.balance.label}</span>
            <span><em>日主</em>{result.balance.dayMaster || '—'} {result.balance.dayMasterElement ?? ''}</span>
            <span><em>建议补</em>{result.balance.need.join('、') || '—'}</span>
            {result.balance.avoid.length > 0 && <span><em>偏旺</em>{result.balance.avoid.join('、')}</span>}
          </div>

          <div className="name-list">
            {result.candidates.map((c) => (
              <article key={c.full} className="name-card">
                <div className="name-card-head">
                  <div>
                    <b>{c.full}</b>
                    <span>{c.pinyin}</span>
                  </div>
                  <em>{c.score}</em>
                </div>
                <div className="name-tags">
                  {c.elements.map((el, i) => <span key={el + i}>{el}</span>)}
                  <span>{c.strokes.join(' + ')} 画</span>
                  <span>{c.tones.join(' · ')} 声</span>
                </div>
                <p>{c.meanings.join('；')}</p>
                <p className="name-reasons">{c.reasons.join(' · ')}</p>
              </article>
            ))}
          </div>

          <p className="tool-note">{result.note}</p>
        </div>
      )}
    </div>
  );
}
