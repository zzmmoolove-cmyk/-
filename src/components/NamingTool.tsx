import { useEffect, useMemo, useState } from 'react';
import type { Astrolabe, ChartOptions, ServiceDraft } from '../types';
import { analyzeNameDate, type TimeSlot } from '../lib/nameDate';
import { generateNames, type NamingResult, type NamingStyle } from '../lib/naming';
import { quotesForStars } from '../lib/classics';

const STYLES: NamingStyle[] = ['文雅', '清朗', '大气', '温润'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateFromSolar(solarDate?: string): string | null {
  const m = solarDate?.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
}

function namingDetail(
  result: NamingResult,
  userLabel: string | undefined,
  chineseDate: string,
  slotLabel: string,
  classicLines: string[],
): string {
  return [
    `【起名参考】${userLabel ? `${userLabel} · ` : ''}${slotLabel} · ${chineseDate}`,
    `五行粗算：${result.balance.label}｜日主：${result.balance.dayMaster || '—'} ${result.balance.dayMasterElement ?? ''}`,
    `建议补：${result.balance.need.join('、') || '—'}｜偏旺：${result.balance.avoid.join('、') || '—'}`,
    '',
    ...result.candidates.map(
      (c) => `${c.full}（${c.pinyin}）｜${c.elements.join('·')}｜${c.strokes.join('+')}画｜${c.score}分\n${c.meanings.join('；')}\n${c.reasons.join(' · ')}`,
    ),
    '',
    result.note,
    ...(classicLines.length ? ['', '【命盘古籍摘录（整理本，仅作气质参考）】', ...classicLines] : []),
  ].join('\n');
}

export default function NamingTool({
  astrolabe,
  userLabel,
  defaultSurname,
  options,
  onSaveService,
}: {
  astrolabe: Astrolabe | null;
  userLabel?: string;
  defaultSurname?: string;
  options: ChartOptions;
  onSaveService?: (draft: ServiceDraft) => void;
}) {
  const [surname, setSurname] = useState(defaultSurname ?? '');
  const [single, setSingle] = useState(false);
  const [style, setStyle] = useState<NamingStyle>('文雅');
  const [forbidden, setForbidden] = useState('');
  const [birthday, setBirthday] = useState(dateFromSolar(astrolabe?.solarDate) ?? todayIso);
  const [gender, setGender] = useState<'男' | '女'>(astrolabe?.gender === '女' ? '女' : '男');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [best, setBest] = useState<TimeSlot | null>(null);
  const [selected, setSelected] = useState<TimeSlot | null>(null);
  const [result, setResult] = useState<NamingResult | null>(null);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultSurname) setSurname(defaultSurname);
  }, [defaultSurname]);

  useEffect(() => {
    const d = dateFromSolar(astrolabe?.solarDate);
    if (d) setBirthday(d);
    if (astrolabe) setGender(astrolabe.gender === '女' ? '女' : '男');
  }, [astrolabe?.solarDate, astrolabe?.gender]);

  useEffect(() => {
    setSlots([]);
    setBest(null);
    setSelected(null);
    setResult(null);
    setError('');
  }, [birthday, gender]);

  const classicQuotes = useMemo(() => {
    if (!selected) return [];
    const ming = selected.astrolabe.palaces.find((p) => p.name === '命宫');
    const stars = ming
      ? [...ming.majorStars, ...ming.minorStars, ...ming.adjectiveStars].map((s) => s.name)
      : [];
    return quotesForStars(stars, 3);
  }, [selected]);

  const analyze = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      setError('请先选择出生日期');
      return;
    }
    setError('');
    const { slots: nextSlots, best: nextBest } = analyzeNameDate(birthday, gender, options);
    if (!nextSlots.length) {
      setError('这一天排不出盘，请检查日期');
      return;
    }
    setSlots(nextSlots);
    setBest(nextBest);
    setSelected(nextBest);
    setResult(null);
  };

  const chooseSlot = (slot: TimeSlot) => {
    setSelected(slot);
    setResult(null);
    setSeed(0);
    setError('');
  };

  const run = (nextSeed = seed) => {
    if (!surname.trim()) {
      setError('请先填写姓氏');
      return;
    }
    if (!selected) {
      setError('先分析 12 时辰，并选择一个时辰');
      return;
    }
    setError('');
    const r = generateNames({
      surname,
      chineseDate: selected.astrolabe.chineseDate,
      gender: selected.astrolabe.gender === '女' ? '女' : '男',
      style,
      singleChar: single,
      forbidden,
      seed: nextSeed,
      count: 5,
    });
    setResult(r);
  };

  const detailText = () => {
    if (!result || !selected) return '';
    return namingDetail(
      result,
      userLabel,
      selected.astrolabe.chineseDate,
      `${birthday} ${selected.name} ${selected.clock}`,
      classicQuotes.map((q) => `${q.bookTitle} · ${q.chapterTitle}：${q.text}`),
    );
  };

  const copyAll = async () => {
    const text = detailText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
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
        <p>先选出生日，比较当天 12 个时辰的命盘结构，选出更稳的时辰；再按该时辰四柱五行挑字、配声调与笔画。</p>
      </div>

      <section className="naming-time-section">
        <div className="tool-subhead">
          <h4>一、择日 · 12 时辰</h4>
          <span>先看结构，再定用字</span>
        </div>
        <div className="tool-form naming-time-form">
          <div className="field">
            <label>出生日期</label>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </div>
          <div className="field">
            <label>性别</label>
            <select value={gender} onChange={(e) => setGender(e.target.value as '男' | '女')}>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div className="field naming-analyze-field">
            <label>&nbsp;</label>
            <button className="btn" onClick={analyze}>分析 12 时辰</button>
          </div>
        </div>
        <p className="tool-note" style={{ marginTop: 2 }}>
          结构分只比较同一天的时辰，不是命运优劣；出生时间请以医疗与家庭决定为准。子时按 00:00 早子示例，统一北京时间，未做真太阳时校正。
        </p>

        {slots.length > 0 && (
          <>
            <div className="time-slot-grid">
              {slots.map((slot) => (
                <button
                  key={slot.index}
                  className={`time-slot ${selected?.index === slot.index ? 'active' : ''} ${best?.index === slot.index ? 'best' : ''}`}
                  onClick={() => chooseSlot(slot)}
                >
                  <div className="time-slot-head">
                    <b>{slot.name}</b>
                    <em>{slot.range}</em>
                    {best?.index === slot.index && <span className="slot-best">推荐</span>}
                  </div>
                  <div className="time-slot-score">
                    {slot.score}<span>{slot.grade}</span>
                  </div>
                  <p>{slot.reasons[0]}</p>
                  <em className="time-slot-balance">{slot.balance.label}</em>
                </button>
              ))}
            </div>
            {selected && (
              <div className="selected-slot">
                已选 <b>{selected.name} {selected.clock}</b>
                <span>{selected.astrolabe.chineseDate}</span>
                <span>五行 {selected.balance.label}</span>
                <em>再往下的名字按这个时辰计算</em>
              </div>
            )}
          </>
        )}
      </section>

      <section className="naming-form-section">
        <div className="tool-subhead">
          <h4>二、按此时辰起名</h4>
          <span>{selected ? `${selected.name} · ${selected.clock}` : '先分析时辰'}</span>
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
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
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
                  if (!result || !selected) return;
                  onSaveService?.({
                    type: 'naming',
                    title: `${userLabel || '择日'} · 起名 · ${birthday}`,
                    summary: `候选：${result.candidates.map((c) => c.full).join('、')} · ${selected.name}`,
                    detail: detailText(),
                  });
                }}
              >
                保存为服务记录
              </button>
            </>
          )}
        </div>

        {result && selected && (
          <div className="naming-result">
            <div className="tool-balance">
              <span><em>日期</em>{birthday}</span>
              <span><em>时辰</em>{selected.name} {selected.clock}</span>
              <span><em>四柱</em>{selected.astrolabe.chineseDate}</span>
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

            <div className="naming-classics">
              <div className="sub-title">
                命盘古籍摘录 <span className="dim">整理本，非影印原文；仅作星曜气质参考</span>
              </div>
              {classicQuotes.length ? (
                classicQuotes.map((q) => (
                  <div key={q.paragraphId} className="classic-quote">
                    <div className="classic-hit-source">{q.bookTitle} · {q.chapterTitle}</div>
                    <p>{q.text}</p>
                  </div>
                ))
              ) : (
                <p className="dim">本盘命宫星曜暂未检索到直接段落。</p>
              )}
              <p className="hint">起名的字义、音律、笔画来自字库与规则，不是古籍原文；古籍只用于命宫星曜的气质参考。</p>
            </div>

            <p className="tool-note">{result.note}</p>
          </div>
        )}
      </section>
    </div>
  );
}
