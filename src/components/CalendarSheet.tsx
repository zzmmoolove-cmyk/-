import CalendarPanel from './CalendarPanel';

export default function CalendarSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="calendar-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="calendar-sheet-head">
          <div>
            <div className="inspector-eyebrow">资料 · 万年历</div>
            <h2>万年历</h2>
            <p>公历 / 农历、干支、生肖、节气与黄历宜忌。</p>
          </div>
          <button className="sheet-close" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="calendar-sheet-body">
          <CalendarPanel />
        </div>
      </div>
    </div>
  );
}
