import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

const STORAGE_KEY = 'ziwei-client-pill-pos';

type Pos = { x: number; y: number };

function initialPos(): Pos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Pos;
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.innerWidth < 760) return { x: 12, y: 66 };
  return { x: 280, y: 10 };
}

function clampPos(p: Pos, el: HTMLElement | null): Pos {
  const w = el?.offsetWidth ?? 190;
  const h = el?.offsetHeight ?? 38;
  const maxX = Math.max(8, window.innerWidth - w - 8);
  const maxY = Math.max(8, window.innerHeight - h - 8);
  return { x: Math.min(Math.max(8, p.x), maxX), y: Math.min(Math.max(8, p.y), maxY) };
}

export default function DraggableClientPill({
  name,
  relation,
  state,
  isPrimary,
  onOpen,
}: {
  name?: string;
  relation?: string;
  state?: string;
  isPrimary?: boolean;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const drag = useRef<{ id: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [pos, setPos] = useState<Pos>(initialPos);
  const posRef = useRef<Pos>(pos);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p, ref.current));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const save = (p: Pos) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  };

  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    if (!d.moved) return;
    const next = clampPos({ x: e.clientX - d.offsetX, y: e.clientY - d.offsetY }, ref.current);
    posRef.current = next;
    setPos(next);
  };

  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (d.moved) {
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 0);
      save(posRef.current);
    }
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const click = () => {
    if (suppressClick.current) return;
    onOpen();
  };

  return (
    <button
      ref={ref}
      className={`top-client client-pill-float ${dragging ? 'dragging' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onClick={click}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      title="拖动可移动；点击切换当前命主"
      aria-label="当前命主，拖动可移动，点击切换"
    >
      <span className="top-avatar">{Array.from(name || '客')[0]}</span>
      <span>
        <b>{name || '选择命主'}</b>
        <em>{name ? `${relation || '本人'}${isPrimary ? ' · 主命主' : ''}` : '按命主工作'}</em>
      </span>
      {state && <span className={`top-state ${state === '已保存' ? 'saved' : 'dirty'}`}>{state}</span>}
      <span className="client-pill-grip" aria-hidden="true">⠿</span>
    </button>
  );
}
