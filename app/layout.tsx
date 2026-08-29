import type { Metadata, Viewport } from 'next';
import Analytics from '@/components/Analytics';
import { publicEnv } from '@/lib/public-env';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trycut — teste ta prochaine coupe avant de t’asseoir dans le fauteuil',
  description:
    'Importe un selfie, choisis une coupe, une couleur ou un accessoire, et vois le résultat en 30 secondes.',
  metadataBase: new URL(publicEnv.siteUrl),
  openGraph: {
    title: 'Trycut — teste ta prochaine coupe',
    description: 'Vois ta prochaine coupe sur ton visage avant de la faire.',
    locale: 'fr_FR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7C3AED',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
