'use client';

/**
 * Bannerul de cookie-uri.
 *
 * Deocamdată nu încărcăm nici statistici, nici scripturi de reclamă — dar alegerea
 * omului se înregistrează de pe prima zi, ca atunci când le adăugăm să existe deja
 * un consimțământ valabil, nu unul cerut retroactiv.
 *
 * Cele strict necesare nu au comutator: fără ele nu ține minte comanda în curs.
 */

import { useState, useSyncExternalStore } from 'react';
import { UI } from '@/lib/i18n';

const COOKIE = 'vocal_consent';
const VERSION = 1;

function save(choice) {
  const value = encodeURIComponent(
    JSON.stringify({ v: VERSION, ...choice, at: new Date().toISOString() }),
  );
  // 6 luni, apoi întrebăm din nou.
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 182}; samesite=lax`;
}

function existing() {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
  if (!hit) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(hit.slice(COOKIE.length + 1)));
    return parsed?.v === VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/* Cookie-ul se poate citi doar în browser, iar serverul nu are de unde ști dacă
   omul a ales deja. Îl citim ca stare externă: pe server spunem „are acord", ca
   HTML-ul livrat să nu conțină bannerul și să nu clipească la hidratare. */
const subscribe = () => () => {};

export default function CookieBanner({ lang = 'ro' }) {
  const t = UI[lang] ?? UI.ro;
  const decided = useSyncExternalStore(
    subscribe,
    () => existing() !== null,
    () => true,
  );

  const [answered, setAnswered] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState(false);
  const [ads, setAds] = useState(false);

  if (decided || answered) return null;

  const decide = (choice) => { save(choice); setAnswered(true); };

  return (
    <div className="ck" role="dialog" aria-live="polite" aria-label={t.ckAria}>
      <div className="ck-in">
        <p className="ck-text">
          {t.ckText}{' '}
          <a href={`/legal/${lang}/confidentialitate`} target="_blank" rel="noopener noreferrer">
            {t.ckPolicy}
          </a>
        </p>

        {open && (
          <div className="ck-opts">
            <label className="ck-opt">
              <input type="checkbox" id="ck-necessary" checked disabled readOnly />
              <span><b>{t.ckNecessaryB}</b>{t.ckNecessary}</span>
            </label>
            <label className="ck-opt">
              <input type="checkbox" id="ck-stats" checked={stats} onChange={(e) => setStats(e.target.checked)} />
              <span><b>{t.ckStatsB}</b>{t.ckStats}</span>
            </label>
            <label className="ck-opt">
              <input type="checkbox" id="ck-ads" checked={ads} onChange={(e) => setAds(e.target.checked)} />
              <span><b>{t.ckAdsB}</b>{t.ckAds}</span>
            </label>
          </div>
        )}

        <div className="ck-btns">
          {open ? (
            <button className="ck-btn" onClick={() => decide({ stats, ads })}>
              {t.ckSave}
            </button>
          ) : (
            <button className="ck-btn ck-ghost" onClick={() => setOpen(true)}>{t.ckSettings}</button>
          )}
          <button className="ck-btn ck-ghost" onClick={() => decide({ stats: false, ads: false })}>
            {t.ckOnlyNeeded}
          </button>
          <button className="ck-btn ck-primary" onClick={() => decide({ stats: true, ads: true })}>
            {t.ckAcceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
