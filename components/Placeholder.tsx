interface PlaceholderProps {
  width: number;
  height: number;
  label: string;
  className?: string;
}

/**
 * Placeholder violet aux dimensions explicites : aucun layout shift
 * tant que les visuels de démo ne sont pas déposés dans /public/demo.
 */
export default function Placeholder({ width, height, label, className }: PlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 text-center ${className ?? ''}`}
      style={{ width: '100%', maxWidth: width, aspectRatio: `${width} / ${height}` }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--violet-400)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="8.5" cy="9" r="1.6" />
        <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17" />
      </svg>
      <span className="px-4 text-xs text-violet-600">{label}</span>
    </div>
  );
}
