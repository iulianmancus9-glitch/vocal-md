'use client';

/**
 * Formularul Vocal MD, portat din prototipul v7.
 *
 * Ecranele și stilurile sunt cele testate, neatinse. Ce s-a schimbat e că toate
 * datele vin acum de la server: versurile de la Gemini, piesele de la Suno,
 * fișierele audio prin linkuri semnate. Nimic nu mai e simulat în pagină.
 *
 * Starea comenzii o ține serverul, nu browserul. Pagina întreabă periodic „unde
 * suntem?" și desenează ce i se răspunde — așa, un telefon care intră în
 * stand-by la mijlocul generării găsește melodia gata când revine.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/client';
import { useRouter } from 'next/navigation';
import { UI, label, styleLabel } from '@/lib/i18n';
// Sub-stilurile și stările fiecărui stil stau lângă promptul lui, în stiluri.ts.
import { OPTIONS } from '@/lib/pipeline/stiluri';
import {
  Check, ArrowLeft, ArrowRight, Heart, Users, PartyPopper, Music2, Star, Mic2,
  Disc3, Guitar, Piano, Flame, Radio, Pencil, PenLine, RefreshCw, Play, Pause,
  Download, Sparkles, Wand2, User, Gift, CalendarHeart, Clock, ShieldCheck, Zap,
  Plus, X, Mail, Copy, AlertTriangle, ListMusic, Link2, RotateCcw, ExternalLink
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════
   DATE
   ══════════════════════════════════════════════════════════════ */

const STYLES = [
  { id: 'romantic',  name: 'Romantic',       desc: 'Baladă de dragoste, caldă și sinceră',  Icon: Heart },
  { id: 'suflet',    name: 'Din suflet',     desc: 'Pentru părinți, frați și prieteni',     Icon: Users },
  { id: 'petrecere', name: 'De petrecere',   desc: 'Ritm de chef și voie bună la masă',     Icon: PartyPopper },
  { id: 'manele',    name: 'Manele',         desc: 'De dragoste, de pahar sau de joc',      Icon: Disc3 },
  { id: 'pop',       name: 'Pop',            desc: 'Modern, cu refren care se ține minte',  Icon: Star },
  { id: 'rb',        name: 'R&B / Soul',     desc: 'Voce catifelată, armonii bogate',       Icon: Mic2 },
  { id: 'rap',       name: 'Hip-Hop / Rap',  desc: 'Flow, rime și beat',                    Icon: Music2 },
  { id: 'rock',      name: 'Rock',           desc: 'Chitări, energie de concert',           Icon: Flame },
  { id: 'folclor',   name: 'Folclor / Etno', desc: 'Sunet românesc, de sărbătoare',         Icon: Radio },
  { id: 'acustic',   name: 'Acustic',        desc: 'Doar voce, chitară sau pian',           Icon: Guitar },
  { id: 'latino',    name: 'Latino',         desc: 'Reggaeton, bachata, ritm cald',         Icon: Flame },
  { id: 'jazz',      name: 'Jazz / Swing',   desc: 'Elegant, de restaurant cu clasă',       Icon: Piano },
];

const VOICE_EMOJI = { 'Femeie': '👩', 'Bărbat': '👨' };

const RECIPIENTS = ['Iubită', 'Iubit', 'Soție', 'Soț', 'Mamă', 'Tată', 'Părinți', 'Fiică',
  'Fiu', 'Soră', 'Frate', 'Prietenă', 'Prieten', 'Bunici', 'Altcineva'];

const OCCASIONS = ['Zi de naștere', 'Aniversare de cuplu', 'Nuntă', 'Cerere în căsătorie',
  'Cumătrie', '8 Martie', 'Ziua Îndrăgostiților', 'Sărbători de iarnă',
  'Absolvire', 'Pensionare', 'Îmi cer scuze', 'Fără ocazie anume', 'Altă ocazie'];

const LANGUAGES = [
  { label: 'Română',   flag: '🇷🇴', note: 'Versuri în limba română' },
  { label: 'Engleză',  flag: '🇬🇧', note: 'Versuri în limba engleză' },
  { label: 'Italiană', flag: '🇮🇹', note: 'Versuri în limba italiană' },
  { label: 'Rusă',     flag: '🇷🇺', note: 'Versuri în limba rusă' },
];

const PERK_ICONS = [PenLine, Download, Clock];

const INSPIRATION_EMOJI = ['💛', '✨', '🌙', '💪', '😄'];
const inspiration = (t) => INSPIRATION_EMOJI.map((emoji, i) => ({
  emoji, label: t[`insp${i + 1}Label`], text: t[`insp${i + 1}Text`],
}));

const steps = (t) => [t.step1, t.step2, t.step3, t.step4, t.step5, t.step6];

/* ══════════════════════════════════════════════════════════════
   CIORNA
   ══════════════════════════════════════════════════════════════ */

/**
 * Ce a completat omul în formular, ținut în browserul lui.
 *
 * Până la ecranul de email, comanda nu există pe server: e doar stare de React.
 * Un refresh, un telefon care intră în stand-by sau o filă închisă din greșeală
 * ștergeau tot, iar omul o lua de la prima întrebare. După șase pași și o
 * poveste scrisă de mână, ăla e momentul în care pleacă de pe site.
 *
 * Nu salvăm bifa de acord cu termenii. Ea trebuie pusă din nou, cu mâna, de
 * fiecare dată — un consimțământ readus din memorie nu e consimțământ.
 *
 * `localStorage` poate lipsi sau poate arunca (fereastră privată, cookie-uri
 * blocate), deci fiecare atingere e învelită: dacă nu merge, se pierde ciorna,
 * nu pagina.
 */
const DRAFT_KEY = 'vocal_draft';
/** Mai vechi de atât, o ciornă nu mai e a nimănui. */
const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
/**
 * Sub atât, a fost un refresh: îl punem înapoi unde era, fără să-l întrebăm.
 * Peste, e o revenire — și atunci întrebarea e cuviincioasă, nu enervantă.
 */
const DRAFT_FRESH = 30 * 60 * 1000;

/** Are ciorna ceva de salvat, sau e formularul gol? */
const hasProgress = (d) =>
  Boolean(d && (d.style || d.names?.[0]?.trim() || d.story?.trim() || d.title?.trim()));

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.v !== 1 || typeof saved.at !== 'number') return null;
    if (Date.now() - saved.at > DRAFT_MAX_AGE) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return hasProgress(saved.d) ? saved : null;
  } catch {
    return null;
  }
}

function writeDraft(value) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(value)); } catch { /* n-avem unde */ }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* n-avem unde */ }
}

/** Pentru cine e melodia din ciornă, ca s-o putem numi când îl întrebăm. */
const draftName = (d) => d?.names?.find((n) => n?.trim())?.trim() ?? '';

/**
 * Numărul de WhatsApp, în forma pe care o cere wa.me: doar cifre, cu prefixul
 * de țară, fără plus și fără spații.
 */
const WHATSAPP_NUMBER = '37361039960';

/**
 * Semnul WhatsApp, desenat aici.
 *
 * `lucide-react`, de unde vin restul pictogramelor, nu mai are semne de marcă.
 */
const WhatsAppIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
  </svg>
);

/** Ce ecran i se cuvine fiecărei stări a comenzii. */
const SCREEN_FOR = {
  draft: 'writing', lyrics_pending: 'writing', lyrics_ready: 'lyrics',
  rendering: 'making', preview_ready: 'demo', payment_claimed: 'demo',
  paid: 'done', delivered: 'done',
  refused: 'error', failed: 'error', expired: 'error',
};

/**
 * Stările în care o comandă are încă ceva de făcut.
 *
 * O comandă livrată nu se „continuă" — se ascultă, din bibliotecă. Una oprită
 * de un refuz de conținut, nici atât.
 */
const IN_PROGRESS = [
  'draft', 'lyrics_pending', 'lyrics_ready', 'rendering', 'preview_ready', 'payment_claimed',
];

/* ══════════════════════════════════════════════════════════════
   STIL
   ══════════════════════════════════════════════════════════════ */

