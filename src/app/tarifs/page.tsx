import type { Metadata } from 'next';
import Link from 'next/link';
import { getUser } from '@/lib/supabase/server';
import { PricingTable } from '@/components/PricingTable';

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Un pack de 15 essais à 4,99 € en paiement unique, ou un pass mensuel pour ceux qui publient souvent.',
};

export default async function PricingPage() {
  const user = await getUser();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-5 py-10">
      <Link href="/" className="text-body-sm font-semibold text-violet-600">
        ← Accueil
      </Link>

      <h1 className="mt-6 text-display-lg">Tarifs</h1>
      <p className="mt-3 text-body text-slate-500">
        On change de coupe quelques fois par an, pas toutes les semaines. C’est
        pour ça que le pack se paie une fois.
      </p>

      <div className="mt-8">
        <PricingTable authenticated={user !== null} />
      </div>

      <section className="mt-10 rounded-2xl border border-violet-200 bg-white p-5">
        <h2 className="text-display-md">À savoir</h2>
        <ul className="mt-3 space-y-2 text-body-sm text-slate-500">
          <li>Les 15 essais du pack sont valables 6 mois à partir de l’achat.</li>
          <li>Les essais du pass mensuel ne sont pas reportés d’un mois sur l’autre.</li>
          <li>Le pass se résilie à tout moment depuis ton compte, sans justification.</li>
          <li>Paiements en mode test tant que le service n’est pas ouvert au public.</li>
        </ul>
      </section>
    </main>
  );
}
