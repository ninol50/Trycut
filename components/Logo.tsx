/** Marque : enseigne de barbier stylisée, carré violet plein. */
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-grid place-items-center rounded-xl bg-violet-600"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="7" y="5" width="10" height="14" rx="5" />
        <path d="M7 9.5 17 5.5M7 13.5 17 9.5M7 17.5 17 13.5" />
        <path d="M5.5 3.5h13M5.5 20.5h13" />
      </svg>
    </span>
  );
}