const CSS = `
/* Fontul vine din layout, prin next/font — găzduit de noi, nu de Google. */

.vc, .vc *, .vc *::before, .vc *::after { box-sizing: border-box; }
.vc {
  --violet: #6C5CE7; --violet-d: #5B4BD1; --violet-l: #EFECFF; --violet-t: #F7F5FF;
  --grad: linear-gradient(135deg, #3BBDF5 0%, #6C5CE7 55%, #8B5CF6 100%);
  --ink: #16161D; --ink-2: #3F3F4B; --gray: #767686;
  --tile: #F4F4F6; --tile-h: #ECECF0; --line: #E6E6EC; --line-2: #D6D6E0;
  --page: #FFFFFF;
  font-family: var(--font-poppins), "Segoe UI", system-ui, sans-serif;
  background: var(--page); color: var(--ink); min-height: 100vh; -webkit-font-smoothing: antialiased;
}
/* :where() ține resetul la specificitate zero. Fără el, „.vc button" (0-1-1) bate
   „.vc-next", „.vc-tile", „.vc-opt" (0-1-0) și le șterge fundalul și chenarul. */
.vc :where(button) { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }
.vc input, .vc textarea { font: inherit; }
.vc :focus-visible { outline: 2px solid var(--violet); outline-offset: 2px; border-radius: 8px; }

.vc-head { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,.86); backdrop-filter: saturate(170%) blur(14px); border-bottom: 1px solid var(--line); }
.vc-headIn { max-width: 640px; margin: 0 auto; padding: 13px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.vc-mark { display: inline-flex; align-items: center; gap: 9px; padding: 0; transition: opacity .15s; }
button.vc-mark:hover { opacity: .68; }
.vc-markBars { display: flex; align-items: flex-end; gap: 2.5px; height: 16px; }
.vc-markBars i { width: 3px; border-radius: 2px; }
.vc-markBars i:nth-child(1) { height: 8px;  background: #3BBDF5; }
.vc-markBars i:nth-child(2) { height: 16px; background: #6C5CE7; }
.vc-markBars i:nth-child(3) { height: 11px; background: #8B5CF6; }
.vc-markText { font-size: 15.5px; font-weight: 700; letter-spacing: .15em; line-height: 1; }
.vc-markMd { margin-left: .16em; color: var(--violet); }

/* Sigla împinge restul la dreapta, ca antetul să arate la fel fie că are una,
   fie două piese lângă comutator. */
.vc-headIn > .vc-mark:first-child { margin-right: auto; }
.vc-lang { font-size: 11.5px; font-weight: 700; letter-spacing: .04em; color: var(--ink-2); background: var(--tile); border: 1px solid var(--line); border-radius: 999px; padding: 5px 11px; white-space: nowrap; transition: background .15s, color .15s; }
.vc-lang:hover { background: var(--violet-l); color: var(--violet); }
.vc-headNote { font-size: 11.5px; font-weight: 600; color: var(--gray); letter-spacing: .01em; background: var(--tile); border-radius: 999px; padding: 5px 11px; white-space: nowrap; }
.vc-wrap { max-width: 640px; margin: 0 auto; padding: 16px 18px 40px; }
.vc-wrap[data-bar="1"] { padding-bottom: 104px; }

.vc-hero { background: linear-gradient(140deg, #F2EFFF 0%, #EDF4FF 48%, #EAF8FB 100%); border-radius: 20px; padding: 22px 18px; margin-bottom: 14px; }
.vc-heroEyebrow { font-size: 11px; font-weight: 600; letter-spacing: .13em; color: var(--violet); margin: 0 0 9px; }
.vc-heroTitle { font-size: clamp(23px, 6.2vw, 30px); font-weight: 700; line-height: 1.2; letter-spacing: -.02em; margin: 0 0 10px; text-wrap: balance; }
.vc-heroText { font-size: 14.5px; line-height: 1.6; color: var(--ink-2); margin: 0 0 18px; max-width: 46ch; }

.vc-perks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.vc-perk { background: rgba(255,255,255,.88); border: 1px solid rgba(108,92,231,.14); border-radius: 15px; padding: 13px 8px 12px; text-align: center; box-shadow: 0 3px 10px rgba(108,92,231,.08); }
.vc-perkIcon { width: 34px; height: 34px; border-radius: 11px; background: var(--grad); color: #fff; display: grid; place-items: center; margin: 0 auto 9px; box-shadow: 0 3px 8px rgba(108,92,231,.24); }
.vc-perkText { font-size: 11.5px; font-weight: 600; line-height: 1.35; margin: 0; color: var(--ink-2); }

.vc-panel { background: var(--page); border: 1px solid var(--line); border-radius: 20px; padding: 20px 17px 22px; }

.vc-steps { display: flex; align-items: center; justify-content: center; }
.vc-dot { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 600; flex: none; background: var(--tile); color: var(--gray); }
.vc-dot[data-s="now"] { background: var(--violet-l); color: var(--violet); box-shadow: 0 0 0 3px rgba(108,92,231,.13); }
.vc-dot[data-s="done"] { background: var(--grad); color: #fff; }
.vc-link { max-width: 30px; height: 2px; background: var(--line); border-radius: 2px; flex: 1 1 auto; }
.vc-link[data-s="done"] { background: var(--grad); }
.vc-stepNow { text-align: center; font-size: 12.5px; font-weight: 600; color: var(--violet); margin: 12px 0 0; }

.vc-q { font-size: 21px; font-weight: 700; letter-spacing: -.02em; margin: 20px 0 5px; }
.vc-qSub { font-size: 14px; line-height: 1.55; color: var(--gray); margin: 0 0 18px; }

.vc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.vc-tile { position: relative; text-align: center; padding: 18px 12px 16px; background: var(--tile); border: 2px solid transparent; border-radius: 16px; transition: background .15s, transform .12s; }
.vc-tile:hover { background: var(--tile-h); }
.vc-tile:active { transform: scale(.985); }
.vc-tile[data-on="1"] { background: linear-gradient(var(--page), var(--page)) padding-box, var(--grad) border-box; border-color: transparent; box-shadow: 0 4px 16px rgba(108,92,231,.14); }
.vc-tileIcon { width: 44px; height: 44px; border-radius: 50%; margin: 0 auto 11px; display: grid; place-items: center; background: var(--page); color: var(--ink-2); transition: background .15s, color .15s; }
.vc-tile[data-on="1"] .vc-tileIcon { background: var(--grad); color: #fff; }
.vc-tileName { font-size: 14px; font-weight: 600; margin: 0 0 4px; letter-spacing: -.01em; }
.vc-tile[data-on="1"] .vc-tileName { color: var(--violet); }
.vc-tileDesc { font-size: 11.5px; line-height: 1.4; color: var(--gray); margin: 0; }
.vc-badge { position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; border-radius: 50%; background: var(--grad); color: #fff; display: grid; place-items: center; border: 2px solid var(--page); }

.vc-mod { background: var(--violet-t); border: 1px solid var(--line); border-radius: 16px; padding: 16px 14px; margin-bottom: 12px; }
.vc-modHead { display: flex; gap: 11px; align-items: flex-start; margin-bottom: 13px; }
.vc-modIcon { width: 34px; height: 34px; border-radius: 10px; background: var(--violet-l); color: var(--violet); display: grid; place-items: center; flex: none; }
.vc-modTitle { font-size: 14.5px; font-weight: 600; margin: 0 0 2px; letter-spacing: -.01em; }
.vc-modText { font-size: 12.5px; line-height: 1.45; color: var(--gray); margin: 0; }

.vc-opts { display: grid; gap: 8px; }
.vc-opt { display: flex; align-items: center; gap: 10px; text-align: left; background: var(--page); border: 1.5px solid var(--line-2); border-radius: 12px; padding: 11px 12px; min-height: 48px; box-shadow: 0 1px 2px rgba(22,22,29,.04); transition: border-color .15s, background .15s, box-shadow .15s; }
.vc-opt:hover { border-color: var(--violet); box-shadow: 0 2px 8px rgba(108,92,231,.12); }
.vc-opt[data-on="1"] { border-color: var(--violet); background: var(--violet-l); }
.vc-radio { width: 19px; height: 19px; border-radius: 50%; border: 2px solid var(--line-2); display: grid; place-items: center; flex: none; transition: border-color .15s; }
.vc-opt:hover .vc-radio, .vc-opt[data-on="1"] .vc-radio { border-color: var(--violet); }
.vc-radioDot { width: 9px; height: 9px; border-radius: 50%; background: var(--grad); }
.vc-optLabel { font-size: 13.2px; font-weight: 500; line-height: 1.3; }
.vc-opt[data-on="1"] .vc-optLabel { color: var(--violet); font-weight: 600; }

.vc-seg { position: relative; display: flex; background: var(--tile); border-radius: 13px; padding: 4px; }
.vc-segPill { position: absolute; top: 4px; bottom: 4px; left: 4px; background: var(--page); border-radius: 10px; box-shadow: 0 2px 8px rgba(22,22,29,.13); transition: transform .3s cubic-bezier(.4,0,.2,1); }
.vc-segBtn { position: relative; z-index: 1; flex: 1; height: 46px; font-size: 14px; font-weight: 600; color: var(--gray); transition: color .22s; display: flex; align-items: center; justify-content: center; gap: 7px; }
.vc-segBtn[data-on="1"] { color: var(--violet); }
.vc-segEmoji { font-size: 16px; line-height: 1; }

.vc-need { margin-top: 14px; background: #FFF7E9; border: 1px solid #F3D8A4; color: #8A5A12; border-radius: 12px; padding: 11px 13px; font-size: 12.5px; line-height: 1.5; display: flex; gap: 8px; align-items: flex-start; }
.vc-need svg { flex: none; margin-top: 1px; }

.vc-input, .vc-area { width: 100%; background: var(--page); color: var(--ink); border: 1.5px solid var(--line-2); border-radius: 12px; padding: 13px 14px; font-size: 16px; transition: border-color .15s, box-shadow .15s; }
.vc-area { min-height: 156px; resize: vertical; line-height: 1.6; font-size: 15px; }
.vc-input:focus, .vc-area:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(108,92,231,.12); outline: none; }
.vc-input::placeholder, .vc-area::placeholder { color: #A3A3B4; }
.vc-meter { text-align: right; font-size: 11.5px; color: var(--gray); margin-top: 6px; font-variant-numeric: tabular-nums; }
.vc-tip { background: var(--page); border: 1px solid var(--line); border-radius: 12px; padding: 12px 13px; font-size: 12.5px; line-height: 1.55; color: var(--ink-2); margin-top: 10px; }
.vc-tip b { color: var(--violet); font-weight: 600; }
.vc-extra { margin-top: 10px; }

.vc-nameRow { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.vc-del { width: 46px; height: 48px; border-radius: 12px; border: 1.5px solid var(--line-2); background: var(--page); display: grid; place-items: center; color: var(--gray); flex: none; transition: border-color .15s, color .15s; }
.vc-del:hover { border-color: #E5484D; color: #E5484D; }
.vc-add { width: 100%; height: 46px; border: 1.5px dashed var(--line-2); border-radius: 12px; color: var(--violet); font-size: 13.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 7px; transition: border-color .15s, background .15s; }
.vc-add:hover { border-color: var(--violet); background: var(--page); }

.vc-picks { display: grid; gap: 9px; }
.vc-pick { display: flex; gap: 11px; align-items: flex-start; text-align: left; background: var(--page); border: 2px solid var(--line); border-radius: 14px; padding: 14px 13px; transition: border-color .15s, background .15s; }
.vc-pick:hover { border-color: var(--line-2); }
.vc-pick[data-on="1"] { border-color: var(--violet); background: var(--violet-t); }
.vc-pickIcon { width: 34px; height: 34px; border-radius: 10px; background: var(--violet-l); display: grid; place-items: center; flex: none; font-size: 19px; line-height: 1; }
.vc-pickName { font-size: 14.5px; font-weight: 600; margin: 0 0 2px; }
.vc-pick[data-on="1"] .vc-pickName { color: var(--violet); }
.vc-pickText { font-size: 12.3px; line-height: 1.45; color: var(--gray); margin: 0; }

.vc-recap { border: 1px solid var(--line); border-radius: 16px; padding: 2px 15px; margin-bottom: 12px; }
.vc-row { display: flex; gap: 16px; justify-content: space-between; align-items: baseline; padding: 13px 0; border-bottom: 1px solid var(--line); }
.vc-row:last-child { border-bottom: 0; }
.vc-rowKey { font-size: 13px; color: var(--gray); flex: none; }
.vc-rowVal { font-size: 13.8px; font-weight: 600; text-align: right; }
.vc-block { padding: 13px 0; border-bottom: 1px solid var(--line); }
.vc-blockText { font-size: 13.5px; line-height: 1.6; margin: 6px 0 0; color: var(--ink-2); }

.vc-getList { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.vc-getList li { display: flex; gap: 9px; font-size: 13.5px; line-height: 1.45; align-items: flex-start; }
.vc-getList svg { color: #16A06A; flex: none; margin-top: 2px; }
.vc-free { margin-top: 14px; background: var(--page); border: 1px solid rgba(108,92,231,.22); border-radius: 13px; padding: 14px; font-size: 13px; line-height: 1.6; color: var(--ink-2); }
.vc-free b { color: var(--violet); font-weight: 600; }

/* navigare — în pagină + bară care apare doar când butonul iese din ecran */
.vc-nav { display: flex; gap: 10px; margin-top: 18px; }
.vc-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; background: var(--page); border-top: 1px solid var(--line); padding: 11px 18px calc(11px + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -6px 20px rgba(22,22,29,.07); animation: vcup .22s ease; }
@keyframes vcup { from { transform: translateY(100%); } }
.vc-barIn { max-width: 640px; margin: 0 auto; display: flex; gap: 10px; align-items: center; }
.vc-back { display: grid; place-items: center; flex: none; width: 54px; height: 54px; border-radius: 14px; border: 1.5px solid var(--line-2); color: var(--ink-2); background: var(--page); transition: background .15s; }
.vc-back:hover { background: var(--tile); }
.vc-next { position: relative; overflow: hidden; flex: 1; height: 54px; border-radius: 14px; background: var(--grad); background-size: 160% 100%; color: #fff; font-size: 16px; font-weight: 600; letter-spacing: -.01em; display: flex; align-items: center; justify-content: center; gap: 9px; box-shadow: 0 6px 18px rgba(108,92,231,.34); transition: background-position .4s ease, box-shadow .2s, transform .12s, filter .15s; }
.vc-next:hover:not(:disabled) { background-position: 100% 0; box-shadow: 0 8px 24px rgba(108,92,231,.44); }
.vc-next:active:not(:disabled) { transform: scale(.985); }
.vc-next:disabled { background: #E4E4EC; color: #A0A0B0; box-shadow: none; cursor: not-allowed; }
/* pulsul de deblocare: se vede cu coada ochiului că poți merge mai departe */
@keyframes vcpop { 0% { transform: scale(1); } 38% { transform: scale(1.032); } 100% { transform: scale(1); } }
@keyframes vcring {
  0%   { box-shadow: 0 6px 18px rgba(108,92,231,.34), 0 0 0 0 rgba(108,92,231,.5); }
  100% { box-shadow: 0 6px 18px rgba(108,92,231,.34), 0 0 0 16px rgba(108,92,231,0); }
}
.vc-next.is-ready { animation: vcpop .46s cubic-bezier(.34,1.4,.64,1), vcring .72s ease-out; }
.vc-ghost { height: 48px; border-radius: 13px; border: 1.5px solid var(--line-2); font-size: 13.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background .15s; }
.vc-ghost:hover:not(:disabled) { background: var(--tile); }

.vc-lyrics { background: var(--tile); border-radius: 16px; padding: 20px 18px; font-size: 15px; line-height: 1.85; white-space: pre-wrap; margin-bottom: 14px; }
.vc-lyricsEdit { width: 100%; background: var(--page); color: var(--ink); border: 2px solid var(--violet); border-radius: 16px; padding: 20px 18px; font-size: 15px; line-height: 1.85; min-height: 360px; resize: vertical; margin-bottom: 14px; outline: none; }
.vc-two { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

.vc-wait { text-align: center; padding: 64px 0 52px; }
.vc-waitRing { display: inline-grid; place-items: center; width: 74px; height: 74px; border-radius: 50%; background: var(--grad); color: #fff; animation: vcspin 3.6s linear infinite; }
@keyframes vcspin { to { transform: rotate(360deg); } }
.vc-waitTitle { font-size: 21px; font-weight: 700; margin: 22px 0 8px; letter-spacing: -.02em; }
.vc-waitText { font-size: 14px; color: var(--gray); margin: 0 auto; max-width: 300px; line-height: 1.6; }
.vc-waitRail { height: 5px; background: var(--tile); border-radius: 5px; margin: 26px auto 0; max-width: 240px; overflow: hidden; }
.vc-waitFill { height: 100%; background: var(--grad); border-radius: 5px; transition: width .5s linear; }

.vc-take { border: 2px solid var(--line); border-radius: 18px; padding: 16px 15px 13px; margin-bottom: 10px; transition: border-color .18s, background .18s, box-shadow .18s; }
.vc-take[data-on="1"] { border-color: var(--violet); background: var(--violet-t); box-shadow: 0 6px 20px rgba(108,92,231,.12); }
.vc-takeTop { display: flex; align-items: center; gap: 12px; }
.vc-playBtn { width: 48px; height: 48px; border-radius: 50%; background: var(--grad); color: #fff; display: grid; place-items: center; flex: none; box-shadow: 0 4px 12px rgba(108,92,231,.32); transition: transform .14s; }
.vc-playBtn:active { transform: scale(.94); }
.vc-takeName { font-size: 14.5px; font-weight: 600; margin: 0 0 2px; }
.vc-takeMeta { font-size: 12px; color: var(--gray); margin: 0; }
.vc-scrub { margin-top: 14px; cursor: pointer; padding: 4px 0; }
.vc-wave { display: flex; align-items: center; gap: 3px; height: 46px; }
.vc-waveBar { flex: 1 1 0; min-width: 0; border-radius: 99px; background: #DFDFE9; transition: background .18s ease; }
.vc-take[data-on="1"] .vc-waveBar { background: #D3D3E2; }
.vc-times { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--gray); margin-top: 9px; font-variant-numeric: tabular-nums; }
.vc-tag { display: inline-flex; align-items: center; gap: 5px; background: var(--violet-l); color: var(--violet); border-radius: 999px; padding: 3px 9px; font-size: 10.5px; font-weight: 600; }

.vc-offer { border-radius: 22px; padding: 2px; background: var(--grad); margin-top: 20px; box-shadow: 0 12px 34px rgba(108,92,231,.24); }
.vc-offerIn { background: var(--page); border-radius: 20px; padding: 22px 18px 20px; }
.vc-offerKicker { font-size: 10.5px; font-weight: 700; letter-spacing: .12em; color: var(--violet); margin: 0 0 7px; }
.vc-offerTitle { font-size: 19px; font-weight: 700; line-height: 1.25; letter-spacing: -.02em; margin: 0 0 16px; text-wrap: balance; }
.vc-offerPrice { display: flex; align-items: baseline; gap: 10px; padding-bottom: 18px; margin-bottom: 18px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.vc-priceNum { font-size: 44px; font-weight: 700; letter-spacing: -.035em; line-height: 1; background: var(--grad); -webkit-background-clip: text; background-clip: text; color: transparent; }
.vc-priceNote { font-size: 12.5px; color: var(--gray); font-weight: 500; }
.vc-offerList { list-style: none; margin: 0; padding: 0; display: grid; gap: 13px; }
.vc-offerList li { display: flex; gap: 11px; align-items: flex-start; font-size: 13.5px; line-height: 1.5; }
.vc-offerCheck { width: 22px; height: 22px; border-radius: 50%; background: var(--violet-l); color: var(--violet); display: grid; place-items: center; flex: none; margin-top: 1px; }
.vc-buy { position: relative; overflow: hidden; width: 100%; height: 60px; border-radius: 16px; background: var(--grad); background-size: 170% 100%; color: #fff; font-size: 16.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 20px; box-shadow: 0 10px 26px rgba(108,92,231,.4); transition: background-position .5s ease, transform .12s, box-shadow .2s; }
.vc-buy:hover { background-position: 100% 0; box-shadow: 0 14px 34px rgba(108,92,231,.52); }
.vc-buy:active { transform: scale(.988); }
.vc-buy > * { position: relative; z-index: 1; }
.vc-buy::after {
  content: ''; position: absolute; top: 0; left: -55%; width: 42%; height: 100%; z-index: 0;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.38), transparent);
  transform: skewX(-18deg); animation: vcshine 3.8s ease-in-out infinite;
}
@keyframes vcshine { 0% { left: -55%; } 52%, 100% { left: 135%; } }
.vc-offerTrust { margin-top: 15px; display: flex; gap: 8px 16px; justify-content: center; flex-wrap: wrap; }
.vc-trustBit { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--gray); font-weight: 500; }
.vc-trustBit svg { color: var(--violet); }

.vc-footer { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; gap: 8px 16px; justify-content: center; flex-wrap: wrap; }
.vc-footLink { font-size: 12px; color: var(--gray); text-decoration: none; font-weight: 500; }
.vc-footLink:hover { color: var(--violet); }
/* Un buton care trebuie să arate ca celelalte legături din subsol. */
.vc-footBtn { background: none; border: 0; padding: 0; font-family: inherit; cursor: pointer; }

.vc-tabs { display: flex; gap: 4px; background: var(--tile); padding: 4px; border-radius: 13px; margin-bottom: 16px; }
.vc-tab { flex: 1; min-height: 42px; border-radius: 10px; font-size: 12px; font-weight: 600; color: var(--gray); padding: 0 6px; line-height: 1.25; }
.vc-tab[data-on="1"] { background: var(--page); color: var(--violet); box-shadow: 0 2px 7px rgba(22,22,29,.1); }
.vc-langBtns { display: inline-flex; gap: 4px; background: var(--tile); padding: 3px; border-radius: 10px; }
.vc-langBtn { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; color: var(--gray); }
.vc-langBtn[data-on="1"] { background: var(--page); color: var(--violet); box-shadow: 0 1px 5px rgba(22,22,29,.1); }
.vc-legalDate { font-size: 12px; color: var(--gray); margin: 0 0 14px; }
.vc-legalIntro { font-size: 14px; line-height: 1.7; color: var(--ink-2); margin: 0 0 4px; }
.vc-legalH { font-size: 14.5px; font-weight: 600; margin: 22px 0 8px; }
.vc-legalP { font-size: 13.5px; line-height: 1.75; color: var(--ink-2); margin: 0 0 9px; }
.vc-legalUl { margin: 0 0 9px; padding-left: 19px; }
.vc-legalUl li { font-size: 13.5px; line-height: 1.75; color: var(--ink-2); margin-bottom: 7px; }
.vc-legalFoot { margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--gray); }

/* ─── email ─── */
.vc-check { display: flex; gap: 11px; align-items: flex-start; cursor: pointer; padding: 11px 0; text-align: left; width: 100%; }
.vc-box { width: 22px; height: 22px; border-radius: 7px; border: 1.5px solid var(--line-2); background: var(--page); display: grid; place-items: center; flex: none; margin-top: 1px; transition: background .15s, border-color .15s; }
.vc-check[data-on="1"] .vc-box { background: var(--grad); border-color: transparent; color: #fff; }
.vc-checkText { font-size: 13px; line-height: 1.55; color: var(--ink-2); }
.vc-checkText u { color: var(--violet); font-weight: 600; }

/* ─── livrare ─── */
.vc-done { text-align: center; padding: 4px 0 18px; }
.vc-doneIcon { width: 72px; height: 72px; border-radius: 50%; background: var(--grad); color: #fff; display: grid; place-items: center; margin: 0 auto 18px; box-shadow: 0 10px 28px rgba(108,92,231,.36); }
.vc-doneTitle { font-size: 23px; font-weight: 700; margin: 0 0 9px; letter-spacing: -.02em; }
.vc-doneText { font-size: 14px; line-height: 1.6; color: var(--gray); margin: 0 auto; max-width: 38ch; }
.vc-track { border: 1.5px solid var(--line); border-radius: 16px; padding: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
.vc-trackIcon { width: 44px; height: 44px; border-radius: 12px; background: var(--violet-l); color: var(--violet); display: grid; place-items: center; flex: none; }
.vc-trackName { font-size: 14.5px; font-weight: 600; margin: 0 0 2px; }
.vc-trackMeta { font-size: 12px; color: var(--gray); margin: 0; }
.vc-dl { width: 46px; height: 46px; border-radius: 12px; background: var(--violet); color: #fff; display: grid; place-items: center; flex: none; transition: background .15s; }
.vc-dl:hover { background: var(--violet-d); }
.vc-linkRow { display: flex; gap: 8px; align-items: center; }
.vc-linkBox { flex: 1; min-width: 0; background: var(--tile); border-radius: 12px; padding: 13px 14px; font-size: 12.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vc-copy { height: 46px; padding: 0 15px; border-radius: 12px; border: 1.5px solid var(--line-2); font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 7px; flex: none; transition: border-color .15s, color .15s; }
.vc-copy[data-done="1"] { border-color: #16A06A; color: #16A06A; }

/* ─── bibliotecă ─── */
.vc-item { border: 1.5px solid var(--line); border-radius: 16px; padding: 15px; margin-bottom: 10px; }
.vc-itemTop { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.vc-itemName { font-size: 15px; font-weight: 600; margin: 0 0 3px; letter-spacing: -.01em; }
.vc-itemMeta { font-size: 12.5px; color: var(--gray); margin: 0; line-height: 1.5; }
.vc-state { font-size: 10.5px; font-weight: 700; padding: 5px 10px; border-radius: 999px; flex: none; }
.vc-state[data-t="paid"] { background: #E4F7EE; color: #0E7A50; }
.vc-state[data-t="demo"] { background: #FFF3E0; color: #9A5B0B; }
.vc-itemAct { display: flex; gap: 8px; margin-top: 13px; }
.vc-empty { text-align: center; padding: 40px 0; }
.vc-emptyIcon { width: 62px; height: 62px; border-radius: 50%; background: var(--tile); color: var(--gray); display: grid; place-items: center; margin: 0 auto 16px; }

/* ─── eroare ─── */
.vc-err { text-align: center; padding: 22px 0 6px; }
.vc-errIcon { width: 70px; height: 70px; border-radius: 50%; background: #FDEEEC; color: #D64541; display: grid; place-items: center; margin: 0 auto 18px; }
.vc-errTitle { font-size: 21px; font-weight: 700; margin: 0 0 10px; letter-spacing: -.02em; }
.vc-errText { font-size: 14px; line-height: 1.65; color: var(--ink-2); margin: 0 auto; max-width: 38ch; }
.vc-safe { background: #E9F8F0; border-radius: 13px; padding: 14px 15px; font-size: 13px; line-height: 1.55; color: #0E7A50; margin-top: 20px; text-align: left; display: flex; gap: 10px; }
.vc-safe svg { flex: none; margin-top: 1px; }

/* ─── banner de start ─── */
.vc-heroCta { display: flex; }
/* Meniul de sub siglă. Pe telefon nu încape pe un rând, deci se derulează
   lateral în loc să se rupă sau să micșoreze literele sub ce se poate citi. */
.vc-nav2 { max-width: 640px; margin: 0 auto; padding: 0 18px 10px; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.vc-nav2::-webkit-scrollbar { display: none; }
.vc-nav2 a, .vc-navBtn { font-size: 12.5px; font-weight: 600; color: var(--ink-2); text-decoration: none; padding: 6px 11px; border-radius: 999px; background: var(--tile); white-space: nowrap; transition: background .15s, color .15s; }
.vc-nav2 a:hover, .vc-navBtn:hover { background: var(--violet-l); color: var(--violet); }
/* Butonul din meniu trebuie să arate exact ca legăturile de lângă el. */
.vc-navBtn { border: 0; font-family: inherit; cursor: pointer; }

/* Antetul are acum două rânduri, deci ancorele trebuie să se oprească mai jos
   ca titlul secțiunii să nu rămână ascuns sub el. */
.vc-sec { scroll-margin-top: 104px; margin-top: 16px; padding: 20px 18px; border: 1px solid var(--line); border-radius: 18px; background: var(--page); }
.vc-secTitle { font-size: 19px; font-weight: 700; letter-spacing: -.01em; margin: 0 0 5px; }
.vc-secSub { font-size: 13.5px; line-height: 1.5; color: var(--gray); margin: 0 0 16px; }

/* ─── biblioteca goală ─── */
.vc-empty { text-align: center; padding: 26px 8px 8px; }
.vc-emptyIcon { width: 58px; height: 58px; border-radius: 50%; background: var(--violet-t); color: var(--violet); display: inline-grid; place-items: center; margin-bottom: 14px; }
.vc-emptyTitle { font-size: 16px; font-weight: 700; margin: 0 0 6px; letter-spacing: -.01em; }
.vc-emptyText { font-size: 13px; line-height: 1.55; color: var(--gray); margin: 0; max-width: 340px; margin-inline: auto; }

/* ─── încă o înregistrare, după plată ─── */
.vc-again { border: 1px solid var(--line); background: var(--page); border-radius: 14px; padding: 13px; margin-top: 12px; }
.vc-againText { font-size: 12.8px; line-height: 1.5; color: var(--gray); margin: 0 0 10px; text-align: center; }

/* ─── butonul de WhatsApp, mereu la îndemână ─── */
/* Stă deasupra barei de jos când aceasta apare, altfel i-ar acoperi butonul
   principal exact în clipa în care omul vrea să apese pe el. */
.vc-wa { position: fixed; right: 16px; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 45; display: flex; align-items: center; gap: 9px; padding: 11px 15px 11px 12px; border-radius: 999px; background: #25D366; color: #fff; font-size: 13.5px; font-weight: 600; text-decoration: none; box-shadow: 0 6px 20px rgba(37,211,102,.38); transition: transform .15s, box-shadow .2s, bottom .22s ease; }
.vc-wa:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(37,211,102,.5); }
.vc-wa:active { transform: scale(.97); }
.vc-wa[data-up="1"] { bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
.vc-wa svg { flex: none; }
/* Pe ecran mic rămâne doar simbolul: un text lângă el ar acoperi pagina. */
.vc-waText { display: none; }
@media (min-width: 560px) { .vc-waText { display: inline; } }
.vc-wa:focus-visible { outline: 2px solid var(--violet); outline-offset: 3px; }

/* ─── panoul „continuă de unde ai rămas" ─── */
.vc-resume { border: 1px solid rgba(108,92,231,.22); background: var(--violet-t); border-radius: 16px; padding: 15px 15px 16px; text-align: left; margin-top: 4px; }
.vc-resumeTitle { font-size: 15.5px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.01em; }
.vc-resumeText { font-size: 12.8px; line-height: 1.5; color: var(--gray); margin: 0 0 13px; }
.vc-resumeRow { display: grid; gap: 8px; }
@media (min-width: 560px) { .vc-resumeRow { grid-template-columns: 1fr auto; align-items: center; } }

/* ─── panoul de plată (link MAIB + confirmare cu mâna) ─── */
.vc-payPanel { width: 100%; }
.vc-payStep { font-size: 13px; font-weight: 600; color: var(--ink-1); margin: 0; }
.vc-payMatch { margin-top: 12px; border: 1px solid rgba(108,92,231,.2); background: var(--violet-t); border-radius: 13px; padding: 12px 13px; }
.vc-payMatchTitle { font-size: 12.5px; font-weight: 600; color: var(--ink-1); margin: 0 0 5px; }
.vc-payMatchValue { font-size: 14.5px; font-weight: 700; margin: 0; word-break: break-all; color: var(--violet); }
.vc-payMatchNote { font-size: 12px; color: var(--gray); margin: 7px 0 0; }
.vc-payFoot { font-size: 12px; line-height: 1.55; color: var(--gray); margin: 10px 0 0; text-align: center; }
.vc-payWait { width: 100%; border: 1px solid var(--line); background: var(--page); border-radius: 15px; padding: 16px; text-align: center; }
.vc-payWaitTitle { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 14.5px; font-weight: 700; margin: 0 0 6px; }
.vc-payWaitText { font-size: 12.8px; line-height: 1.55; color: var(--gray); margin: 0; }

.vc-how { display: grid; gap: 13px; }
.vc-howStep { display: flex; gap: 13px; align-items: flex-start; }
.vc-howNum { flex: none; width: 29px; height: 29px; border-radius: 50%; background: var(--grad); color: #fff; font-size: 13.5px; font-weight: 700; display: grid; place-items: center; }
.vc-howTitle { font-size: 14.5px; font-weight: 700; margin: 4px 0 3px; }
.vc-howText { font-size: 13.5px; line-height: 1.55; color: var(--ink-2); margin: 0; }

.vc-faq { display: grid; gap: 8px; }
.vc-faqItem { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.vc-faqItem summary { list-style: none; cursor: pointer; padding: 13px 14px; font-size: 13.8px; font-weight: 600; line-height: 1.4; display: flex; align-items: center; gap: 10px; }
.vc-faqItem summary::-webkit-details-marker { display: none; }
.vc-faqItem summary::after { content: ''; margin-left: auto; flex: none; width: 8px; height: 8px; border-right: 2px solid var(--gray); border-bottom: 2px solid var(--gray); transform: rotate(45deg) translate(-2px,-2px); transition: transform .18s; }
.vc-faqItem[open] summary::after { transform: rotate(225deg) translate(-2px,-2px); }
.vc-faqItem p { font-size: 13.4px; line-height: 1.6; color: var(--ink-2); margin: 0; padding: 0 14px 14px; }
.vc-faqFoot { font-size: 12.5px; color: var(--gray); text-align: center; margin: 15px 0 0; }
.vc-faqFoot a { color: var(--violet); }

.vc-heroPrice { font-size: 13.5px; line-height: 1.5; color: var(--ink-2); text-align: center; margin: 12px 0 0; }


/* ─── dialog de confirmare ─── */
.vc-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(22,22,29,.44); backdrop-filter: blur(3px); display: grid; place-items: center; padding: 20px; animation: vcfade .16s ease; }
.vc-dialog { background: var(--page); border-radius: 20px; padding: 22px 20px 18px; width: 100%; max-width: 360px; box-shadow: 0 18px 50px rgba(22,22,29,.28); animation: vcrise .2s cubic-bezier(.34,1.3,.64,1); }
.vc-dialogTitle { font-size: 18px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 8px; }
.vc-dialogText { font-size: 13.5px; line-height: 1.6; color: var(--ink-2); margin: 0 0 18px; }
.vc-dialogBtns { display: flex; gap: 10px; }
@keyframes vcfade { from { opacity: 0; } }
@keyframes vcrise { from { opacity: 0; transform: translateY(8px) scale(.97); } }

/* Bifa reală e ascunsă sub caseta desenată: tastatura și cititoarele de ecran
   o găsesc, ochiul vede caseta noastră. */
.vc-checkIn { position: absolute; width: 1px; height: 1px; opacity: 0; margin: 0; pointer-events: none; }
.vc-check { cursor: pointer; }
.vc-check:has(.vc-checkIn:focus-visible) { outline: 2px solid var(--violet); outline-offset: 2px; }
.vc-checkLinks { font-size: 12px; line-height: 1.5; color: var(--gray); margin: 8px 0 0; padding-left: 34px; }
.vc-checkLinks a { color: var(--violet); font-weight: 500; }
/* ─── modul pliabil (sugestiile de poveste) ─── */
.vc-modFold summary { list-style: none; cursor: pointer; display: flex; gap: 11px; align-items: flex-start; margin: 0; }
.vc-modFold summary::-webkit-details-marker { display: none; }
.vc-modFold summary:hover .vc-modTitle { color: var(--violet); }
.vc-foldArrow { margin-left: auto; flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--tile); display: grid; place-items: center; transition: transform .22s ease, background .15s; align-self: center; }
.vc-foldArrow::before { content: ''; width: 6px; height: 6px; border-right: 2px solid var(--gray); border-bottom: 2px solid var(--gray); transform: rotate(45deg) translate(-1px,-1px); }
.vc-modFold[open] .vc-foldArrow { transform: rotate(180deg); background: var(--violet-l); }
.vc-modFold[open] .vc-foldArrow::before { border-color: var(--violet); }
.vc-modFold summary:focus-visible { outline: 2px solid var(--violet); outline-offset: 3px; border-radius: 10px; }

/* ─── alegerea între înregistrări ─── */
.vc-takes { margin-bottom: 14px; }
.vc-takesLabel { font-size: 12.5px; line-height: 1.55; color: var(--gray); margin: 0 0 9px; }
.vc-takesRow { display: flex; gap: 7px; flex-wrap: wrap; }
.vc-takeTab { display: flex; align-items: center; gap: 7px; border: 1.5px solid var(--line-2); border-radius: 12px; padding: 8px 13px; font-size: 13px; font-weight: 600; color: var(--ink-2); transition: border-color .15s, background .15s, color .15s; }
.vc-takeTab:hover:not(:disabled) { border-color: var(--violet); color: var(--violet); }
.vc-takeTab[data-on="1"] { background: var(--grad); border-color: transparent; color: #fff; box-shadow: 0 3px 10px rgba(108,92,231,.26); }
.vc-takeTab:disabled { opacity: .55; cursor: not-allowed; }
.vc-takeTabNote { font-size: 11px; font-weight: 500; opacity: .75; }
.vc-takesFoot { font-size: 12px; line-height: 1.55; color: var(--gray); margin: 10px 0 0; }

/* ─── variantele anterioare de versuri ─── */
.vc-hist { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 14px; }
.vc-hist summary { font-size: 13px; font-weight: 600; color: var(--violet); cursor: pointer; list-style: none; display: flex; align-items: center; gap: 7px; }
.vc-hist summary::-webkit-details-marker { display: none; }
.vc-hist summary::after { content: '▾'; font-size: 11px; transition: transform .2s; }
.vc-hist[open] summary::after { transform: rotate(180deg); }
.vc-histItem { background: var(--tile); border-radius: 13px; padding: 13px 14px; margin-top: 10px; }
.vc-histTitle { font-size: 13.5px; font-weight: 600; margin: 0 0 4px; }
.vc-histText { font-size: 12.5px; line-height: 1.55; color: var(--gray); margin: 0 0 11px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* ─── mesaj de eroare ─── */
.vc-alert { display: flex; gap: 10px; align-items: flex-start; background: #FEF2F2; border: 1px solid #FECACA; color: #B42318; border-radius: 13px; padding: 13px 14px; font-size: 13px; line-height: 1.55; margin-top: 14px; }
.vc-alert svg { flex: none; margin-top: 1px; }

@media (prefers-reduced-motion: reduce) { .vc *, .vc *::before, .vc *::after { animation: none !important; transition: none !important; } }

@media (min-width: 760px) {
  .vc-wrap { padding: 22px 18px 48px; }
  .vc-panel { padding: 26px 26px 28px; }
  .vc-hero { padding: 30px 28px; }
  .vc-grid { grid-template-columns: repeat(4, 1fr); }
  .vc-picks { grid-template-columns: 1fr 1fr; }
  .vc-link { max-width: 52px; }
  .vc-wave { height: 56px; gap: 4px; }
  .vc-perkText { font-size: 12.5px; }
  .vc-offerIn { padding: 28px 26px 24px; }
  .vc-tab { font-size: 13px; }
}
`;

