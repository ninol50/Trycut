/**
 * Silhouette de portrait, affichée à la place d'une photo absente. Aucun texte
 * technique : un visiteur ne doit jamais lire un chemin de fichier. Le cadre
 * garde le ratio de l'image attendue, donc aucun décalage quand elle arrive.
 */
export default function PortraitPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`grid h-full w-full place-items-center bg-violet-50 ${className ?? ''}`}
    >
      <svg
        width="72"
        height="72"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--violet-400)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3c3 0 5 2.1 5 5.2 0 2.1-.5 3.4-1.2 4.6-.4.7-.6 1.2-.6 1.9v.6" />
        <path d="M12 3C9 3 7 5.1 7 8.2c0 2.1.5 3.4 1.2 4.6.4.7.6 1.2.6 1.9v.6" />
        <path d="M4.5 21c.6-3 3.5-4.7 7.5-4.7s6.9 1.7 7.5 4.7" />
      </svg>
    </div>
  );
}
