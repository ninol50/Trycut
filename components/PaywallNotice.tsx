import Link from 'next/link';

import { offreEntree } from '@/lib/pricing';

/**
 * Écran opposé quand l'abonnement, lui, existe mais ne passe plus : un
 * prélèvement refusé.
 *
 * Un compte qui n'a simplement jamais payé, lui, ne voit pas cet écran — il
 * entre dans le studio et rencontre les offres au moment de générer. Fermer la
 * porte avant qu'on ait vu le produit, c'est ce qui faisait partir les gens.
 * Ici, on dit ce qui manque et où le régler — jamais un refus sec.
 */
export default function PaywallNotice({ reason = 'none' }: { reason?: 'none' | 'past_due' }) {
  const pastDue = reason === 'past_due';
  // Le prix se lit dans la grille : recopié à la main, il finit par mentir.
  const entree = offreEntree();

  return (
    <main className="section py-14">
      <h1 className="text-2xl">
        {pastDue ? 'Ton dernier paiement a été refusé.' : 'Il te faut un abonnement.'}
      </h1>

      <p className="mt-4 text-base text-slate-500">
        {pastDue
          ? 'L’accès reprend dès que la facture est réglée. Tes coupes restantes sont conservées.'
          : entree
            ? `L’essai virtuel est réservé aux abonnés. À partir de ${entree.price} par mois pour ${entree.credits} coupes, sans engagement.`
            : 'L’essai virtuel est réservé aux abonnés.'}
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
