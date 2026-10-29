import { useMemo, useState } from 'react';
import type { Astrolabe } from '../types';
import {
  getScopeData,
  LAYER_META,
  type ActiveLayers,
  type LayerScope,
  type ScopeData,
} from '../lib/scope';

type ScopeEntry = {
  key: LayerScope;
  label: string;
  stem: string;
  branch: string;
  scopePalaceName?: string;
  mutagens: { star: string; mutagen: string; landing?: string }[];
  palaces: {
    base: string;
    flow: string;
    stars: string[];
    focus: boolean;
    isScopePalace: boolean;
  }[];
  note: string;
};

const FOCUS_ORDER = ['命宫', '夫妻', '官禄', '财帛', '福德'];

const NOTES: Record<LayerScope, string> = {
  decadal: '十年底色：先看大限命宫落本命哪一宫，再看大限四化把主题带到哪里。',
  yearly: '今年引动：流年命宫与流年四化叠在大限上，判断这一年的主旋律。',
  monthly: '本月节奏：流月命宫与流月四化用来选时机，不单独断吉凶。',
  daily: '当日触发：流日命宫与流日四化只做当天提醒，过日即散。',
  age: '小限是传统辅助层，优先看大限与流年。',
  hourly: '流时用于临时择时，必须服从流日与流月。',
};

const MUTAGEN_CLASS: Record<string, string> = {
  禄: 'hua-禄',
  权: 'hua-权',
  科: 'hua-科',
  忌: 'hua-忌',
};

function landingPalace(astrolabe: Astrolabe, star: string): string | undefined {
  const hit = astrolabe.palaces.find((p) =>
    [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].some((s) => s.name === star),
  );
  return hit?.name;
}

