import type { HistoryItem } from '../types';

export default function HistoryPanel({
  items,
  onLoad,
  onDelete,
}: {
  items: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>客户信息</h2>
      {items.length === 0 ? (
        <p className="dim">暂无客户。排盘后点「保存此盘」即可记录。</p>
      ) : (
        <ul className="history-list">
          {items.map((h) => (
            <li key={h.id}>
              <button className="history-item" onClick={() => onLoad(h)}>
                <span>{h.label}</span>
                <span className="dim">{h.savedAt}</span>
              </button>
              <button className="history-del" onClick={() => onDelete(h.id)} title="删除">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
