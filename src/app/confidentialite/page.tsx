import type { Metadata } from 'next';
import Link from 'next/link';
import { AI_PROVIDER } from '@/lib/env';

export const metadata: Metadata = {
  title: 'Confidentialité',
  description:
    'Ce que devient ta photo : qui la traite, où, et combien de temps elle est conservée.',
};

/**
 * Le nom du sous-traitant IA et la localisation du traitement sont affichés
 * dynamiquement d'après `AI_PROVIDER` : la page ne peut pas se désynchroniser
 * de ce que le service fait réellement.
 */
const PROVIDERS: Record<string, { name: string; location: string }> = {
  mock: {
    name: 'aucun (fournisseur de démonstration local)',
    location: 'aucun transfert : les images ne quittent pas l’infrastructure du service',
  },
  fal: {
    name: 'fal.ai (Features and Labels, Inc.)',
    location: 'États-Unis, sur la base de clauses contractuelles types',
  },
};

export default function PrivacyPage() {
  const provider = PROVIDERS[AI_PROVIDER] ?? PROVIDERS['mock'];

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-5 py-10">
      <Link href="/" className="text-body-sm font-semibold text-violet-600">
        ← Accueil
      </Link>

      <h1 className="mt-6 text-display-lg">Ce que devient ta photo</h1>
      <p className="mt-3 text-body text-slate-500">
        Le service traite des photos de visage. Ce ne sont pas des données
        biométriques au sens du RGPD — aucune identification n’est effectuée —
        mais ce sont des données personnelles, traitées comme telles.
      </p>

      <Section title="Ce qu’on collecte">
        <ul className="space-y-2">
          <li>La photo que tu importes.</li>
          <li>Les réponses de ton questionnaire de profil.</li>
          <li>Ton adresse email, ton prénom et ta déclaration d’âge, si tu crées un compte.</li>
          <li>
            Une empreinte non réversible de ton adresse IP, uniquement pour
            limiter les essais gratuits. L’adresse elle-même n’est jamais stockée.
          </li>
        </ul>
      </Section>

      <Section title="Pourquoi">
        <p>
          Générer l’image que tu demandes, te la restituer, limiter les abus et
          facturer les offres payantes. Rien d’autre. Aucune revente, aucun
          partage publicitaire.
        </p>
      </Section>

      <Section title="Qui traite ta photo">
        <p>
          Le traitement de l’image est confié à notre sous-traitant :{' '}
          <strong className="text-violet-900">{provider?.name}</strong>.
        </p>
        <p className="mt-2">
          Localisation du traitement : {provider?.location}.
        </p>
        <p className="mt-2">
          L’hébergement de la base de données et du stockage est assuré par
          Supabase, sur des serveurs situés dans l’Union européenne. Les
          paiements sont traités par Stripe.
        </p>
      </Section>

      <Section title="Combien de temps">
        <p>
          Les photos sources et les résultats sont supprimés automatiquement{' '}
          <strong className="text-violet-900">30 jours</strong> après leur
          création, par une tâche quotidienne. Ton compte et tes réponses de
          profil sont conservés tant que tu ne supprimes pas ton compte.
        </p>
      </Section>

      <Section title="Tes droits">
        <p>
          Tu peux supprimer ton compte à tout moment depuis la page{' '}
          <Link href="/compte" className="font-semibold text-violet-600 underline">
            Mon compte
          </Link>
          . La suppression efface le profil, l’historique d’essais et tous les
          fichiers associés, immédiatement et sans confirmation différée.
        </p>
        <p className="mt-2">
          Pour toute demande d’accès, de rectification ou d’opposition, écris à
          l’adresse de contact indiquée dans les mentions légales.
        </p>
      </Section>

      <Section title="Âge minimum">
        <p>
          Le service est réservé aux personnes de 15 ans et plus, âge du
          consentement numérique en France. Une déclaration explicite est
          demandée à la création du compte.
        </p>
      </Section>

      <Section title="Consentement">
        <p>
          Avant ton premier envoi de photo, une case à cocher — jamais
          pré-cochée — te demande d’accepter que l’image soit transmise au
          prestataire d’IA pour traitement et supprimée sous 30 jours. Tant
          qu’elle n’est pas cochée, aucun envoi n’est possible.
        </p>
      </Section>

      <p className="mt-10 text-body-sm text-slate-500">
        Dernière mise à jour : à la mise en service.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-display-md">{title}</h2>
      <div className="mt-2 text-body text-slate-500">{children}</div>
    </section>
  );
}
