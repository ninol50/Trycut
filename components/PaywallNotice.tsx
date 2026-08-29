import Link from 'next/link';

/**
 * Écran opposé à qui n'a pas d'abonnement actif.
 *
 * Il ne montre ni le studio ni le catalogue : sans paiement, il n'y a pas
 * d'accès. Il dit ce qui manque et où le prendre — jamais un refus sec.
 */
export default function PaywallNotice({ reason = 'none' }: { reason?: 'none' | 'past_due' }) {
  const pastDue = reason === 'past_due';

  return (
    <main className="section py-14">
      <h1 className="text-2xl">
        {pastDue ? 'Ton dernier paiement a été refusé.' : 'Il te faut un abonnement.'}
      </h1>

      <p className="mt-4 text-base text-slate-500">
        {pastDue
          ? 'L’accès reprend dès que la facture est réglée. Tes coupes restantes sont conservées.'
          : 'L’essai virtuel est réservé aux abonnés. 3 € par semaine pour 5 coupes, ou 10 € par mois pour 23 coupes.'}
      </p>

      <div className="mt-8 space-y-3">
        <Link href="/tarifs" className="btn-primary w-full">
          {pastDue ? 'Mettre à jour mon paiement' : 'Voir les offres'}
        </Link>
        <Link href="/compte" className="btn-outline w-full">
          Mon compte
        </Link>
      </div>
    </main>
  );
}
