import { useState } from 'react';
import type { ServiceRecord } from '../types';
import { serviceLabel } from '../lib/services';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printService(record: ServiceRecord): void {
  const w = window.open('', '_blank', 'width=820,height=1080');
  if (!w) {
    window.alert('浏览器拦截了新窗口，请允许弹窗后再导出。');
    return;
  }
  const status = record.status === 'delivered' ? '已交付' : '草稿';
  w.document.write(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(record.title)} · 服务记录</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1c1b18; font-family: "Songti SC", "STSong", "Noto Serif CJK SC", serif; font-size: 12pt; line-height: 1.85; }
  .brand { font-size: 9pt; letter-spacing: 3px; color: #8a6d1d; border-bottom: 1px solid #c9a35c; padding-bottom: 7mm; }
  h1 { margin: 8mm 0 2mm; font-size: 21pt; font-weight: 600; letter-spacing: 1px; }
  .meta { font-size: 9.5pt; color: #666; margin-bottom: 6mm; }
  .status { display: inline-block; border: 1px solid #c9a35c; border-radius: 99px; padding: 0 3mm; font-size: 8.5pt; color: #8a6d1d; margin-left: 2mm; }
  .summary { padding: 4mm 5mm; background: #f7f3e9; border-left: 2px solid #c9a35c; font-size: 10.5pt; margin-bottom: 5mm; }
  pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 11pt; line-height: 1.9; margin: 0; }
  footer { margin-top: 8mm; padding-top: 3mm; border-top: 1px solid #ddd; font-size: 8.5pt; color: #888; }
</style>
</head>
<body>
  <div class="brand">紫微斗数 · 观星</div>
  <h1>${escapeHtml(record.title)}</h1>
  <div class="meta">${record.clientNames.length ? escapeHtml(record.clientNames.join(' × ')) : '未关联命主'} · ${escapeHtml(record.createdAt)}<span class="status">${status}</span></div>
  <div class="summary">${escapeHtml(record.summary)}</div>
  <pre>${escapeHtml(record.detail)}</pre>
  <footer>传统命理参考，不构成医疗、法律、投资或情感建议。 · 紫微斗数观星</footer>
</body>
</html>`);
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 350);
}

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

export default function ServiceRecordSheet({
  record,
  onClose,
  onStatus,
  onDelete,
}: {
  record: ServiceRecord;
  onClose: () => void;
  onStatus: (status: 'draft' | 'delivered') => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="service-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="service-sheet-head">
          <div>
            <div className="inspector-eyebrow">服务记录 · {serviceLabel(record.type)}</div>
            <h2>{record.title}</h2>
            <p>{record.clientNames.join(' × ') || '未关联命主'} · {record.createdAt}</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="service-sheet-body">
          <div className="service-sheet-meta">
            <span className={`service-status ${record.status}`}>{record.status === 'delivered' ? '已交付' : '草稿'}</span>
            <span className="dim">{record.summary}</span>
          </div>
          <pre className="service-detail">{record.detail}</pre>
        </div>

        <div className="service-sheet-actions">
          <button className="btn" onClick={() => onStatus(record.status === 'delivered' ? 'draft' : 'delivered')}>
            {record.status === 'delivered' ? '撤回为草稿' : '标记已交付'}
          </button>
          <button
            className="btn ghost"
            onClick={async () => { await copyText(record.detail); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }}
          >
            {copied ? '✓ 已复制' : '复制全文'}
          </button>
          <button className="btn ghost" onClick={() => printService(record)}>导出 PDF</button>
          <span className="service-actions-spacer" />
          <button className="btn ghost danger-text" onClick={() => { if (window.confirm('删除这条服务记录？')) onDelete(); }}>删除</button>
        </div>
      </div>
    </div>
  );
}
