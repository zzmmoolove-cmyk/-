import { useMemo, useState } from 'react';
import { astro } from 'iztro';
import type { Astrolabe, BirthInput, ChartOptions, ServiceDraft, UserProfile, UserRecord } from '../types';
import { buildAstrolabe } from '../lib/buildChart';
import { compareCharts, idealPartnerProfile, synastryText } from '../lib/synastry';
import { compareAstro, astroSynastryText, type AstroBirth, type AstroSynastry } from '../lib/astroSynastry';
import { compareBaziProfiles, baziSynastryText, type BaziSynastry } from '../lib/baziSynastry';
import { buildBaziProfile, type BaziProfile } from '../lib/bazi';
import QuickClientSheet from './QuickClientSheet';
import IdealBProfile from './IdealBProfile';
import SynastryBreakdown from './SynastryBreakdown';
import AstroSynastryBoard from './AstroSynastryBoard';
import BaziSynastryBoard from './BaziSynastryBoard';

function optionsFrom(p: UserRecord['payload']): ChartOptions {
  return {
    algorithm: p.algorithm ?? 'default',
    yearDivide: p.yearDivide ?? 'normal',
    ageDivide: p.ageDivide ?? 'normal',
    horoscopeDivide: p.horoscopeDivide ?? 'normal',
    dayDivide: p.dayDivide ?? 'current',
  };
}

