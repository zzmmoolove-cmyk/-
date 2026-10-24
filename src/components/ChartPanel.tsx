import { useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Iztrolabe } from 'react-iztro';
import type { Astrolabe, BirthInput, ChartOptions, Palace } from '../types';
import { LAYER_META, type LayeredData, type LayerScope } from '../lib/scope';
import { getProfile } from '../lib/knowledge/starProfiles';
import { PALACE_KB, PALACE_ORDER } from '../lib/knowledge/palaces';
import {
  FIVE_ELEMENTS_CLASS,
  LIMIT_CONCEPTS,
  branchElement,
  branchShort,
  getConcept,
  stemElement,
  type Concept,
  type ConceptKind,
} from '../lib/knowledge/foundations';
import { fourTransformsOfStem } from '../lib/wuxing';
import ConceptPanel, { type ConceptView } from './ConceptPanel';

/** 把「运马/流马/月马/日马」拆成 范围字 + 星字，方便文字区分 */
function splitStar(name: string): { scopeChar: string; starChar: string } {
  if (name.length >= 2) return { scopeChar: name.slice(0, 1), starChar: name.slice(1) };
  return { scopeChar: '', starChar: name };
}

const LABEL = (n: string) => (n.endsWith('宫') ? n : `${n}宫`);

/** 大限/小限的显示文本：小限只取前三个年龄，避免刷屏 */
function formatLimit(hit: { kind: '大限' | '小限'; text: string }): string {
  if (hit.kind === '大限') return `${hit.text} 岁`;
  const ages = hit.text.split(/\s+/).filter(Boolean).slice(0, 3);
  return ages.length ? `${ages.join('、')}…` : hit.text;
}

type Hit =
  | { type: 'star'; name: string; palace?: string; el: HTMLElement }
  | { type: 'flow'; name: string; palace?: string; el: HTMLElement }
  | { type: 'palace'; name: string; el: HTMLElement }
  | { type: 'concept'; kind: ConceptKind; name: string; palace?: string; el: HTMLElement }
  | { type: 'gz'; stem: string; branch: string; palace?: string; el: HTMLElement }
  | { type: 'limit'; kind: '大限' | '小限'; text: string; palace?: string; el: HTMLElement };

type Tip = {
  key: string;
  title: string;
  sub?: string;
  body: string;
  hint: string;
  x: number;
  y: number;
  above: boolean;
};

