import { useEffect } from 'react';
import type { Astrolabe } from '../types';
import { getProfile, type PalaceKey } from '../lib/knowledge/starProfiles';
import { describeSynastry } from '../lib/wuxing';

const KIND_LABEL: Record<string, string> = {
  主星: '主星',
  吉星: '吉星',
  煞星: '煞星',
  禄存: '禄存',
  天马: '天马',
  桃花: '桃花',
  杂曜: '杂曜',
  神煞: '神煞',
};

export default function StarProfilePanel({
  astrolabe,
  starName,
  palaceName,
  onClose,
  onSelectStar,
}: {
  astrolabe: Astrolabe | null;
  starName: string;
  palaceName?: string;
  onClose: () => void;
  onSelectStar: (name: string, palaceName?: string) => void;
}) {
  const profile = getProfile(starName);
  const palace = astrolabe && palaceName ? astrolabe.palaces.find((p) => p.name === palaceName) : undefined;
  const inPalace = palace
    ? [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].find((s) => s.name === starName)
    : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!profile) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h2>{starName}</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <p className="dim">资料库暂未收录这颗星。可在「星曜资料库」中补充档案，或先按杂曜理解。</p>
        </div>
      </div>
    );
  }

  const mates = palace
    ? [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].filter((s) => s.name !== starName)
    : [];

  const palaceLine = palaceName ? profile.palaces?.[palaceName as PalaceKey] : undefined;
  const combos = profile.combos ?? [];
  const presentNames = new Set(
    palace ? [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars].map((s) => s.name) : [],
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${profile.name}星曜档案`}>
        <div className="modal-head">
          <div>
            <h2>{profile.name}</h2>
            <div className="modal-sub">
              {profile.aliases?.length ? <span>{profile.aliases.join(' / ')}</span> : null}
              <span className="badge">{profile.grade}级</span>
              <span className="badge">{KIND_LABEL[profile.category]}</span>
              <span className="badge">{profile.yinyang ?? '—'}{profile.wuxing}</span>
              {profile.huaqi && <span className="badge">{profile.huaqi}</span>}
              {profile.flow && <span className="badge badge-flow">{profile.flow.label}流曜</span>}
              {inPalace?.brightness && <span className="badge badge-mutagen">亮度·{inPalace.brightness}</span>}
              {inPalace?.mutagen && <span className="badge badge-mutagen">化{inPalace.mutagen}</span>}
              {palaceName && <span className="badge badge-body">在{palaceName}</span>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="essence">{profile.essence}</p>

          {profile.flow && (
            <section>
              <h3 className="section-title">运限投射</h3>
              <p className="star-detail">
                这是「{profile.name}」，本质是 <b>{profile.flow.base}</b> 在{profile.flow.label}层的投射，只在{profile.flow.span}内有效。
                它的落宫说明「{profile.flow.span}内哪一宫被{profile.flow.base}的主题引动」；换限/换年即失效，不要当成本命星。
                四化由这一层的天干决定（大限干 / 流年干），不套用本命生年四化表。
              </p>
            </section>
          )}

          <div className="kw-row">
            {profile.keywords.map((k) => (
              <span key={k} className="kw">{k}</span>
            ))}
          </div>

          {palaceName && (
            <section>
              <h3 className="section-title">落在{palaceName}</h3>
              <p className="star-detail">
                {palaceLine ?? `由本体推导：${profile.essence} 落入${palaceName}，需结合同宫星曜与庙旺判断具体表现。`}
              </p>
              {mates.length > 0 && (
                <div className="syn-list">
                  {mates.slice(0, 6).map((m) => {
                    const syn = describeSynastry({ name: starName, brightness: inPalace?.brightness }, m);
                    if (!syn) return null;
                    return (
                      <button key={m.name} className="syn-row" onClick={() => onSelectStar(m.name, palaceName)}>
                        <span className="syn-rel">{syn.relation}·{syn.verdict}</span>
                        <span className="syn-text">
                          遇 <b>{m.name}</b>（{syn.text.replace(/^.*?：/, '')}）
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <section>
            <h3 className="section-title">五行根性</h3>
            <p className="star-detail">{profile.root}</p>
            {profile.body && <p className="star-detail dim">身体对应：{profile.body}</p>}
          </section>

          {(profile.positive?.length || profile.negative?.length) && (
            <section className="two-col">
              <div>
                <h4 className="sub-title ok">正面发挥</h4>
                <ul className="notes">{profile.positive?.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              <div>
                <h4 className="sub-title danger">风险盲点</h4>
                <ul className="notes">{profile.negative?.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </section>
          )}

          <section>
            <h3 className="section-title">四化与自化</h3>
            {profile.sihua ? (
              <div className="sihua-grid">
                {(['禄', '权', '科', '忌'] as const).map((m) =>
                  profile.sihua?.[m] ? (
                    <div key={m} className="sihua-cell">
                      <b>化{m}</b>
                      <span>{profile.sihua[m]}</span>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="star-detail dim">
                {profile.flow
                  ? '运限流曜的四化看引动它的运限天干（大限干/流年干），不套用本命四化表。'
                  : '本星不参与四化（神煞或固定辅曜），动态要看同宫星曜与宫位场景。'}
              </p>
            )}
            {profile.zihua && (
              <div className="sihua-grid" style={{ marginTop: 8 }}>
                {(['禄', '权', '科', '忌'] as const).map((m) =>
                  profile.zihua?.[m] ? (
                    <div key={m} className="sihua-cell zihua">
                      <b>自化{m}</b>
                      <span>{profile.zihua[m]?.replace(new RegExp(`^自化${m}[：:]`), '')}</span>
                    </div>
                  ) : null,
                )}
              </div>
            )}
          </section>

          {combos.length > 0 && (
            <section>
              <h3 className="section-title">组合提示</h3>
              <div className="combo-list">
                {combos.map((c) => (
                  <div key={c.with} className={`combo-row ${c.kind} ${presentNames.has(c.with) ? 'present' : ''}`}>
                    <span className="combo-with">
                      + {c.with}
                      {presentNames.has(c.with) && <em>本宫有</em>}
                    </span>
                    <span>{c.verdict}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile.palaces && (
            <section>
              <h3 className="section-title">十二宫投射</h3>
              <div className="palace-projection">
                {Object.entries(profile.palaces).map(([p, line]) => (
                  <div key={p} className={`proj-row ${p === palaceName ? 'active' : ''}`}>
                    <b>{p}</b>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="section-title">用星建议</h3>
            <div className="use-grid">
              <div><b>适合</b><span>{profile.use.field}</span></div>
              <div><b>风险</b><span>{profile.use.risk}</span></div>
              <div><b>修正</b><span>{profile.use.fix}</span></div>
            </div>
            <p className="motto">「{profile.use.motto}」</p>
          </section>

          <p className="hint">
            {profile.flow ? '运限派生档案（不单独扩写）' : profile.tier === 'full' ? '完整档案' : '简版档案（待扩写）'}
            {profile.source ? ` · ${profile.source}` : ''}
            ｜庙旺与生年四化来自排盘引擎，资料库不重复存储。
          </p>
        </div>
      </div>
    </div>
  );
}