export default function ScopeReportPanel({
  astrolabe,
  raw,
  active,
  userLabel,
  onSelectPalace,
}: {
  astrolabe: Astrolabe;
  raw: Record<string, unknown> | null;
  active: ActiveLayers;
  userLabel?: string;
  onSelectPalace: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const entries = useMemo<ScopeEntry[]>(() => {
    if (!raw) return [];
    const source = raw as never;
    const list: { key: LayerScope; opts: Record<string, unknown> }[] = [];
    if (active.decadal != null) list.push({ key: 'decadal', opts: { decadalIndex: active.decadal } });
    if (active.yearly != null) list.push({ key: 'yearly', opts: { targetDate: `${active.yearly}-06-15` } });
    if (active.monthly != null && active.yearly != null) {
      const m = String(active.monthly).padStart(2, '0');
      list.push({ key: 'monthly', opts: { targetDate: `${active.yearly}-${m}-15` } });
    }
    if (active.daily != null) list.push({ key: 'daily', opts: { targetDate: active.daily } });

    return list.map(({ key, opts }) => {
      const d = getScopeData(source, key as never, opts as never) as ScopeData;
      const mutagens = d.mutagenMap.map((m) => ({
        ...m,
        landing: landingPalace(astrolabe, m.star),
      }));
      const palaces = astrolabe.palaces
        .map((p) => {
          const flow = d.flowPalaceByBase[p.name] ?? '';
          return {
            base: p.name,
            flow,
            stars: (d.palaces[p.name] ?? []).map((s) => s.name),
            focus: FOCUS_ORDER.includes(flow),
            isScopePalace: p.name === d.scopePalaceName,
          };
        })
        .filter((p) => p.flow)
        .sort((a, b) => {
          const ai = FOCUS_ORDER.indexOf(a.flow);
          const bi = FOCUS_ORDER.indexOf(b.flow);
          return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        });
      return {
        key,
        label: LAYER_META[key].label,
        stem: d.heavenlyStem,
        branch: d.earthlyBranch,
        scopePalaceName: d.scopePalaceName,
        mutagens,
        palaces,
        note: NOTES[key],
      };
    });
  }, [astrolabe, raw, active]);

  const copy = async () => {
    const lines = [
      `运限报告${userLabel ? ` · ${userLabel}` : ''}`,
      `本命：${astrolabe.solarDate} · ${astrolabe.chineseDate}`,
      '',
      ...entries.flatMap((e) => [
        `【${e.label}${e.stem}${e.branch}】命宫落本命${e.scopePalaceName ?? '—'}`,
        `四化：${e.mutagens.map((m) => `${m.star}化${m.mutagen}${m.landing ? `→${m.landing}` : ''}`).join('、') || '—'}`,
        `重点：${e.palaces.filter((p) => p.focus).map((p) => `${p.flow}（本命${p.base}）${p.stars.length ? `：${p.stars.join('、')}` : ''}`).join('；') || '—'}`,
        e.note,
        '',
      ]),
      '传统命理参考，不构成医疗、法律、投资建议。',
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const activeCount = entries.length;

  return (
    <div className="panel scope-report">
      <div className="report-head">
        <h2>
          运限报告 <span className="badge">v1.0</span>
          {userLabel && <span className="dim"> · {userLabel}</span>}
        </h2>
        <button className="btn ghost small" onClick={copy} disabled={!activeCount}>
          {copied ? '✓ 已复制' : '复制运限报告'}
        </button>
      </div>

      <p className="hint" style={{ marginTop: 0 }}>
        点上方「选择时间…」按大限 → 流年 → 流月 → 流日逐级选择，报告会按当前层级叠加。大限定十年底色，流年看引动，流月流日抓时机。
      </p>

      {activeCount === 0 ? (
        <div className="scope-empty">
          <div className="empty-sigil" aria-hidden="true">
            <span className="empty-sigil-ring" />
            <span className="empty-sigil-star">✦</span>
          </div>
          <p className="empty-kicker">先选一个运限层</p>
          <p className="dim">点上方「选择时间…」，先选一个大限，再逐级选流年 / 流月 / 流日。</p>
        </div>
      ) : (
        <div className="scope-stack">
          {entries.map((e) => (
            <section key={e.key} className="scope-block">
              <div className="scope-block-head">
                <span className={`scope-badge layer-${e.key}`}>{e.label}</span>
                <b>{e.stem}{e.branch || ''}</b>
                <span className="dim">运限命宫落本命 <b>{e.scopePalaceName ?? '—'}</b></span>
              </div>

              <div className="scope-mutagens">
                {e.mutagens.length === 0 && <span className="dim">本层四化未取到</span>}
                {e.mutagens.map((m) => (
                  <button
                    key={m.star + m.mutagen}
                    className={`scope-mutagen ${MUTAGEN_CLASS[m.mutagen] ?? ''}`}
                    onClick={() => m.landing && onSelectPalace(m.landing)}
                    title={m.landing ? `打开本命${m.landing}` : undefined}
                  >
                    {m.star}化{m.mutagen}
                    {m.landing && <em>→ {m.landing}</em>}
                  </button>
                ))}
              </div>

              <div className="scope-palaces">
                {e.palaces.filter((p) => p.focus || p.isScopePalace).map((p) => (
                  <button
                    key={p.base + p.flow}
                    className={`scope-palace ${p.isScopePalace ? 'is-scope' : ''}`}
                    onClick={() => onSelectPalace(p.base)}
                  >
                    <span className="scope-palace-flow">{p.flow}</span>
                    <span className="scope-palace-base">本命{p.base}</span>
                    <span className="scope-palace-stars">{p.stars.length ? p.stars.join(' · ') : '无流曜'}</span>
                  </button>
                ))}
              </div>

              <p className="scope-note">{e.note}</p>
            </section>
          ))}
        </div>
      )}

      <p className="hint scope-foot">
        运限四化与流曜只在该层有效；先看本命宫位底色，再看哪一层把它引动。传统命理参考，不构成医疗、法律、投资建议。
      </p>
    </div>
  );
}
