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
import { openCheckout } from '@/lib/paddle-client';
import {
  Check, ArrowLeft, ArrowRight, Heart, Users, PartyPopper, Music2, Star, Mic2,
  Disc3, Guitar, Piano, Flame, Radio, Pencil, PenLine, RefreshCw, Play, Pause,
  Download, Sparkles, Wand2, User, Gift, CalendarHeart, Clock, ShieldCheck, Zap,
  Plus, X, Mail, Copy, AlertTriangle, ListMusic, Link2, RotateCcw
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

const OPTIONS = {
  romantic:  { sub: ['Baladă', 'Acustic', 'Pop romantic', 'Cinematic'],               mood: ['Tandră', 'Pasională', 'Nostalgică', 'Solemnă'],          voice: ['Femeie', 'Bărbat'] },
  suflet:    { sub: ['Baladă acustică', 'Pop cald', 'Folk', 'Orchestral'],            mood: ['Recunoștință', 'Nostalgică', 'Luminoasă', 'Emoționantă'], voice: ['Femeie', 'Bărbat'] },
  petrecere: { sub: ['Dance', 'Disco', 'Folclor modern', 'Latino'],                   mood: ['Energică', 'Veselă', 'Exuberantă'],                      voice: ['Femeie', 'Bărbat'] },
  manele:    { sub: ['De dragoste', 'De petrecere', 'De pahar', 'Orientală modernă'], mood: ['Sentimentală', 'De chef', 'Cu năduf'],                   voice: ['Femeie', 'Bărbat'] },
  pop:       { sub: ['Pop modern', 'Dance-pop', 'Pop acustic', 'Retro anii 80'],      mood: ['Veselă', 'Emoționantă', 'Energică', 'Visătoare'],        voice: ['Femeie', 'Bărbat'] },
  rb:        { sub: ['Classic Soul', 'Contemporary', 'Neo-Soul', 'Funky'],            mood: ['Senzuală', 'Romantică', 'Reflexivă'],                    voice: ['Femeie', 'Bărbat'] },
  rap:       { sub: ['Melodic rap', 'Trap', 'Old-school', 'Boom bap'],                mood: ['Energică', 'Emoționantă', 'Amuzantă', 'Motivațională'],  voice: ['Femeie', 'Bărbat'] },
  rock:      { sub: ['Rock clasic', 'Baladă rock', 'Pop-rock', 'Alternativ'],         mood: ['Energică', 'Emoționantă', 'Rebelă'],                     voice: ['Femeie', 'Bărbat'] },
  folclor:   { sub: ['Etno modern', 'Tradițional', 'Doină', 'Sârbă de joc'],          mood: ['Veselă', 'Nostalgică', 'De sărbătoare'],                 voice: ['Femeie', 'Bărbat'] },
  acustic:   { sub: ['Voce și chitară', 'Pian', 'Folk', 'Indie'],                     mood: ['Caldă', 'Intimă', 'Nostalgică'],                         voice: ['Femeie', 'Bărbat'] },
  latino:    { sub: ['Reggaeton', 'Bachata', 'Salsa', 'Latin pop'],                   mood: ['Pasională', 'Veselă', 'Senzuală'],                       voice: ['Femeie', 'Bărbat'] },
  jazz:      { sub: ['Swing', 'Jazz lounge', 'Bossa nova', 'Big band'],               mood: ['Elegantă', 'Jucăușă', 'Romantică'],                      voice: ['Femeie', 'Bărbat'] },
};

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

const PERKS = [
  { Icon: PenLine, text: 'Versuri scrise de la zero' },
  { Icon: Mic2,    text: 'Voce plină de emoție' },
  { Icon: Clock,   text: 'Gata în câteva minute' },
];

const INSPIRATION = [
  { emoji: '💛', label: 'Mulțumesc pentru tot', text: 'Vreau să-i mulțumesc pentru tot ce a făcut pentru mine de-a lungul anilor, fără să ceară nimic în schimb.' },
  { emoji: '✨', label: 'Cum ne-am cunoscut',   text: 'Povestea zilei în care ne-am cunoscut și cum s-a schimbat totul de atunci.' },
  { emoji: '🌙', label: 'Îmi lipsești',          text: 'Suntem departe unul de celălalt și vreau să știe cât de mult îmi lipsește.' },
  { emoji: '💪', label: 'Ești puterea mea',      text: 'Despre cât de mult mă inspiră și cum mă ține pe picioare în zilele grele.' },
  { emoji: '😄', label: 'Ceva amuzant',          text: 'O piesă veselă, cu glumele noastre și lucrurile caraghioase pe care le face.' },
];

const STORY_EXAMPLE =
  'Anul acesta facem 10 ani de la nuntă. Am construit totul de la zero împreună, de când stăteam în chirie într-o garsonieră mică, până la viața aglomerată de acum cu doi copii. Chiar dacă suntem mereu pe fugă, diminețile când îmi pregătește cafeaua mă fac să uit de stres. Vreau să-i mulțumesc pentru toată răbdarea și să știe că o iubesc la fel de mult.';

const STEPS = ['Stilul', 'Personalizare', 'Pentru cine', 'Povestea', 'Limba', 'Gata'];

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

.vc-head { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,.93); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
.vc-headIn { max-width: 640px; margin: 0 auto; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; }
.vc-mark { font-size: 17px; font-weight: 700; letter-spacing: .16em; padding-left: .16em; }
.vc-headNote { font-size: 12.5px; color: var(--gray); font-weight: 500; }
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
.vc-heroNote { font-size: 12.5px; line-height: 1.5; color: var(--ink-2); text-align: center; margin: 11px 0 0; }
.vc-heroSep { height: 1px; background: rgba(108,92,231,.13); margin: 18px 0 16px; }
.vc-mark { transition: opacity .15s; }
button.vc-mark:hover { opacity: .62; }

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
function Choices({ options, value, onPick, cols = 2 }) {
  return (
    <div className="vc-opts" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {options.map((o) => (
        <button key={o} className="vc-opt" data-on={value === o ? '1' : '0'}
          aria-pressed={value === o} onClick={() => onPick(value === o ? null : o)}>
          <span className="vc-radio">{value === o && <span className="vc-radioDot" />}</span>
          <span className="vc-optLabel">{o}</span>
        </button>
      ))}
    </div>
  );
}

function Segmented({ options, value, onPick, emoji }) {
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
          {emoji?.[o] && <span className="vc-segEmoji">{emoji[o]}</span>}{o}
        </button>
      ))}
    </div>
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