/* ══════════════════════════════════════════════════════════════
   PIESE
   ══════════════════════════════════════════════════════════════ */

function Module({ icon: Icon, title, text, children }) {
  return (
    <div className="vc-mod">
      <div className="vc-modHead">
        <span className="vc-modIcon"><Icon size={17} /></span>
        <div>
          <p className="vc-modTitle">{title}</p>
          <p className="vc-modText">{text}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* toate alegerile se pot anula printr-o a doua apăsare */
function Choices({ options, value, onPick, cols = 2, labelFor }) {
  return (
    <div className="vc-opts" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o} className="vc-opt" data-on={value === o ? '1' : '0'}
          aria-pressed={value === o} onClick={() => onPick(value === o ? null : o)}>
          <span className="vc-radio">{value === o && <span className="vc-radioDot" />}</span>
          <span className="vc-optLabel">{labelFor ? labelFor(o) : o}</span>
        </button>
      ))}
    </div>
  );
}

function Segmented({ options, value, onPick, emoji, labelFor }) {
  const i = options.indexOf(value);
  return (
    <div className="vc-seg" role="group">
      {i >= 0 && (
        <span className="vc-segPill" aria-hidden="true"
          style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }} />
      )}
      {options.map((o) => (
        <button key={o} className="vc-segBtn" data-on={value === o ? '1' : '0'}
          aria-pressed={value === o} onClick={() => onPick(value === o ? null : o)}>
          {emoji?.[o] && <span className="vc-segEmoji">{emoji[o]}</span>}{labelFor ? labelFor(o) : o}
        </button>
      ))}
    </div>
  );
}

