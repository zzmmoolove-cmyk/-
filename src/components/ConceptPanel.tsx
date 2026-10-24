import { useEffect } from 'react';

export type ConceptView = {
  title: string;
  subtitle?: string;
  tags?: string[];
  sections: { label?: string; text: string }[];
  extra?: { label: string; value: string }[];
  footer?: string;
};

export default function ConceptPanel({ view, onClose }: { view: ConceptView; onClose: () => void }) {
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={view.title}>
        <div className="modal-head">
          <div>
            <h2>{view.title}</h2>
            <div className="modal-sub">
              {view.subtitle && <span>{view.subtitle}</span>}
              {view.tags?.map((t) => (
                <span key={t} className="badge">{t}</span>
              ))}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {view.sections.map((s, i) => (
            <section key={i} className="concept-section">
              {s.label && <h3 className="section-title">{s.label}</h3>}
              <p className="star-detail">{s.text}</p>
            </section>
          ))}

          {view.extra && view.extra.length > 0 && (
            <section className="concept-section">
              {view.extra.map((e) => (
                <div key={e.label} className="concept-extra">
                  <b>{e.label}</b>
                  <span>{e.value}</span>
                </div>
              ))}
            </section>
          )}

          {view.footer && <p className="hint">{view.footer}</p>}
        </div>
      </div>
    </div>
  );
}
