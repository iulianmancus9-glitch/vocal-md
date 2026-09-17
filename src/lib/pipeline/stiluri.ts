/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  STILURILE MUZICALE — singurul loc unde se reglează sunetul          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Aici stă tot ce traduce alegerile clientului în limbajul pe care îl
 * înțelege Suno. Dacă un gen sună prost, se schimbă un rând de mai jos —
 * nu codul.
 *
 * CE VEZI ÎNAINTE SĂ SCHIMBI CEVA:
 *
 *     npm run stiluri
 *
 * Îți arată, pentru fiecare stil, exact șirul care pleacă la Suno, și îți
 * spune dacă a rămas ceva nepotrivit între formular și traduceri.
 *
 * CE E UNDE:
 *
 *   • stilurile, stările, limbile, vocea   → fișierul ăsta
 *   • promptul care scrie versurile        → `prompt.ts`, SYSTEM_PROMPT
 *   • ordinea în care se lipesc bucățile   → `prompt.ts`, buildStyle()
 *
 * REGULI CÂND EDITEZI:
 *
 *   1. `nume` e cheia către tot restul aplicației — apare în formular, în
 *      baza de date și în exportul CSV. Dacă îl schimbi, comenzile vechi
 *      rămân cu numele vechi. Schimbă-l doar dacă chiar trebuie.
 *   2. `suno` se scrie ÎN ENGLEZĂ, cu virgule între noțiuni. Suno a fost
 *      antrenat pe descrieri englezești; româna acolo dă rezultate slabe.
 *   3. După orice schimbare: `npm run stiluri`, apoi deploy.
 */

export interface Stil {
  /** Cheia tehnică, cea din formular. Nu se schimbă niciodată. */
  id: string;
  /** Numele văzut de om, și cheia către restul aplicației. */
  nume: string;
  /** Ce pleacă la Suno pentru stilul ăsta. Scrie în engleză. */
  suno: string;
  /** Direcțiile muzicale oferite la pasul doi, pentru stilul ăsta. */
  sub: string[];
  /** Stările de spirit oferite la pasul doi. Fiecare trebuie să existe în STARI. */
  stari: string[];
}

export const STILURI: Stil[] = [
  {
    id: 'romantic', nume: 'Romantic',
    suno: 'romantic ballad',
    sub: ['Baladă', 'Acustic', 'Pop romantic', 'Cinematic'],
    stari: ['Tandră', 'Pasională', 'Nostalgică', 'Solemnă'],
  },
  {
    id: 'suflet', nume: 'Din suflet',
    suno: 'heartfelt acoustic ballad',
    sub: ['Baladă acustică', 'Pop cald', 'Folk', 'Orchestral'],
    stari: ['Recunoștință', 'Nostalgică', 'Luminoasă', 'Emoționantă'],
  },
  {
    id: 'petrecere', nume: 'De petrecere',
    suno: 'upbeat party music',
    sub: ['Dance', 'Disco', 'Folclor modern', 'Latino'],
    stari: ['Energică', 'Veselă', 'Exuberantă'],
  },
  {
    id: 'manele', nume: 'Manele',
    suno: 'manele, oriental balkan pop',
    sub: ['De dragoste', 'De petrecere', 'De pahar', 'Orientală modernă'],
    stari: ['Sentimentală', 'De chef', 'Cu năduf'],
  },
  {
    id: 'pop', nume: 'Pop',
    suno: 'modern pop',
    sub: ['Pop modern', 'Dance-pop', 'Pop acustic', 'Retro anii 80'],
    stari: ['Veselă', 'Emoționantă', 'Energică', 'Visătoare'],
  },
  {
    id: 'rb', nume: 'R&B / Soul',
    suno: 'rnb soul',
    sub: ['Classic Soul', 'Contemporary', 'Neo-Soul', 'Funky'],
    stari: ['Senzuală', 'Romantică', 'Reflexivă'],
  },
  {
    id: 'rap', nume: 'Hip-Hop / Rap',
    suno: 'hip hop',
    sub: ['Melodic rap', 'Trap', 'Old-school', 'Boom bap'],
    stari: ['Energică', 'Emoționantă', 'Amuzantă', 'Motivațională'],
  },
  {
    id: 'rock', nume: 'Rock',
    suno: 'rock',
    sub: ['Rock clasic', 'Baladă rock', 'Pop-rock', 'Alternativ'],
    stari: ['Energică', 'Emoționantă', 'Rebelă'],
  },
  {
    id: 'folclor', nume: 'Folclor / Etno',
    suno: 'balkan folk, ethno',
    sub: ['Etno modern', 'Tradițional', 'Doină', 'Sârbă de joc'],
    stari: ['Veselă', 'Nostalgică', 'De sărbătoare'],
  },
  {
    id: 'acustic', nume: 'Acustic',
    suno: 'acoustic',
    sub: ['Voce și chitară', 'Pian', 'Folk', 'Indie'],
    stari: ['Caldă', 'Intimă', 'Nostalgică'],
  },
  {
    id: 'latino', nume: 'Latino',
    suno: 'latin pop',
    sub: ['Reggaeton', 'Bachata', 'Salsa', 'Latin pop'],
    stari: ['Pasională', 'Veselă', 'Senzuală'],
  },
  {
    id: 'jazz', nume: 'Jazz / Swing',
    suno: 'jazz swing',
    sub: ['Swing', 'Jazz lounge', 'Bossa nova', 'Big band'],
    stari: ['Elegantă', 'Jucăușă', 'Romantică'],
  },
];

