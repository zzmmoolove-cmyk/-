import { useMemo, useState } from 'react';
import { ALL_BOOKS, searchClassics } from '../lib/classics';

export default function ClassicsBrowser({ initialQuery = '' }: { initialQuery?: string }) {
  const [slug, setSlug] = useState(ALL_BOOKS[0]?.slug ?? '');
  const [query, setQuery] = useState(initialQuery);
  const hits = useMemo(() => searchClassics(query, 80), [query]);
  const book = ALL_BOOKS.find((b) => b.slug === slug) ?? ALL_BOOKS[0];

  return (
    <div className="classics-page">
      <div className="classics-notice">
        <b>整理本，非影印原文。</b>
        来源：Renhuai123/ziwei-doushu 的 <code>lib/classics</code>（MIT / 数据 CC BY 4.0）。
        用于检索与对照；逐字引用、学术出版前请核对原书或维基文库。
      </div>

      <div className="classics-toolbar">
        <input value={query} placeholder="搜索星曜 / 宫位 / 格局，如「紫微」「七杀」「化忌」" onChange={(e) => setQuery(e.target.value)} />
        {query && <button className="btn ghost small" onClick={() => setQuery('')}>清除</button>}
      </div>

      {query ? (
        <div className="classics-hits">
          <div className="classics-hits-head">
            <span>检索「{query}」</span>
            <em>{hits.length} 条</em>
          </div>
          {hits.map((h) => (
            <div key={h.paragraphId} className="classic-hit">
              <div className="classic-hit-source">{h.bookTitle} · {h.chapterTitle}</div>
              <p>{h.text}</p>
            </div>
          ))}
          {!hits.length && <p className="dim">没有检索到，换一个关键词试试。</p>}
        </div>
      ) : (
        <>
          <div className="classics-books">
            {ALL_BOOKS.map((b) => (
              <button key={b.slug} className={`classic-book ${b.slug === book?.slug ? 'active' : ''}`} onClick={() => setSlug(b.slug)}>
                <b>{b.title}</b>
                <span>{b.dynasty} · {b.chapters.length} 篇</span>
              </button>
            ))}
          </div>

          {book && (
            <div className="classic-reader">
              <div className="classic-reader-head">
                <h3>{book.title}</h3>
                <p>{book.intro}</p>
                <div className="dim">{book.dynasty} · {book.author} · 约 {book.wordCount} 字</div>
              </div>
              {book.chapters.map((ch, i) => (
                <details key={ch.title + i} className="classic-chapter" open={i === 0}>
                  <summary>
                    <span>{ch.title}</span>
                    {ch.subtitle && <em>{ch.subtitle}</em>}
                  </summary>
                  {ch.paragraphs.map((p) => (
                    <p key={p.id} className="classic-paragraph">{p.text}</p>
                  ))}
                </details>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
