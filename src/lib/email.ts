import { optionalEnv } from '@/lib/env';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoi d'e-mail.
 *
 * Sans `RESEND_API_KEY`, on log en console : le parcours complet reste
 * parcourable en local sans compte Resend. Dès que la clé est présente,
 * l'appel part réellement, sans autre changement de code.
 */
export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean }> {
  const apiKey = optionalEnv('RESEND_API_KEY');
  const from = optionalEnv('EMAIL_FROM') ?? 'Trycut <onboarding@resend.dev>';

  if (!apiKey) {
    console.info(
      `[email:mock] à=${payload.to} objet="${payload.subject}" ` +
        `(définis RESEND_API_KEY pour un envoi réel)`,
    );
    return { sent: false };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: [payload.to], subject: payload.subject, html: payload.html }),
  });

  if (!response.ok) {
    console.error('[email] Resend a répondu', response.status, await response.text());
    return { sent: false };
  }

  return { sent: true };
}
