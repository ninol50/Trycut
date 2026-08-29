import { env } from '@/lib/env';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoi via Resend. Sans `RESEND_API_KEY`, on log en console : le développement
 * n'a pas besoin de compte. Aucun envoi ne doit jamais faire échouer le
 * parcours appelant — un email raté ne bloque pas une inscription.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean }> {
  if (!env.resendApiKey) {
    console.info('[email:mock]', payload.to, '—', payload.subject);
    return { sent: false };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.resendApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    if (!response.ok) {
      console.error('[email] Resend a répondu', response.status, await response.text());
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error('[email] envoi impossible', error);
    return { sent: false };
  }
}

// --------------------------------------------------------------- gabarits

function layout(title: string, body: string, cta?: { href: string; label: string }): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:24px;background:#f5f3ff;font-family:Inter,Helvetica,Arial,sans-serif;color:#12101a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:20px;padding:32px">
      <tr><td>
        <p style="margin:0 0 24px;font-size:18px;font-weight:700;color:#7c3aed">trycut</p>
        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#2e1065">${title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#4b5563">${body}</div>
        ${
          cta
            ? `<p style="margin:28px 0 0"><a href="${cta.href}" style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:600;font-size:15px">${cta.label}</a></p>`
            : ''
        }
        <p style="margin:32px 0 0;font-size:12px;color:#6b7280">
          Images générées par IA, à titre indicatif. Tu reçois cet email parce que tu as
          un compte sur trycut.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function sendWelcomeEmail(to: string, firstName: string | null) {
  return sendEmail({
    to,
    subject: 'Bienvenue sur trycut',
    html: layout(
      firstName ? `Bienvenue ${firstName}.` : 'Bienvenue.',
      `<p style="margin:0 0 12px">Ton email est vérifié, ton compte est prêt.</p>
       <p style="margin:0">Importe un selfie, choisis une coupe, et vois le rendu sur ton
       visage en une trentaine de secondes.</p>`,
      { href: `${env.siteUrl}/app`, label: 'Essayer une coupe' },
    ),
  });
}

export function sendGenerationReadyEmail(to: string, generationId: string) {
  return sendEmail({
    to,
    subject: 'Ta coupe est prête',
    html: layout(
      'Ta coupe est prête.',
      `<p style="margin:0">Le rendu est disponible dans ton espace. Tu peux le comparer
       avec ta photo d'origine et le télécharger en 9:16.</p>`,
      { href: `${env.siteUrl}/app/resultat?id=${generationId}`, label: 'Voir le résultat' },
    ),
  });
}

export function sendSubscriptionEmail(to: string, planName: string, credits: number) {
  return sendEmail({
    to,
    subject: `Ton abonnement ${planName} est actif`,
    html: layout(
      `Ton ${planName} est actif.`,
      `<p style="margin:0 0 12px">${credits} coupes viennent d'être créditées sur ton compte.</p>
       <p style="margin:0">Elles se renouvellent chaque mois et ne sont pas reportables.
       Tu peux résilier à tout moment en répondant à cet email.</p>`,
      { href: `${env.siteUrl}/app`, label: 'Générer une coupe' },
    ),
  });
}
