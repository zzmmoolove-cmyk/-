import { useState } from 'react';
import type { ServiceRecord } from '../types';
import { serviceLabel } from '../lib/services';

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
            <p>{record.clientNames.join(' × ') || '未关联客户'} · {record.createdAt}</p>
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
          <span className="service-actions-spacer" />
          <button className="btn ghost danger-text" onClick={() => { if (window.confirm('删除这条服务记录？')) onDelete(); }}>删除</button>
        </div>
      </div>
    </div>
  );
}
