'use client';

/**
 * Pune limba documentului pe <html>, pentru paginile care o știu din adresă.
 *
 * Antetul rădăcină alege limba din cookie, ceea ce e corect pentru formular.
 * Paginile legale însă o au în URL — /legal/en/termeni e engleză oricare ar fi
 * cookie-ul — și sunt generate la build, când nu există cookie. Fără asta, un
 * cititor de ecran ar pronunța un document englezesc cu reguli românești.
 */
import { useEffect } from 'react';

export default function HtmlLang({ lang }) {
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return null;
}