function downloadCard(
  result: ReturnType<typeof compareCharts>,
  aName: string,
  bName: string,
  overall = result.score,
  overallGrade = result.grade,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const bg = ctx.createLinearGradient(0, 0, 900, 1200);
  bg.addColorStop(0, '#141828');
  bg.addColorStop(0.55, '#0a0c15');
  bg.addColorStop(1, '#06070c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 900, 1200);

  // 星点
  for (let i = 0; i < 90; i++) {
    const x = (i * 137.5) % 900;
    const y = (i * 281.3) % 1200;
    const r = i % 7 === 0 ? 1.6 : 0.9;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 5 === 0 ? 'rgba(201,163,92,.55)' : 'rgba(255,246,222,.35)';
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(201,163,92,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(450, 430, 250, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(450, 430, 218, 0, Math.PI * 2);
  ctx.setLineDash([3, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9a35c';
  ctx.font = '600 30px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText('三 系 统 合 盘', 450, 120);

  ctx.fillStyle = '#f1e6cf';
  ctx.font = '700 56px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText(`${aName} × ${bName}`, 450, 250);

  ctx.fillStyle = '#e8cc93';
  ctx.font = '700 124px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText(String(overall), 450, 470);
  ctx.fillStyle = 'rgba(232,204,147,.72)';
  ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('综 合 契 合 度', 450, 510);

  ctx.fillStyle = '#f1e6cf';
  ctx.font = '600 34px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText(`${overallGrade} · ${result.archetype.title}`, 450, 580);

  ctx.fillStyle = 'rgba(201,163,92,.8)';
  ctx.font = '400 20px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText(result.keywords.join(' · '), 450, 630);

  const wrapWidth = (text: string, maxWidth: number, font: string, maxLines = 3) => {
    ctx.font = font;
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
        if (lines.length >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    return lines;
  };

  // oneLine，按实际字宽换行，避免标点孤行
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(231,223,204,.9)';
  const oneFont = '400 23px -apple-system, "PingFang SC", sans-serif';
  wrapWidth(result.oneLine, 700, oneFont, 3).forEach((line, i) => {
    ctx.font = oneFont;
    ctx.fillText(line, 450, 720 + i * 36);
  });

  // 三条相处提示：编号 + 按字宽换行
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(201,163,92,.9)';
  ctx.font = '600 19px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('相处提示', 110, 865);

  const adviceFont = '400 19px -apple-system, "PingFang SC", sans-serif';
  let y = 905;
  result.advice.slice(0, 3).forEach((a, i) => {
    ctx.fillStyle = 'rgba(201,163,92,.75)';
    ctx.font = '600 16px -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(`0${i + 1}`, 110, y);
    ctx.fillStyle = 'rgba(231,223,204,.86)';
    const lines = wrapWidth(a, 650, adviceFont, 2);
    lines.forEach((line, j) => {
      ctx.font = adviceFont;
      ctx.fillText(line, 150, y + j * 27);
    });
    y += lines.length * 27 + 16;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(201,163,92,.5)';
  ctx.font = '400 16px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText('紫微 45% + 星座 30% + 八字 25% · 关系结构参考', 450, 1155);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ziwei-hepan-${aName}-${bName}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export default function SynastryTool({
  astrolabe,
  users,
  activeUserId,
  userName,
  options,
  onSaveService,
  onCreateClient,
}: {
  astrolabe: Astrolabe | null;
  users: UserRecord[];
  activeUserId: string | null;
  userName?: string;
  options: ChartOptions;
  onSaveService?: (draft: ServiceDraft) => void;
  onCreateClient?: (input: BirthInput, profile: UserProfile) => string;
}) {
  const candidates = useMemo(
    () => users.filter((u) => u.id !== activeUserId),
    [users, activeUserId],
  );
  const [bId, setBId] = useState<string>(candidates[0]?.id ?? '');
  const [copied, setCopied] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [board, setBoard] = useState<'ziwei' | 'astro' | 'bazi'>('ziwei');

  const bRecord = candidates.find((u) => u.id === bId) ?? candidates[0];
  const bChart = useMemo(() => {
    if (!bRecord) return null;
    try {
      const chart = buildAstrolabe(bRecord.payload, optionsFrom(bRecord.payload));
      // 合盘生成 B 盘会临时改 iztro 全局配置；恢复 A 的配置，避免影响运限报告
      astro.config({
        algorithm: options.algorithm,
        yearDivide: options.yearDivide,
        ageDivide: options.ageDivide,
        horoscopeDivide: options.horoscopeDivide,
        dayDivide: options.dayDivide,
      });
      return chart;
    } catch {
      try {
        astro.config({
          algorithm: options.algorithm,
          yearDivide: options.yearDivide,
          ageDivide: options.ageDivide,
          horoscopeDivide: options.horoscopeDivide,
          dayDivide: options.dayDivide,
        });
      } catch {
        /* ignore */
      }
      return null;
    }
  }, [bRecord, options]);

  const result = useMemo(() => {
    if (!astrolabe || !bChart) return null;
    return compareCharts(astrolabe, bChart, userName || '你', bRecord?.name || '对方');
  }, [astrolabe, bChart, userName, bRecord]);

  const ideal = useMemo(
    () => (astrolabe ? idealPartnerProfile(astrolabe, userName || '你') : null),
    [astrolabe, userName],
  );

  const aRecord = useMemo(
    () => users.find((u) => u.id === activeUserId),
    [users, activeUserId],
  );

  const aBirth = useMemo<AstroBirth | null>(() => {
    if (!astrolabe) return null;
    const date = aRecord?.payload.birthday ?? (() => {
      const m = astrolabe.solarDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
    })();
    if (!date) return null;
    return {
      name: userName || '你',
      date,
      time: aRecord?.payload.clockTime || '12:00',
      longitude: aRecord?.payload.longitude ?? 116.41,
      latitude: aRecord?.payload.latitude ?? 30,
      useTrueSolar: aRecord?.payload.useTrueSolar,
      sign: astrolabe.sign,
    };
  }, [astrolabe, aRecord, userName]);

  const bBirth = useMemo<AstroBirth | null>(() => {
    if (!bChart || !bRecord) return null;
    return {
      name: bRecord.name,
      date: bRecord.payload.birthday,
      time: bRecord.payload.clockTime,
      longitude: bRecord.payload.longitude,
      latitude: bRecord.payload.latitude ?? 30,
      useTrueSolar: bRecord.payload.useTrueSolar,
      sign: bChart.sign,
    };
  }, [bChart, bRecord]);

  const astroResult = useMemo<AstroSynastry | null>(
    () => (aBirth && bBirth ? compareAstro(aBirth, bBirth) : null),
    [aBirth, bBirth],
  );

  const aBaziDetail = useMemo<BaziProfile | null>(() => {
    if (!astrolabe) return null;
    if (aRecord) return buildBaziProfile(aRecord.payload, userName || aRecord.name, aRecord.payload.gender);
    const m = astrolabe.solarDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    return buildBaziProfile({
      birthday: `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`,
      clockTime: '12:00',
      gender: astrolabe.gender === '女' ? '女' : '男',
      birthdayType: 'solar',
      isLeapMonth: false,
      fixLeap: true,
      useTrueSolar: false,
      longitude: 116.41,
      latitude: 30,
    }, userName || '你');
  }, [astrolabe, aRecord, userName]);

  const bBaziDetail = useMemo<BaziProfile | null>(
    () => (bRecord ? buildBaziProfile(bRecord.payload, bRecord.name, bRecord.payload.gender) : null),
    [bRecord],
  );

  const bazi = useMemo<BaziSynastry | null>(
    () => (aBaziDetail && bBaziDetail ? compareBaziProfiles(aBaziDetail, bBaziDetail) : null),
    [aBaziDetail, bBaziDetail],
  );

  const overall = result
    ? Math.round(
      astroResult && bazi
        ? result.score * 0.45 + astroResult.score * 0.3 + bazi.score * 0.25
        : result.score,
    )
    : 0;
  const overallGrade = overall >= 85 ? '高度同频' : overall >= 72 ? '同频互补' : overall >= 58 ? '可磨合' : '张力型';
  const weakestDim = result ? [...result.dimensions].sort((a, b) => a.score - b.score)[0] : null;
  const topAdvice = result
    ? [
      weakestDim ? `最需要练：${weakestDim.label} —— ${weakestDim.summary}` : '',
      '星座层面：先看双方上升节奏能不能接住，再看太阳表达是否同频；具体放到「星座」板块单独看。',
      bazi?.advice[0] ?? '',
    ].filter(Boolean)
    : [];

  const buildFullText = () => {
    if (!result || !bRecord) return '';
    return [
      `【综合合盘】${userName || '你'} × ${bRecord.name}`,
      `综合参考 ${overall} · ${overallGrade}｜紫微 ${result.score} / 星座 ${astroResult?.score ?? '—'} / 八字 ${bazi?.score ?? '—'}`,
      '综合分 = 紫微 45% + 星座 30% + 八字 25%；三系统分开看，不做单一宿命判断。',
      '',
      synastryText(result, userName || '你', bRecord.name),
      '',
      astroResult ? astroSynastryText(astroResult) : '',
      '',
      bazi ? baziSynastryText(bazi) : '',
    ].filter(Boolean).join('\n');
  };

  if (!astrolabe) {
    return (
      <div className="tool-empty">
        <div className="empty-sigil" aria-hidden="true">
          <span className="empty-sigil-ring" />
          <span className="empty-sigil-star">✦</span>
        </div>
        <p className="empty-kicker">先有 A 盘</p>
        <p className="dim">先在左侧排盘，或选择一个已保存用户作为 A。</p>
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="tool-pane">
        <div className="tool-intro">
          <h3>双人合盘</h3>
          <p>紫微五维看命盘结构，星座与八字各自独立成板；先给你一份高分 B 画像，再选 B 做具体合盘。</p>
        </div>
        {ideal && <IdealBProfile ideal={ideal} />}
        <div className="tool-empty slim">
          <p className="empty-kicker">还差 B 盘</p>
          <p className="dim">新建 B 只保存档案，不会切换当前 A 盘。</p>
          {onCreateClient && <button className="btn" onClick={() => setQuickOpen(true)}>+ 新建 B</button>}
        </div>
        {quickOpen && (
          <QuickClientSheet
            onClose={() => setQuickOpen(false)}
            onSave={(input, profile) => {
              const id = onCreateClient?.(input, profile);
              if (id) setBId(id);
            }}
          />
        )}
      </div>
    );
  }

  const copy = async () => {
    const text = buildFullText();
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
        <h3>双人合盘</h3>
        <p>紫微五维看命盘结构，星座与八字各自独立成板；先看你的高分 B 画像，再选 B 做具体合盘。A 使用当前盘，B 从已保存用户里选。</p>
      </div>

      <div className="tool-form synastry-form">
        <div className="field">
          <label>A 盘</label>
          <div className="synastry-fixed">{userName || '当前用户'} · {astrolabe.solarDate}</div>
        </div>
        <div className="field">
          <label>B 盘（已保存用户）</label>
          <div className="synastry-b-row">
            <select value={bRecord?.id ?? ''} onChange={(e) => setBId(e.target.value)}>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.relation} · {u.payload.birthday}
                </option>
              ))}
            </select>
            {onCreateClient && <button className="btn ghost small" onClick={() => setQuickOpen(true)}>+ 新建 B</button>}
          </div>
        </div>
      </div>

      {ideal && (
        result ? (
          <details className="ideal-b-details">
            <summary>
              <span>高分 B 画像 · {ideal.title}</span>
              <em>展开看适合你的类型</em>
            </summary>
            <IdealBProfile ideal={ideal} />
          </details>
        ) : (
          <IdealBProfile ideal={ideal} />
        )
      )}
      {!bChart && <p className="hint">B 盘生成失败，请检查对方出生信息。</p>}

      {result && bRecord && (
        <div className="synastry-result">
          <div className="synastry-card synastry-overview">
            <div className="synastry-card-top">三系统合盘 · {result.archetype.title}</div>
            <div className="synastry-names">
              <span>{userName || '你'}</span>
              <em>×</em>
              <span>{bRecord.name}</span>
            </div>
            <div className="synastry-score">{overall}</div>
            <div className="synastry-system-scores">
              <span>紫微 {result.score}</span>
              <span>星座 {astroResult?.score ?? '—'}</span>
              <span>八字 {bazi?.score ?? '—'}</span>
            </div>
            <div className="synastry-grade-line">{overallGrade} · 综合参考</div>
            <p className="synastry-oneline">{result.oneLine}</p>
            <div className="synastry-card-foot">紫微 45% · 星座 30% · 八字 25% · 关系参考</div>
          </div>

          {topAdvice.length > 0 && (
            <div className="synastry-top-advice">
              <div className="inspector-eyebrow">如果只记三句话</div>
              <ol>{topAdvice.map((a) => <li key={a}>{a}</li>)}</ol>
            </div>
          )}

          <div className="synastry-tabs">
            <button className={board === 'ziwei' ? 'active' : ''} onClick={() => setBoard('ziwei')}>
              <b>紫微</b><span>{result.score} · 命盘相合</span>
            </button>
            <button className={board === 'astro' ? 'active' : ''} onClick={() => setBoard('astro')} disabled={!astroResult}>
              <b>星座</b><span>{astroResult?.score ?? '—'} · 太阳/上升/下降</span>
            </button>
            <button className={board === 'bazi' ? 'active' : ''} onClick={() => setBoard('bazi')} disabled={!bazi}>
              <b>八字</b><span>{bazi?.score ?? '—'} · 日主/夫妻宫</span>
            </button>
          </div>

          {board === 'ziwei' && (
            <>
              <SynastryBreakdown result={result} />
              <div className="synastry-sections">
                {result.sections.map((s) => (
                  <section key={s.title} className="synastry-section">
                    <h4>{s.title}</h4>
                    <p>{s.body}</p>
                  </section>
                ))}
                <section className="synastry-section">
                  <h4>紫微相处建议</h4>
                  <ul>{result.advice.map((a) => <li key={a}>{a}</li>)}</ul>
                </section>
              </div>
            </>
          )}

          {board === 'astro' && astroResult && <AstroSynastryBoard data={astroResult} />}
          {board === 'bazi' && bazi && (
            <BaziSynastryBoard data={bazi} aDetail={aBaziDetail} bDetail={bBaziDetail} />
          )}

          <div className="tool-actions">
            <button className="btn" onClick={() => downloadCard(result, userName || '你', bRecord.name, overall, overallGrade)}>保存分享卡</button>
            <button className="btn ghost" onClick={copy}>{copied ? '✓ 已复制' : '复制三系统文案'}</button>
            <button
              className="btn ghost"
              onClick={() => onSaveService?.({
                type: 'synastry',
                title: `${userName || '你'} × ${bRecord.name} · 合盘`,
                summary: `综合 ${overall} · 紫微 ${result.score} / 星座 ${astroResult?.score ?? '—'} / 八字 ${bazi?.score ?? '—'} · ${result.archetype.title}`,
                detail: buildFullText(),
                clientIds: [activeUserId, bRecord.id].filter((x): x is string => Boolean(x)),
                clientNames: [userName || '你', bRecord.name],
              })}
            >
              保存为服务记录
            </button>
          </div>
          <p className="tool-note">
            紫微、星座、八字是三种不同的象征系统；综合分是三系统加权，不是感情判决，也不替代真实沟通、心理咨询或法律意见。星座上升为近似值，八字未纳藏干/旺衰/大运。
          </p>
          {quickOpen && (
            <QuickClientSheet
              onClose={() => setQuickOpen(false)}
              onSave={(input, profile) => {
                const id = onCreateClient?.(input, profile);
                if (id) setBId(id);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
