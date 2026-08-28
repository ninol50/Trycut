import Link from 'next/link';
import Footer from '@/components/Footer';
import CheckoutButton from '@/components/CheckoutButton';
import { PRICING, ONE_TIME_PACK } from '@/lib/pricing';
import { env } from '@/lib/env';
import { getSessionUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

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
        <h1 className="text-2xl">Trois façons d’essayer.</h1>

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

              <ul className="mt-3 space-y-1 text-sm text-slate-500">
                {plan.features.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>

              <div className="mt-5">
                {plan.id === 'free' ? (
                  <Link href="/onboarding" className="btn-secondary w-full">
                    Essayer gratuitement
                  </Link>
                ) : (
                  <CheckoutButton
                    plan={plan.id === 'pack' ? 'pack' : 'pass'}
                    label={`Prendre le ${plan.name.toLowerCase()}`}
                    variant={plan.highlighted ? 'primary' : 'secondary'}
                    authenticated={Boolean(user)}
                  />
                )}
              </div>
            </div>
          ))}

          {env.enableOneTimePack ? (
            <div className="card">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg font-bold text-violet-900">
                  {ONE_TIME_PACK.name}
                </span>
                <span className="font-display text-xl text-violet-900">{ONE_TIME_PACK.price}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Paiement unique, {ONE_TIME_PACK.credits} essais {ONE_TIME_PACK.validity}. Sans
                abonnement.
              </p>
              <div className="mt-5">
                <CheckoutButton
                  plan="pack_oneshot"
                  label="Acheter le pack"
                  variant="secondary"
                  authenticated={Boolean(user)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl bg-violet-50 p-5 text-sm text-slate-500">
          <p className="font-semibold text-violet-900">Bon à savoir</p>
          <p className="mt-2">
            Les crédits ne sont pas reportables d’un mois sur l’autre.
          </p>
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
