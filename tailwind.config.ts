import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          50: 'var(--violet-50)',
          100: '#EDE9FE',
          200: 'var(--violet-200)',
          400: 'var(--violet-400)',
          600: 'var(--violet-600)',
          900: 'var(--violet-900)',
        },
        ink: 'var(--ink)',
        line: 'var(--line)',
        slate: { 500: 'var(--slate-500)' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'General Sans', 'Satoshi', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.65' }],
        lg: ['18px', { lineHeight: '1.6' }],
        xl: ['24px', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        '2xl': ['32px', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
        '3xl': ['40px', { lineHeight: '1.05', letterSpacing: '-0.035em' }],
        '4xl': ['48px', { lineHeight: '1.02', letterSpacing: '-0.035em' }],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        violet: '0 8px 30px rgba(124,58,237,0.12)',
        'violet-lg': '0 16px 50px rgba(124,58,237,0.18)',
      },
      backgroundImage: {
        'cta-gradient': 'linear-gradient(135deg, #7C3AED, #A78BFA)',
      },
    },
  },
  plugins: [],
};

export default config;
