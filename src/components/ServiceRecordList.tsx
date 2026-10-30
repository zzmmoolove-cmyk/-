import type { ServiceRecord } from '../types';
import { serviceLabel } from '../lib/services';

export default function ServiceRecordList({
  records,
  onOpen,
  emptyText = '还没有服务记录。生成起名 / 择日 / 合盘后，点「保存为服务记录」。',
}: {
  records: ServiceRecord[];
  onOpen: (id: string) => void;
  emptyText?: string;
}) {
  if (!records.length) {
    return <p className="dim service-empty">{emptyText}</p>;
  }

  return (
    <div className="service-records">
      {records.map((r) => (
        <button key={r.id} className="service-record" onClick={() => onOpen(r.id)}>
          <span className={`service-type type-${r.type}`}>{serviceLabel(r.type)}</span>
          <span className="service-record-main">
            <b>{r.title}</b>
            <em>{r.clientNames.length ? r.clientNames.join(' × ') : '未关联客户'} · {r.summary}</em>
          </span>
          <span className="service-record-side">
            <span className={`service-status ${r.status}`}>{r.status === 'delivered' ? '已交付' : '草稿'}</span>
            <em>{r.createdAt.split(' ')[0]}</em>
          </span>
        </button>
      ))}
    </div>
  );
}
