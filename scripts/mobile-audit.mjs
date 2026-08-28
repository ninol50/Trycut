/**
 * Passe mobile (section 10 du brief) : viewport 390px, cibles de tap 48px,
 * aucun scroll horizontal, aucun débordement hors conteneur assumé.
 *
 * Usage :
 *   npx next build && npx next start -p 3100 &
 *   node scripts/mobile-audit.mjs
 *
 * Les liens en ligne dans une phrase sont exclus : la cible réelle est le
 * paragraphe ou le label qui les contient, pas le lien lui-même.
 */
import { chromium } from 'playwright';

const BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:3100';
const PAGES = ['/', '/onboarding', '/onboarding/photo', '/tarifs', '/confidentialite', '/inscription', '/connexion'];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

let failures = 0;
for (const path of PAGES) {
  const page = await context.newPage();
  const bytes = { total: 0 };
  page.on('response', async (r) => {
    try {
      const len = Number(r.headers()['content-length'] ?? 0);
      bytes.total += len;
    } catch {}
  });

  await page.goto(BASE + path, { waitUntil: 'networkidle' });

  const audit = await page.evaluate(() => {
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;

    const small = [];
    const targets = document.querySelectorAll('a, button, summary, [role=slider]');
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Les liens en ligne dans une phrase ne sont pas des cibles autonomes :
      // la zone de tap réelle est le paragraphe ou le label qui les contient.
      if (el.closest('p, label, figcaption')) continue;
      if (r.height < 48 || r.width < 48) {
        small.push(`${el.tagName.toLowerCase()}"${(el.textContent || '').trim().slice(0, 28)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }

    // Éléments qui débordent horizontalement
    const overflow = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > clientW + 1 && r.width > 0) {
        // Ignorer ce qui vit dans un conteneur à défilement horizontal assumé
        // (carrousel de preuve en snap-x).
        let inScroller = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const s = getComputedStyle(p);
          if (s.overflowX === 'auto' || s.overflowX === 'scroll') { inScroller = true; break; }
        }
        if (!inScroller) {
          overflow.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 30)} right=${Math.round(r.right)}`);
        }
      }
    }

    return { scrollW, clientW, small, overflow: overflow.slice(0, 5) };
  });

  const horizontal = audit.scrollW > audit.clientW;
  const ok = !horizontal && audit.small.length === 0;
  if (!ok) failures += 1;

  console.log(`\n${ok ? 'OK  ' : 'FAIL'} ${path}`);
  console.log(`     largeur doc ${audit.scrollW} / viewport ${audit.clientW}${horizontal ? '  <-- SCROLL HORIZONTAL' : ''}`);
  console.log(`     poids réseau ~${(bytes.total / 1024).toFixed(0)} Ko`);
  if (audit.small.length) console.log(`     cibles < 48px : ${audit.small.join(' | ')}`);
  if (audit.overflow.length) console.log(`     débordements : ${audit.overflow.join(' | ')}`);

  await page.close();
}

await browser.close();
console.log(`\n${failures === 0 ? 'Toutes les pages passent.' : failures + ' page(s) en échec.'}`);
process.exit(failures === 0 ? 0 : 1);
