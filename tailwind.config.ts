import type { Config } from 'tailwindcss';

/**
 * Les valeurs vivent dans `src/app/globals.css` sous forme de custom properties.
 * Tailwind ne fait que les exposer : une seule source de vérité pour la palette.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        violet: {
          50: 'var(--violet-50)',
          200: 'var(--violet-200)',
          400: 'var(--violet-400)',
          600: 'var(--violet-600)',
          900: 'var(--violet-900)',
        },
        ink: 'var(--ink)',
        slate: {
          500: 'var(--slate-500)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Échelle imposée : 48 / 32 / 24 / 18 / 16 / 14
        'display-xl': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-lg': ['2rem', { lineHeight: '1.12', letterSpacing: '-0.03em' }],
        'display-md': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.03em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.65' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55' }],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        violet: '0 8px 30px rgba(124, 58, 237, 0.12)',
        'violet-lg': '0 16px 48px rgba(124, 58, 237, 0.18)',
      },
      backgroundImage: {
        // Le seul dégradé autorisé, réservé aux CTA principaux.
        cta: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
      },
      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
