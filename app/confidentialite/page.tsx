import Link from 'next/link';
import Footer from '@/components/Footer';
import { env } from '@/lib/env';

export const metadata = { title: 'Confidentialité — Trycut' };

const PROVIDERS = {
  mock: {
    name: 'Aucun (mode démonstration)',
    location: 'Aucun transfert : les rendus sont simulés localement.',
  },
  fal: {
    name: 'fal.ai (fal Serverless, Inc.)',
    location: 'Traitement aux États-Unis, encadré par les clauses contractuelles types.',
  },
} as const;

export default function PrivacyPage() {
  const provider = PROVIDERS[env.aiProvider];

  return (
    <>
      <main className="section py-10">
        <h1 className="text-2xl">Ce qu’on fait de ta photo.</h1>

        <section className="mt-8">
          <h2 className="text-xl">Ce qu’on collecte</h2>
          <ul className="mt-3 space-y-2 text-base text-slate-500">
            <li>· La photo que tu importes, et le rendu généré à partir d’elle.</li>
            <li>· Tes réponses au questionnaire, pour trier le catalogue.</li>
            <li>· Ton email et ton prénom, si tu crées un compte.</li>
            <li>· Ton adresse IP, uniquement pour limiter les abus sur l’essai gratuit.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Le sous-traitant IA</h2>
          <p className="mt-3 text-base text-slate-500">
            La génération d’image est confiée à un prestataire : <strong>{provider.name}</strong>.
            {' '}
            {provider.location}
          </p>
          <p className="mt-3 text-base text-slate-500">
            Ta photo lui est transmise par une URL signée valable 60 secondes. Elle n’est pas
            utilisée pour entraîner de modèle.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Combien de temps</h2>
          <ul className="mt-3 space-y-2 text-base text-slate-500">
            <li>· Photos et résultats d’un compte : supprimés automatiquement à J+30.</li>
            <li>· Essai sans compte : supprimé à J+1.</li>
            <li>· Suppression du compte : tout est effacé immédiatement, sans délai.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Où c’est stocké</h2>
          <p className="mt-3 text-base text-slate-500">
            Sur des espaces privés (Supabase Storage, région européenne). Aucun fichier n’est
            accessible publiquement : chaque affichage passe par une URL signée de 60 secondes,
            générée après vérification que le fichier t’appartient.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Âge minimum</h2>
          <p className="mt-3 text-base text-slate-500">
            Le service est réservé aux personnes de 15 ans ou plus. Cette déclaration est
            demandée à la création du compte.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl">Tes droits</h2>
          <p className="mt-3 text-base text-slate-500">
            Accès, rectification, effacement, portabilité, opposition. Le bouton de suppression
            sur la page{' '}
            <Link href="/compte" className="text-violet-600 underline">
              compte
            </Link>{' '}
            exécute l’effacement immédiatement. Pour toute autre demande, écris-nous.
          </p>
        </section>

        <p className="mt-10 text-sm text-slate-500">
          Les images produites sont générées par IA et fournies à titre indicatif.
        </p>
      </main>
      <Footer />
    </>
  );
}