/**
 * Starea de spirit. Cheia e ce alege omul în formular, valoarea e ce pleacă
 * la Suno. Aici se câștigă mult: „nostalgic, bittersweet" dă alt sunet decât
 * simplul „nostalgic".
 */
export const STARI: Record<string, string> = {
  'Tandră': 'tender, warm',
  'Caldă': 'warm',
  'Intimă': 'intimate',
  'Pasională': 'passionate',
  'Nostalgică': 'nostalgic, bittersweet',
  'Solemnă': 'solemn, cinematic',
  'Recunoștință': 'grateful, uplifting',
  'Luminoasă': 'bright',
  'Veselă': 'joyful',
  'Emoționantă': 'emotional, moving',
  'Energică': 'energetic, driving',
  'Exuberantă': 'exuberant',
  'Senzuală': 'sensual, smooth',
  'Reflexivă': 'reflective',
  'Sentimentală': 'sentimental',
  'De chef': 'festive',
  'Cu năduf': 'melancholic',
  'Amuzantă': 'playful, humorous',
  'Motivațională': 'motivational',
  'Rebelă': 'rebellious',
  'Visătoare': 'dreamy',
  'De sărbătoare': 'celebratory',
  'Jucăușă': 'playful',
  'Elegantă': 'elegant',
  'Romantică': 'romantic',
};

/** Limba în care se cântă. */
export const LIMBI: Record<string, string> = {
  'Română':   'Romanian language vocals',
  'Engleză':  'English vocals',
  'Italiană': 'Italian language vocals',
  'Rusă':     'Russian language vocals',
};

/** Suno primește genul vocii separat, prin `vocalGender`. */
export const VOCI: Record<string, 'f' | 'm'> = { 'Femeie': 'f', 'Bărbat': 'm' };

/** Cine cântă, în ordinea din formular. */
export const VOCI_LISTA = ['Femeie', 'Bărbat'];

/**
 * Sub-stilurile din pasul doi al formularului pleacă la Suno AȘA CUM SUNT,
 * adică în română: „baladă acustică", „sârbă de joc", „voce și chitară".
 *
 * Tabelul de mai jos NU e folosit încă — e pregătit, ca să poți compara.
 * Suno înțelege mai bine engleza, deci probabil ar suna mai curat pe traduceri;
 * dar pipeline-ul a fost reglat și testat pe varianta românească, iar o
 * schimbare aici schimbă sunetul tuturor melodiilor deodată.
 *
 * Ca să treci pe engleză, în `prompt.ts`, în buildStyle(), înlocuiește
 *     parts.push(brief.directie.toLowerCase())
 * cu
 *     parts.push(SUB_STILURI[brief.directie] ?? brief.directie.toLowerCase())
 * și adaugă `SUB_STILURI` la import. Apoi ascultă câteva melodii înainte să
 * lași așa.
 */
export const SUB_STILURI: Record<string, string> = {
  'Baladă': 'ballad', 'Acustic': 'acoustic', 'Pop romantic': 'romantic pop',
  'Cinematic': 'cinematic', 'Baladă acustică': 'acoustic ballad', 'Pop cald': 'warm pop',
  'Folk': 'folk', 'Orchestral': 'orchestral', 'Dance': 'dance', 'Disco': 'disco',
  'Folclor modern': 'modern folk', 'Latino': 'latin', 'De dragoste': 'love song',
  'De petrecere': 'party', 'De pahar': 'drinking song', 'Orientală modernă': 'modern oriental',
  'Pop modern': 'modern pop', 'Dance-pop': 'dance-pop', 'Pop acustic': 'acoustic pop',
  'Retro anii 80': '80s retro', 'Classic Soul': 'classic soul', 'Contemporary': 'contemporary',
  'Neo-Soul': 'neo-soul', 'Funky': 'funky', 'Melodic rap': 'melodic rap', 'Trap': 'trap',
  'Old-school': 'old-school', 'Boom bap': 'boom bap', 'Rock clasic': 'classic rock',
  'Baladă rock': 'rock ballad', 'Pop-rock': 'pop-rock', 'Alternativ': 'alternative',
  'Etno modern': 'modern ethno', 'Tradițional': 'traditional', 'Doină': 'doina lament',
  'Sârbă de joc': 'balkan dance tune', 'Voce și chitară': 'voice and guitar', 'Pian': 'piano',
  'Indie': 'indie', 'Reggaeton': 'reggaeton', 'Bachata': 'bachata', 'Salsa': 'salsa',
  'Latin pop': 'latin pop', 'Swing': 'swing', 'Jazz lounge': 'jazz lounge',
  'Bossa nova': 'bossa nova', 'Big band': 'big band',
};

/* ─── formele de care are nevoie restul aplicației ─── */

/** id → nume. Formularul, baza de date și exportul CSV lucrează cu astea. */
export const STYLE_NAMES: Record<string, string> =
  Object.fromEntries(STILURI.map((s) => [s.id, s.nume]));

/** nume → fragment Suno. Construit din același tabel, deci nu pot ieși din pas. */
export const STYLE_MAP: Record<string, string> =
  Object.fromEntries(STILURI.map((s) => [s.nume, s.suno]));

/** Ce arată formularul la pasul doi, pentru fiecare stil. */
export const OPTIONS: Record<string, { sub: string[]; mood: string[]; voice: string[] }> =
  Object.fromEntries(STILURI.map((s) => [s.id, { sub: s.sub, mood: s.stari, voice: VOCI_LISTA }]));