/**
 * Sigla. Trei bare ca un egalizator, apoi „VOCAL MD".
 *
 * „MD" lipsea, deși brandul și domeniul așa se numesc — omul a tastat vocal.md
 * ca să ajungă aici și găsea altceva scris. Barele sunt culorile din gradientul
 * mărcii, luate una câte una: la 3 pixeli lățime, un gradient întreg n-ar arăta
 * decât o singură nuanță.
 */
function Brand({ onClick, t }) {
  const inner = (
    <>
      <span className="vc-markBars" aria-hidden="true"><i /><i /><i /></span>
      <span className="vc-markText">VOCAL<span className="vc-markMd">MD</span></span>
    </>
  );
  if (!onClick) return <span className="vc-mark">{inner}</span>;
  return (
    <button className="vc-mark" onClick={onClick} aria-label={t.brandBack}>
      {inner}
    </button>
  );
}

/**
 * Comutatorul de limbă.
 *
 * Arată limba în care treci, nu cea în care ești: cine nu înțelege pagina
 * caută cuvântul pe care îl recunoaște, nu o etichetă a stării curente.
 */
function LangSwitch({ t, onClick }) {
  return (
    <button className="vc-lang" onClick={onClick} aria-label={t.switchAria}>
      {t.switchTo}
    </button>
  );
}

function Alert({ text }) {
  if (!text) return null;
  return (
    <div className="vc-alert" role="alert">
      <AlertTriangle size={16} />
      <span>{text}</span>
    </div>
  );
}

function Need({ items, t }) {
  if (!items.length) return null;
  return (
    <div className="vc-need">
      <Sparkles size={14} />
      <span>{t.needPrefix} <b>{items.join(', ')}</b>.</span>
    </div>
  );
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const N = 54;
const WAVE = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1);
  const env = Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08 + 0.05)), 0.4);
  const detail = 0.52 + 0.26 * Math.abs(Math.sin(i * 1.27)) + 0.16 * Math.abs(Math.sin(i * 0.41 + 1.1)) + 0.12 * Math.abs(Math.sin(i * 2.83 + 0.4));
  return Math.max(0.16, Math.min(1, env * detail));
});
const barColor = (i) => {
  const t = i / (N - 1);
  return `rgb(${Math.round(59 + 80 * t)},${Math.round(189 - 97 * t)},${Math.round(245 + t)})`;
};

function Take({ name, meta, playing, at, active, dur = 60, onToggle, onSeek, t }) {
  const ref = useRef(null);
  const seek = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur);
  };
  const head = active && dur ? at / dur : 0;
  return (
    <div className="vc-take" data-on={active ? '1' : '0'}>
      <div className="vc-takeTop">
        <button className="vc-playBtn" onClick={onToggle} aria-label={playing ? t.stopAria(name) : t.playAria(name)}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <div style={{ flex: 1 }}>
          <p className="vc-takeName">{name}</p>
          <p className="vc-takeMeta">{meta}</p>
        </div>
        <span className="vc-tag">{t.tagPreview}</span>
      </div>
      <div className="vc-scrub" ref={ref} onClick={seek}>
        <div className="vc-wave" aria-hidden="true">
          {WAVE.map((h, i) => {
            const p = i / (N - 1);
            const near = Math.abs(p - head) < 0.022 && active;
            return <span key={i} className="vc-waveBar"
              style={{ height: `${(near ? Math.min(1, h * 1.22) : h) * 100}%`, background: p <= head ? barColor(i) : undefined }} />;
          })}
        </div>
      </div>
      <div className="vc-times"><span>{fmt(active ? at : 0)}</span><span>{fmt(dur)}</span></div>
    </div>
  );
}

/* Documentele se deschid ca pagini proprii, în filă nouă: cine citește Termenii
   la pasul patru nu are voie să-și piardă povestea scrisă. */