export default function ChartPanel({
  astrolabe,
  input,
  options,
  timeIndex,
  layered,
  selectedPalace,
  userLabel,
  onSelectPalace,
  onSelectStar,
}: {
  astrolabe: Astrolabe | null;
  input: BirthInput;
  options: ChartOptions;
  timeIndex: number;
  layered: LayeredData | null;
  selectedPalace: string | null;
  userLabel?: string;
  onSelectPalace: (name: string) => void;
  onSelectStar: (name: string, palace?: string) => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [concept, setConcept] = useState<ConceptView | null>(null);

  useEffect(() => {
    const hide = () => setTip(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, []);

  if (!astrolabe) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔮</div>
        <p style={{ color: 'var(--text-dim)' }}>填写左侧出生信息后点击「排盘」</p>
      </div>
    );
  }

  const palaceObj = (name?: string): Palace | undefined =>
    name ? astrolabe.palaces.find((p) => p.name === name) : undefined;

  const palaceNameOf = (el: HTMLElement): string | undefined => {
    const pEl = el.closest('.iztro-palace');
    if (!pEl) return undefined;
    const text = pEl.querySelector('.iztro-palace-name-wrapper')?.textContent ?? '';
    return PALACE_ORDER.find((n) => text.includes(n));
  };

  /** 盘面点击/悬停的统一命中判定（第三方组件无回调，只能事件委托 + DOM 反查） */
  const detectHit = (target: HTMLElement | null): Hit | null => {
    if (!(target instanceof HTMLElement)) return null;

    const brightEl = target.closest('.iztro-star-brightness') as HTMLElement | null;
    if (brightEl) {
      const name = (brightEl.textContent ?? '').trim();
      if (name && getConcept('庙旺', name)) {
        return { type: 'concept', kind: '庙旺', name, palace: palaceNameOf(brightEl), el: brightEl };
      }
    }

    const mutEl = target.closest('.iztro-star-mutagen') as HTMLElement | null;
    if (mutEl) {
      const name = (mutEl.textContent ?? '').trim();
      if (name && getConcept('四化', name)) {
        return { type: 'concept', kind: '四化', name, palace: palaceNameOf(mutEl), el: mutEl };
      }
    }

    const starEl = target.closest('.iztro-star') as HTMLElement | null;
    if (starEl) {
      const name = starEl.querySelector('.star-with-mutagen')?.textContent?.trim();
      if (!name) return null;
      if (starEl.closest('.iztro-palace-horo-star') && !getProfile(name)) {
        return { type: 'flow', name, palace: palaceNameOf(starEl), el: starEl };
      }
      return { type: 'star', name, palace: palaceNameOf(starEl), el: starEl };
    }

    const lft = target.closest('.iztro-palace-lft24') as HTMLElement | null;
    if (lft) {
      const idx = Array.from(lft.children).findIndex((c) => c.contains(target));
      const isBoshi = idx === 1;
      const name = (lft.children[isBoshi ? 1 : 0]?.textContent ?? '').trim();
      if (name) {
        return {
          type: 'concept',
          kind: isBoshi ? '博士十二神' : '长生十二神',
          name,
          palace: palaceNameOf(lft),
          el: lft,
        };
      }
      return null;
    }

    const rgt = target.closest('.iztro-palace-rgt24') as HTMLElement | null;
    if (rgt) {
      const idx = Array.from(rgt.children).findIndex((c) => c.contains(target));
      const isJiang = idx === 1;
      const name = (rgt.children[isJiang ? 1 : 0]?.textContent ?? '').trim();
      if (name) {
        return {
          type: 'concept',
          kind: isJiang ? '将前十二神' : '岁前十二神',
          name,
          palace: palaceNameOf(rgt),
          el: rgt,
        };
      }
      return null;
    }

    const gz = target.closest('.iztro-palace-gz') as HTMLElement | null;
    if (gz) {
      const text = (gz.textContent ?? '').replace(/\s/g, '');
      if (text.length >= 2) {
        return { type: 'gz', stem: text[0], branch: text[1], palace: palaceNameOf(gz), el: gz };
      }
      return null;
    }

    const dec = target.closest('.iztro-palace-scope-decadal') as HTMLElement | null;
    if (dec) {
      const text = (dec.textContent ?? '').trim();
      if (text) return { type: 'limit', kind: '大限', text, palace: palaceNameOf(dec), el: dec };
      return null;
    }

    const age = target.closest('.iztro-palace-scope-age') as HTMLElement | null;
    if (age) {
      const text = (age.textContent ?? '').trim();
      if (text) return { type: 'limit', kind: '小限', text, palace: palaceNameOf(age), el: age };
      return null;
    }

    const nameEl = target.closest('.iztro-palace-name') as HTMLElement | null;
    if (nameEl) {
      const text = nameEl.querySelector('.iztro-palace-name-wrapper')?.textContent ?? '';
      const name = PALACE_ORDER.find((n) => text.includes(n));
      if (name) return { type: 'palace', name, el: nameEl };
    }

    return null;
  };

  const place = (el: HTMLElement, data: Omit<Tip, 'x' | 'y' | 'above'>): Tip => {
    const r = el.getBoundingClientRect();
    const above = r.top > 130;
    const half = 150;
    return {
      ...data,
      x: Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half),
      y: above ? r.top - 8 : r.bottom + 8,
      above,
    };
  };

  const starTip = (name: string, palace: string | undefined, el: HTMLElement): Tip | null => {
    const profile = getProfile(name);
    if (!profile) return null;
    const p = palaceObj(palace);
    const star = p
      ? [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].find((s) => s.name === name)
      : undefined;
    if (profile.flow) {
      return place(el, {
        key: `star:${name}:${palace ?? ''}`,
        title: name,
        sub: `运限投射 · ${profile.flow.label}${profile.flow.base}${palace ? ` · ${LABEL(palace)}` : ''}`,
        body: profile.essence,
        hint: '点击查看运限流曜说明',
      });
    }
    const parts = [
      `${profile.yinyang ?? ''}${profile.wuxing}`,
      star?.brightness ? `亮度${star.brightness}` : '亮度未提供',
      star?.mutagen ? `化${star.mutagen}` : '',
    ].filter(Boolean);
    return place(el, {
      key: `star:${name}:${palace ?? ''}`,
      title: name,
      sub: `${parts.join(' · ')}${palace ? ` · ${LABEL(palace)}` : ''}`,
      body: profile.essence,
      hint: '点击查看完整星曜档案',
    });
  };

  const tipForHit = (hit: Hit): Tip | null => {
    if (hit.type === 'star') return starTip(hit.name, hit.palace, hit.el);

    if (hit.type === 'flow') {
      return place(hit.el, {
        key: `flow:${hit.name}:${hit.palace ?? ''}`,
        title: hit.name,
        sub: `运限流曜${hit.palace ? ` · ${LABEL(hit.palace)}` : ''}`,
        body: '该运限流曜暂无派生档案；它只在这一层有效，力度看引动它的运限四化。',
        hint: '流曜不单独断事，合看大小限与四化',
      });
    }

    if (hit.type === 'palace') {
      const p = palaceObj(hit.name);
      const info = PALACE_KB[hit.name];
      return place(hit.el, {
        key: `palace:${hit.name}`,
        title: LABEL(hit.name),
        sub: p ? `${p.heavenlyStem}${p.earthlyBranch}${p.isBodyPalace ? ' · 身宫' : ''} · ${p.changsheng12}` : '',
        body: info?.brief ?? '',
        hint: '点击切换到这个宫位',
      });
    }

    if (hit.type === 'concept') {
      const c = getConcept(hit.kind, hit.name);
      return place(hit.el, {
        key: `concept:${hit.kind}:${hit.name}`,
        title: hit.name,
        sub: `${hit.kind}${hit.palace ? ` · ${LABEL(hit.palace)}` : ''}`,
        body: c?.brief ?? '该神煞暂无详细档案，可按「当宫/当年的气机标签」理解。',
        hint: '点击查看说明',
      });
    }

    if (hit.type === 'gz') {
      return place(hit.el, {
        key: `gz:${hit.stem}${hit.branch}:${hit.palace ?? ''}`,
        title: `${hit.stem}${hit.branch}`,
        sub: `${hit.palace ? LABEL(hit.palace) : ''} · 宫干支`,
        body: `天干${hit.stem}（${stemElement(hit.stem)}）· 地支${hit.branch}（${branchElement(hit.branch)}${branchShort(hit.branch) ? `·${branchShort(hit.branch)}` : ''}）`,
        hint: '点击查看干支与四化',
      });
    }

    return place(hit.el, {
      key: `limit:${hit.kind}:${hit.text}:${hit.palace ?? ''}`,
      title: `${hit.kind} ${formatLimit(hit)}`,
      sub: hit.palace ? LABEL(hit.palace) : '',
      body: LIMIT_CONCEPTS[hit.kind].brief,
      hint: '点击查看说明',
    });
  };

  const palaceExtra = (name?: string) => {
    const p = palaceObj(name);
    if (!p) return undefined;
    return [{ label: '所在宫位', value: `${LABEL(p.name)}（${p.heavenlyStem}${p.earthlyBranch}）· 长生${p.changsheng12}` }];
  };

  const conceptView = (hit: Extract<Hit, { type: 'concept' | 'gz' | 'limit' }>): ConceptView => {
    if (hit.type === 'concept') {
      const c: Concept | undefined = getConcept(hit.kind, hit.name);
      const starEl = hit.el.closest('.iztro-star');
      const starName = starEl?.querySelector('.star-with-mutagen')?.textContent?.trim();
      const starExtra = starName
        ? [{ label: '所在星曜', value: `${starName}${hit.palace ? `（${LABEL(hit.palace)}）` : ''}` }]
        : [];
      return {
        title: hit.name,
        subtitle: `${hit.kind}${hit.palace ? ` · ${LABEL(hit.palace)}` : ''}`,
        tags: c?.tags,
        sections: [
          {
            label: '含义',
            text: c?.detail ?? '该神煞暂无详细档案。可先把它当作这一宫/这一年的「气机标签」，与主星、四化、吉煞合看，不单独断事。',
          },
        ],
        extra: [...(c?.extra ?? []), ...starExtra, ...(palaceExtra(hit.palace) ?? [])],
        footer:
          hit.kind === '庙旺'
            ? '庙旺只决定「力度」，不改变星曜性质；四化才决定「方向」。'
            : hit.kind === '四化'
              ? '四化是能量方向：庙旺放大它的力度，宫位决定它的场景。'
              : '神煞是修饰，不是主角：先看主星与四化，再用它调色。',
      };
    }

    if (hit.type === 'gz') {
      const stem = getConcept('天干', hit.stem);
      const branch = getConcept('地支', hit.branch);
      const fly = fourTransformsOfStem(hit.stem).map(({ star, mutagen }) => {
        const target = astrolabe.palaces.find((p) =>
          [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star),
        );
        return `${star}化${mutagen}${target ? ` → ${LABEL(target.name)}` : ''}`;
      });
      return {
        title: `${hit.stem}${hit.branch}`,
        subtitle: `${hit.palace ? `${LABEL(hit.palace)} · ` : ''}宫干与地支`,
        tags: [stemElement(hit.stem), branchElement(hit.branch), branchShort(hit.branch)].filter(Boolean),
        sections: [
          { label: `天干 ${hit.stem}`, text: stem?.detail ?? '' },
          { label: `地支 ${hit.branch}`, text: branch?.detail ?? '' },
        ],
        extra: [{ label: '本宫宫干四化', value: fly.join('；') }, ...(palaceExtra(hit.palace) ?? [])],
        footer: '悬停盘上的宫干，可以预览该干引动的四化；点击会打开这份说明。',
      };
    }

    return {
      title: `${hit.kind} ${formatLimit(hit)}`,
      subtitle: hit.palace ? LABEL(hit.palace) : '',
      tags: LIMIT_CONCEPTS[hit.kind].tags,
      sections: [{ label: hit.kind, text: LIMIT_CONCEPTS[hit.kind].detail }],
      extra: palaceExtra(hit.palace),
      footer: '本命定底色，运限定阶段：先读本命宫位卡，再看运限。',
    };
  };

  const handleChartOver = (e: ReactMouseEvent<HTMLDivElement>) => {
    const hit = detectHit(e.target as HTMLElement);
    if (!hit) return;
    const next = tipForHit(hit);
    if (!next) return;
    setTip((prev) => (prev?.key === next.key ? prev : next));
  };

  const handleChartOut = (e: ReactMouseEvent<HTMLDivElement>) => {
    const to = e.relatedTarget as Node | null;
    if (!(to instanceof HTMLElement) || !detectHit(to)) setTip(null);
  };

  const handleChartClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const hit = detectHit(e.target as HTMLElement);
    if (!hit) return;
    setTip(null);
    if (hit.type === 'star') {
      onSelectStar(hit.name, hit.palace);
      return;
    }
    if (hit.type === 'flow') {
      return;
    }
    if (hit.type === 'palace') {
      onSelectPalace(hit.name);
      // 点宫名时把下方宫位卡带到视野里，给一个明确反馈
      window.setTimeout(() => {
        document.querySelector('.report-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }
    setConcept(conceptView(hit));
  };

  const bodyPalace = astrolabe.palaces.find((p) => p.isBodyPalace);
  const natalHua = astrolabe.palaces
    .flatMap((p) =>
      [...p.majorStars, ...p.minorStars]
        .filter((s) => s.mutagen)
        .map((s) => ({ star: s.name, mutagen: s.mutagen as string })),
    )
    .sort((a, b) => ['禄', '权', '科', '忌'].indexOf(a.mutagen) - ['禄', '权', '科', '忌'].indexOf(b.mutagen));

  const five = FIVE_ELEMENTS_CLASS[astrolabe.fiveElementsClass];
  const openFiveElements = () => {
    if (!five) return;
    setConcept({
      title: five.name,
      subtitle: '五行局',
      tags: five.tags,
      sections: [{ label: '五行局', text: five.detail }],
      extra: [{ label: '作用', value: '五行局定起运年龄，也定长生十二神的起点。' }],
    });
  };

  // 星名 → 各层级四化
  const mutagenByStar = new Map<string, { scope: LayerScope; mutagen: string }[]>();
  (layered?.mutagens ?? []).forEach((m) => {
    const arr = mutagenByStar.get(m.star) ?? [];
    arr.push({ scope: m.scope, mutagen: m.mutagen });
    mutagenByStar.set(m.star, arr);
  });

  return (
    <>
      <div className="panel">
        <h2>
          命盘<span className="dim">（悬停看批注，点击看档案）</span>
        </h2>
        <div className="chart-scroll" onClick={handleChartClick} onMouseOver={handleChartOver} onMouseOut={handleChartOut}>
          <div className="chart-inner">
            <Iztrolabe
              birthday={input.birthday}
              birthTime={timeIndex}
              gender={input.gender}
              birthdayType={input.birthdayType}
              isLeapMonth={input.isLeapMonth}
              fixLeap={input.fixLeap}
              lang="zh-CN"
              options={options}
            />

            <div className="chart-center">
              <div className="cc-title">
                {userLabel ? `${userLabel} · 本命盘` : '本命盘'}
                <span>{astrolabe.gender} · 属{astrolabe.zodiac} · {astrolabe.fiveElementsClass}</span>
              </div>
              <div className="cc-grid">
                <div className="cc-item">
                  <em>命主</em>
                  <button className="link-btn" onClick={() => onSelectStar(astrolabe.soul)}>{astrolabe.soul}</button>
                </div>
                <div className="cc-item">
                  <em>身主</em>
                  <button className="link-btn" onClick={() => onSelectStar(astrolabe.body)}>{astrolabe.body}</button>
                </div>
                <div className="cc-item">
                  <em>五行局</em>
                  <button className="link-btn" onClick={openFiveElements}>{astrolabe.fiveElementsClass}</button>
                </div>
                <div className="cc-item">
                  <em>身宫</em>
                  <span>{bodyPalace ? LABEL(bodyPalace.name) : '—'}</span>
                </div>
              </div>
              <div className="cc-dates">
                <div><em>阳历</em><span>{astrolabe.solarDate}</span></div>
                <div><em>农历</em><span>{astrolabe.lunarDate}</span></div>
              </div>
              <div className="cc-hua">
                <em>生年四化</em>
                <span className="cc-hua-list">
                  {natalHua.map((h) => (
                    <span key={h.star + h.mutagen} className={`cc-hua-item hua-${h.mutagen}`}>
                      {h.star}{h.mutagen}
                    </span>
                  ))}
                </span>
              </div>
              <div className="cc-hint">悬停看批注 · 点击看档案 · 排盘 iztro</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>
          十二宫<span className="dim">（点击查看解读，运限叠加显示）</span>
        </h2>
        <div className="palace-grid">
          {astrolabe.palaces.map((p: Palace) => {
            const layerStars = layered?.palaces[p.name] ?? [];
            return (
              <div
                key={p.index}
                role="button"
                tabIndex={0}
                className={`palace-card ${selectedPalace === p.name ? 'active' : ''}`}
                onClick={() => onSelectPalace(p.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectPalace(p.name);
                }}
              >
                <div className="palace-card-head">
                  <span className="palace-name">{p.name}</span>
                  {p.isBodyPalace && <span className="badge badge-body">身宫</span>}
                </div>
                <div className="palace-stars">
                  {p.majorStars.length ? (
                    p.majorStars.map((s) => {
                      const ms = mutagenByStar.get(s.name) ?? [];
                      return (
                        <span
                          key={s.name}
                          className="star-tag major clickable"
                          role="button"
                          tabIndex={0}
                          title={`查看 ${s.name} 档案`}
                          onMouseEnter={(e) => {
                            const t = starTip(s.name, p.name, e.currentTarget);
                            if (t) setTip(t);
                          }}
                          onMouseLeave={() => setTip(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStar(s.name, p.name);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              onSelectStar(s.name, p.name);
                            }
                          }}
                        >
                          {s.name}
                          {ms.map((m) => (
                            <em key={m.scope + m.mutagen} className={`mutagen layer-${m.scope}`}>
                              {LAYER_META[m.scope].short}{m.mutagen}
                            </em>
                          ))}
                        </span>
                      );
                    })
                  ) : (
                    <span className="empty">空宫</span>
                  )}
                  {p.minorStars.slice(0, 4).map((s) => (
                    <span
                      key={s.name}
                      className="star-tag minor clickable"
                      role="button"
                      tabIndex={0}
                      title={`查看 ${s.name} 档案`}
                      onMouseEnter={(e) => {
                        const t = starTip(s.name, p.name, e.currentTarget);
                        if (t) setTip(t);
                      }}
                      onMouseLeave={() => setTip(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStar(s.name, p.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          onSelectStar(s.name, p.name);
                        }
                      }}
                    >
                      {s.name}
                    </span>
                  ))}
                  {layerStars.map((s, i) => {
                    const { scopeChar, starChar } = splitStar(s.name);
                    return (
                      <span
                        key={s.name + i}
                        className={`star-tag layer-tag layer-${s.scope} clickable`}
                        role="button"
                        tabIndex={0}
                        title={`查看 ${s.name} 说明`}
                        onMouseEnter={(e) => {
                          const t = starTip(s.name, p.name, e.currentTarget);
                          if (t) setTip(t);
                        }}
                        onMouseLeave={() => setTip(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStar(s.name, p.name);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            onSelectStar(s.name, p.name);
                          }
                        }}
                      >
                        <em className="scope-char">{scopeChar}</em>
                        {starChar}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="legend">
          <span className="lg"><i className="dot layer-decadal" />大限</span>
          <span className="lg"><i className="dot layer-yearly" />流年</span>
          <span className="lg"><i className="dot layer-monthly" />流月</span>
          <span className="lg"><i className="dot layer-daily" />流日</span>
        </div>
      </div>

      {tip && (
        <div
          className={`chart-tip ${tip.above ? 'above' : 'below'}`}
          style={{ left: tip.x, top: tip.y }}
          role="tooltip"
        >
          <div className="chart-tip-head">
            <b>{tip.title}</b>
            {tip.sub && <span>{tip.sub}</span>}
          </div>
          <p>{tip.body}</p>
          <div className="chart-tip-hint">{tip.hint}</div>
        </div>
      )}

      {concept && <ConceptPanel view={concept} onClose={() => setConcept(null)} />}
    </>
  );
}
