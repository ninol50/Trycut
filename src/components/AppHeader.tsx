import Link from 'next/link';

/**
 * Les crédits restants sont visibles en permanence dans l'app : c'est
 * l'information dont dépend chaque action de l'utilisateur.
 */
export function AppHeader({
  credits,
  plan,
  firstName,
}: {
  credits: number;
  plan: 'free' | 'pass';
  firstName: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-violet-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-5 py-3">
        <Link href="/app" className="text-body font-semibold text-violet-900">
          {firstName ? `Salut ${firstName}` : 'Trycut'}
        </Link>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full bg-violet-50 px-3 py-1 text-body-sm font-semibold text-violet-900"
            aria-label={`${credits} crédit${credits > 1 ? 's' : ''} restant${credits > 1 ? 's' : ''}`}
          >
            {credits} crédit{credits > 1 ? 's' : ''}
          </span>
          {plan === 'pass' && (
            <span className="rounded-full bg-violet-600 px-3 py-1 text-body-sm font-semibold text-white">
              Pass
            </span>
          )}
          <Link
            href="/compte"
            className="flex min-h-tap min-w-tap items-center justify-center text-body-sm font-semibold text-violet-600"
          >
            Compte
          </Link>
        </div>
      </div>
    </header>
  );
}
