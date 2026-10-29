export default function Sigil({ className = '' }: { className?: string }) {
  return (
    <svg className={`sigil ${className}`} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" className="sigil-ring" />
      <circle cx="32" cy="32" r="23" className="sigil-dashed" />
      <path d="M32 5 L36.4 27.6 L59 32 L36.4 36.4 L32 59 L27.6 36.4 L5 32 L27.6 27.6 Z" className="sigil-star" />
      <circle cx="32" cy="32" r="4.2" className="sigil-core" />
      <circle cx="50" cy="14" r="1.4" className="sigil-dot" />
      <circle cx="14" cy="49" r="1" className="sigil-dot" />
      <circle cx="52" cy="47" r="0.9" className="sigil-dot" />
    </svg>
  );
}
