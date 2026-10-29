import { useMemo, useState } from 'react';
import { astro } from 'iztro';
import type { Astrolabe, ChartOptions, UserRecord } from '../types';
import { buildAstrolabe } from '../lib/buildChart';
import { compareCharts, synastryText } from '../lib/synastry';

function optionsFrom(p: UserRecord['payload']): ChartOptions {
  return {
    algorithm: p.algorithm ?? 'default',
    yearDivide: p.yearDivide ?? 'normal',
    ageDivide: p.ageDivide ?? 'normal',
    horoscopeDivide: p.horoscopeDivide ?? 'normal',
    dayDivide: p.dayDivide ?? 'current',
  };
}

function downloadCard(result: ReturnType<typeof compareCharts>, aName: string, bName: string) {
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
  ctx.fillText('紫 微 合 盘', 450, 120);

  ctx.fillStyle = '#f1e6cf';
  ctx.font = '700 56px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText(`${aName} × ${bName}`, 450, 250);

  ctx.fillStyle = '#e8cc93';
  ctx.font = '700 124px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText(String(result.score), 450, 470);
  ctx.fillStyle = 'rgba(232,204,147,.72)';
  ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif';
  ctx.fillText('契 合 度', 450, 510);

  ctx.fillStyle = '#f1e6cf';
  ctx.font = '600 34px "Songti SC", "Noto Serif SC", serif';
  ctx.fillText(result.grade, 450, 580);

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
  ctx.fillText('紫微斗数 · 观星 · 关系结构参考', 450, 1155);

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
}: {
  astrolabe: Astrolabe | null;
  users: UserRecord[];
  activeUserId: string | null;
  userName?: string;
  options: ChartOptions;
}) {
  const candidates = useMemo(
    () => users.filter((u) => u.id !== activeUserId),
    [users, activeUserId],
  );
  const [bId, setBId] = useState<string>(candidates[0]?.id ?? '');
  const [copied, setCopied] = useState(false);

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
          <p>用命宫、夫妻宫、福德宫的主星五行与星性，看吸引力、沟通方式与容易卡住的地方。</p>
        </div>
        <div className="tool-empty slim">
          <p className="empty-kicker">还差 B 盘</p>
          <p className="dim">在左侧「用户信息」里保存另一个人的档案（姓名 + 出生信息），再回来选 B。</p>
        </div>
      </div>
    );
  }

  const copy = async () => {
    if (!result || !bRecord) return;
    try {
      await navigator.clipboard.writeText(synastryText(result, userName || '你', bRecord.name));
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
        <p>用命宫、夫妻宫、福德宫的主星五行与星性，看吸引力、沟通方式与容易卡住的地方。A 使用当前盘，B 从已保存用户里选。</p>
      </div>

      <div className="tool-form synastry-form">
        <div className="field">
          <label>A 盘</label>
          <div className="synastry-fixed">{userName || '当前用户'} · {astrolabe.solarDate}</div>
        </div>
        <div className="field">
          <label>B 盘（已保存用户）</label>
          <select value={bRecord?.id ?? ''} onChange={(e) => setBId(e.target.value)}>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.relation} · {u.payload.birthday}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!bChart && <p className="hint">B 盘生成失败，请检查对方出生信息。</p>}

      {result && bRecord && (
        <div className="synastry-result">
          <div className="synastry-card">
            <div className="synastry-card-top">紫微合盘 · {result.grade}</div>
            <div className="synastry-names">
              <span>{userName || '你'}</span>
              <em>×</em>
              <span>{bRecord.name}</span>
            </div>
            <div className="synastry-score">{result.score}</div>
            <div className="synastry-kws">{result.keywords.map((k) => <span key={k}>{k}</span>)}</div>
            <p className="synastry-oneline">{result.oneLine}</p>
            <div className="synastry-card-foot">五行 {result.elements.a} × {result.elements.b} · 关系参考</div>
          </div>

          <div className="synastry-sections">
            {result.sections.map((s) => (
              <section key={s.title} className="synastry-section">
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </section>
            ))}
            <section className="synastry-section">
              <h4>相处建议</h4>
              <ul>
                {result.advice.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </section>
          </div>

          <div className="tool-actions">
            <button className="btn" onClick={() => downloadCard(result, userName || '你', bRecord.name)}>保存分享卡</button>
            <button className="btn ghost" onClick={copy}>{copied ? '✓ 已复制' : '复制合盘文案'}</button>
          </div>
          <p className="tool-note">
            分数看的是结构匹配与张力，不是感情好坏；低分也可能代表高吸引。合盘是关系参考，不替代沟通、心理咨询或法律意见。
          </p>
        </div>
      )}
    </div>
  );
}
