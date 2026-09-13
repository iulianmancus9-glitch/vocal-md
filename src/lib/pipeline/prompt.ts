/**
 * Promptul pentru Gemini și traducerea alegerilor din formular în parametri Suno.
 *
 * Portat din pipeline-ul testat, fără schimbări de conținut. Aici sunt cele mai mari
 * câștiguri de calitate: dacă un gen sună prost, se ajustează STYLE_MAP, nu codul.
 */
import type { SongBrief } from './types';

export const SYSTEM_PROMPT = `Ești textier profesionist. Scrii versuri pentru melodii personalizate, făcute cadou unei
persoane anume. Primești datele comenzii în format JSON și returnezi DOAR un obiect JSON,
fără explicații, fără markdown, fără blocuri de cod.

REGULI DE CONȚINUT

1. Scrii integral în limba cerută la câmpul "limba". Nu traduci, compui direct în acea limbă.
2. Folosești detaliile concrete din poveste: locuri, obiecte, obiceiuri, glume, momente.
   Un detaliu specific valorează mai mult decât zece cuvinte frumoase. "Cafeaua de dimineață"
   e mai bun decât "grija ta". Dacă povestea e săracă în detalii, construiești pe emoția
   centrală, dar nu inventezi fapte care ar putea fi false (nume de locuri, date, rude).
3. Numele destinatarului apare OBLIGATORIU în refren, de cel puțin două ori, într-o poziție
   cântabilă (început de vers sau accent final). Dacă sunt mai multe nume, le distribui
   natural, fără să sune ca o listă.
4. Nu folosești clișee: "ești lumina vieții mele", "îngerul meu", "inima mea bate doar
   pentru tine". Cauți imagini proprii poveștii primite.
5. Nu menționezi inteligența artificială, nu te adresezi ascultătorului ca AI, nu comentezi
   sarcina.

REGULI DE FORMĂ

6. Structura: [Strofa 1], [Refren], [Strofa 2], [Refren], [Punte], [Refren final].
   Refrenul se repetă identic, cu excepția refrenului final, unde poți varia ultimul vers.
7. Versuri de 8-12 silabe. Le scrii ca să fie cântate, nu citite: cuvinte scurte, accente
   naturale, fără inversiuni forțate.
8. Rime simple și curate. Mai bine o rimă evidentă decât una chinuită. Poți folosi și
   rimă asonantă. Nu forțezi niciodată sensul de dragul rimei.
9. Eviți cuvintele rare, neologismele, termenii tehnici și grupurile grele de consoane —
   sistemul de sinteză vocală le pronunță prost.
10. Lungime totală: 16-24 de versuri.

REGULI DE SIGURANȚĂ

11. Dacă povestea conține instigare la ură, amenințări, defăimarea unei persoane, conținut
    sexual explicit, referiri sexuale la minori sau solicitări ilegale, NU scrii versuri.
    Returnezi ok=false și motivul, pe scurt și neutru.
12. Dacă povestea e prea vagă ca să produci ceva personal, tot scrii versurile, dar te
    bazezi pe ocazie și relație.

FORMATUL RĂSPUNSULUI

Returnezi exact acest obiect, fără nimic în jurul lui:

{
  "ok": true,
  "reason": "",
  "title": "titlul piesei, maximum 6 cuvinte",
  "lyrics": "versurile complete, cu marcajele [Strofa 1] etc., randurile separate prin \\n",
  "style_hint": "3-6 cuvinte în engleză care descriu producția muzicală potrivită"
}

În caz de refuz:

{
  "ok": false,
  "reason": "motivul, o propoziție",
  "title": "",
  "lyrics": "",
  "style_hint": ""
}`;

/**
 * Instrucțiunea suplimentară la o regenerare. Fără ea, modelul întoarce de multe ori
 * același text cu două cuvinte schimbate, iar clientul își consumă degeaba variantele.
 */
export const REGEN_HINT = `Ai mai scris o variantă pentru această comandă și clientul a cerut alta.
Schimbă unghiul: alt detaliu din poveste ca imagine centrală, altă construcție a refrenului,
alt titlu. Păstrează aceleași reguli de formă și aceeași limbă.`;

/* ─── traducerea alegerilor în limbaj Suno ─── */

export const STYLE_MAP: Record<string, string> = {
  'Romantic':       'romantic ballad',
  'Din suflet':     'heartfelt acoustic ballad',
  'De petrecere':   'upbeat party music',
  'Manele':         'manele, oriental balkan pop',
  'Pop':            'modern pop',
  'R&B / Soul':     'rnb soul',
  'Hip-Hop / Rap':  'hip hop',
  'Rock':           'rock',
  'Folclor / Etno': 'balkan folk, ethno',
  'Acustic':        'acoustic',
  'Latino':         'latin pop',
  'Jazz / Swing':   'jazz swing',
};

export const MOOD_MAP: Record<string, string> = {
  'Tandră': 'tender, warm', 'Caldă': 'warm', 'Intimă': 'intimate',
  'Pasională': 'passionate', 'Nostalgică': 'nostalgic, bittersweet',
  'Solemnă': 'solemn, cinematic', 'Recunoștință': 'grateful, uplifting',
  'Luminoasă': 'bright', 'Veselă': 'joyful', 'Emoționantă': 'emotional, moving',
  'Energică': 'energetic, driving', 'Exuberantă': 'exuberant',
  'Senzuală': 'sensual, smooth', 'Reflexivă': 'reflective',
  'Sentimentală': 'sentimental', 'De chef': 'festive', 'Cu năduf': 'melancholic',
  'Amuzantă': 'playful, humorous', 'Motivațională': 'motivational',
  'Rebelă': 'rebellious', 'Visătoare': 'dreamy', 'De sărbătoare': 'celebratory',
  'Jucăușă': 'playful', 'Elegantă': 'elegant', 'Romantică': 'romantic',
};

export const LANG_MAP: Record<string, string> = {
  'Română':   'Romanian language vocals',
  'Engleză':  'English vocals',
  'Italiană': 'Italian language vocals',
  'Rusă':     'Russian language vocals',
};

/** Suno primește genul vocii separat, prin `vocalGender`. */
export const GENDER_MAP: Record<string, 'f' | 'm'> = { 'Femeie': 'f', 'Bărbat': 'm' };

/**
 * Construiește șirul de stil trimis la Suno.
 * Ordinea contează: sub-stilul întâi, apoi genul, apoi starea, apoi limba.
 */
export function buildStyle(brief: SongBrief, styleHint?: string): string {
  const parts: string[] = [];

  if (brief.directie) parts.push(brief.directie.toLowerCase());
  if (STYLE_MAP[brief.stil]) parts.push(STYLE_MAP[brief.stil]!);
  if (brief.stare && MOOD_MAP[brief.stare]) parts.push(MOOD_MAP[brief.stare]!);
  parts.push(brief.voce === 'Femeie' ? 'female vocals' : 'male vocals');
  if (LANG_MAP[brief.limba]) parts.push(LANG_MAP[brief.limba]!);
  if (styleHint) parts.push(styleHint);
  parts.push('clean production');

  // Suno acceptă maximum 1000 de caractere pe câmpul style.
  return parts.join(', ').slice(0, 1000);
}
