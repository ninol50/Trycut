import Link from 'next/link';
import { Hero } from '@/components/landing/Hero';
import { Reveal } from '@/components/landing/Reveal';
import { Faq } from '@/components/landing/Faq';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { LandingCta } from '@/components/landing/LandingCta';
import { OFFERS } from '@/lib/offers';

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'Réponds à quelques questions',
    body: 'Longueur, texture, forme du visage. On en tire une sélection de coupes qui te correspondent vraiment.',
  },
  {
    title: 'Importe un selfie',
    body: 'Visage de face, bien éclairé, sans casquette. C’est tout ce qu’il faut.',
  },
  {
    title: 'Compare avant / après',
    body: 'Tu télécharges le résultat au format 9:16 et tu le montres à ton coiffeur.',
  },
];

const EXAMPLES: readonly { before: string; after: string; label: string }[] = [
  { before: '/demo/before-1.jpg', after: '/demo/after-1.jpg', label: 'Dégradé bas' },
  { before: '/demo/before-2.jpg', after: '/demo/after-2.jpg', label: 'Boucles dégagées' },
  { before: '/demo/before-3.jpg', after: '/demo/after-3.jpg', label: 'Gris cendré' },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh bg-white">
      <Hero />

      {/* 3 exemples de transformations ------------------------------------ */}
      <section className="mx-auto w-full max-w-md px-5 py-12">
        <Reveal>
          <h2 className="text-display-lg">Trois transformations, trois profils.</h2>
          <p className="mt-3 text-body text-slate-500">
            Même photo de départ, même lumière. Seule la zone concernée change.
          </p>
        </Reveal>

        <div className="mt-8 space-y-8">
          {EXAMPLES.map((example, index) => (
            <Reveal key={example.label} delay={index * 0.05}>
              <BeforeAfterSlider
                beforeSrc={example.before}
                afterSrc={example.after}
                beforeAlt={`Avant : ${example.label}`}
                afterAlt={`Après : ${example.label}`}
                autoplay={index === 0}
              />
              <p className="mt-3 text-body-sm font-semibold text-violet-900">{example.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comment ça marche ------------------------------------------------- */}
      <section className="mx-auto w-full max-w-md px-5 py-12">
        <Reveal>
          <h2 className="text-display-lg">Comment ça marche</h2>
        </Reveal>
        <ol className="mt-8 space-y-6">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.05}>
              <li className="flex gap-4">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                             bg-violet-50 text-body font-semibold text-violet-600"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-display-md">{step.title}</h3>
                  <p className="mt-1 text-body text-slate-500">{step.body}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Tarifs résumés ---------------------------------------------------- */}
      <section className="mx-auto w-full max-w-md px-5 py-12">
        <Reveal>
          <h2 className="text-display-lg">Tarifs</h2>
          <p className="mt-3 text-body text-slate-500">
            Le pack se paie une fois. Pas d’abonnement imposé.
          </p>
        </Reveal>

        <div className="mt-8 space-y-4">
          {OFFERS.map((offer, index) => (
            <Reveal key={offer.id} delay={index * 0.05}>
              <div
                className={
                  offer.highlighted
                    ? 'rounded-2xl border-2 border-violet-600 bg-violet-50 p-5 shadow-violet'
                    : 'card'
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-display-md">{offer.name}</h3>
                  <span className="text-body-lg font-semibold text-violet-600">{offer.price}</span>
                </div>
                {offer.cadence && (
                  <p className="text-body-sm text-slate-500">{offer.cadence}</p>
                )}
                <p className="mt-2 text-body text-slate-500">
                  {offer.credits} essai{offer.credits > 1 ? 's' : ''}
                  {offer.id === 'pass' ? ' par mois' : ''}
                </p>
                {offer.highlighted && (
                  <p className="mt-2 inline-flex rounded-full bg-violet-600 px-3 py-1 text-body-sm font-semibold text-white">
                    Le plus choisi
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <Link
            href="/tarifs"
            className="mt-5 inline-flex min-h-tap items-center text-body font-semibold text-violet-600 underline"
          >
            Voir le détail des offres
          </Link>
        </Reveal>
      </section>

      {/* FAQ --------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-md px-5 py-12">
        <Reveal>
          <h2 className="text-display-lg">Questions fréquentes</h2>
        </Reveal>
        <div className="mt-8">
          <Faq />
        </div>
      </section>

      {/* CTA final — le seul bloc violet de la page ------------------------- */}
      <LandingCta />

      <footer className="mx-auto w-full max-w-md px-5 pb-10 pt-8 text-body-sm text-slate-500">
        <nav className="-mx-2 flex flex-wrap items-center gap-x-2">
          <Link href="/tarifs" className="inline-flex min-h-tap min-w-tap items-center justify-center underline">
            Tarifs
          </Link>
          <Link href="/confidentialite" className="inline-flex min-h-tap min-w-tap items-center justify-center underline">
            Confidentialité
          </Link>
          <Link href="/connexion" className="inline-flex min-h-tap min-w-tap items-center justify-center underline">
            Se connecter
          </Link>
        </nav>
        <p className="mt-4">Réservé aux personnes de 15 ans et plus.</p>
      </footer>
    </main>
  );
}
