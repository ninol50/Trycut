import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { PostHogProvider } from '@/components/PostHogProvider';
import { MotionProvider } from '@/components/MotionProvider';
import { siteUrl } from '@/lib/env';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Trycut — teste ta prochaine coupe avant de t’asseoir dans le fauteuil',
    template: '%s — Trycut',
  },
  description:
    'Importe un selfie, choisis une coupe, une couleur ou un accessoire, et vois le résultat en trente secondes. Sans risque, sans rendez-vous.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Trycut',
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
      {/*
        Typographies chargées par lien plutôt que par `next/font` : General
        Sans vient de Fontshare, que `next/font/google` ne sert pas, et un
        chargement par lien évite un fetch réseau au moment du build.

        La règle `no-page-custom-font` vise le Pages Router, où une balise
        <link> hors de `_document` ne s'applique qu'à une page. Ce projet n'a
        pas de répertoire `pages/` : le layout racine couvre toutes les routes.
      */}
      {/* eslint-disable @next/next/no-page-custom-font */}
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=general-sans@700,600&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      {/* eslint-enable @next/next/no-page-custom-font */}
      <body>
        <Suspense fallback={null}>
          <PostHogProvider>
            <MotionProvider>{children}</MotionProvider>
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
