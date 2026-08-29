import Link from 'next/link';
import Footer from '@/components/Footer';
import CheckoutButton from '@/components/CheckoutButton';
import { PRICING } from '@/lib/pricing';
import { isSupabaseConfigured } from '@/lib/env';
import { getSessionUser } from '@/lib/supabase/server';

export const metadata = { title: 'Tarifs — Trycut' };
export const dynamic = 'force-dynamic';

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const params = await searchParams;
  const user = isSupabaseConfigured ? await getSessionUser() : null;

  return (
    <>
      <main className="section py-10">
        <h1 className="text-2xl">Choisis ton rythme.</h1>

        {params.paiement === 'annule' ? (
          <p role="status" className="mt-4 rounded-2xl bg-violet-50 p-3 text-sm text-violet-900">
            Paiement annulé. Rien n’a été débité.
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          {PRICING.map((plan) => (
            <div
              key={plan.id}
              className={`card relative ${plan.highlighted ? 'border-2 border-violet-600' : ''}`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-5 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                  Le plus choisi
                </span>
              ) : null}

              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-violet-900">{plan.name}</span>
                <span className="font-display text-xl text-violet-900">
                  {plan.price}
                  <span className="text-sm font-normal text-slate-500">{plan.period}</span>
                </span>
              </div>

              <p className="mt-2 text-sm font-semibold text-violet-600">
                {plan.credits === 0
                  ? 'Aucune coupe incluse'
                  : `${plan.credits} coupes par mois`}
              </p>

              <ul className="mt-3 space-y-1 text-sm text-slate-500">
                {plan.features.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>

              <div className="mt-5">
                {plan.paymentLink ? (
                  <CheckoutButton
                    plan={plan.id === 'pack' ? 'pack' : 'pass'}
                    paymentLink={plan.paymentLink}
                    label={`Prendre le ${plan.name.toLowerCase()}`}
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    authenticated={Boolean(user)}
                  />
                ) : (
                  <Link href="/onboarding/photo" className="btn-outline w-full">
                    Voir le catalogue
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-violet-50 p-5 text-sm text-slate-500">
          <p className="font-semibold text-violet-900">Bon à savoir</p>
          <p className="mt-2">Les coupes ne sont pas reportables d’un mois sur l’autre.</p>
          <p className="mt-2">
            Tu peux résilier à tout moment depuis ton compte. L’accès reste actif jusqu’à la
            fin de la période déjà payée.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
