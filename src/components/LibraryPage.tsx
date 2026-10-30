import { useMemo, useState } from 'react';
import { FLOW_PROFILES, PROFILE_STATS, STAR_PROFILES } from '../lib/knowledge/starProfiles';
import ClassicsBrowser from './ClassicsBrowser';
import { quotesForStar } from '../lib/classics';

type LibraryTab = 'manual' | 'classics';

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'manual', label: '星曜手册' },
  { key: 'classics', label: '古籍' },
];

export default function LibraryPage({ onOpenData }: { onOpenData: () => void }) {
  const [tab, setTab] = useState<LibraryTab>('manual');
  const stars = useMemo(() => Object.values(STAR_PROFILES), []);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(stars[0]?.name ?? '');
  const [classicQuery, setClassicQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? stars.filter((s) => `${s.name}${s.keywords.join('')}${s.essence}`.includes(q)) : stars;
  }, [stars, query]);
  const profile = STAR_PROFILES[selected] ?? filtered[0];
  const classicQuotes = useMemo(() => (profile ? quotesForStar(profile.name, 2) : []), [profile?.name]);

  return (
    <div className="library-page">
      <div className="page-head">
        <div>
          <h2>资料</h2>
          <p className="dim">星曜手册与古籍。万年历已移到「今日」；数据在右上角；排盘与 AI 设置收进站点右上角「设置」。</p>
        </div>
        <div className="library-head-actions">
          <button className="btn ghost small" onClick={onOpenData}>数据</button>
        </div>
      </div>

      <div className="library-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tool-nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <b>{t.label}</b>
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div className="manual-page">
          <div className="manual-list">
            <input value={query} placeholder="搜索星曜 / 关键词" onChange={(e) => setQuery(e.target.value)} />
            <div className="manual-stars">
              {filtered.map((s) => (
                <button
                  key={s.name}
                  className={`manual-star ${profile?.name === s.name ? 'active' : ''}`}
                  onClick={() => setSelected(s.name)}
                >
                  <span>{s.name}</span>
                  <em>{s.category}</em>
                </button>
              ))}
            </div>
          </div>
          <div className="manual-detail">
            {profile ? (
              <>
                <div className="manual-title">
                  <h3>{profile.name}</h3>
                  <span>{profile.wuxing} · {profile.category} · {profile.grade}级</span>
                </div>
                <p className="essence">{profile.essence}</p>
                <div className="kw-row">{profile.keywords.map((k) => <span key={k} className="kw">{k}</span>)}</div>
                {profile.positive?.length ? <><div className="sub-title ok">正面</div><ul className="notes">{profile.positive.map((x) => <li key={x}>{x}</li>)}</ul></> : null}
                {profile.negative?.length ? <><div className="sub-title danger">风险</div><ul className="notes">{profile.negative.map((x) => <li key={x}>{x}</li>)}</ul></> : null}
                <p className="hint">资料库 {PROFILE_STATS.total} 颗（完整 {PROFILE_STATS.full}）＋ 运限派生 {FLOW_PROFILES.length}。来源：{profile.source || '自建知识库'}。</p>

                {classicQuotes.length > 0 && (
                  <div className="classic-quotes">
                    <div className="sub-title">古籍摘录 <span className="dim">整理本，非影印原文</span></div>
                    {classicQuotes.map((q) => (
                      <div key={q.paragraphId} className="classic-quote">
                        <div className="classic-hit-source">{q.bookTitle} · {q.chapterTitle}</div>
                        <p>{q.text}</p>
                      </div>
                    ))}
                    <button className="btn ghost small" onClick={() => { setClassicQuery(profile.name); setTab('classics'); }}>
                      在古籍中检索「{profile.name}」→
                    </button>
                  </div>
                )}
              </>
            ) : <p className="dim">没有匹配星曜。</p>}
          </div>
        </div>
      )}

      {tab === 'classics' && <div className="library-body"><ClassicsBrowser key={classicQuery} initialQuery={classicQuery} /></div>}
    </div>
  );
}