function Need({ items }) {
  if (!items.length) return null;
  return (
    <div className="vc-need">
      <Sparkles size={14} />
      <span>Ca să mergem mai departe, mai alege: <b>{items.join(', ')}</b>.</span>
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

function Take({ name, meta, playing, at, active, dur = 60, onToggle, onSeek }) {
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
        <button className="vc-playBtn" onClick={onToggle} aria-label={playing ? `Oprește ${name}` : `Ascultă ${name}`}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <div style={{ flex: 1 }}>
          <p className="vc-takeName">{name}</p>
          <p className="vc-takeMeta">{meta}</p>
        </div>
        <span className="vc-tag">previzualizare</span>
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
function Footer() {
  return (
    <div className="vc-footer">
      <a className="vc-footLink" href="/legal/ro/termeni" target="_blank" rel="noopener noreferrer">
        Termeni și condiții
      </a>
      <a className="vc-footLink" href="/legal/ro/rambursare" target="_blank" rel="noopener noreferrer">
        Politica de rambursare
      </a>
      <a className="vc-footLink" href="/legal/ro/confidentialitate" target="_blank" rel="noopener noreferrer">
        Confidențialitate
      </a>
      <span className="vc-footLink">Wade Production S.R.L.</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APLICAȚIA
   ══════════════════════════════════════════════════════════════ */

/**
 * @param {{ initialOrderId?: string | null }} props
 *   `initialOrderId` vine din pagina deschisă dintr-un link de email.
 */
export default function Vocal({ initialOrderId = null }) {
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
  const [copied, setCopied] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const [library, setLibrary] = useState([]);

  const top = useRef(null);
  const storyBox = useRef(null);
  const navRef = useRef(null);
  const [showBar, setShowBar] = useState(false);

  const style = STYLES.find((s) => s.id === d.style);
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

  /* Deschisă dintr-un link de email: sărim direct unde a rămas comanda. Aici
     mutarea ecranului e voită, spre deosebire de sincronizarea obișnuită. */
  useEffect(() => {
    if (!initialOrderId) return;
    let stop = false;
    (async () => {
      try {
        const state = await api.get(initialOrderId);
        if (stop) return;
        setOrder(state);
        if (state.lyrics != null) setLyrics(state.lyrics);
        const map = {
          draft: 'writing', lyrics_pending: 'writing', lyrics_ready: 'lyrics',
          rendering: 'making', preview_ready: 'demo', paid: 'done', delivered: 'done',
          refused: 'error', failed: 'error', expired: 'error',
        };
        if (state.status === 'rendering' || state.status === 'lyrics_pending') {
          setWaitFrom(Date.now());
        }
        setScreen(map[state.status] ?? 'intro');
      } catch {
        if (!stop) setScreen('intro');
      }
    })();
    return () => { stop = true; };
  }, [initialOrderId]);

  /* Întrebăm serverul cât timp are ceva de lucru. Trei secunde e des cât să
     nu pară blocat și rar cât să nu încărcăm baza degeaba. */
  useEffect(() => {
    if (!orderId) return;
    const waiting = ['draft', 'lyrics_pending', 'rendering'].includes(order?.status);
    if (!waiting) return;

    let stop = false;
    const tick = async () => {
      try {
        const state = await api.get(orderId);
        if (!stop) applyState(state);
      } catch {
        /* o interogare pierdută nu e o eroare pentru client; încercăm iar */
      }
    };
    const t = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(t); };
  }, [orderId, order?.status, applyState]);

  /* Bara de progres nu măsoară nimic real — Suno nu ne spune cât a făcut. Ce
     poate face cinstit e să arate că timpul trece, fără să ajungă la 100 înainte
     ca melodia să existe. */
  useEffect(() => {
    if (screen !== 'making' && screen !== 'writing') return;
    const t = setInterval(() => setTick(Date.now()), 300);
    return () => clearInterval(t);
  }, [screen]);

  const waitSeconds = screen === 'making' ? 99 : 30;
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

  const missing2 = [!d.sub && 'direcția muzicală', !d.mood && 'starea de spirit', !d.voice && 'cine cântă'].filter(Boolean);
  const missing3 = [
    !d.recipient && 'persoana',
    d.recipient === 'Altcineva' && !d.recipientOther.trim() && 'cine este persoana',
    !filledNames.length && 'numele',
    !d.occasion && 'ocazia',
    d.occasion === 'Altă ocazie' && !d.occasionOther.trim() && 'ce ocazie este',
  ].filter(Boolean);
  const missing4 = [!d.title.trim() && 'titlul piesei', !d.story.trim() && (d.mode === 'ai' ? 'povestea voastră' : 'versurile tale')].filter(Boolean);
  const missing5 = [!d.lang && 'limba versurilor'].filter(Boolean);

  const canGo = [!!d.style, !missing2.length, !missing3.length, !missing4.length, !missing5.length, true][step];
  const nextLabel = step === 5 ? 'Scrie versurile — gratuit' : 'Continuă';

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
   * Plata. Serverul pregătește tranzacția, Paddle deschide fereastra, iar
   * confirmarea vine prin webhook — nu de la browser, care poate minți.
   * De asta, după ce fereastra se închide, întrebăm serverul dacă s-a încasat.
   */
  const [waitingPayment, setWaitingPayment] = useState(false);

  const buy = () => run(async () => {
    const session = await api.checkout(orderId);
    await openCheckout(session, {
      onCompleted: () => {
        setWaitingPayment(true);
        // Webhook-ul ajunge în câteva secunde; întrebăm până se vede plata.
        const started = Date.now();
        const t = setInterval(async () => {
          try {
            const state = await api.get(orderId);
            if (state.paid) {
              clearInterval(t);
              setWaitingPayment(false);
              setOrder(state);
              setScreen('done');
            } else if (Date.now() - started > 90_000) {
              clearInterval(t);
              setWaitingPayment(false);
              setApiError(
                'Plata a fost trimisă, dar confirmarea întârzie. Îți scriem pe email imediat ce intră.',
              );
            }
          } catch { /* o interogare pierdută nu e o eroare; încercăm iar */ }
        }, 2500);
      },
    });
  });

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
        <p className="vc-dialogTitle" id="vcHomeTitle">Înapoi la început?</p>
        <p className="vc-dialogText">
          {delivered
            ? 'Melodia ta rămâne în bibliotecă. Te ducem la pagina de start.'
            : 'Se pierde ce ai completat până acum și o iei de la prima întrebare.'}
        </p>
        <div className="vc-dialogBtns">
          <button className="vc-ghost" style={{ flex: 1 }} onClick={() => setConfirmHome(false)}>
            Rămân aici
          </button>
          <button className="vc-next" style={{ height: 48, fontSize: 14.5 }} onClick={goHome}>
            Înapoi la început
          </button>
        </div>
      </div>
    </div>
  );

  /* ────────── pagini legale ────────── */
  if (screen === 'loading') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span>
        </div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><Disc3 size={32} /></div>
            <h2 className="vc-waitTitle">Se deschide comanda ta</h2>
          </div>
        </div></div>
      </div>
    );
  }

  /* pagina de start: bannerul singur, cu un singur lucru de făcut.
     Pașii apar abia după apăsare, iar bannerul nu se mai întoarce. */
  if (screen === 'intro') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        {homeDialog}

        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button>
        </div></div>

        <div className="vc-wrap" ref={top}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">Melodii 100% personalizate</p>
            <h1 className="vc-heroTitle">Transformă povestea voastră într-o melodie de neuitat.</h1>
            <p className="vc-heroText">
              Spune-ne povestea voastră. Noi scriem versurile, le dăm viață pe note muzicale,
              iar tu dăruiești o melodie creată exclusiv pentru omul drag ție.
            </p>

            <div className="vc-heroCta">
              <button className="vc-next" onClick={() => { setStep(0); setScreen('wizard'); }}>
                <Sparkles size={18} /> Creează melodia ta
              </button>
            </div>
            <p className="vc-heroNote">
              Versurile și un minut din melodie sunt gratuite.<br />
              Plătești doar dacă îți place ce auzi.
            </p>

            <div className="vc-heroSep" />

            <div className="vc-perks">
              {PERKS.map(({ Icon, text }) => (
                <div className="vc-perk" key={text}>
                  <span className="vc-perkIcon"><Icon size={17} /></span>
                  <p className="vc-perkText">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <Footer />
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
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button><span className="vc-headNote">Ultimul pas</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-hero">
            <p className="vc-heroEyebrow">Aproape gata</p>
            <h1 className="vc-heroTitle">Unde îți trimitem melodia?</h1>
            <p className="vc-heroText">
              Îți scriem versurile în câteva secunde. Lăsăm adresa ta de email ca să nu pierzi
              nimic dacă închizi pagina — îți trimitem acolo și versurile, și melodia.
            </p>
          </div>
          <div className="vc-panel">
            <Module icon={Mail} title="Adresa ta de email" text="Doar pentru livrarea melodiei. Fără reclame nesolicitate.">
              <input className="vc-input" type="email" inputMode="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="numele.tau@email.com" />
            </Module>

            <label className="vc-check" data-on={agree ? '1' : '0'} htmlFor="vc-agree">
              <input className="vc-checkIn" type="checkbox" id="vc-agree"
                checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span className="vc-box">{agree && <Check size={14} strokeWidth={3} />}</span>
              <span className="vc-checkText">
                Am citit și accept Termenii și condițiile și Politica de confidențialitate.
              </span>
            </label>

            {/* Legăturile stau sub bifă, nu în ea: altfel aproape tot rândul devine
                legătură, iar o apăsare pe mijloc deschide un document în loc să bifeze. */}
            <p className="vc-checkLinks">
              <a href="/legal/ro/termeni" target="_blank" rel="noopener noreferrer">
                Citește Termenii
              </a>
              <span aria-hidden="true"> · </span>
              <a href="/legal/ro/confidentialitate" target="_blank" rel="noopener noreferrer">
                Citește Politica de confidențialitate
              </a>
            </p>

            <label className="vc-check" data-on={news ? '1' : '0'} htmlFor="vc-news">
              <input className="vc-checkIn" type="checkbox" id="vc-news"
                checked={news} onChange={(e) => setNews(e.target.checked)} />
              <span className="vc-box">{news && <Check size={14} strokeWidth={3} />}</span>
              <span className="vc-checkText">
                Vreau să primesc ocazional idei de cadouri și oferte. Opțional, te poți dezabona oricând.
              </span>
            </label>

            <div className="vc-safe" style={{ background: 'var(--violet-t)', color: 'var(--ink-2)' }}>
              <ShieldCheck size={16} color="#6C5CE7" />
              <span>Nu îți cerem nicio plată acum. Versurile și minutul de ascultat rămân gratuite.</span>
            </div>

            <div className="vc-nav" ref={navRef}>
              <button className="vc-back" onClick={() => { setScreen('wizard'); setStep(5); }} aria-label="Înapoi">
                <ArrowLeft size={19} />
              </button>
              <button className={nextCls} disabled={!okMail || !agree || busy} onClick={submitOrder}>
                <Sparkles size={18} /> {busy ? 'Se trimite…' : 'Scrie versurile — gratuit'}
              </button>
            </div>
            {(!okMail || !agree) && (
              <Need items={[!okMail && 'o adresă de email validă', !agree && 'acordul cu termenii'].filter(Boolean)} />
            )}
            <Alert text={apiError} />
          </div>
          <Footer />
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
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button>
          <span className="vc-headNote">Comanda {order?.publicId ?? ''}</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-done">
              <div className="vc-doneIcon"><Check size={34} strokeWidth={3} /></div>
              <h1 className="vc-doneTitle">Melodia e a ta.</h1>
              <p className="vc-doneText">
                Ți-am trimis totul și pe email, la {order?.email || email || 'adresa ta'}.
                O poți descărca de aici oricând.
              </p>
            </div>

            {tracks.map((t) => (
              <div className="vc-track" key={t.variant}>
                <span className="vc-trackIcon"><Music2 size={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="vc-trackName">
                    {order?.songTitle || d.title || 'Melodia ta'} — varianta {t.variant}
                  </p>
                  <p className="vc-trackMeta">MP3 · {t.duration ? fmt(t.duration) : '—'}</p>
                </div>
                <a className="vc-dl" href={t.fullUrl ?? '#'} download
                  aria-label={`Descarcă varianta ${t.variant}`}>
                  <Download size={19} />
                </a>
              </div>
            ))}

            <div className="vc-safe">
              <Check size={16} />
              <span>
                Factura ți-a fost trimisă de Paddle pe email. Melodia rămâne în biblioteca ta 24 de luni
                și o poți descărca de oricâte ori vrei.
              </span>
            </div>

            <div className="vc-nav" ref={navRef}>
              <button className="vc-ghost" style={{ flex: 1 }} disabled={busy} onClick={openLibrary}>
                <ListMusic size={16} /> Biblioteca mea
              </button>
              <button className="vc-ghost" style={{ flex: 1 }} onClick={goHome}>
                <Sparkles size={16} /> Mai fac una
              </button>
            </div>
            <Alert text={apiError} />
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  if (screen === 'library') {
    return (
      <div className="vc">
        <style>{CSS}</style>
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button><span className="vc-headNote">Biblioteca</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <h1 className="vc-q" style={{ marginTop: 4 }}>Melodiile tale</h1>
            <p className="vc-qSub">Comenzile făcute de pe acest dispozitiv.</p>

            {library.length === 0 && (
              <p className="vc-qSub" style={{ marginTop: 14 }}>
                Încă nu ai nicio melodie aici.
              </p>
            )}

            {library.map((it) => (
              <div className="vc-item" key={it.publicId}>
                <div className="vc-itemTop">
                  <div style={{ minWidth: 0 }}>
                    <p className="vc-itemName">{it.songTitle || 'Melodie fără titlu'}</p>
                    <p className="vc-itemMeta">
                      {new Date(it.createdAt).toLocaleDateString('ro-RO', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="vc-state" data-t={it.paid ? 'paid' : 'demo'}>
                    {it.paid ? 'CUMPĂRATĂ' : 'DOAR DEMO'}
                  </span>
                </div>

                {it.tracks.length > 0 && (
                  <div className="vc-itemAct">
                    <button className="vc-ghost" style={{ flex: 1 }}
                      onClick={() => { setOrderId(it.publicId); applyState(it); }}>
                      <Play size={15} /> {it.paid ? 'Ascultă' : 'Ascultă demo'}
                    </button>
                    {it.paid && it.tracks[0]?.fullUrl && (
                      <a className="vc-ghost" style={{ flex: 1 }} href={it.tracks[0].fullUrl} download>
                        <Download size={15} /> Descarcă
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="vc-nav" ref={navRef}>
              <button className={nextCls} onClick={goHome}>
                <Sparkles size={18} /> Creează o melodie nouă
              </button>
            </div>
          </div>
          <Footer />
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
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button><span className="vc-headNote">Ceva n-a mers</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-err">
              <div className="vc-errIcon"><AlertTriangle size={32} /></div>
              <h1 className="vc-errTitle">
                {refused ? 'Nu putem face această melodie' : 'Înregistrarea nu a reușit'}
              </h1>
              <p className="vc-errText">
                {order?.problem
                  ?? 'Studioul nostru a răspuns cu o eroare la această piesă. Se întâmplă rar și de obicei se rezolvă din a doua încercare — versurile tale sunt salvate, nu le rescrii.'}
              </p>
            </div>

            <div className="vc-safe">
              <ShieldCheck size={16} />
              <span>Nu ți-a fost debitat niciun ban. Plata se face doar după ce asculți melodia.</span>
            </div>

            <div className="vc-nav" ref={navRef}>
              {refused ? (
                <button className={nextCls} onClick={goHome}>
                  <Sparkles size={18} /> Începe altă melodie
                </button>
              ) : (
                <button className={nextCls} disabled={busy} onClick={approveLyrics}>
                  <RotateCcw size={18} /> {busy ? 'Se reîncearcă…' : 'Încearcă din nou'}
                </button>
              )}
            </div>
            <button className="vc-ghost" style={{ width: '100%', marginTop: 9 }}
              disabled={busy} onClick={openLibrary}>
              <ListMusic size={16} /> Vezi melodiile salvate
            </button>
            <Alert text={apiError} />
            <p style={{ fontSize: 12.5, color: '#767686', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
              Dacă se repetă, scrie-ne la base.vocalmd@gmail.com și rezolvăm noi manual.
            </p>
          </div>
          <Footer />
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
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn"><button className="vc-mark" onClick={askHome}>VOCAL</button></div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><PenLine size={30} /></div>
            <h2 className="vc-waitTitle">Se scriu versurile</h2>
            <p className="vc-waitText">
              {overtime
                ? 'Mai durează câteva clipe — textul e pe ultima sută de metri. Lasă pagina deschisă.'
                : 'Citim povestea ta și compunem textul. Durează câteva zeci de secunde — lasă pagina deschisă.'}
            </p>
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
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn"><button className="vc-mark" onClick={askHome}>VOCAL</button></div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><Disc3 size={32} /></div>
            <h2 className="vc-waitTitle">Se înregistrează melodia</h2>
            <p className="vc-waitText">
              {overtime
                ? 'Mai durează câteva clipe — se lucrează la mixaj. Nu închide pagina, melodia vine.'
                : 'Vocea, instrumentele și mixajul. Durează două-trei minute — lasă pagina deschisă.'}
            </p>
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
    const previewLen = Math.min(60, Math.max(...tracks.map((t) => t.duration || 60), 60));
    return (
      <div className="vc">
        <style>{CSS}</style>
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button><span className="vc-headNote">Melodia ta</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">Gata</p>
            <h1 className="vc-heroTitle">Ascultă cum sună povestea voastră.</h1>
            <p className="vc-heroText">Am pregătit două interpretări ale aceleiași piese. Ascultă-le pe amândouă — le primești pe ambele, integral.</p>
          </div>
          <div className="vc-panel">
            {recordings.length > 1 && (
              <div className="vc-takes">
                <p className="vc-takesLabel">
                  Ai {recordings.length} înregistrări ale aceleiași piese. Alege-o pe cea care
                  îți place — pe ea o primești.
                </p>
                <div className="vc-takesRow">
                  {recordings.map((r) => (
                    <button key={r.id} className="vc-takeTab" disabled={busy}
                      data-on={r.id === order?.currentRenderId ? '1' : '0'}
                      aria-pressed={r.id === order?.currentRenderId}
                      onClick={() => chooseRecording(r.id)}>
                      Înregistrarea {r.generation}
                      {r.lyricsVersion !== order?.lyricsVersion && (
                        <span className="vc-takeTabNote">alt text</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tracks.map((t) => (
              <React.Fragment key={t.variant}>
                <audio
                  ref={(el) => { audioRefs.current[t.variant] = el; }}
                  src={t.previewUrl ?? undefined}
                  preload="metadata"
                  onTimeUpdate={(e) => { if (take === t.variant) setAt(e.currentTarget.currentTime); }}
                  onEnded={() => setPlaying(false)}
                />
                <Take
                  name={`Varianta ${t.variant}`}
                  meta={t.variant === 1
                    ? `${style?.name ?? 'Melodia ta'} · voce ${(d.voice || 'Femeie').toLowerCase()}`
                    : `${style?.name ?? 'Melodia ta'} · interpretare alternativă`}
                  playing={playing && take === t.variant}
                  at={at}
                  active={take === t.variant}
                  dur={previewLen}
                  onToggle={() => toggleTake(t.variant)}
                  onSeek={(sec) => seekTake(t.variant, sec)}
                />
              </React.Fragment>
            ))}

            <div className="vc-two" style={{ marginTop: 14 }}>
              <button className="vc-ghost" onClick={() => setScreen('lyrics')}>
                <ListMusic size={16} /> Vezi versurile
              </button>
              <button className="vc-ghost" disabled={busy || (order?.rendersLeft ?? 0) === 0}
                onClick={askNewRecording}
                style={(order?.rendersLeft ?? 0) === 0 ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
                <RefreshCw size={16} /> Altă înregistrare
              </button>
            </div>
            <p className="vc-takesFoot">
              {(order?.rendersLeft ?? 0) > 0
                ? `Mai poți cere ${order.rendersLeft} ${order.rendersLeft === 1 ? 'înregistrare' : 'înregistrări'}, gratuit. Cele de până acum rămân, nu se pierd.`
                : 'Ai folosit toate înregistrările gratuite. Alege dintre cele de mai sus pe cea care îți place.'}
            </p>
            <Alert text={apiError} />

            <div className="vc-offer">
              <div className="vc-offerIn">
                <p className="vc-offerKicker">VARIANTA COMPLETĂ</p>
                <h2 className="vc-offerTitle">Melodia întreagă, gata de dăruit</h2>
                <div className="vc-offerPrice">
                  <span className="vc-priceNum">30 €</span>
                  <span className="vc-priceNote">plată unică · fără abonament</span>
                </div>
                <ul className="vc-offerList">
                  <li><span className="vc-offerCheck"><Check size={13} strokeWidth={3} /></span>
                    <span>Piesa completă, de la prima până la ultima notă</span></li>
                  <li><span className="vc-offerCheck"><Check size={13} strokeWidth={3} /></span>
                    <span>Primești ambele variante integral, ca să o oferi pe cea mai bună</span></li>
                  <li><span className="vc-offerCheck"><Check size={13} strokeWidth={3} /></span>
                    <span>Fișier MP3 descărcabil pe telefon sau laptop, al tău pentru totdeauna</span></li>
                  <li><span className="vc-offerCheck"><Check size={13} strokeWidth={3} /></span>
                    <span>Link dedicat cu piesa și versurile, gata de trimis persoanei dragi</span></li>
                </ul>
                <div className="vc-nav" ref={navRef} style={{ marginTop: 0 }}>
                  <button className="vc-buy" disabled={busy || waitingPayment} onClick={buy}>
                    <Gift size={20} /> {waitingPayment ? 'Se confirmă plata…' : 'Primește melodia — 30 €'}
                  </button>
                </div>
                <div className="vc-offerTrust">
                  <span className="vc-trustBit"><ShieldCheck size={13} /> Plată securizată</span>
                  <span className="vc-trustBit"><Zap size={13} /> Livrare instant</span>
                  <span className="vc-trustBit"><Download size={13} /> Descărcare nelimitată</span>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
        {showBar && (
          <div className="vc-bar"><div className="vc-barIn">
            <button className="vc-next" disabled={busy || waitingPayment} onClick={buy}>
              <Gift size={18} /> {waitingPayment ? 'Se confirmă plata…' : 'Primește melodia — 30 €'}
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
    const sung = ['rendering', 'preview_ready', 'paid', 'delivered'].includes(order?.status);
    // Textul de acum diferă de cel din înregistrarea aleasă: are rost să-l cânte.
    const chosen = (order?.recordings ?? []).find((r) => r.id === order?.currentRenderId);
    const textChanged = sung && chosen && chosen.lyricsVersion !== order?.lyricsVersion;
    const canRecord = textChanged && (order?.rendersLeft ?? 0) > 0;
    return (
      <div className="vc">
        <style>{CSS}</style>
      {homeDialog}
        <div className="vc-head"><div className="vc-headIn">
          <button className="vc-mark" onClick={askHome}>VOCAL</button><span className="vc-headNote">Versurile</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">Pasul următor</p>
            <h1 className="vc-heroTitle">{order?.songTitle || d.title || 'Versurile tale sunt gata'}</h1>
            <p className="vc-heroText">
              {sung
                ? 'Textul pe care l-ai aprobat. Dacă îți place mai mult o variantă anterioară, o poți readuce și cere o înregistrare nouă pe ea.'
                : 'Citește-le cu atenție — exact așa vor fi înregistrate. Poți modifica orice cuvânt sau poți cere o variantă nouă.'}
            </p>
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
                    <Pencil size={16} /> {saving ? 'Se salvează…' : editing ? 'Am terminat' : 'Modifică acest text'}
                  </button>
                  <button className="vc-ghost" disabled={left === 0 || busy || editing}
                    onClick={askNewLyrics}
                    style={left === 0 ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
                    <RefreshCw size={16} /> Altă variantă
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#767686', margin: '12px 0 0', lineHeight: 1.55 }}>
                  {left > 0
                    ? `Mai ai ${left} ${left === 1 ? 'variantă gratuită' : 'variante gratuite'} de versuri.`
                    : 'Ai folosit variantele gratuite — dar poți modifica textul direct, oricât vrei.'}
                </p>
              </>
            )}

            {textChanged && (
              <div className="vc-safe" style={{ background: 'var(--violet-t)', color: 'var(--ink-2)' }}>
                <Sparkles size={16} color="#6C5CE7" />
                <span>
                  {canRecord
                    ? 'Textul de acum e altul decât cel din înregistrarea pe care o asculți. Înregistrează-l ca să-l auzi cântat.'
                    : 'Textul de acum e altul decât cel din înregistrarea pe care o asculți, dar ai folosit toate înregistrările.'}
                </span>
              </div>
            )}

            {older.length > 0 && (
              <details className="vc-hist">
                <summary>
                  Variantele anterioare ({older.length})
                </summary>
                {older.map((v) => (
                  <div className="vc-histItem" key={v.version}>
                    <p className="vc-histTitle">{v.title || `Varianta ${v.version}`}</p>
                    <p className="vc-histText">
                      {v.lyrics.split('\n').map((l) => l.trim())
                        .filter((l) => l && !l.startsWith('['))
                        .slice(0, 2).join(' · ')}
                    </p>
                    <button className="vc-ghost" style={{ width: '100%' }} disabled={busy}
                      onClick={() => restoreLyrics(v.version)}>
                      <RotateCcw size={15} /> Readu varianta asta
                    </button>
                  </div>
                ))}
              </details>
            )}
            <Alert text={apiError} />
            <div className="vc-nav" ref={navRef}>
              <button className="vc-back" onClick={askHome} aria-label="Înapoi"><ArrowLeft size={19} /></button>
              {!sung ? (
              <button className="vc-next" disabled={busy || saving} onClick={approveLyrics}>
                <Check size={18} /> {busy ? 'Se trimite…' : 'Aprobă și înregistrează'}
              </button>
            ) : canRecord ? (
              <button className="vc-next" disabled={busy} onClick={askNewRecording}>
                <Mic2 size={18} /> {busy ? 'Se trimite…' : 'Înregistrează varianta asta'}
              </button>
            ) : (
              <button className="vc-next" onClick={() => setScreen('demo')}>
                <Play size={18} fill="currentColor" /> Înapoi la melodie
              </button>
            )}
            </div>
          </div>
          <Footer />
        </div>
        {showBar && (
          <div className="vc-bar"><div className="vc-barIn">
            <button className="vc-back" onClick={askHome} aria-label="Înapoi"><ArrowLeft size={19} /></button>
            {!sung ? (
              <button className="vc-next" disabled={busy || saving} onClick={approveLyrics}>
                <Check size={18} /> {busy ? 'Se trimite…' : 'Aprobă și înregistrează'}
              </button>
            ) : canRecord ? (
              <button className="vc-next" disabled={busy} onClick={askNewRecording}>
                <Mic2 size={18} /> {busy ? 'Se trimite…' : 'Înregistrează varianta asta'}
              </button>
            ) : (
              <button className="vc-next" onClick={() => setScreen('demo')}>
                <Play size={18} fill="currentColor" /> Înapoi la melodie
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
      {homeDialog}

      <div className="vc-head"><div className="vc-headIn">
        <button className="vc-mark" onClick={askHome}>VOCAL</button>
        <span className="vc-headNote">Pasul {step + 1} din 6</span>
      </div></div>

      <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
        <div className="vc-panel">
          <div className="vc-steps">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className="vc-link" data-s={i <= step ? 'done' : ''} />}
                <span className="vc-dot" data-s={i < step ? 'done' : i === step ? 'now' : ''}>
                  {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
                </span>
              </React.Fragment>
            ))}
          </div>
          <p className="vc-stepNow">{STEPS[step]}</p>

          {/* 1 — stil */}
          {step === 0 && (
            <>
              <h2 className="vc-q">Ce fel de melodie vrei?</h2>
              <p className="vc-qSub">Alege atmosfera piesei. Restul detaliilor le potrivim împreună la pasul următor.</p>
              <div className="vc-grid">
                {STYLES.map(({ id, name, desc, Icon }) => (
                  <button key={id} className="vc-tile" data-on={d.style === id ? '1' : '0'} aria-pressed={d.style === id}
                    onClick={() => setD((p) => p.style === id
                      ? { ...p, style: null, sub: null, mood: null, voice: null }
                      : { ...p, style: id, sub: null, mood: null, voice: null })}>
                    {d.style === id && <span className="vc-badge"><Check size={12} strokeWidth={3} /></span>}
                    <span className="vc-tileIcon"><Icon size={20} /></span>
                    <p className="vc-tileName">{name}</p>
                    <p className="vc-tileDesc">{desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 2 — personalizare */}
          {step === 1 && opts && (
            <>
              <h2 className="vc-q">Cum să sune mai exact?</h2>
              <p className="vc-qSub">Trei alegeri scurte care dau piesei caracterul ei.</p>
              <Module icon={Music2} title="Direcția muzicală" text={`Nuanța din interiorul stilului ${style.name.toLowerCase()}.`}>
                <Choices options={opts.sub} value={d.sub} onPick={(v) => set('sub', v)} />
              </Module>
              <Module icon={Wand2} title="Starea de spirit" text="Emoția pe care vrei s-o lase piesa după ce se termină.">
                <Choices options={opts.mood} value={d.mood} onPick={(v) => set('mood', v)} />
              </Module>
              <Module icon={Mic2} title="Cine cântă" text="Vocea care va interpreta versurile tale.">
                <Segmented options={opts.voice} value={d.voice} onPick={(v) => set('voice', v)} emoji={VOICE_EMOJI} />
              </Module>
              <Need items={missing2} />
            </>
          )}

          {/* 3 — pentru cine */}
          {step === 2 && (
            <>
              <h2 className="vc-q">Cui îi dăruiești melodia?</h2>
              <p className="vc-qSub">Numele se aude cântat în refren. Acesta este detaliul care emoționează cel mai mult.</p>

              <Module icon={User} title="Persoana" text="Cine va asculta melodia.">
                <Choices options={RECIPIENTS} value={d.recipient} onPick={(v) => set('recipient', v)} />
                {d.recipient === 'Altcineva' && (
                  <div className="vc-extra">
                    <input className="vc-input" maxLength={40} value={d.recipientOther}
                      onChange={(e) => set('recipientOther', e.target.value)}
                      placeholder="ex. nașa mea, colegul de trupă" />
                  </div>
                )}
              </Module>

              <Module icon={Heart} title="Numele" text="Scrie-l exact cum se pronunță. Așa îl va cânta vocea.">
                {d.names.map((n, i) => (
                  <div className="vc-nameRow" key={i}>
                    <input className="vc-input" maxLength={28} value={n}
                      onChange={(e) => setName(i, e.target.value)}
                      placeholder={i === 0 ? 'ex. Maria' : 'ex. Andrei'} />
                    {d.names.length > 1 && (
                      <button className="vc-del" onClick={() => delName(i)} aria-label={`Șterge numele ${i + 1}`}>
                        <X size={17} />
                      </button>
                    )}
                  </div>
                ))}
                {d.names.length < 4 && (
                  <button className="vc-add" onClick={addName}>
                    <Plus size={16} /> Adaugă încă un nume
                  </button>
                )}
              </Module>

              <Module icon={CalendarHeart} title="Ocazia" text="Momentul în care îi dai melodia.">
                <Choices options={OCCASIONS} value={d.occasion} onPick={(v) => set('occasion', v)} />
                {d.occasion === 'Altă ocazie' && (
                  <div className="vc-extra">
                    <input className="vc-input" maxLength={50} value={d.occasionOther}
                      onChange={(e) => set('occasionOther', e.target.value)}
                      placeholder="ex. 25 de ani de căsnicie" />
                  </div>
                )}
              </Module>
              <Need items={missing3} />
            </>
          )}

          {/* 4 — povestea */}
          {step === 3 && (
            <>
              <h2 className="vc-q">Ce vrei să-i spui?</h2>
              <p className="vc-qSub">Partea asta face diferența dintre o melodie frumoasă și una pe care o va ține minte toată viața.</p>

              <div className="vc-picks" style={{ marginBottom: 12 }}>
                <button className="vc-pick" data-on={d.mode === 'ai' ? '1' : '0'} onClick={() => set('mode', 'ai')}>
                  <span className="vc-pickIcon"><Sparkles size={17} color="#6C5CE7" /></span>
                  <span>
                    <p className="vc-pickName">Scriem noi versurile</p>
                    <p className="vc-pickText">Ne spui povestea în cuvintele tale, noi o transformăm în versuri.</p>
                  </span>
                </button>
                <button className="vc-pick" data-on={d.mode === 'own' ? '1' : '0'} onClick={() => set('mode', 'own')}>
                  <span className="vc-pickIcon"><Pencil size={17} color="#6C5CE7" /></span>
                  <span>
                    <p className="vc-pickName">Am deja versurile</p>
                    <p className="vc-pickText">Le introduci aici și le înregistrăm așa cum le-ai scris.</p>
                  </span>
                </button>
              </div>

              <Module icon={Gift} title="Titlul piesei" text="Apare pe player și pe fișierul pe care îl descarci.">
                <input className="vc-input" maxLength={60} value={d.title}
                  onChange={(e) => set('title', e.target.value)} placeholder="ex. Cântecul mamei" />
              </Module>

              <div ref={storyBox} style={{ scrollMarginTop: 72 }}>
              <Module icon={Pencil}
                title={d.mode === 'ai' ? 'Povestea voastră' : 'Versurile tale'}
                text={d.mode === 'ai'
                  ? 'Nume, locuri, glume între voi, o amintire anume sau mesajul pe care vrei să i-l transmiți.'
                  : 'Introdu textul complet, cu strofe și refren.'}>
                <textarea className="vc-area" maxLength={2000} value={d.story}
                  onChange={(e) => set('story', e.target.value)}
                  placeholder={d.mode === 'ai' ? STORY_EXAMPLE : '[Strofa 1]\n…'} />
                <p className="vc-meter">{d.story.length} / 2000</p>
                {d.mode === 'ai' && (
                  <p className="vc-tip">
                    <b>Un detaliu mic creează cea mai mare emoție.</b> „Cafeaua pregătită în diminețile aglomerate”
                    spune mult mai multe într-o piesă decât un simplu „îți mulțumesc pentru tot”.
                  </p>
                )}
              </Module>
              </div>

              {d.mode === 'ai' && (
                <Module icon={Sparkles} title="Nu știi de unde să începi?" text="Alege o direcție și îți completăm un început, pe care îl poți schimba.">
                  <div className="vc-opts" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                    {INSPIRATION.map((i) => (
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
                </Module>
              )}
              <Need items={missing4} />
            </>
          )}

          {/* 5 — limba */}
          {step === 4 && (
            <>
              <h2 className="vc-q">În ce limbă se cântă?</h2>
              <p className="vc-qSub">Versurile sunt scrise direct în limba aleasă, nu traduse.</p>
              <div className="vc-picks">
                {LANGUAGES.map((l) => (
                  <button key={l.label} className="vc-pick" data-on={d.lang === l.label ? '1' : '0'}
                    aria-pressed={d.lang === l.label}
                    onClick={() => set('lang', d.lang === l.label ? null : l.label)}>
                    <span className="vc-pickIcon">{l.flag}</span>
                    <span>
                      <p className="vc-pickName">{l.label}</p>
                      <p className="vc-pickText">{l.note}</p>
                    </span>
                  </button>
                ))}
              </div>
              <Need items={missing5} />
            </>
          )}

          {/* 6 — recapitulare */}
          {step === 5 && (
            <>
              <h2 className="vc-q">Verifică înainte să începem</h2>
              <p className="vc-qSub">Poți schimba orice — apasă săgeata înapoi.</p>
              <div className="vc-recap">
                <div className="vc-row"><span className="vc-rowKey">Stil</span><span className="vc-rowVal">{style?.name}</span></div>
                <div className="vc-row"><span className="vc-rowKey">Direcție</span><span className="vc-rowVal">{d.sub}</span></div>
                <div className="vc-row"><span className="vc-rowKey">Stare de spirit</span><span className="vc-rowVal">{d.mood}</span></div>
                <div className="vc-row"><span className="vc-rowKey">Voce</span><span className="vc-rowVal">{d.voice}</span></div>
                <div className="vc-row"><span className="vc-rowKey">Pentru</span>
                  <span className="vc-rowVal">{filledNames.join(', ')} ({d.recipient === 'Altcineva' ? d.recipientOther : d.recipient})</span></div>
                <div className="vc-row"><span className="vc-rowKey">Ocazia</span>
                  <span className="vc-rowVal">{d.occasion === 'Altă ocazie' ? d.occasionOther : d.occasion}</span></div>
                <div className="vc-row"><span className="vc-rowKey">Titlu</span><span className="vc-rowVal">{d.title}</span></div>
                <div className="vc-row"><span className="vc-rowKey">Limba</span><span className="vc-rowVal">{d.lang}</span></div>
                <div className="vc-block">
                  <span className="vc-rowKey">{d.mode === 'ai' ? 'Povestea' : 'Versurile tale'}</span>
                  <p className="vc-blockText">{d.story}</p>
                </div>
              </div>

              <div className="vc-mod">
                <div className="vc-modHead">
                  <span className="vc-modIcon"><Gift size={17} /></span>
                  <div><p className="vc-modTitle">Ce primești</p>
                    <p className="vc-modText">Fără nicio plată în acest moment.</p></div>
                </div>
                <ul className="vc-getList">
                  <li><Check size={16} /><span>Versuri originale, scrise pe povestea ta</span></li>
                  <li><Check size={16} /><span>Le poți modifica sau cere altele înainte de înregistrare</span></li>
                  <li><Check size={16} /><span>Două variante cântate, din care o alegi pe cea preferată</span></li>
                  <li><Check size={16} /><span>Un minut din melodie, ca să auzi cum sună</span></li>
                </ul>
                <div className="vc-free">
                  <b>Plătești doar dacă îți place.</b> Versurile și minutul de ascultat sunt gratuite.
                  Piesa întreagă costă 30 € și o iei doar dacă te-a convins ce ai auzit.
                </div>
              </div>
            </>
          )}

          {/* navigarea, chiar sub conținut */}
          <div className="vc-nav" ref={navRef}>
            {step > 0 && <button className="vc-back" onClick={() => setStep(step - 1)} aria-label="Pasul anterior"><ArrowLeft size={19} /></button>}
            <button className={nextCls} disabled={!canGo} onClick={goNext}>
              {step === 5 ? <Sparkles size={18} /> : null}{nextLabel}{step < 5 && <ArrowRight size={18} />}
            </button>
          </div>
        </div>

        <Footer />
      </div>

      {showBar && (
        <div className="vc-bar"><div className="vc-barIn">
          {step > 0 && <button className="vc-back" onClick={() => setStep(step - 1)} aria-label="Pasul anterior"><ArrowLeft size={19} /></button>}
          <button className={nextCls} disabled={!canGo} onClick={goNext}>
            {step === 5 ? <Sparkles size={18} /> : null}{nextLabel}{step < 5 && <ArrowRight size={18} />}
          </button>
        </div></div>
      )}
    </div>
  );
}
