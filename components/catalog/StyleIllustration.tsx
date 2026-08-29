/**
 * Vignettes du catalogue, dessinées.
 *
 * Pas de photos : elles montreraient des personnes réelles, poseraient une
 * question de droits sur un site marchand, et vieilliraient mal. Un trait
 * violet sur fond clair reste lisible en 96 px, cohérent avec le reste de
 * l'interface, et n'appartient à personne.
 *
 * Les photos de référence ne sont jamais affichées : elles ne servent qu'à
 * montrer la coupe au modèle au moment du rendu.
 */

const STROKE = 'var(--violet-600)';
const FILL = 'var(--violet-200)';

/** Tête et épaules, identiques partout : seule la matière ajoutée change. */
function Head() {
  return (
    <>
      <path
        d="M32 84c0-9 7-14 16-14s16 5 16 14"
        fill="none"
        stroke={STROKE}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <ellipse cx="48" cy="46" rx="16" ry="19" fill="none" stroke={STROKE} strokeWidth="2.4" />
      <path d="M32 44h-3M64 44h3" stroke={STROKE} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

const SHAPES: Record<string, React.ReactNode> = {
  'cut-buzz': <path d="M32 42a16 16 0 0 1 32 0c0 2-32 2-32 0Z" fill={FILL} />,
  'cut-chauve': <path d="M34 40a14 14 0 0 1 28 0Z" fill={FILL} opacity="0.5" />,
  'cut-degrade-espagnol': (
    <path d="M31 44c0-13 7-20 17-20s17 7 17 20c0-6-4-8-9-8-6 0-8 4-14 4-5 0-11-2-11 4Z" fill={FILL} />
  ),
  'cut-cuenca': (
    <path d="M31 44c0-13 7-20 17-20s17 7 17 20c-2-8-8-10-17-6-6 3-13 1-17 6Z" fill={FILL} />
  ),
  'cut-middle-part': (
    <path
      d="M31 48c0-15 7-24 17-24s17 9 17 24c-2-11-6-16-11-18-2 6-8 6-10 0-6 3-11 7-13 18Z"
      fill={FILL}
    />
  ),
  'cut-lisse-cote': (
    <path d="M31 44c0-13 7-20 17-20s17 7 17 20c-3-10-9-14-20-11-8 2-12 4-14 11Z" fill={FILL} />
  ),
  'cut-permanente-courte': (
    <path
      d="M30 44c0-14 8-22 18-22s18 8 18 22c-2-4-5-3-7-6-3 3-6 1-9-2-3 4-7 4-10 1-3 3-8 2-10 7Z"
      fill={FILL}
    />
  ),
  'cut-permanente-mi-longue': (
    <path
      d="M27 52c0-19 9-30 21-30s21 11 21 30c-3-6-6-6-8-11-4 4-8 2-11-3-4 5-9 5-12 1-4 4-9 4-11 13Z"
      fill={FILL}
    />
  ),
  'cut-permanente-longue': (
    <path
      d="M25 66c0-28 10-44 23-44s23 16 23 44c-4-10-7-12-9-20-5 5-10 2-13-5-5 6-11 6-15 1-5 5-7 10-9 24Z"
      fill={FILL}
    />
  ),
  'cut-afro-court': <circle cx="48" cy="38" r="21" fill={FILL} />,
  'cut-afro-mi-long': <circle cx="48" cy="35" r="26" fill={FILL} />,
  'cut-locks': (
    <g fill={FILL}>
      <path d="M31 42a17 17 0 0 1 34 0Z" />
      <rect x="30" y="41" width="4" height="24" rx="2" />
      <rect x="38" y="41" width="4" height="20" rx="2" />
      <rect x="46" y="41" width="4" height="26" rx="2" />
      <rect x="54" y="41" width="4" height="20" rx="2" />
      <rect x="62" y="41" width="4" height="24" rx="2" />
    </g>
  ),
  'cut-tresses': (
    <g>
      <path d="M31 44a17 17 0 0 1 34 0Z" fill={FILL} />
      <g stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M35 44c1-9 4-14 8-16M42 43c1-9 3-14 6-16M48 42c0-9 1-14 2-16M54 43c-1-9-3-14-6-16M61 44c-1-9-4-14-8-16" />
      </g>
    </g>
  ),
  'cut-cheveux-longs': (
    <path
      d="M28 70c0-30 9-46 20-46s20 16 20 46c-3-14-6-24-9-30-4 4-14 4-18 0-4 6-10 16-13 30Z"
      fill={FILL}
    />
  ),
  'cut-long-attache': (
    <g fill={FILL}>
      <path d="M31 44c0-13 7-20 17-20s17 7 17 20c-3-11-9-15-17-15s-14 4-17 15Z" />
      <circle cx="69" cy="46" r="7" />
    </g>
  ),
  'cut-long-attache-boucle': (
    <g fill={FILL}>
      <path d="M31 44c0-13 7-20 17-20s17 7 17 20c-3-11-9-15-17-15s-14 4-17 15Z" />
      <circle cx="69" cy="45" r="5" />
      <circle cx="72" cy="52" r="4" />
      <circle cx="66" cy="53" r="4" />
    </g>
  ),

  'beard-rase': (
    <path
      d="M38 62c3 4 7 6 10 6s7-2 10-6"
      fill="none"
      stroke={STROKE}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="2 4"
    />
  ),
  'beard-trois-jours': (
    <path d="M34 52c0 10 6 17 14 17s14-7 14-17c0 7-6 11-14 11s-14-4-14-11Z" fill={FILL} opacity="0.55" />
  ),
  'beard-courte': (
    <path d="M33 50c0 12 7 20 15 20s15-8 15-20c0 8-7 13-15 13s-15-5-15-13Z" fill={FILL} />
  ),
  'beard-fournie': (
    <path d="M32 48c0 17 7 27 16 27s16-10 16-27c0 10-7 16-16 16s-16-6-16-16Z" fill={FILL} />
  ),
  'beard-longue': (
    <path d="M32 48c0 26 7 36 16 36s16-10 16-36c0 11-7 17-16 17s-16-6-16-17Z" fill={FILL} />
  ),
  'beard-bouc': <path d="M42 58h12c0 8-2 12-6 12s-6-4-6-12Z" fill={FILL} />,
  'beard-moustache': (
    <path d="M39 55c3-2 6-2 9 0 3-2 6-2 9 0-2 3-5 4-9 3-4 1-7 0-9-3Z" fill={FILL} />
  ),
  'beard-bouc-moustache': (
    <g fill={FILL}>
      <path d="M39 55c3-2 6-2 9 0 3-2 6-2 9 0-2 3-5 4-9 3-4 1-7 0-9-3Z" />
      <path d="M42 60h12c0 7-2 10-6 10s-6-3-6-10Z" />
    </g>
  ),
  'beard-collier': (
    <path
      d="M33 50c0 12 7 20 15 20s15-8 15-20c0 9-7 15-15 15s-15-6-15-15Z"
      fill="none"
      stroke={STROKE}
      strokeWidth="3"
    />
  ),
};

const COLOR_SWATCHES: Record<string, string> = {
  'color-platine': '#e8e4dc',
  'color-cendre': '#b9b3a8',
  'color-caramel': '#a06a38',
  'color-meches': '#c9a273',
  'color-blond-miel': '#d6a75a',
  'color-chatain-froid': '#5c4534',
  'color-noir-intense': '#1c1a1c',
  'color-roux-cuivre': '#b1512a',
};

function chain(cy: number, rx: number, width: number) {
  return (
    <ellipse cx="48" cy={cy} rx={rx} ry={rx * 0.42} fill="none" stroke={STROKE} strokeWidth={width} />
  );
}

const ACCESSORIES: Record<string, React.ReactNode> = {
  'acc-chaine-fine': chain(52, 14, 2.6),
  'acc-chaine-maille': chain(58, 19, 5),
  'acc-chaine-pendentif': (
    <g>
      {chain(54, 17, 2.6)}
      <rect x="43" y="60" width="10" height="10" rx="2" fill={FILL} stroke={STROKE} strokeWidth="2" />
    </g>
  ),
  'acc-double-chaine': (
    <g>
      {chain(48, 13, 2.6)}
      {chain(58, 19, 2.6)}
    </g>
  ),
  'acc-creole-fine': <circle cx="48" cy="48" r="15" fill="none" stroke={STROKE} strokeWidth="2.4" />,
  'acc-puce-discrete': <circle cx="48" cy="48" r="6" fill={FILL} stroke={STROKE} strokeWidth="2.4" />,
  'acc-anneau-epais': <circle cx="48" cy="48" r="15" fill="none" stroke={STROKE} strokeWidth="6" />,
  'acc-grillz-simple': (
    <rect x="44" y="42" width="8" height="12" rx="2" fill={FILL} stroke={STROKE} strokeWidth="2.4" />
  ),
  'acc-grillz-bas': (
    <rect x="30" y="50" width="36" height="12" rx="3" fill={FILL} stroke={STROKE} strokeWidth="2.4" />
  ),
  'acc-grillz-complet': (
    <g fill={FILL} stroke={STROKE} strokeWidth="2.4">
      <rect x="30" y="34" width="36" height="12" rx="3" />
      <rect x="30" y="50" width="36" height="12" rx="3" />
    </g>
  ),
};

interface StyleIllustrationProps {
  slug: string;
  category: string;
}

export default function StyleIllustration({ slug, category }: StyleIllustrationProps) {
  const swatch = COLOR_SWATCHES[slug];

  return (
    <svg
      viewBox="0 0 96 96"
      className="absolute inset-0 h-full w-full"
      role="presentation"
      aria-hidden="true"
    >
      {swatch ? (
        <circle cx="48" cy="48" r="24" fill={swatch} stroke={STROKE} strokeWidth="2" />
      ) : category === 'accessory' ? (
        (ACCESSORIES[slug] ?? null)
      ) : (
        <>
          <Head />
          {SHAPES[slug] ?? null}
        </>
      )}
    </svg>
  );
}
