import { useMemo, useState } from 'react';
import type { Astrolabe, ServiceDraft, UserRecord } from '../types';
import { investmentProfile } from '../lib/investment';
import { buildBaziProfile } from '../lib/bazi';
import { buildAstroPerson, sunSignOfDate } from '../lib/astroSynastry';

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fall through */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

export default function InvestmentTool({
  astrolabe,
  raw,
  client,
  userLabel,
  onSaveService,
}: {
  astrolabe: Astrolabe | null;
  raw: Record<string, unknown> | null;
  client?: UserRecord;
  userLabel?: string;
  onSaveService?: (draft: ServiceDraft) => void;
}) {
  const [copied, setCopied] = useState(false);
  const profile = useMemo(() => (astrolabe ? investmentProfile(astrolabe, raw) : null), [astrolabe, raw]);

  const bazi = useMemo(() => {
    if (!client) return null;
    try { return buildBaziProfile(client.payload, client.name, client.payload.gender); } catch { return null; }
  }, [client]);

  const astro = useMemo(() => {
    if (!client) return null;
    try {
      return buildAstroPerson({
        name: client.name,
        date: client.payload.birthday,
        time: client.payload.clockTime || '12:00',
        longitude: client.payload.longitude,
        latitude: client.payload.latitude ?? 30,
        useTrueSolar: client.payload.useTrueSolar,
        sign: sunSignOfDate(client.payload.birthday).sign,
      });
    } catch { return null; }
  }, [client]);

  if (!profile) {
    return (
      <div className="tool-empty">
        <div className="empty-sigil" aria-hidden="true">
          <span className="empty-sigil-ring" />
          <span className="empty-sigil-star">✦</span>
        </div>
        <p className="empty-kicker">先有一张盘</p>
        <p className="dim">投资倾向要看财帛、福德、命宫与当前大限/流年；先选择一个客户或排盘。</p>
      </div>
    );
  }

  const report = [
    `【紫微投资倾向】${userLabel || '当前客户'}`,
    '这不是投资建议，不预测指数/个股涨跌，也不构成收益承诺。',
    '',
    `${profile.title}｜${profile.subtitle}`,
    profile.summary,
    `风险适配：${profile.riskScore} / 100 · ${profile.riskLabel}`,
    `风格：${profile.style}`,
    `结构：${profile.patterns.join('、') || '无极端结构'}`,
    ...(bazi ? [`八字：日主 ${bazi.dayMaster}${bazi.dayMasterEl} · ${bazi.strength}｜用神初判 ${bazi.usefulGods.join('、') || '—'}`] : []),
    ...(astro ? [`星座：太阳${astro.sun.sign} / 上升${astro.rising.sign} / 下降${astro.descendant.sign}`] : []),
    '',
    '【四维自检】',
    ...profile.scores.map((s) => `· ${s.label}：${s.value}/100｜${s.note}`),
    '',
    '【当前节奏】',
    ...(profile.timing
      ? [`· 大限：${profile.timing.decadalLabel}`, `· 流年：${profile.timing.yearlyLabel}`, `· 节奏：${profile.timing.level}`, profile.timing.note, ...profile.timing.details.map((d) => `· ${d}`)]
      : ['· 没有当前大限/流年数据（需要完整命盘）']),
    '',
    '【适合的倾向】',
    ...profile.suitable.map((s) => `· ${s}`),
    '',
    '【避雷】',
    ...profile.avoid.map((s) => `· ${s}`),
    '',
    '【行动清单】',
    ...profile.checklist.map((s) => `· ${s}`),
    '',
    '紫微不能可靠预测市场；本报告只做个人风险偏好与决策习惯自检，不构成财务/投资/法律/税务建议。',
  ].join('\n');

  const copy = async () => {
    await copyText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="tool-pane investment-pane">
      <div className="tool-intro">
        <h3>投资倾向</h3>
        <p>用财帛宫、福德宫、命宫看「财富剧本」、风险预算与当前节奏。它不预测市场涨跌，只做个人风险习惯自检。</p>
      </div>

      <div className="investment-disclaimer">
        <b>不是投资建议。</b>
        本工具不预测指数、个股、收益率或买卖点，也不构成财务、法律、税务建议。命盘只能描述倾向，真实决策要结合收入、负债、期限、家庭责任与持牌顾问。
      </div>

      <div className="investment-framework">
        <span>分析框架</span>
        <p>本命看「财富剧本」→ 大限看十年基调 → 流年看年度节奏。四化只描述个人账本的能量变化，不映射具体行业、指数或个股。</p>
      </div>

      <section className="investment-profile">
        <div className="investment-profile-head">
          <div>
            <div className="inspector-eyebrow">财富剧本</div>
            <h4>{profile.title}</h4>
            <p>{profile.subtitle}</p>
          </div>
          <div className={`investment-risk ${profile.riskScore >= 70 ? 'high' : profile.riskScore < 40 ? 'low' : 'mid'}`}>
            <b>{profile.riskScore}</b>
            <span>{profile.riskLabel}</span>
          </div>
        </div>
        <p className="investment-summary">{profile.summary}</p>
        <div className="investment-patterns">
          <span className="investment-style">{profile.style}</span>
          {profile.patterns.map((p) => <span key={p}>{p}</span>)}
        </div>
      </section>

      {(bazi || astro) && (
        <section className="investment-three">
          <div className="tool-subhead"><h4>三系统视角</h4><span>紫微定剧本，八字看根气，星座看节奏</span></div>
          <div className="investment-three-grid">
            {bazi && (
              <div>
                <em>八字</em>
                <b>日主 {bazi.dayMaster}{bazi.dayMasterEl} · {bazi.strength}</b>
                <p>用神初判：{bazi.usefulGods.join('、') || '—'}；配偶星：{bazi.spouseStar}（{bazi.spouseStars.length}）</p>
              </div>
            )}
            {astro && (
              <div>
                <em>星座</em>
                <b>太阳{astro.sun.sign} · 上升{astro.rising.sign}</b>
                <p>下降{astro.descendant.sign}；{astro.sun.element}象 / {astro.rising.element}象，关系里容易被「{astro.descendant.sign}」气质吸引。</p>
              </div>
            )}
            <div className="investment-cross">
              <em>交叉</em>
              <p>
                紫微是「{profile.style}」，八字是「{bazi?.strength ?? '—'}」，
                星座是「{astro?.sun.sign ?? '—'} / 上升{astro?.rising.sign ?? '—'}」。
                三者叠起来：先按{profile.style === '进攻型' ? '小仓位与止损规则' : profile.style === '防守型' ? '低波动与现金流安全' : '分散与长期计划'}走；
                八字用神提示{ bazi?.usefulGods.join('、') || '先补结构' }，星座节奏提示{ astro?.rising.element === '火' ? '行动快、容易先做后想' : astro?.rising.element === '水' ? '感受细、容易被情绪带走' : '先观察再表态' }。
                这些只用于自我校准，不构成买卖建议。
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="investment-scores">
        <div className="tool-subhead"><h4>四维自检</h4><span>不是总分排名，是四种能力分开看</span></div>
        <div className="investment-score-grid">
          {profile.scores.map((s) => (
            <div key={s.label} className="investment-score">
              <div className="investment-score-top"><b>{s.label}</b><span>{s.value}</span></div>
              <div className="investment-bar"><i style={{ width: `${s.value}%` }} /></div>
              <p>{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="investment-timing">
        <div className="tool-subhead">
          <h4>当前节奏</h4>
          <span>{profile.timing ? `${profile.timing.yearlyLabel} · ${profile.timing.level}` : '需要完整命盘'}</span>
        </div>
        {profile.timing ? (
          <>
            <div className={`investment-level ${profile.timing.level}`}>{profile.timing.level}</div>
            <div className="investment-timing-meta">
              <span>大限：{profile.timing.decadalLabel}</span>
              <span>流年：{profile.timing.yearlyLabel}</span>
            </div>
            <p>{profile.timing.note}</p>
            <ul className="notes">
              {profile.timing.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </>
        ) : (
          <p className="dim">当前没有可用的大限/流年数据；本命部分仍可参考。</p>
        )}

        {profile.yearMutagens.length > 0 && (
          <div className="investment-mutagens">
            <em>今年流年四化（只作个人账本主题，不代表行业涨跌）</em>
            <div>
              {profile.yearMutagens.map((m) => (
                <span key={m.star + m.mutagen} className={`hw hua-${m.mutagen}`}>{m.star}化{m.mutagen}{m.landing ? ` · ${m.landing}` : ''}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="investment-two-col">
        <section className="investment-list-card">
          <h4>适合的倾向</h4>
          <ul>{profile.suitable.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section className="investment-list-card warn">
          <h4>避雷</h4>
          <ul>{profile.avoid.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>

      <div className="investment-two-col">
        <section className="investment-list-card">
          <h4>可用优势</h4>
          <ul>{profile.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section className="investment-list-card warn">
          <h4>风险提醒</h4>
          <ul>{profile.cautions.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>

      <section className="investment-checklist">
        <div className="tool-subhead"><h4>行动清单</h4><span>先把规则写下来，再谈收益</span></div>
        <ol>
          {profile.checklist.map((c) => <li key={c}>{c}</li>)}
        </ol>
      </section>

      <div className="tool-actions">
        <button className="btn" onClick={copy}>{copied ? '✓ 已复制' : '复制投资报告'}</button>
        <button
          className="btn ghost"
          onClick={() => onSaveService?.({
            type: 'investment',
            title: `${userLabel || '当前客户'} · 投资倾向`,
            summary: `${profile.title} · ${profile.riskLabel} · ${profile.timing?.level ?? '本命'}`,
            detail: report,
          })}
        >
          保存为服务记录
        </button>
      </div>

      <p className="tool-note">边界：不预测具体市场、不给买卖点、不承诺收益；命盘不能替代基本面、风险测评与持牌顾问。</p>
    </div>
  );
}