function Footer({ t, lang, onLibrary }) {
  return (
    <div className="vc-footer">
      {/* Biblioteca se ajungea doar de pe ecranul de livrare, adică doar după ce
          plăteai. Acum e la îndemână de pe orice ecran: cine se întoarce peste o
          săptămână îl caută exact aici, jos. */}
      {onLibrary && (
        <button className="vc-footLink vc-footBtn" onClick={onLibrary}>
          {t.myLibrary}
        </button>
      )}
      <a className="vc-footLink" href={`/legal/${lang}/termeni`} target="_blank" rel="noopener noreferrer">
        {t.footTerms}
      </a>
      <a className="vc-footLink" href={`/legal/${lang}/rambursare`} target="_blank" rel="noopener noreferrer">
        {t.footRefund}
      </a>
      <a className="vc-footLink" href={`/legal/${lang}/confidentialitate`} target="_blank" rel="noopener noreferrer">
        {t.footPrivacy}
      </a>
      <a className="vc-footLink" href="mailto:base.vocalmd@gmail.com">base.vocalmd@gmail.com</a>
      <span className="vc-footLink">S.R.L. „WADE PRODUCTION” · IDNO 1025600056881</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APLICAȚIA
   ══════════════════════════════════════════════════════════════ */

/**
 * @param {{ initialOrderId?: string | null, initialToken?: string | null, lang?: 'ro' | 'en' }} props
 *   `initialOrderId` vine din pagina deschisă dintr-un link de email sau de la
 *   întoarcerea din plată. `initialToken` e secretul din adresă: pe alt
 *   dispozitiv decât cel care a comandat, el e singura dovadă că omul are
 *   dreptul la comandă.
 *   `lang` e limba paginii, hotărâtă pe server din cookie sau din setarea
 *   implicită. Alegerile trimise serverului rămân în română oricum — se
 *   traduce doar eticheta văzută de om.
 */
export default function Vocal({ initialOrderId = null, initialToken = null, lang = 'ro' }) {
  const t = UI[lang] ?? UI.ro;
  const [screen, setScreen] = useState(initialOrderId ? 'loading' : 'intro');
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    style: null, sub: null, mood: null, voice: null,
    recipient: null, recipientOther: '', names: [''], occasion: null, occasionOther: '',
    mode: 'ai', title: '', story: '', lang: 'Română',
  });
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  /* ce știe serverul despre comandă; pagina doar desenează ce i se spune */
  const [orderId, setOrderId] = useState(initialOrderId);
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState(null);

  const [lyrics, setLyrics] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [waitFrom, setWaitFrom] = useState(0);
  const [tick, setTick] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const [take, setTake] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const audioRefs = useRef({});

  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [news, setNews] = useState(false);
  /* Panoul de plată deschis, dacă e vreunul. Stă aici, sus, printre celelalte
     stări, pentru că `jumpTo` trebuie să-l poată închide — iar `jumpTo` e
     declarat înaintea secțiunii de plată. */
  const [pay, setPay] = useState(null);
  /* Ce i-am găsit la intrare și i-am putea da înapoi: o comandă de pe server
     sau, dacă n-a ajuns să facă una, ciorna din browser. */
  const [draft, setDraft] = useState(null);
  const [resumeOrder, setResumeOrder] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [library, setLibrary] = useState([]);
  /* Comutatorul de limbă. `router.refresh()` cere serverului pagina în limba
     nouă fără să reîncarce browserul, deci ce a completat omul în formular
     rămâne pe loc. */
  const router = useRouter();
  const switchLang = () => {
    const next = lang === 'ro' ? 'en' : 'ro';
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  };

  /**
   * Sare direct pe ecranul care se potrivește stării comenzii.
   *
   * Spre deosebire de `applyState`, care mută ecranul doar când omul aștepta
   * ceva, asta e o mutare voită: venim dintr-un link de email sau dintr-o
   * pagină reîncărcată, iar locul corect e cel în care a rămas comanda.
   *
   * Stă aici, sus, pentru că efectul de mai jos îl folosește. `const` nu se
   * ridică singur: declarat sub el, ar fi fost citit înainte să existe.
   */
  const jumpTo = useCallback((state) => {
    setOrderId(state.publicId);
    setOrder(state);
    /* Trecem la altă comandă, deci ce ținea de cea dinainte se închide: un
       panou de plată rămas deschis ar arăta numărul comenzii vechi, iar omul
       ar plăti crezând că e vorba de asta. */
    setPay(null);
    setApiError(null);
    if (state.lyrics != null) setLyrics(state.lyrics);
    // Stările în care ecranul arată o bară de așteptare. Fără momentul de
    // pornire, bara ar sta la zero și ar părea înțepenită.
    if (['rendering', 'lyrics_pending', 'draft'].includes(state.status)) {
      setWaitFrom(Date.now());
    }
    setScreen(SCREEN_FOR[state.status] ?? 'intro');
  }, []);

  /**
   * La intrare: ce facem cu ce a rămas de data trecută.
   *
   * Dacă a dat refresh acum câteva minute, îl punem exact unde era — asta nu e o
   * alegere, e continuarea aceluiași gest. Dacă a trecut mai mult, îl întrebăm
   * pe pagina de start, ca să nu-l aruncăm într-un formular pe care poate nu-l
   * mai vrea.
   *
   * Nu se aplică deloc când intră dintr-un link de email: acolo comanda există
   * pe server și ea bate orice ciornă din browser.
   */
  useEffect(() => {
    if (initialOrderId) return;
    let stop = false;

    (async () => {
      /**
       * Întâi comenzile adevărate, apoi ciorna.
       *
       * O comandă există pe server și supraviețuiește oricui: browserul o ține
       * minte prin cookie-ul ei. Ciorna e doar ce n-a apucat să devină comandă.
       * Dacă există amândouă, comanda câștigă — ea are versurile deja scrise.
       *
       * Asta repară și cazul care doare cel mai tare: omul primește versurile,
       * dă de limita zilnică la înregistrare, reîncarcă pagina din reflex — și
       * până acum se trezea la prima întrebare, cu versurile lui rămase pe un
       * server de care nu mai știa nimic.
       */
      let live = null;
      try {
        const { orders: mine } = await api.list();
        live = (mine ?? []).find((o) => IN_PROGRESS.includes(o.status)) ?? null;
      } catch { /* fără cookie sau fără rețea: mergem mai departe cu ciorna */ }
      if (stop) return;

      if (live) {
        if (Date.now() - new Date(live.updatedAt).getTime() < DRAFT_FRESH) {
          jumpTo(live);
        } else {
          setResumeOrder(live);
        }
        return;
      }

      const saved = readDraft();
      if (!saved) return;

      if (Date.now() - saved.at < DRAFT_FRESH) {
        setD(saved.d);
        setStep(saved.step ?? 0);
        setEmail(saved.email ?? '');
        setNews(Boolean(saved.news));
        setScreen(saved.screen === 'email' ? 'email' : 'wizard');
        return;
      }
      setDraft(saved);
    })();

    return () => { stop = true; };
  }, [initialOrderId, jumpTo]);

  /* Salvăm la fiecare schimbare, cât timp e în formular. E puțin text, iar
     momentul în care se pierde tot e tocmai cel în care n-ai apucat să salvezi. */
  useEffect(() => {
    if (screen !== 'wizard' && screen !== 'email') return;
    if (!hasProgress(d)) return;
    writeDraft({ v: 1, at: Date.now(), screen, step, d, email, news });
  }, [screen, step, d, email, news]);

  const top = useRef(null);
  const storyBox = useRef(null);
  const navRef = useRef(null);
  const [showBar, setShowBar] = useState(false);

  const style = STYLES.find((s) => s.id === d.style);
  const styleName = style ? styleLabel(lang, style.id, style).name : null;
  const opts = d.style ? OPTIONS[d.style] : null;

  /* Pe telefon, cine apasă „Creează melodia ta" a derulat deja jumătate de
     pagină. Fără asta, formularul se deschide la mijloc și primul pas nu se
     vede. `scrollIntoView` nu era de ajuns: cadrul următor readuce poziția. */
  useEffect(() => {
    const id = requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    return () => cancelAnimationFrame(id);
  }, [step, screen]);

  /* bara de jos apare doar când butonul din pagină nu se vede */
  useEffect(() => {
    const el = navRef.current;
    if (!el) { setShowBar(false); return; }
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [step, screen, d.mode, d.style]);

  /* ─── legătura cu serverul ─── */

  /* Starea vine de la server; ecranul e doar reflexia ei. Așa, o pagină
     reîncărcată sau un telefon revenit din stand-by nimeresc locul corect. */
  const applyState = useCallback((state) => {
    setOrder(state);
    if (state.lyrics != null) setLyrics((cur) => (editing ? cur : state.lyrics));

    const map = {
      draft: 'writing',
      lyrics_pending: 'writing',
      lyrics_ready: 'lyrics',
      rendering: 'making',
      preview_ready: 'demo',
      payment_claimed: 'demo',
      paid: 'done',
      delivered: 'done',
      refused: 'error',
      failed: 'error',
      expired: 'error',
    };
    const next = map[state.status];
    if (!next) return;

    setScreen((cur) => {
      if (cur === next) return cur;

      // O oprire trebuie văzută oriunde ai fi.
      if (next === 'error') return 'error';

      // Mutăm ecranul doar când omul așteaptă ceva. Dacă s-a dus singur pe
      // versuri ca să se uite la variante, nu-l aruncăm înapoi la melodie
      // pentru că serverul a răspuns între timp.
      const waiting = cur === 'writing' || cur === 'making';
      if (!waiting) return cur;

      // Melodia a ajuns înaintea barei: o umplem repede, apoi arătăm variantele.
      if (next === 'demo' || next === 'lyrics') {
        setFinishing(true);
        setTimeout(() => { setFinishing(false); setScreen(next); }, 650);
        return cur;
      }
      return next;
    });
  }, [editing]);

  /* Deschisă dintr-un link de email: sărim direct unde a rămas comanda. */
  useEffect(() => {
    if (!initialOrderId) return;
    let stop = false;
    (async () => {
      try {
        const state = await api.get(initialOrderId, initialToken);
        if (!stop) jumpTo(state);
      } catch {
        if (!stop) setScreen('intro');
      }
    })();
    return () => { stop = true; };
  }, [initialOrderId, initialToken, jumpTo]);

  /* Întrebăm serverul cât timp are ceva de lucru. Trei secunde e des cât să
     nu pară blocat și rar cât să nu încărcăm baza degeaba. */
  useEffect(() => {
    if (!orderId) return;
    const waiting = ['draft', 'lyrics_pending', 'rendering'].includes(order?.status);
    if (!waiting) return;

    let stop = false;
    const tick = async () => {
      try {
        const state = await api.get(orderId, initialToken);
        if (!stop) applyState(state);
      } catch {
        /* o interogare pierdută nu e o eroare pentru client; încercăm iar */
      }
    };
    const t = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [orderId, order?.status, applyState, initialToken]);

  /* Bara de progres nu măsoară nimic real — Suno nu ne spune cât a făcut. Ce
     poate face cinstit e să arate că timpul trece, fără să ajungă la 100 înainte
     ca melodia să existe. */
  useEffect(() => {
    if (screen !== 'making' && screen !== 'writing') return;
    const t = setInterval(() => setTick(Date.now()), 300);
    return () => clearInterval(t);
  }, [screen]);

  /**
   * Cât ținem bara, în secunde.
   *
   * 99 era prea mult: melodia ajungea pe la 75% din bară, adică după vreo 75 de
   * secunde, și omul rămânea uitându-se la un sfert de bară care nu mai avea ce
   * măsura. 78 o duce aproape de capăt exact când sosește piesa.
   *
   * Dacă Suno întârzie peste atât, `overtime` spune asta în cuvinte — bara nu
   * rămâne blocată fără explicație.
   */
  const waitSeconds = screen === 'making' ? 78 : 30;
  const elapsed = waitFrom ? (Math.max(tick, waitFrom) - waitFrom) / 1000 : 0;

  /* Bara nu măsoară nimic real — Suno nu ne spune cât a făcut. Ce poate face
     cinstit e să arate că timpul trece, fără să ajungă la capăt înaintea
     melodiei. Când melodia chiar a ajuns, `finishing` o duce repede la 100. */
  const progress = (() => {
    if (finishing) return 100;
    if (!waitFrom || (screen !== 'making' && screen !== 'writing')) return 0;
    return Math.max(0, Math.min(96, Math.round((elapsed / waitSeconds) * 100)));
  })();

  /* Dacă bara s-a umplut și încă nu a venit nimic, spunem asta, în loc s-o
     lăsăm blocată la 96 fără nicio explicație. */
  const overtime = !finishing && waitFrom > 0 && elapsed > waitSeconds;

  /* ─── ascultarea previzualizărilor ─── */

  const stopOthers = (keep) => {
    Object.entries(audioRefs.current).forEach(([n, el]) => {
      if (Number(n) !== keep && el) { el.pause(); el.currentTime = 0; }
    });
  };

  const toggleTake = (n) => {
    const el = audioRefs.current[n];
    if (!el) return;
    if (take === n && playing) { el.pause(); setPlaying(false); return; }
    stopOthers(n);
    setTake(n); setPlaying(true);
    el.play().catch(() => setPlaying(false));
  };

  const seekTake = (n, sec) => {
    const el = audioRefs.current[n];
    if (!el) return;
    stopOthers(n);
    el.currentTime = sec;
    setTake(n); setAt(sec); setPlaying(true);
    el.play().catch(() => setPlaying(false));
  };


  /* nume multiple */
  const setName = (i, v) => setD((p) => { const n = [...p.names]; n[i] = v; return { ...p, names: n }; });
  const addName = () => setD((p) => (p.names.length >= 4 ? p : { ...p, names: [...p.names, ''] }));
  const delName = (i) => setD((p) => ({ ...p, names: p.names.filter((_, k) => k !== i) }));
  const filledNames = d.names.map((n) => n.trim()).filter(Boolean);

  const missing2 = [!d.sub && t.needDirection, !d.mood && t.needMood, !d.voice && t.needVoice].filter(Boolean);
  const missing3 = [
    !d.recipient && t.needPerson,
    d.recipient === 'Altcineva' && !d.recipientOther.trim() && t.needWhoIs,
    !filledNames.length && t.needNames,
    !d.occasion && t.needOccasion,
    d.occasion === 'Altă ocazie' && !d.occasionOther.trim() && t.needWhatOccasion,
  ].filter(Boolean);
  const missing4 = [!d.title.trim() && t.needTitle, !d.story.trim() && (d.mode === 'ai' ? t.needStory : t.needOwnLyrics)].filter(Boolean);
  const missing5 = [!d.lang && t.needSongLang].filter(Boolean);

  const canGo = [!!d.style, !missing2.length, !missing3.length, !missing4.length, !missing5.length, true][step];
  const nextLabel = step === 5 ? t.writeLyrics : t.continueLabel;

  /* când pasul tocmai s-a completat, butonul dă un puls scurt */
  const [ready, setReady] = useState(false);
  const wasReady = useRef(canGo);
  useEffect(() => {
    if (canGo && !wasReady.current) {
      setReady(true);
      const t = setTimeout(() => setReady(false), 760);
      wasReady.current = canGo;
      return () => clearTimeout(t);
    }
    wasReady.current = canGo;
  }, [canGo]);
  const nextCls = `vc-next${ready ? ' is-ready' : ''}`;

  const goNext = () => (step === 5 ? setScreen('email') : setStep(step + 1));

  /* ─── acțiunile care ating serverul ─── */

  const run = async (fn) => {
    setBusy(true); setApiError(null);
    try { await fn(); }
    catch (e) { setApiError(e.message); }
    finally { setBusy(false); }
  };

  /* Trimiterea formularului. De aici încolo comanda există pe server și
     supraviețuiește închiderii paginii. */
  const submitOrder = () => run(async () => {
    const { publicId } = await api.create({
      style: d.style, sub: d.sub, mood: d.mood, voice: d.voice,
      recipient: d.recipient, recipientOther: d.recipientOther,
      names: filledNames, occasion: d.occasion, occasionOther: d.occasionOther,
      mode: d.mode, title: d.title, story: d.story, lang: d.lang,
      email: email.trim(), newsletter: news, terms: agree,
    });
    // De aici încolo comanda trăiește pe server, iar cookie-ul o ține minte.
    // Ciorna din browser și-a făcut treaba și n-are de ce să mai stea.
    clearDraft();
    setDraft(null);
    setOrderId(publicId);
    setWaitFrom(Date.now());
    setScreen('writing');
    setOrder({ status: 'lyrics_pending', tracks: [], regensLeft: 2 });
  });

  const askNewLyrics = () => run(async () => {
    await api.regenerate(orderId);
    setEditing(false);
    setWaitFrom(Date.now());
    setScreen('writing');
    setOrder((o) => ({ ...o, status: 'lyrics_pending' }));
  });

  /* Textul modificat se salvează la ieșirea din editare, nu la fiecare tastă. */
  const finishEditing = async () => {
    setEditing(false);
    if (!orderId || lyrics.trim() === (order?.lyrics ?? '').trim()) return;
    setSaving(true); setApiError(null);
    try { applyState(await api.saveLyrics(orderId, lyrics)); }
    catch (e) { setApiError(e.message); }
    finally { setSaving(false); }
  };

  const approveLyrics = () => run(async () => {
    if (editing) await finishEditing();
    await api.approve(orderId);
    setWaitFrom(Date.now());
    setScreen('making');
    setOrder((o) => ({ ...o, status: 'rendering' }));
  });

  /* Încă o înregistrare a aceluiași text. Costă credite, deci e limitată. */
  const askNewRecording = () => run(async () => {
    await api.newRecording(orderId);
    setPlaying(false); setTake(null); setAt(0);
    setWaitFrom(Date.now());
    setScreen('making');
    setOrder((o) => ({ ...o, status: 'rendering', rendersLeft: Math.max(0, (o?.rendersLeft ?? 1) - 1) }));
  });

  /* Alegerea rămâne pe server: e melodia pe care o primește la livrare. */
  const chooseRecording = (renderId) => run(async () => {
    setPlaying(false); setTake(null); setAt(0);
    applyState(await api.chooseRecording(orderId, renderId));
  });

  const restoreLyrics = (version) => run(async () => {
    setEditing(false);
    applyState(await api.restoreLyrics(orderId, version));
  });

  /**
   * Plata, prin linkul fix de la MAIB.
   *
   * Nu se deschide nicio fereastră peste pagină: linkul e un `<a>` adevărat, pe
   * care îl apasă omul. Altfel Safari și telefoanele l-ar bloca drept fereastră
   * nesolicitată, pentru că s-ar deschide după o cerere la server, nu direct
   * din apăsare.
   *
   * Confirmarea nu vine de la browser — linkul MAIB nu ne anunță nimic, iar
   * browserul poate minți. Clientul spune doar că a plătit; melodia se
   * deschide când vede cineva banii în cont și apasă butonul de pe Telegram.
   *
   * Panoul deschis se ține în `pay`, declarat sus, printre celelalte stări.
   */

  /**
   * Așteptarea nu e o stare a paginii, ci a comenzii.
   *
   * Dacă ar fi ținută doar în browser, omul care se întoarce a doua zi din
   * linkul de email ar vedea iar butonul de cumpărare, deși plata lui e deja
   * anunțată — și ar plăti a doua oară.
   */
  const waitingPayment = order?.status === 'payment_claimed';

  /**
   * Întrebăm serverul și cât timp e doar deschis panoul de plată, nu numai
   * după ce a apăsat „am efectuat achitarea".
   *
   * Altfel, când deblocam noi de pe Telegram — pentru un client care a plătit
   * și n-a mai confirmat nimic — pagina lui nu afla niciodată: rămânea cu
   * panoul de plată deschis până dădea refresh din proprie inițiativă.
   */
  const awaitingPayment = waitingPayment || Boolean(pay);

  /**
   * Când se întoarce în filă, întrebăm pe loc.
   *
   * Plata se face în altă filă, iar omul poate zăbovi acolo: la întoarcere n-are
   * de ce să mai aștepte încă cinci secunde, și nici să fi trecut de fereastra
   * în care mai întrebam.
   */
  const [awake, setAwake] = useState(0);
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === 'visible') setAwake((n) => n + 1);
    };
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, []);

  const buy = () => run(async () => {
    setPay(await api.checkout(orderId));
  });

  /** „Am efectuat achitarea." Nu deblochează nimic: doar ne anunță pe noi. */
  const claimPaid = () => run(async () => {
    const state = await api.claimPayment(orderId);
    applyState(state);
    if (state.paid) setScreen('done');
  });

  /**
   * Cât timp comanda așteaptă confirmarea, întrebăm serverul din zece în zece
   * secunde, ca melodia să se deschidă singură sub ochii lui.
   *
   * Ne oprim după un sfert de oră. Deblocarea o face un om, iar omul poate
   * dormi — iar o pagină uitată deschisă peste noapte n-are de ce să bată
   * serverul până dimineața. Textul spune de ce: melodia vine oricum pe email.
   */
  useEffect(() => {
    if (!awaitingPayment || !orderId) return;
    const until = Date.now() + 900_000;
    let stop = false;

    const check = async () => {
      if (stop) return;
      try {
        const fresh = await api.get(orderId, initialToken);
        if (stop) return;

        /**
         * Plata a fost confirmată — nu contează de cine.
         *
         * Se ajunge aici și când o deblocăm noi, de pe Telegram, fără ca el să
         * fi apăsat „am efectuat achitarea". Sunt clienți care plătesc și nu
         * mai confirmă nimic; melodia li se deschide oricum, sub ochii lor.
         */
        if (fresh.paid) {
          stop = true;
          setOrder(fresh);
          setPay(null);
          setScreen('done');
          return;
        }

        /**
         * Anunțase o plată, iar noi n-am găsit-o.
         *
         * `waitingPayment` e prins aici din efectul curent, deci e adevărat
         * doar cât comanda chiar aștepta o confirmare — un panou de plată pur
         * și simplu deschis nu trece pe ramura asta.
         */
        if (waitingPayment && fresh.status !== 'payment_claimed') {
          stop = true;
          setOrder(fresh);
          setPay(null);
          setApiError(t.payRejected);
        }
      } catch { /* o interogare pierdută nu e o eroare; încercăm iar */ }
    };

    // O dată pe loc: dacă tocmai s-a întors în filă, n-are de ce să mai aștepte.
    void check();

    // `timer`, nu `t`: `t` sunt textele paginii, iar o variabilă cu același
    // nume le-ar acoperi tocmai aici, unde avem nevoie de un mesaj din ele.
    const timer = setInterval(() => {
      if (stop || Date.now() > until) { clearInterval(timer); return; }
      void check();
    }, 5000);

    return () => { stop = true; clearInterval(timer); };
  }, [awaitingPayment, waitingPayment, orderId, initialToken, t, awake]);

  const openLibrary = () => run(async () => {
    const { orders } = await api.list();
    setLibrary(orders);
    setScreen('library');
  });

  /* apăsarea pe siglă nu aruncă niciodată munca omului fără să întrebe */
  const askHome = () => { if (screen !== 'intro') setConfirmHome(true); };

  const goHome = () => {
    setConfirmHome(false);
    setD({
      style: null, sub: null, mood: null, voice: null,
      recipient: null, recipientOther: '', names: [''], occasion: null, occasionOther: '',
      mode: 'ai', title: '', story: '', lang: 'Română',
    });
    setStep(0); setLyrics(''); setEditing(false);
    setOrderId(null); setOrder(null); setApiError(null); setWaitFrom(0);
    setTake(null); setPlaying(false); setAt(0);
    setEmail(''); setAgree(false); setNews(false);
    setScreen('intro');
  };

  /* după livrare nu se pierde nimic, deci nici nu speriem degeaba */
  const delivered = screen === 'done' || screen === 'library';

  const homeDialog = confirmHome && (
    <div className="vc-overlay" role="dialog" aria-modal="true" aria-labelledby="vcHomeTitle"
      onClick={() => setConfirmHome(false)}>
      <div className="vc-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="vc-dialogTitle" id="vcHomeTitle">{t.homeTitle}</p>
        <p className="vc-dialogText">{delivered ? t.homeTextKept : t.homeTextLost}</p>
        <div className="vc-dialogBtns">
          <button className="vc-ghost" style={{ flex: 1 }} onClick={() => setConfirmHome(false)}>
            {t.homeStay}
          </button>
          <button className="vc-next" style={{ height: 48, fontSize: 14.5 }} onClick={goHome}>
            {t.homeGo}
          </button>
        </div>
      </div>
    </div>
  );

  /**
   * Ce plutește peste orice ecran.
   *
   * Fereastra „înapoi la început" și butonul de WhatsApp stau împreună, într-un
   * singur loc: fiecare ecran are propriul `return`, iar un buton adăugat de
   * mână în zece locuri e un buton uitat în al unsprezecelea.
   */
  const overlays = (
    <>
      {homeDialog}
      <a
        className="vc-wa"
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t.waMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        data-up={showBar ? '1' : '0'}
        aria-label={t.waAria}
      >
        <WhatsAppIcon />
        <span className="vc-waText">{t.waText}</span>
      </a>
    </>
  );

  /* ────────── pagini legale ────────── */
  if (screen === 'loading') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <Brand t={t} />
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><Disc3 size={32} /></div>
            <h2 className="vc-waitTitle">{t.loadingTitle}</h2>
          </div>
        </div></div>
      </div>
    );
  }

  /* pagina de start: bannerul singur, cu un singur lucru de făcut.
     Pașii apar abia după apăsare, iar bannerul nu se mai întoarce. */
  if (screen === 'intro') {
    /* „Începe" pornește de la zero, deci ciorna veche se aruncă: altfel primul
       pas ar arăta bifat cu alegerile altei melodii. */
    /* Numele pentru care i s-a început melodia. La o comandă îl avem de la
       server; la o ciornă, din ce a completat în formular. */
    const resumeName = resumeOrder
      ? (resumeOrder.names?.find((n) => n?.trim())?.trim() || resumeOrder.songTitle || '')
      : draftName(draft?.d);

    /* „Începe" pornește de la zero. Ciorna se aruncă, dar comanda de pe server
       NU se atinge: rămâne în bibliotecă și în linkul din email. */
    const start = () => {
      clearDraft();
      setDraft(null);
      setResumeOrder(null);
      setD({
        style: null, sub: null, mood: null, voice: null,
        recipient: null, recipientOther: '', names: [''], occasion: null, occasionOther: '',
        mode: 'ai', title: '', story: '', lang: 'Română',
      });
      setEmail('');
      setNews(false);
      setStep(0);
      setScreen('wizard');
    };

    const resume = () => {
      if (resumeOrder) { setResumeOrder(null); jumpTo(resumeOrder); return; }
      setD(draft.d);
      setStep(draft.step ?? 0);
      setEmail(draft.email ?? '');
      setNews(Boolean(draft.news));
      setDraft(null);
      setScreen(draft.screen === 'email' ? 'email' : 'wizard');
    };
    return (
      <div className="vc">
        <style>{CSS}</style>
        {overlays}

        <div className="vc-head">
          <div className="vc-headIn">
            <Brand onClick={askHome} t={t} />
            <LangSwitch t={t} onClick={switchLang} />
          </div>
          {/* Fără meniu, pagina arată a reclamă, nu a magazin. Prețul nu mai
              are secțiune proprie — stă sub butonul din antet, lângă „creează",
              acolo unde îl caută și cumpărătorul, și cine ne verifică. */}
          <nav className="vc-nav2" aria-label={t.navAria}>
            <a href="#how">{t.navHow}</a>
            <a href="#faq">{t.navFaq}</a>
            {/* Cine se întoarce după melodiile lui le caută în meniu, nu în
                subsol. Merge și gol: atunci biblioteca îi spune că e goală și
                îi dă butonul de a face prima. */}
            <button className="vc-navBtn" onClick={openLibrary}>{t.myLibrary}</button>
          </nav>
        </div>

        <div className="vc-wrap" ref={top}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">{t.heroEyebrow}</p>
            <h1 className="vc-heroTitle">{t.heroTitle}</h1>
            <p className="vc-heroText">{t.heroText}</p>

            {/* A lăsat ceva neterminat. Îl întrebăm o dată, aici, în locul
                butonului obișnuit — nu-l aruncăm înapoi în formular, dar nici
                nu ne facem că n-a fost nimic. */}
            {resumeOrder || draft ? (
              <div className="vc-resume">
                <p className="vc-resumeTitle">
                  {resumeName ? t.resumeFor(resumeName) : t.resumeTitle}
                </p>
                <p className="vc-resumeText">
                  {resumeOrder ? t.resumeOrderText : t.resumeText}
                </p>
                <div className="vc-resumeRow">
                  <button className="vc-next" onClick={resume}>
                    <RotateCcw size={17} /> {t.resumeGo}
                  </button>
                  <button className="vc-ghost" onClick={start}>{t.resumeNew}</button>
                </div>
              </div>
            ) : (
              <div className="vc-heroCta">
                <button className="vc-next" onClick={start}>
                  <Sparkles size={18} /> {t.ctaCreate}
                </button>
              </div>
            )}
            {/* Prețul stă lângă buton, nu ascuns mai jos: e primul lucru pe care
                îl caută si un cumpărător, si cine ne verifică. */}
            <p className="vc-heroPrice">
              {t.heroPriceA}<b>{t.heroPriceB}</b>{t.heroPriceC}
            </p>
          </div>

          <section className="vc-sec" id="how">
            <h2 className="vc-secTitle">{t.howTitle}</h2>
            <p className="vc-secSub">{t.howSub}</p>
            <div className="vc-how">
              {[1, 2, 3].map((n) => (
                <div className="vc-howStep" key={n}>
                  <span className="vc-howNum">{n}</span>
                  <div>
                    <p className="vc-howTitle">{t[`how${n}Title`]}</p>
                    <p className="vc-howText">{t[`how${n}Text`]}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="vc-perks" style={{ marginTop: 18 }}>
              {PERK_ICONS.map((Icon, i) => (
                <div className="vc-perk" key={i}>
                  <span className="vc-perkIcon"><Icon size={17} /></span>
                  <p className="vc-perkText">{t[`perk${i + 1}`]}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="vc-sec" id="faq">
            <h2 className="vc-secTitle">{t.faqTitle}</h2>
            <div className="vc-faq">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <details className="vc-faqItem" key={n}>
                  <summary>{t[`faq${n}Q`]}</summary>
                  <p>{t[`faq${n}A`]}</p>
                </details>
              ))}
            </div>
            <p className="vc-faqFoot">
              {t.faqContact} <a href="mailto:base.vocalmd@gmail.com">base.vocalmd@gmail.com</a>
            </p>
          </section>

          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
      </div>
    );
  }

  /* ────────── emailul, înainte de generare ────────── */
  if (screen === 'email') {
    const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn">
          <Brand onClick={askHome} t={t} /><span className="vc-headNote">{t.headLast}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-hero">
            <p className="vc-heroEyebrow">{t.emailEyebrow}</p>
            <h1 className="vc-heroTitle">{t.emailTitle}</h1>
            <p className="vc-heroText">{t.emailText}</p>
          </div>
          <div className="vc-panel">
            <Module icon={Mail} title={t.emailModTitle} text={t.emailModText}>
              <input className="vc-input" type="email" inputMode="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
            </Module>

            <label className="vc-check" data-on={agree ? '1' : '0'} htmlFor="vc-agree">
              <input className="vc-checkIn" type="checkbox" id="vc-agree"
                checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="vc-box">{agree && <Check size={14} strokeWidth={3} />}</span>
              <span className="vc-checkText">{t.agreeText}</span>
            </label>

            {/* Legăturile stau sub bifă, nu în ea: altfel aproape tot rândul devine
                legătură, iar o apăsare pe mijloc deschide un document în loc să bifeze. */}
            <p className="vc-checkLinks">
              <a href={`/legal/${lang}/termeni`} target="_blank" rel="noopener noreferrer">
                {t.readTerms}
              </a>
              <span aria-hidden="true"> · </span>
              <a href={`/legal/${lang}/confidentialitate`} target="_blank" rel="noopener noreferrer">
                {t.readPrivacy}
              </a>
            </p>

            <label className="vc-check" data-on={news ? '1' : '0'} htmlFor="vc-news">
              <input className="vc-checkIn" type="checkbox" id="vc-news"
                checked={news} onChange={(e) => setNews(e.target.checked)} />
              <span className="vc-box">{news && <Check size={14} strokeWidth={3} />}</span>
              <span className="vc-checkText">{t.newsText}</span>
            </label>

            <div className="vc-safe" style={{ background: 'var(--violet-t)', color: 'var(--ink-2)' }}>
              <ShieldCheck size={16} color="#6C5CE7" />
              <span>{t.noPayNow}</span>
            </div>

            <div className="vc-nav" ref={navRef}>
              <button className="vc-back" onClick={() => { setScreen('wizard'); setStep(5); }} aria-label={t.backAria}>
                <ArrowLeft size={19} />
              </button>
              <button className={nextCls} disabled={!okMail || !agree || busy} onClick={submitOrder}>
                <Sparkles size={18} /> {busy ? t.sending : t.writeLyrics}
              </button>
            </div>
            {(!okMail || !agree) && (
              <Need t={t} items={[!okMail && t.needEmail, !agree && t.needAgree].filter(Boolean)} />
            )}
            <Alert text={apiError} />
          </div>
          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
      </div>
    );
  }

  /* ────────── livrarea, după plată ────────── */
  /* Se ajunge aici doar cu plata confirmată de server. Fișierele integrale vin
     prin linkuri semnate, verificate la fiecare descărcare. */
  if (screen === 'done') {
    const tracks = order?.tracks ?? [];
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn">
          <Brand onClick={askHome} t={t} />
          <span className="vc-headNote">{t.headOrder(order?.publicId ?? '')}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-done">
              <div className="vc-doneIcon"><Check size={34} strokeWidth={3} /></div>
              <h1 className="vc-doneTitle">{t.doneTitle}</h1>
              <p className="vc-doneText">{t.doneText(order?.email || email || t.yourAddress)}</p>
            </div>

            {tracks.map((track) => (
              <div className="vc-track" key={track.variant}>
                <span className="vc-trackIcon"><Music2 size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="vc-trackName">
                    {order?.songTitle || d.title || t.yourSong} — {t.variantOf(track.variant)}
                  </p>
                  <p className="vc-trackMeta">MP3 · {track.duration ? fmt(track.duration) : '—'}</p>
                </div>
                <a className="vc-dl" href={track.fullUrl ?? '#'} download
                  aria-label={t.dlAria(track.variant)}>
                  <Download size={19} />
                </a>
              </div>
            ))}

            <div className="vc-safe">
              <Check size={16} />
              <span>{t.invoiceNote}</span>
            </div>

            {/* A plătit, deci mai are dreptul la câteva interpretări ale
                aceleiași piese. Cele pe care le are deja nu se pierd — una nouă
                se adaugă lângă ele, iar linkurile rămân bune tot timpul. */}
            {(order?.rendersLeft ?? 0) > 0 && (
              <div className="vc-again">
                <p className="vc-againText">{t.againText(order.rendersLeft)}</p>
                <button className="vc-ghost" style={{ width: '100%' }}
                  disabled={busy} onClick={askNewRecording}>
                  <RefreshCw size={16} /> {t.againCta}
                </button>
              </div>
            )}

            <div className="vc-nav" ref={navRef}>
              <button className="vc-ghost" style={{ flex: 1 }} disabled={busy} onClick={openLibrary}>
                <ListMusic size={16} /> {t.myLibrary}
              </button>
              <button className="vc-ghost" style={{ flex: 1 }} onClick={goHome}>
                <Sparkles size={16} /> {t.makeAnother}
              </button>
            </div>
            <Alert text={apiError} />
          </div>
          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
      </div>
    );
  }

  if (screen === 'library') {
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn">
          <Brand onClick={askHome} t={t} /><span className="vc-headNote">{t.headLibrary}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <h1 className="vc-q" style={{ marginTop: 4 }}>{t.libTitle}</h1>
            <p className="vc-qSub">{t.libSub}</p>

            {/* Biblioteca se ajunge acum de oriunde, deci se deschide des și
                goală. Un rând de text într-o pagină pustie arată a greșeală;
                mai bine îi spunem limpede că e goală și îi dăm ce a venit să
                caute — un buton de a începe. */}
            {library.length === 0 && (
              <div className="vc-empty">
                <span className="vc-emptyIcon"><ListMusic size={26} /></span>
                <p className="vc-emptyTitle">{t.libEmpty}</p>
                <p className="vc-emptyText">{t.libEmptyText}</p>
                <button className="vc-next" style={{ width: '100%', marginTop: 16 }}
                  onClick={goHome}>
                  <Sparkles size={18} /> {t.ctaCreate}
                </button>
              </div>
            )}

            {library.map((it) => (
              <div className="vc-item" key={it.publicId}>
                <div className="vc-itemTop">
                  <div style={{ minWidth: 0 }}>
                    <p className="vc-itemName">{it.songTitle || t.untitled}</p>
                    <p className="vc-itemMeta">
                      {new Date(it.createdAt).toLocaleDateString(t.dateLocale, {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="vc-state" data-t={it.paid ? 'paid' : 'demo'}>
                    {it.paid ? t.statePaid : t.stateDemo}
                  </span>
                </div>

                {/* Butonul apare la orice comandă, nu doar la cele care au deja
                    piese: o melodie lăsată la jumătate se continuă tot de aici.
                    `jumpTo` duce fiecare comandă pe ecranul stării ei — ascultat,
                    versuri, sau așteptare. */}
                <div className="vc-itemAct">
                  <button className="vc-ghost" style={{ flex: 1 }} onClick={() => jumpTo(it)}>
                    {it.tracks.length > 0 ? (
                      <><Play size={15} /> {it.paid ? t.listen : t.listenDemo}</>
                    ) : (
                      <><ArrowRight size={15} /> {t.libContinue}</>
                    )}
                  </button>
                  {it.paid && it.tracks[0]?.fullUrl && (
                    <a className="vc-ghost" style={{ flex: 1 }} href={it.tracks[0].fullUrl} download>
                      <Download size={15} /> {t.download}
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="vc-nav" ref={navRef}>
              <button className={nextCls} onClick={goHome}>
                <Sparkles size={18} /> {t.newSong}
              </button>
            </div>
          </div>
          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
      </div>
    );
  }

  /* Două feluri de oprire, cu răspunsuri diferite: o eroare tehnică se
     reîncearcă, un refuz de conținut nu — ar da același răspuns. */
  if (screen === 'error') {
    const refused = order?.status === 'refused';
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn">
          <Brand onClick={askHome} t={t} /><span className="vc-headNote">{t.headError}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-err">
              <div className="vc-errIcon"><AlertTriangle size={32} /></div>
              <h1 className="vc-errTitle">{refused ? t.errRefused : t.errFailed}</h1>
              <p className="vc-errText">{order?.problem ?? t.errDefault}</p>
            </div>

            <div className="vc-safe">
              <ShieldCheck size={16} />
              <span>{t.noCharge}</span>
            </div>

            <div className="vc-nav" ref={navRef}>
              {refused ? (
                <button className={nextCls} onClick={goHome}>
                  <Sparkles size={18} /> {t.startAnother}
                </button>
              ) : (
                <button className={nextCls} disabled={busy} onClick={approveLyrics}>
                  <RotateCcw size={18} /> {busy ? t.retrying : t.retry}
                </button>
              )}
            </div>
            <button className="vc-ghost" style={{ width: '100%', marginTop: 9 }}
              disabled={busy} onClick={openLibrary}>
              <ListMusic size={16} /> {t.seeSaved}
            </button>
            <Alert text={apiError} />
            <p style={{ fontSize: 12.5, color: '#767686', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
              {t.contactNote}
            </p>
          </div>
          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
      </div>
    );
  }

  /* ────────── se creează ────────── */
  /* Gemini durează zeci de secunde, nu instant. Ecranul spune ce se întâmplă,
     ca omul să nu creadă că pagina s-a blocat. */
  if (screen === 'writing') {
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn"><Brand onClick={askHome} t={t} /><LangSwitch t={t} onClick={switchLang} /></div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><PenLine size={30} /></div>
            <h2 className="vc-waitTitle">{t.writingTitle}</h2>
            <p className="vc-waitText">{overtime ? t.writingLate : t.writingNormal}</p>
            <div className="vc-waitRail"><div className="vc-waitFill" style={{ width: `${progress}%` }} /></div>
          </div>
        </div></div>
      </div>
    );
  }

  if (screen === 'making') {
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn"><Brand onClick={askHome} t={t} /><LangSwitch t={t} onClick={switchLang} /></div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><Disc3 size={32} /></div>
            <h2 className="vc-waitTitle">{t.makingTitle}</h2>
            <p className="vc-waitText">{overtime ? t.makingLate : t.makingNormal}</p>
            <div className="vc-waitRail"><div className="vc-waitFill" style={{ width: `${progress}%` }} /></div>
          </div>
        </div></div>
      </div>
    );
  }

  /* ────────── demo + ofertă ────────── */
  if (screen === 'demo') {
    const tracks = order?.tracks ?? [];
    const recordings = order?.recordings ?? [];
    // Previzualizarea e tăiată la 60 de secunde, dar dacă piesa e mai scurtă
    // playerul trebuie să arate durata adevărată, nu una promisă.
    const previewLen = Math.min(60, Math.max(...tracks.map((x) => x.duration || 60), 60));
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn">
          <Brand onClick={askHome} t={t} /><span className="vc-headNote">{t.headSong}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">{t.demoEyebrow}</p>
            <h1 className="vc-heroTitle">{t.demoTitle}</h1>
            <p className="vc-heroText">{t.demoText}</p>
          </div>
          <div className="vc-panel">
            {recordings.length > 1 && (
              <div className="vc-takes">
                <p className="vc-takesLabel">{t.takesLabel(recordings.length)}</p>
                <div className="vc-takesRow">
                  {recordings.map((r) => (
                    <button key={r.id} className="vc-takeTab" disabled={busy}
                      data-on={r.id === order?.currentRenderId ? '1' : '0'}
                      aria-pressed={r.id === order?.currentRenderId}
                      onClick={() => chooseRecording(r.id)}>
                      {t.recordingN(r.generation)}
                      {r.lyricsVersion !== order?.lyricsVersion && (
                        <span className="vc-takeTabNote">{t.altText}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tracks.map((track) => (
              <React.Fragment key={track.variant}>
                <audio
                  ref={(el) => { audioRefs.current[track.variant] = el; }}
                  src={track.previewUrl ?? undefined}
                  preload="metadata"
                  onTimeUpdate={(e) => { if (take === track.variant) setAt(e.currentTarget.currentTime); }}
                  onEnded={() => setPlaying(false)}
                />
                <Take
                  t={t}
                  name={t.variantN(track.variant)}
                  meta={track.variant === 1
                    ? t.voiceMeta(styleName ?? t.yourSong, label(lang, 'voices', d.voice || 'Femeie'))
                    : t.altTake(styleName ?? t.yourSong)}
                  playing={playing && take === track.variant}
                  at={at}
                  active={take === track.variant}
                  dur={previewLen}
                  onToggle={() => toggleTake(track.variant)}
                  onSeek={(sec) => seekTake(track.variant, sec)}
                />
              </React.Fragment>
            ))}

            <div className="vc-two" style={{ marginTop: 14 }}>
              <button className="vc-ghost" onClick={() => setScreen('lyrics')}>
                <ListMusic size={16} /> {t.seeLyrics}
              </button>
              <button className="vc-ghost" disabled={busy || (order?.rendersLeft ?? 0) === 0}
                onClick={askNewRecording}
                style={(order?.rendersLeft ?? 0) === 0 ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
                <RefreshCw size={16} /> {t.otherRecording}
              </button>
            </div>
            <p className="vc-takesFoot">
              {(order?.rendersLeft ?? 0) > 0 ? t.rendersLeft(order.rendersLeft) : t.rendersNone}
            </p>
            <Alert text={apiError} />

            <div className="vc-offer">
              <div className="vc-offerIn">
                <p className="vc-offerKicker">{t.offerKicker}</p>
                <h2 className="vc-offerTitle">{t.offerTitle}</h2>
                <div className="vc-offerPrice">
                  <span className="vc-priceNum">{t.spec3a}</span>
                  <span className="vc-priceNote">{t.priceNote}</span>
                </div>
                <ul className="vc-offerList">
                  {[t.offer1, t.offer2, t.offer3, t.offer4].map((line) => (
                    <li key={line}><span className="vc-offerCheck"><Check size={13} strokeWidth={3} /></span>
                      <span>{line}</span></li>
                  ))}
                </ul>
                <div className="vc-nav" ref={navRef} style={{ marginTop: 0 }}>
                  {waitingPayment ? (
                    /* A spus că a plătit. Aici nu mai are ce apăsa: deblocarea e
                       la noi, iar pagina se deschide singură când se face. */
                    <div className="vc-payWait">
                      <p className="vc-payWaitTitle">
                        <Clock size={16} /> {t.payCheckingTitle}
                      </p>
                      <p className="vc-payWaitText">{t.payCheckingText}</p>
                    </div>
                  ) : !pay ? (
                    <button className="vc-buy" disabled={busy} onClick={buy}>
                      <Download size={20} /> {t.buyCta}
                    </button>
                  ) : (
                    <div className="vc-payPanel">
                      <p className="vc-payStep">{t.payStep1}</p>
                      {/* Linkul e un <a> adevărat, nu o fereastră deschisă din
                          cod: altfel telefoanele îl blochează. */}
                      <a className="vc-buy" href={pay.url} target="_blank" rel="noopener noreferrer"
                        style={{ marginTop: 10, textDecoration: 'none' }}>
                        <ExternalLink size={19} /> {t.payOpen(pay.priceEur)}
                      </a>

                      {/* Linkul MAIB e același pentru toți și nu poartă numărul
                          comenzii. Emailul e singura punte între banii intrați
                          și comanda asta, deci i-l punem sub ochi. */}
                      <div className="vc-payMatch">
                        <p className="vc-payMatchTitle">{t.paySameEmail}</p>
                        <p className="vc-payMatchValue">{order?.email ?? '—'}</p>
                        <p className="vc-payMatchNote">{t.payOrderRef} <b>{pay.orderRef}</b></p>
                      </div>

                      <p className="vc-payStep" style={{ marginTop: 14 }}>{t.payStep2}</p>
                      <button className="vc-ghost" disabled={busy} onClick={claimPaid}
                        style={{ width: '100%', marginTop: 8 }}>
                        <Check size={16} /> {t.payDone}
                      </button>
                      <p className="vc-payFoot">{t.payFoot}</p>
                    </div>
                  )}
                </div>
                <div className="vc-offerTrust">
                  <span className="vc-trustBit"><ShieldCheck size={13} /> {t.trust1}</span>
                  <span className="vc-trustBit"><Zap size={13} /> {t.trust2}</span>
                  <span className="vc-trustBit"><Download size={13} /> {t.trust3}</span>
                </div>
              </div>
            </div>
          </div>
          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
        {/* Bara de jos dispare odată ce s-a deschis panoul de plată: altfel ar
            acoperi tocmai butonul „am efectuat achitarea". */}
        {showBar && !pay && !waitingPayment && (
          <div className="vc-bar"><div className="vc-barIn">
            <button className="vc-next" disabled={busy} onClick={buy}>
              <Download size={18} /> {t.buyCta}
            </button>
          </div></div>
        )}
      </div>
    );
  }

  /* ────────── versuri ────────── */
  if (screen === 'lyrics') {
    const left = order?.regensLeft ?? 0;
    const history = order?.lyricsHistory ?? [];
    const older = history.filter((v) => !v.isCurrent).reverse();
    // După ce piesa a fost cântată, textul nu se mai schimbă pe loc — dar se
    // poate reveni la o variantă veche, iar apoi cere o înregistrare nouă.
    const sung = ['rendering', 'preview_ready', 'payment_claimed', 'paid', 'delivered'].includes(order?.status);
    // Textul de acum diferă de cel din înregistrarea aleasă: are rost să-l cânte.
    const chosen = (order?.recordings ?? []).find((r) => r.id === order?.currentRenderId);
    const textChanged = sung && chosen && chosen.lyricsVersion !== order?.lyricsVersion;
    const canRecord = textChanged && (order?.rendersLeft ?? 0) > 0;
    return (
      <div className="vc">
        <style>{CSS}</style>
      {overlays}
        <div className="vc-head"><div className="vc-headIn">
          <Brand onClick={askHome} t={t} /><span className="vc-headNote">{t.headLyrics}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>
        <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">{t.lyricsEyebrow}</p>
            <h1 className="vc-heroTitle">{order?.songTitle || d.title || t.lyricsFallback}</h1>
            <p className="vc-heroText">{sung ? t.lyricsSung : t.lyricsFresh}</p>
          </div>
          <div className="vc-panel">
            {editing
              ? <textarea className="vc-lyricsEdit" value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
              : <div className="vc-lyrics">{lyrics}</div>}
            {!sung && (
              <>
                <div className="vc-two">
                  <button className="vc-ghost" disabled={saving}
                    onClick={() => (editing ? finishEditing() : setEditing(true))}>
                    <Pencil size={16} /> {saving ? t.saving : editing ? t.editDone : t.editStart}
                  </button>
                  <button className="vc-ghost" disabled={left === 0 || busy || editing}
                    onClick={askNewLyrics}
                    style={left === 0 ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
                    <RefreshCw size={16} /> {t.otherVersion}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#767686', margin: '12px 0 0', lineHeight: 1.55 }}>
                  {left > 0 ? t.regensLeft(left) : t.regensNone}
                </p>
              </>
            )}

            {textChanged && (
              <div className="vc-safe" style={{ background: 'var(--violet-t)', color: 'var(--ink-2)' }}>
                <Sparkles size={16} color="#6C5CE7" />
                <span>{canRecord ? t.changedCanRecord : t.changedNoRecord}</span>
              </div>
            )}

            {older.length > 0 && (
              <details className="vc-hist">
                <summary>{t.historySummary(older.length)}</summary>
                {older.map((v) => (
                  <div className="vc-histItem" key={v.version}>
                    <p className="vc-histTitle">{v.title || t.versionN(v.version)}</p>
                    <p className="vc-histText">
                      {v.lyrics.split('\n').map((l) => l.trim())
                        .filter((l) => l && !l.startsWith('['))
                        .slice(0, 2).join(' · ')}
                    </p>
                    <button className="vc-ghost" style={{ width: '100%' }} disabled={busy}
                      onClick={() => restoreLyrics(v.version)}>
                      <RotateCcw size={15} /> {t.restoreVersion}
                    </button>
                  </div>
                ))}
              </details>
            )}
            <Alert text={apiError} />
            <div className="vc-nav" ref={navRef}>
              <button className="vc-back" onClick={askHome} aria-label={t.backAria}><ArrowLeft size={19} /></button>
              {!sung ? (
              <button className="vc-next" disabled={busy || saving} onClick={approveLyrics}>
                <Check size={18} /> {busy ? t.sending : t.approveRecord}
              </button>
            ) : canRecord ? (
              <button className="vc-next" disabled={busy} onClick={askNewRecording}>
                <Mic2 size={18} /> {busy ? t.sending : t.recordThis}
              </button>
            ) : (
              <button className="vc-next" onClick={() => setScreen('demo')}>
                <Play size={18} fill="currentColor" /> {t.backToSong}
              </button>
            )}
            </div>
          </div>
          <Footer t={t} lang={lang} onLibrary={openLibrary} />
        </div>
        {showBar && (
          <div className="vc-bar"><div className="vc-barIn">
            <button className="vc-back" onClick={askHome} aria-label={t.backAria}><ArrowLeft size={19} /></button>
            {!sung ? (
              <button className="vc-next" disabled={busy || saving} onClick={approveLyrics}>
                <Check size={18} /> {busy ? t.sending : t.approveRecord}
              </button>
            ) : canRecord ? (
              <button className="vc-next" disabled={busy} onClick={askNewRecording}>
                <Mic2 size={18} /> {busy ? t.sending : t.recordThis}
              </button>
            ) : (
              <button className="vc-next" onClick={() => setScreen('demo')}>
                <Play size={18} fill="currentColor" /> {t.backToSong}
              </button>
            )}
          </div></div>
        )}
      </div>
    );
  }

  /* ────────── formular ────────── */
  return (
    <div className="vc">
      <style>{CSS}</style>
      {overlays}

      <div className="vc-head"><div className="vc-headIn">
        <Brand onClick={askHome} t={t} />
        <span className="vc-headNote">{t.headStep(step + 1)}</span>
          <LangSwitch t={t} onClick={switchLang} />
        </div></div>

      <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
        <div className="vc-panel">
          <div className="vc-steps">
            {steps(t).map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className="vc-link" data-s={i <= step ? 'done' : ''} />}
                <span className="vc-dot" data-s={i < step ? 'done' : i === step ? 'now' : ''}>
                  {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
              </React.Fragment>
            ))}
          </div>
          <p className="vc-stepNow">{steps(t)[step]}</p>

          {/* 1 — stil */}
          {step === 0 && (
            <>
              <h2 className="vc-q">{t.q1}</h2>
              <p className="vc-qSub">{t.q1sub}</p>
              <div className="vc-grid">
                {STYLES.map(({ id, name, desc, Icon }) => (
                  <button key={id} className="vc-tile" data-on={d.style === id ? '1' : '0'} aria-pressed={d.style === id}
                    onClick={() => setD((p) => p.style === id
                      ? { ...p, style: null, sub: null, mood: null, voice: null }
                      : { ...p, style: id, sub: null, mood: null, voice: null })}>
                    {d.style === id && <span className="vc-badge"><Check size={12} strokeWidth={3} /></span>}
                    <span className="vc-tileIcon"><Icon size={20} /></span>
                    <p className="vc-tileName">{styleLabel(lang, id, { name, desc }).name}</p>
                    <p className="vc-tileDesc">{styleLabel(lang, id, { name, desc }).desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 2 — personalizare */}
          {step === 1 && opts && (
            <>
              <h2 className="vc-q">{t.q2}</h2>
              <p className="vc-qSub">{t.q2sub}</p>
              <Module icon={Music2} title={t.modDirection} text={t.modDirectionText(styleName ?? '')}>
                <Choices options={opts.sub} value={d.sub} onPick={(v) => set('sub', v)}
                  labelFor={(v) => label(lang, 'subs', v)} />
              </Module>
              <Module icon={Wand2} title={t.modMood} text={t.modMoodText}>
                <Choices options={opts.mood} value={d.mood} onPick={(v) => set('mood', v)}
                  labelFor={(v) => label(lang, 'moods', v)} />
              </Module>
              <Module icon={Mic2} title={t.modVoice} text={t.modVoiceText}>
                <Segmented options={opts.voice} value={d.voice} onPick={(v) => set('voice', v)}
                  emoji={VOICE_EMOJI} labelFor={(v) => label(lang, 'voices', v)} />
              </Module>
              <Need items={missing2} t={t} />
            </>
          )}

          {/* 3 — pentru cine */}
          {step === 2 && (
            <>
              <h2 className="vc-q">{t.q3}</h2>
              <p className="vc-qSub">{t.q3sub}</p>

              <Module icon={User} title={t.modPerson} text={t.modPersonText}>
                <Choices options={RECIPIENTS} value={d.recipient} onPick={(v) => set('recipient', v)}
                  labelFor={(v) => label(lang, 'recipients', v)} />
                {d.recipient === 'Altcineva' && (
                  <div className="vc-extra">
                    <input className="vc-input" maxLength={40} value={d.recipientOther}
                      onChange={(e) => set('recipientOther', e.target.value)}
                      placeholder={t.otherPersonPlaceholder} />
                  </div>
                )}
              </Module>

              <Module icon={Heart} title={t.modNames} text={t.modNamesText}>
                {d.names.map((n, i) => (
                  <div className="vc-nameRow" key={i}>
                    <input className="vc-input" maxLength={28} value={n}
                      onChange={(e) => setName(i, e.target.value)}
                      placeholder={i === 0 ? t.namePlaceholder1 : t.namePlaceholder2} />
                    {d.names.length > 1 && (
                      <button className="vc-del" onClick={() => delName(i)} aria-label={t.delNameAria(i + 1)}>
                        <X size={17} />
                      </button>
                    )}
                  </div>
                ))}
                {d.names.length < 4 && (
                  <button className="vc-add" onClick={addName}>
                    <Plus size={16} /> {t.addName}
                  </button>
                )}
              </Module>

              <Module icon={CalendarHeart} title={t.modOccasion} text={t.modOccasionText}>
                <Choices options={OCCASIONS} value={d.occasion} onPick={(v) => set('occasion', v)}
                  labelFor={(v) => label(lang, 'occasions', v)} />
                {d.occasion === 'Altă ocazie' && (
                  <div className="vc-extra">
                    <input className="vc-input" maxLength={50} value={d.occasionOther}
                      onChange={(e) => set('occasionOther', e.target.value)}
                      placeholder={t.otherOccasionPlaceholder} />
                  </div>
                )}
              </Module>
              <Need items={missing3} t={t} />
            </>
          )}

          {/* 4 — povestea */}
          {step === 3 && (
            <>
              <h2 className="vc-q">{t.q4}</h2>
              <p className="vc-qSub">{t.q4sub}</p>

              <div className="vc-picks" style={{ marginBottom: 12 }}>
                <button className="vc-pick" data-on={d.mode === 'ai' ? '1' : '0'} onClick={() => set('mode', 'ai')}>
                  <span className="vc-pickIcon"><Sparkles size={17} color="#6C5CE7" /></span>
                  <span>
                    <p className="vc-pickName">{t.pickAi}</p>
                    <p className="vc-pickText">{t.pickAiText}</p>
                  </span>
                </button>
                <button className="vc-pick" data-on={d.mode === 'own' ? '1' : '0'} onClick={() => set('mode', 'own')}>
                  <span className="vc-pickIcon"><Pencil size={17} color="#6C5CE7" /></span>
                  <span>
                    <p className="vc-pickName">{t.pickOwn}</p>
                    <p className="vc-pickText">{t.pickOwnText}</p>
                  </span>
                </button>
              </div>

              <Module icon={Gift} title={t.modSongTitle} text={t.modSongTitleText}>
                <input className="vc-input" maxLength={60} value={d.title}
                  onChange={(e) => set('title', e.target.value)} placeholder={t.songTitlePlaceholder} />
              </Module>

              <div ref={storyBox} style={{ scrollMarginTop: 72 }}>
              <Module icon={Pencil}
                title={d.mode === 'ai' ? t.modStoryAi : t.modStoryOwn}
                text={d.mode === 'ai' ? t.modStoryAiText : t.modStoryOwnText}>
                <textarea className="vc-area" maxLength={2000} value={d.story}
                  onChange={(e) => set('story', e.target.value)}
                  placeholder={d.mode === 'ai' ? t.storyExample : t.ownPlaceholder} />
                <p className="vc-meter">{d.story.length} / 2000</p>
              </Module>
              </div>

              {d.mode === 'ai' && (
                <details className="vc-mod vc-modFold">
                  <summary className="vc-modHead">
                    <span className="vc-modIcon"><Sparkles size={17} /></span>
                    <div>
                      <p className="vc-modTitle">{t.inspireTitle}</p>
                      <p className="vc-modText">{t.inspireText}</p>
                    </div>
                    <span className="vc-foldArrow" aria-hidden="true" />
                  </summary>
                  <div className="vc-opts" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginTop: 14 }}>
                    {inspiration(t).map((i) => (
                      <button key={i.label} className="vc-opt" onClick={() => {
                        set('story', i.text);
                        // pe telefon caseta a rămas sus, în afara ecranului: îl ducem la ea
                        requestAnimationFrame(() =>
                          storyBox.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                      }}>
                        <span style={{ fontSize: 15, lineHeight: 1 }}>{i.emoji}</span>
                        <span className="vc-optLabel">{i.label}</span>
                      </button>
                    ))}
                  </div>
                </details>
              )}
              <Need items={missing4} t={t} />
            </>
          )}

          {/* 5 — limba */}
          {step === 4 && (
            <>
              <h2 className="vc-q">{t.q5}</h2>
              <p className="vc-qSub">{t.q5sub}</p>
              <div className="vc-picks">
                {LANGUAGES.map((l) => (
                  <button key={l.label} className="vc-pick" data-on={d.lang === l.label ? '1' : '0'}
                    aria-pressed={d.lang === l.label}
                    onClick={() => set('lang', d.lang === l.label ? null : l.label)}>
                    <span className="vc-pickIcon">{l.flag}</span>
                    <span>
                      <p className="vc-pickName">{label(lang, 'songLangs', l.label)}</p>
                      <p className="vc-pickText">{t.songLangNote(label(lang, 'songLangs', l.label))}</p>
                    </span>
                  </button>
                ))}
              </div>
              <Need items={missing5} t={t} />
            </>
          )}

          {/* 6 — recapitulare */}
          {step === 5 && (
            <>
              <h2 className="vc-q">{t.q6}</h2>
              <p className="vc-qSub">{t.q6sub}</p>
              <div className="vc-recap">
                <div className="vc-row"><span className="vc-rowKey">{t.recapStyle}</span><span className="vc-rowVal">{styleName}</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapDirection}</span><span className="vc-rowVal">{label(lang, 'subs', d.sub)}</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapMood}</span><span className="vc-rowVal">{label(lang, 'moods', d.mood)}</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapVoice}</span><span className="vc-rowVal">{label(lang, 'voices', d.voice)}</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapFor}</span>
                  <span className="vc-rowVal">{filledNames.join(', ')} ({d.recipient === 'Altcineva' ? d.recipientOther : label(lang, 'recipients', d.recipient)})</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapOccasion}</span>
                  <span className="vc-rowVal">{d.occasion === 'Altă ocazie' ? d.occasionOther : label(lang, 'occasions', d.occasion)}</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapTitle}</span><span className="vc-rowVal">{d.title}</span></div>
                <div className="vc-row"><span className="vc-rowKey">{t.recapLang}</span><span className="vc-rowVal">{label(lang, 'songLangs', d.lang)}</span></div>
                <div className="vc-block">
                  <span className="vc-rowKey">{d.mode === 'ai' ? t.recapStory : t.recapOwnLyrics}</span>
                  <p className="vc-blockText">{d.story}</p>
                </div>
              </div>

              <div className="vc-mod">
                <div className="vc-modHead">
                  <span className="vc-modIcon"><Gift size={17} /></span>
                  <div><p className="vc-modTitle">{t.getTitle}</p>
                    <p className="vc-modText">{t.getText}</p></div>
                </div>
                <ul className="vc-getList">
                  {[t.get1, t.get2, t.get3, t.get4].map((line) => (
                    <li key={line}><Check size={16} /><span>{line}</span></li>
                  ))}
                </ul>
                <div className="vc-free">
                  <b>{t.freeNoteBold}</b>{t.freeNoteRest}
                </div>
              </div>
            </>
          )}

          {/* navigarea, chiar sub conținut */}
          <div className="vc-nav" ref={navRef}>
            {step > 0 && <button className="vc-back" onClick={() => setStep(step - 1)} aria-label={t.prevStepAria}><ArrowLeft size={19} /></button>}
            <button className={nextCls} disabled={!canGo} onClick={goNext}>
              {step === 5 ? <Sparkles size={18} /> : null}{nextLabel}{step < 5 && <ArrowRight size={18} />}
            </button>
          </div>
        </div>

        <Footer t={t} lang={lang} onLibrary={openLibrary} />
      </div>

      {showBar && (
        <div className="vc-bar"><div className="vc-barIn">
          {step > 0 && <button className="vc-back" onClick={() => setStep(step - 1)} aria-label={t.prevStepAria}><ArrowLeft size={19} /></button>}
          <button className={nextCls} disabled={!canGo} onClick={goNext}>
            {step === 5 ? <Sparkles size={18} /> : null}{nextLabel}{step < 5 && <ArrowRight size={18} />}
          </button>
        </div></div>
      )}
    </div>
  );
}
