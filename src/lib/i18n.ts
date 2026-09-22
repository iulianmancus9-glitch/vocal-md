/**
 * Textele site-ului, în română și engleză.
 *
 * Un lucru e important de înțeles aici: ce se traduce și ce nu.
 *
 * Alegerile din formular — „Femeie", „Altcineva", „Română", stările de spirit —
 * NU se traduc. Ele sunt protocolul dintre pagină și server: zod le validează
 * ca enumerări exacte (`src/lib/validation.ts`), promptul lui Suno se
 * construiește din ele (`MOOD_MAP`, `LANG_MAP`, `GENDER_MAP`), baza de date le
 * păstrează așa, iar exportul CSV le citește la fel. O traducere acolo ar rupe
 * generarea în tăcere.
 *
 * Ce se traduce e doar eticheta văzută de om. Valoarea trimisă rămâne aceeași,
 * indiferent de limba paginii. De asta există `VALUES` separat de `UI`.
 */

export const LANGS = ['ro', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}

/* ══════════════════════════════════════════════════════════════
   ETICHETELE ALEGERILOR
   Cheia e valoarea trimisă serverului. Valoarea e doar ce se vede.
   ══════════════════════════════════════════════════════════════ */

type Labels = Record<string, string>;

const SUBS_EN: Labels = {
  'Baladă': 'Ballad', 'Acustic': 'Acoustic', 'Pop romantic': 'Romantic pop',
  'Cinematic': 'Cinematic', 'Baladă acustică': 'Acoustic ballad', 'Pop cald': 'Warm pop',
  'Folk': 'Folk', 'Orchestral': 'Orchestral', 'Dance': 'Dance', 'Disco': 'Disco',
  'Folclor modern': 'Modern folk', 'Latino': 'Latino', 'De dragoste': 'Love song',
  'De petrecere': 'Party', 'De pahar': 'Drinking song', 'Orientală modernă': 'Modern oriental',
  'Pop modern': 'Modern pop', 'Dance-pop': 'Dance-pop', 'Pop acustic': 'Acoustic pop',
  'Retro anii 80': '80s retro', 'Classic Soul': 'Classic soul', 'Contemporary': 'Contemporary',
  'Neo-Soul': 'Neo-soul', 'Funky': 'Funky', 'Melodic rap': 'Melodic rap', 'Trap': 'Trap',
  'Old-school': 'Old-school', 'Boom bap': 'Boom bap', 'Rock clasic': 'Classic rock',
  'Baladă rock': 'Rock ballad', 'Pop-rock': 'Pop-rock', 'Alternativ': 'Alternative',
  'Etno modern': 'Modern ethno', 'Tradițional': 'Traditional', 'Doină': 'Doina',
  'Sârbă de joc': 'Village dance', 'Voce și chitară': 'Voice and guitar', 'Pian': 'Piano',
  'Indie': 'Indie', 'Reggaeton': 'Reggaeton', 'Bachata': 'Bachata', 'Salsa': 'Salsa',
  'Latin pop': 'Latin pop', 'Swing': 'Swing', 'Jazz lounge': 'Jazz lounge',
  'Bossa nova': 'Bossa nova', 'Big band': 'Big band',
};

const MOODS_EN: Labels = {
  'Tandră': 'Tender', 'Pasională': 'Passionate', 'Nostalgică': 'Nostalgic',
  'Solemnă': 'Solemn', 'Recunoștință': 'Grateful', 'Luminoasă': 'Bright',
  'Emoționantă': 'Moving', 'Energică': 'Energetic', 'Veselă': 'Joyful',
  'Exuberantă': 'Exuberant', 'Sentimentală': 'Sentimental', 'De chef': 'Festive',
  'Cu năduf': 'Melancholic', 'Visătoare': 'Dreamy', 'Senzuală': 'Sensual',
  'Romantică': 'Romantic', 'Reflexivă': 'Reflective', 'Amuzantă': 'Playful',
  'Motivațională': 'Motivational', 'Rebelă': 'Rebellious', 'De sărbătoare': 'Celebratory',
  'Caldă': 'Warm', 'Intimă': 'Intimate', 'Elegantă': 'Elegant', 'Jucăușă': 'Playful',
};

const VOICES_EN: Labels = { 'Femeie': 'Female', 'Bărbat': 'Male' };

const RECIPIENTS_EN: Labels = {
  'Iubită': 'Girlfriend', 'Iubit': 'Boyfriend', 'Soție': 'Wife', 'Soț': 'Husband',
  'Mamă': 'Mother', 'Tată': 'Father', 'Părinți': 'Parents', 'Fiică': 'Daughter',
  'Fiu': 'Son', 'Soră': 'Sister', 'Frate': 'Brother', 'Prietenă': 'Friend (she)',
  'Prieten': 'Friend (he)', 'Bunici': 'Grandparents', 'Altcineva': 'Someone else',
};

const OCCASIONS_EN: Labels = {
  'Zi de naștere': 'Birthday', 'Aniversare de cuplu': 'Anniversary', 'Nuntă': 'Wedding',
  'Cerere în căsătorie': 'Proposal', 'Cumătrie': 'Christening', '8 Martie': "Women's Day",
  'Ziua Îndrăgostiților': "Valentine's Day", 'Sărbători de iarnă': 'Winter holidays',
  'Absolvire': 'Graduation', 'Pensionare': 'Retirement', 'Îmi cer scuze': "I'm sorry",
  'Fără ocazie anume': 'No special occasion', 'Altă ocazie': 'Another occasion',
};

const SONG_LANGS_EN: Labels = {
  'Română': 'Romanian', 'Engleză': 'English', 'Italiană': 'Italian', 'Rusă': 'Russian',
};

const STYLES_EN: Record<string, { name: string; desc: string }> = {
  romantic:  { name: 'Romantic',      desc: 'A love ballad, warm and honest' },
  suflet:    { name: 'Heartfelt',     desc: 'For parents, siblings and friends' },
  petrecere: { name: 'Party',         desc: 'Upbeat, for dancing round the table' },
  manele:    { name: 'Manele',        desc: 'Of love, of drink or of dance' },
  pop:       { name: 'Pop',           desc: 'Modern, with a chorus that sticks' },
  rb:        { name: 'R&B / Soul',    desc: 'Velvet vocals, rich harmonies' },
  rap:       { name: 'Hip-Hop / Rap', desc: 'Flow, rhymes and a beat' },
  rock:      { name: 'Rock',          desc: 'Guitars, the energy of a live show' },
  folclor:   { name: 'Folk / Ethno',  desc: 'Romanian sound, for celebrations' },
  acustic:   { name: 'Acoustic',      desc: 'Just voice, guitar or piano' },
  latino:    { name: 'Latino',        desc: 'Reggaeton, bachata, warm rhythm' },
  jazz:      { name: 'Jazz / Swing',  desc: 'Elegant, supper-club class' },
};

/** Eticheta unei alegeri. Pe română valoarea e deja eticheta. */
export function label(lang: Lang, group: keyof typeof EN_VALUES, value: string | null): string {
  if (value == null) return '';
  if (lang === 'ro') return value;
  return EN_VALUES[group][value] ?? value;
}

const EN_VALUES = {
  subs: SUBS_EN,
  moods: MOODS_EN,
  voices: VOICES_EN,
  recipients: RECIPIENTS_EN,
  occasions: OCCASIONS_EN,
  songLangs: SONG_LANGS_EN,
} satisfies Record<string, Labels>;

/** Numele și descrierea unui stil, în limba paginii. */
export function styleLabel(lang: Lang, id: string, ro: { name: string; desc: string }) {
  return lang === 'ro' ? ro : (STYLES_EN[id] ?? ro);
}

/* ══════════════════════════════════════════════════════════════
   TEXTELE PAGINII
   Româna e forma de referință; engleza trebuie să aibă exact
   aceleași chei, altfel TypeScript se plânge la build.
   ══════════════════════════════════════════════════════════════ */

const RO = {
  brandBack: 'Vocal MD — înapoi la început',
  switchTo: 'English',
  switchAria: 'Switch to English',

  footTerms: 'Termeni și condiții',
  footRefund: 'Politica de rambursare',
  footPrivacy: 'Confidențialitate',

  needPrefix: 'Ca să mergem mai departe, mai alege:',
  tagPreview: 'previzualizare',
  playAria: (n: string) => `Ascultă ${n}`,
  stopAria: (n: string) => `Oprește ${n}`,
  backAria: 'Înapoi',
  prevStepAria: 'Pasul anterior',

  /* fereastra „înapoi la început" */
  homeTitle: 'Înapoi la început?',
  homeTextKept: 'Melodia ta rămâne în bibliotecă. Te ducem la pagina de start.',
  homeTextLost: 'Se pierde ce ai completat până acum și o iei de la prima întrebare.',
  homeStay: 'Rămân aici',
  homeGo: 'Înapoi la început',

  loadingTitle: 'Se deschide comanda ta',

  /* pagina de start */
  heroEyebrow: 'Melodii 100% personalizate',
  heroTitle: 'Transformă povestea voastră într-o melodie de neuitat.',
  heroText: 'Spui povestea voastră, iar versurile și vocea sunt generate automat. În câteva minute ai o melodie făcută numai pentru omul drag ție.',
  ctaCreate: 'Creează melodia ta',

  /* revenirea la o melodie lăsată neterminată */
  resumeTitle: 'Ai o melodie începută',
  resumeFor: (nume: string) => `Ai început o melodie pentru ${nume}`,
  resumeText: 'Am păstrat ce ai completat. Poți continua de unde ai rămas sau poți lua totul de la capăt.',
  resumeOrderText: 'Melodia ta e salvată și te așteaptă. Poți continua de unde ai rămas sau poți începe alta.',
  resumeGo: 'Continuă melodia',
  resumeNew: 'Începe una nouă',

  /* butonul de WhatsApp, prezent pe toate ecranele */
  waText: 'Scrie-ne',
  waAria: 'Scrie-ne pe WhatsApp',
  waMessage: 'Bună! Am o întrebare despre Vocal MD.',

  /* încă o înregistrare, după ce a plătit */
  againCta: 'Cere altă înregistrare',
  againText: (n: number) => n === 1
    ? 'Nu-ți place cum a ieșit? Mai poți cere o înregistrare a aceleiași piese.'
    : `Nu-ți place cum a ieșit? Mai poți cere ${n} înregistrări ale aceleiași piese.`,
  specTitle: 'Ce primești',
  spec1a: 'Două fișiere MP3', spec1b: ' — două interpretări ale melodiei tale',
  spec2a: 'Livrare ', spec2b: 'pe email', spec2c: ' și în pagină, după confirmarea plății',
  spec3a: '30 €', spec3b: ', plată unică — fără abonament',
  specFreeA: 'Versurile și un minut din melodie sunt ', specFreeB: 'gratuite', specFreeC: ', înainte de plată.',
  perk1: 'Versuri generate de AI',
  perk2: 'Două fișiere MP3, ale tale',
  perk3: 'Gata în câteva minute',

  /* ecranul de email */
  headLast: 'Ultimul pas',
  emailEyebrow: 'Aproape gata',
  emailTitle: 'Unde îți trimitem melodia?',
  emailText: 'Versurile se generează în câteva secunde. Lăsăm adresa ta de email ca să nu pierzi nimic dacă închizi pagina — îți trimitem acolo și versurile, și melodia.',
  emailModTitle: 'Adresa ta de email',
  emailModText: 'Pe această adresă îți trimitem melodia, în două fișiere MP3. Doar pentru livrare — fără reclame nesolicitate.',
  emailPlaceholder: 'numele.tau@email.com',
  agreeText: 'Am citit și accept Termenii și condițiile și Politica de confidențialitate.',
  readTerms: 'Citește Termenii',
  readPrivacy: 'Citește Politica de confidențialitate',
  newsText: 'Vreau să primesc ocazional idei de cadouri și oferte. Opțional, te poți dezabona oricând.',
  noPayNow: 'Nu îți cerem nicio plată acum. Versurile și minutul de ascultat rămân gratuite.',
  sending: 'Se trimite…',
  writeLyrics: 'Scrie versurile — gratuit',
  needEmail: 'o adresă de email validă',
  needAgree: 'acordul cu termenii',

  /* livrarea */
  headOrder: (id: string) => `Comanda ${id}`,
  doneTitle: 'Melodia e a ta.',
  doneText: (mail: string) => `Ți-am trimis totul și pe email, la ${mail}. O poți descărca de aici oricând.`,
  yourAddress: 'adresa ta',
  yourSong: 'Melodia ta',
  variantOf: (n: number) => `varianta ${n}`,
  dlAria: (n: number) => `Descarcă varianta ${n}`,
  invoiceNote: 'Plata a fost înregistrată. Factura îți vine pe email, direct de la MAIB.',
  myLibrary: 'Biblioteca mea',
  makeAnother: 'Mai fac una',

  /* biblioteca */
  headLibrary: 'Biblioteca',
  libTitle: 'Melodiile tale',
  libSub: 'Comenzile făcute de pe acest dispozitiv.',
  libEmpty: 'Încă nu ai nicio melodie',
  libEmptyText: 'Aici ajung melodiile pe care le faci de pe acest dispozitiv. Prima e la câteva minute distanță — versurile și un minut de ascultat sunt gratuite.',
  libContinue: 'Continuă melodia',
  untitled: 'Melodie fără titlu',
  statePaid: 'CUMPĂRATĂ',
  stateDemo: 'DOAR DEMO',
  listen: 'Ascultă',
  listenDemo: 'Ascultă demo',
  download: 'Descarcă',
  newSong: 'Creează o melodie nouă',
  dateLocale: 'ro-RO',

  /* oprire */
  headError: 'Ceva n-a mers',
  errRefused: 'Nu putem face această melodie',
  errFailed: 'Înregistrarea nu a reușit',
  errDefault: 'Studioul nostru a răspuns cu o eroare la această piesă. Se întâmplă rar și de obicei se rezolvă din a doua încercare — versurile tale sunt salvate, nu le rescrii.',
  noCharge: 'Nu ți-a fost debitat niciun ban. Plata se face doar după ce asculți melodia.',
  startAnother: 'Începe altă melodie',
  retrying: 'Se reîncearcă…',
  retry: 'Încearcă din nou',
  seeSaved: 'Vezi melodiile salvate',
  contactNote: 'Dacă se repetă, scrie-ne la base.vocalmd@gmail.com și rezolvăm noi manual.',

  /* așteptare */
  writingTitle: 'Se scriu versurile',
  writingLate: 'Mai durează câteva clipe — textul e pe ultima sută de metri. Lasă pagina deschisă.',
  writingNormal: 'Povestea ta se citește și textul se generează. Durează câteva zeci de secunde — lasă pagina deschisă.',
  makingTitle: 'Se înregistrează melodia',
  makingLate: 'Mai durează câteva clipe — se lucrează la mixaj. Nu închide pagina, melodia vine.',
  makingNormal: 'Vocea, instrumentele și mixajul. Durează un minut-două — lasă pagina deschisă.',

  /* previzualizare + ofertă */
  headSong: 'Melodia ta',
  demoEyebrow: 'Gata',
  demoTitle: 'Ascultă cum sună povestea voastră.',
  demoText: 'Am pregătit două interpretări ale aceleiași piese. Ascultă-le pe amândouă — le primești pe ambele, integral.',
  takesLabel: (n: number) => `Ai ${n} înregistrări ale aceleiași piese. Alege-o pe cea care îți place — pe ea o primești.`,
  recordingN: (n: number) => `Înregistrarea ${n}`,
  altText: 'alt text',
  variantN: (n: number) => `Varianta ${n}`,
  voiceMeta: (style: string, voice: string) => `${style} · voce ${voice.toLowerCase()}`,
  altTake: (style: string) => `${style} · interpretare alternativă`,
  seeLyrics: 'Vezi versurile',
  otherRecording: 'Altă înregistrare',
  rendersLeft: (n: number) => `Mai poți cere ${n} ${n === 1 ? 'înregistrare' : 'înregistrări'}, gratuit. Cele de până acum rămân, nu se pierd.`,
  rendersNone: 'Ai folosit toate înregistrările gratuite. Alege dintre cele de mai sus pe cea care îți place.',
  offerKicker: 'VARIANTA COMPLETĂ',
  offerTitle: 'Melodia completă, în două fișiere MP3',
  priceNote: 'plată unică · fără abonament',
  offer1: 'Piesa completă, de la prima până la ultima notă',
  offer2: 'Primești ambele variante integral, ca să o oferi pe cea mai bună',
  offer3: 'Fișier MP3 descărcabil pe telefon sau laptop, al tău pentru totdeauna',
  offer4: 'Un link cu piesa și versurile, pe care îl poți trimite mai departe',
  buyCta: 'Primește melodia — 30 €',
  trust1: 'Plată securizată',
  trust2: 'Livrare pe email',
  trust3: 'Descărcare nelimitată',

  /* plata: link MAIB, apoi confirmarea făcută de noi */
  payStep1: '1. Plătește 30 € prin MAIB',
  payStep2: '2. Întoarce-te aici și spune-ne',
  payOpen: (eur: number) => `Deschide plata — ${eur} €`,
  paySameEmail: 'Folosește la plată aceeași adresă de email:',
  payOrderRef: 'Comanda ta:',
  payDone: 'Am efectuat achitarea',
  payFoot: 'Verificăm plata și îți deblocăm melodia. De obicei în câteva minute.',
  payCheckingTitle: 'Verificăm plata',
  payCheckingText: 'Melodia se deschide singură aici imediat ce confirmăm, și îți ajunge și pe email. Poți închide pagina — linkul din email rămâne bun.',
  payRejected: 'Nu am găsit plata ta. Dacă ai achitat, scrie-ne la base.vocalmd@gmail.com și rezolvăm noi. Dacă nu, poți încerca din nou.',

  /* versuri */
  headLyrics: 'Versurile',
  lyricsEyebrow: 'Pasul următor',
  lyricsFallback: 'Versurile tale sunt gata',
  lyricsSung: 'Textul pe care l-ai aprobat. Dacă îți place mai mult o variantă anterioară, o poți readuce și cere o înregistrare nouă pe ea.',
  lyricsFresh: 'Citește-le cu atenție — exact așa vor fi înregistrate. Poți modifica orice cuvânt sau poți cere o variantă nouă.',
  saving: 'Se salvează…',
  editDone: 'Am terminat',
  editStart: 'Modifică acest text',
  otherVersion: 'Altă variantă',
  regensLeft: (n: number) => `Mai ai ${n} ${n === 1 ? 'variantă gratuită' : 'variante gratuite'} de versuri.`,
  regensNone: 'Ai folosit variantele gratuite — dar poți modifica textul direct, oricât vrei.',
  changedCanRecord: 'Textul de acum e altul decât cel din înregistrarea pe care o asculți. Înregistrează-l ca să-l auzi cântat.',
  changedNoRecord: 'Textul de acum e altul decât cel din înregistrarea pe care o asculți, dar ai folosit toate înregistrările.',
  historySummary: (n: number) => `Variantele anterioare (${n})`,
  versionN: (n: number) => `Varianta ${n}`,
  restoreVersion: 'Readu varianta asta',
  approveRecord: 'Aprobă și înregistrează',
  recordThis: 'Înregistrează varianta asta',
  backToSong: 'Înapoi la melodie',

  /* formularul */
  headStep: (n: number) => `Pasul ${n} din 6`,
  step1: 'Stilul', step2: 'Personalizare', step3: 'Pentru cine',
  step4: 'Povestea', step5: 'Limba', step6: 'Gata',
  continueLabel: 'Continuă',

  q1: 'Ce fel de melodie vrei?',
  q1sub: 'Alege atmosfera piesei. Restul detaliilor le potrivim împreună la pasul următor.',

  q2: 'Cum să sune mai exact?',
  q2sub: 'Trei alegeri scurte care dau piesei caracterul ei.',
  modDirection: 'Direcția muzicală',
  modDirectionText: (style: string) => `Nuanța din interiorul stilului ${style.toLowerCase()}.`,
  modMood: 'Starea de spirit',
  modMoodText: 'Emoția pe care vrei s-o lase piesa după ce se termină.',
  modVoice: 'Cine cântă',
  modVoiceText: 'Vocea care va interpreta versurile tale.',
  needDirection: 'direcția muzicală',
  needMood: 'starea de spirit',
  needVoice: 'cine cântă',

  q3: 'Cui îi dăruiești melodia?',
  q3sub: 'Numele se aude cântat în refren. Acesta este detaliul care emoționează cel mai mult.',
  modPerson: 'Persoana',
  modPersonText: 'Cine va asculta melodia.',
  otherPersonPlaceholder: 'ex. nașa mea, colegul de trupă',
  modNames: 'Numele',
  modNamesText: 'Scrie-l exact cum se pronunță. Așa îl va cânta vocea.',
  namePlaceholder1: 'ex. Maria',
  namePlaceholder2: 'ex. Andrei',
  delNameAria: (n: number) => `Șterge numele ${n}`,
  addName: 'Adaugă încă un nume',
  modOccasion: 'Ocazia',
  modOccasionText: 'Momentul în care îi dai melodia.',
  otherOccasionPlaceholder: 'ex. 25 de ani de căsnicie',
  needPerson: 'persoana',
  needWhoIs: 'cine este persoana',
  needNames: 'numele',
  needOccasion: 'ocazia',
  needWhatOccasion: 'ce ocazie este',

  q4: 'Ce vrei să-i spui?',
  q4sub: 'Partea asta face diferența dintre o melodie frumoasă și una pe care o va ține minte toată viața.',
  pickAi: 'Versurile se generează',
  pickAiText: 'Ne spui povestea în cuvintele tale, iar din ea se scriu versurile.',
  pickOwn: 'Am deja versurile',
  pickOwnText: 'Le introduci aici și se înregistrează așa cum le-ai scris.',
  modSongTitle: 'Titlul piesei',
  modSongTitleText: 'Apare pe player și pe fișierul pe care îl descarci.',
  songTitlePlaceholder: 'ex. Cântecul mamei',
  modStoryAi: 'Povestea voastră',
  modStoryOwn: 'Versurile tale',
  modStoryAiText: 'Nume, locuri, glume între voi, o amintire anume sau mesajul pe care vrei să i-l transmiți.',
  modStoryOwnText: 'Introdu textul complet, cu strofe și refren.',
  storyExample: 'Anul acesta facem 10 ani de la nuntă. Am construit totul de la zero împreună, de când stăteam în chirie într-o garsonieră mică, până la viața aglomerată de acum cu doi copii. Chiar dacă suntem mereu pe fugă, diminețile când îmi pregătește cafeaua mă fac să uit de stres. Vreau să-i mulțumesc pentru toată răbdarea și să știe că o iubesc la fel de mult.',
  ownPlaceholder: '[Strofa 1]\n…',
  inspireTitle: 'Nu știi de unde să începi?',
  inspireText: 'Alege o direcție și îți completăm un început, pe care îl poți schimba.',
  insp1Label: 'Mulțumesc pentru tot',
  insp1Text: 'Vreau să-i mulțumesc pentru tot ce a făcut pentru mine de-a lungul anilor, fără să ceară nimic în schimb.',
  insp2Label: 'Cum ne-am cunoscut',
  insp2Text: 'Povestea zilei în care ne-am cunoscut și cum s-a schimbat totul de atunci.',
  insp3Label: 'Îmi lipsești',
  insp3Text: 'Suntem departe unul de celălalt și vreau să știe cât de mult îmi lipsește.',
  insp4Label: 'Ești puterea mea',
  insp4Text: 'Despre cât de mult mă inspiră și cum mă ține pe picioare în zilele grele.',
  insp5Label: 'Ceva amuzant',
  insp5Text: 'O piesă veselă, cu glumele noastre și lucrurile caraghioase pe care le face.',
  needTitle: 'titlul piesei',
  needStory: 'povestea voastră',
  needOwnLyrics: 'versurile tale',

  q5: 'În ce limbă se cântă?',
  q5sub: 'Versurile sunt scrise direct în limba aleasă, nu traduse.',
  songLangNote: (l: string) => `Versuri în limba ${l.toLowerCase()}`,
  needSongLang: 'limba versurilor',

  q6: 'Verifică înainte să începem',
  q6sub: 'Poți schimba orice — apasă săgeata înapoi.',
  recapStyle: 'Stil',
  recapDirection: 'Direcție',
  recapMood: 'Stare de spirit',
  recapVoice: 'Voce',
  recapFor: 'Pentru',
  recapOccasion: 'Ocazia',
  recapTitle: 'Titlu',
  recapLang: 'Limba',
  recapStory: 'Povestea',
  recapOwnLyrics: 'Versurile tale',
  getTitle: 'Ce primești',
  getText: 'Fără nicio plată în acest moment.',
  get1: 'Versuri originale, scrise pe povestea ta',
  get2: 'Le poți modifica sau cere altele înainte de înregistrare',
  get3: 'Două variante cântate, din care o alegi pe cea preferată',
  get4: 'Un minut din melodie, ca să auzi cum sună',
  freeNoteBold: 'Plătești doar dacă îți place.',
  freeNoteRest: ' Versurile și minutul de ascultat sunt gratuite. Piesa întreagă costă 30 € și o iei doar dacă te-a convins ce ai auzit.',

  /* navigarea de pe pagina de start */
  navHow: 'Cum funcționează',
  navFaq: 'Întrebări',
  navAria: 'Secțiunile paginii',

  heroPriceA: 'Previzualizare gratuită · ',
  heroPriceB: '30 €',
  heroPriceC: ' pentru melodia completă, plată unică',

  /* cum funcționează */
  howTitle: 'Cum funcționează',
  howSub: 'Trei pași, câteva minute. Totul automat.',
  how1Title: 'Spui povestea',
  how1Text: 'Alegi stilul, pentru cine e melodia și ce vrei să-i transmiți. Formularul are șase pași scurți.',
  how2Title: 'Asculți, gratuit',
  how2Text: 'Versurile se generează în câteva secunde și le poți schimba. Apoi primești un minut din melodie, în două interpretări. Până aici nu plătești nimic.',
  how3Title: 'Plătești și descarci',
  how3Text: 'Dacă îți place, plătești 30 € și primești două fișiere MP3 — în pagină și pe email, imediat ce confirmăm plata.',

  /* întrebări frecvente */
  faqTitle: 'Întrebări frecvente',
  faq1Q: 'Ce primesc, mai exact?',
  faq1A: 'Două fișiere MP3: aceeași melodie, în două interpretări. Le primești pe amândouă, integral. Se descarcă direct din pagină și îți ajung și pe email.',
  faq2Q: 'Cât durează?',
  faq2A: 'Versurile se scriu în câteva zeci de secunde, melodia în două-trei minute. Previzualizarea gratuită e gata în sub zece minute. Melodia întreagă ajunge la tine imediat ce confirmăm plata — de obicei în câteva minute, cel târziu în câteva ore.',
  faq3Q: 'Trebuie să plătesc înainte s-o aud?',
  faq3A: 'Nu. Versurile și un minut din melodie sunt gratuite. Plătești cele 30 € doar dacă îți place ce ai auzit.',
  faq4Q: 'Cântă un om adevărat?',
  faq4A: 'Nu. Vocea e generată de un model AI. Nu clonăm și nu imităm voci de persoane reale, iar mostre de voce nu acceptăm.',
  faq5Q: 'Pot să public melodia pe TikTok sau Instagram?',
  faq5A: 'Da. Primești dreptul s-o folosești personal și s-o publici pe rețele sociale. Nu poți însă pretinde că ai compus-o tu și nu o poți înregistra în sisteme de tip Content ID.',
  faq6Q: 'În ce limbi se poate cânta?',
  faq6A: 'Română, engleză, italiană și rusă. Versurile se scriu direct în limba aleasă, nu se traduc.',
  faq7Q: 'Pot schimba versurile?',
  faq7A: 'Da. Le poți modifica cuvânt cu cuvânt sau poți cere alte variante, înainte de înregistrare. După ce melodia e gata mai poți cere încă două înregistrări, gratuit.',
  faq8Q: 'Dacă nu-mi place sau ceva nu merge?',
  faq8A: 'Plata se face abia după ce asculți, deci nu rămâi cu o melodie nedorită. Dacă apare o problemă tehnică, scrie-ne la base.vocalmd@gmail.com. Condițiile complete sunt în Politica de rambursare.',
  faqContact: 'Altă întrebare? Scrie-ne la',

  /* bannerul de cookie-uri */
  ckAria: 'Cookie-uri',
  ckText: 'Folosim cookie-uri strict necesare ca să ținem minte comanda în curs. Cu acordul tău am folosi și cookie-uri de statistică și de măsurare a reclamelor.',
  ckPolicy: 'Politica de confidențialitate',
  ckNecessaryB: 'Strict necesare', ckNecessary: ' — comanda în curs, sesiunea, securitatea. Nu pot fi oprite.',
  ckStatsB: 'Statistică', ckStats: ' — câți vizitatori avem și unde întâmpină dificultăți.',
  ckAdsB: 'Marketing', ckAds: ' — cât de bine funcționează reclamele noastre.',
  ckSave: 'Salvează alegerea',
  ckSettings: 'Setări',
  ckOnlyNeeded: 'Doar necesare',
  ckAcceptAll: 'Accept toate',

  /* titlul din fila browserului */
  metaTitle: 'Vocal MD — melodii personalizate',
  metaDesc: 'Spui povestea, iar versurile și vocea sunt generate automat. Asculți un minut gratuit și plătești doar dacă îți place.',
  metaOgDesc: 'Versuri gratuite, un minut de ascultat gratuit, plătești doar dacă îți place.',
  metaLocale: 'ro_RO',
};

const EN: typeof RO = {
  brandBack: 'Vocal MD — back to the start',
  switchTo: 'Română',
  switchAria: 'Treci la română',

  footTerms: 'Terms and conditions',
  footRefund: 'Refund policy',
  footPrivacy: 'Privacy',

  needPrefix: 'To continue, please also choose:',
  tagPreview: 'preview',
  playAria: (n: string) => `Play ${n}`,
  stopAria: (n: string) => `Pause ${n}`,
  backAria: 'Back',
  prevStepAria: 'Previous step',

  homeTitle: 'Back to the start?',
  homeTextKept: 'Your song stays in your library. We will take you to the home page.',
  homeTextLost: 'Everything you have filled in so far is lost and you start from the first question.',
  homeStay: 'Stay here',
  homeGo: 'Back to the start',

  loadingTitle: 'Opening your order',

  heroEyebrow: '100% personalised songs',
  heroTitle: 'Turn your story into a song no one forgets.',
  heroText: 'You tell your story, and the lyrics and the voice are generated automatically. In a few minutes you have a song made for one person only.',
  ctaCreate: 'Create your song',

  resumeTitle: 'You have a song in progress',
  resumeFor: (nume: string) => `You started a song for ${nume}`,
  resumeText: 'We kept what you filled in. You can carry on from where you left off, or start over.',
  resumeOrderText: 'Your song is saved and waiting. You can carry on from where you left off, or start another one.',
  resumeGo: 'Carry on',
  resumeNew: 'Start a new one',

  waText: 'Message us',
  waAria: 'Message us on WhatsApp',
  waMessage: 'Hello! I have a question about Vocal MD.',

  againCta: 'Ask for another recording',
  againText: (n: number) => n === 1
    ? 'Not happy with how it turned out? You can ask for one more recording of the same song.'
    : `Not happy with how it turned out? You can ask for ${n} more recordings of the same song.`,
  specTitle: 'What you get',
  spec1a: 'Two MP3 files', spec1b: ' — two takes of your song',
  spec2a: 'Delivered ', spec2b: 'by email', spec2c: ' and on this page, once your payment is confirmed',
  spec3a: '€30', spec3b: ', one-time payment — no subscription',
  specFreeA: 'The lyrics and one minute of the song are ', specFreeB: 'free', specFreeC: ', before you pay.',
  perk1: 'Lyrics generated by AI',
  perk2: 'Two MP3 files, yours to keep',
  perk3: 'Ready in minutes',

  headLast: 'Last step',
  emailEyebrow: 'Almost there',
  emailTitle: 'Where do we send your song?',
  emailText: 'The lyrics are generated in a few seconds. We take your email address so nothing is lost if you close the page — we send both the lyrics and the song there.',
  emailModTitle: 'Your email address',
  emailModText: 'We send your song to this address, as two MP3 files. For delivery only — no unsolicited marketing.',
  emailPlaceholder: 'your.name@email.com',
  agreeText: 'I have read and accept the Terms and Conditions and the Privacy Policy.',
  readTerms: 'Read the Terms',
  readPrivacy: 'Read the Privacy Policy',
  newsText: 'I would like to receive occasional gift ideas and offers. Optional, and you can unsubscribe at any time.',
  noPayNow: 'We ask for no payment now. The lyrics and the one-minute preview stay free.',
  sending: 'Sending…',
  writeLyrics: 'Write the lyrics — free',
  needEmail: 'a valid email address',
  needAgree: 'your agreement to the terms',

  headOrder: (id: string) => `Order ${id}`,
  doneTitle: 'The song is yours.',
  doneText: (mail: string) => `We have also sent everything by email, to ${mail}. You can download it here whenever you like.`,
  yourAddress: 'your address',
  yourSong: 'Your song',
  variantOf: (n: number) => `take ${n}`,
  dlAria: (n: number) => `Download take ${n}`,
  invoiceNote: 'Your payment has been recorded. Your invoice is emailed to you directly by MAIB.',
  myLibrary: 'My library',
  makeAnother: 'Make another one',

  headLibrary: 'Library',
  libTitle: 'Your songs',
  libSub: 'Orders made from this device.',
  libEmpty: 'No songs here yet',
  libEmptyText: 'This is where the songs you make on this device end up. The first one is a few minutes away — the lyrics and a minute of the song are free.',
  libContinue: 'Carry on with this song',
  untitled: 'Untitled song',
  statePaid: 'PURCHASED',
  stateDemo: 'PREVIEW ONLY',
  listen: 'Listen',
  listenDemo: 'Play preview',
  download: 'Download',
  newSong: 'Create a new song',
  dateLocale: 'en-GB',

  headError: 'Something went wrong',
  errRefused: 'We cannot make this song',
  errFailed: 'The recording did not go through',
  errDefault: 'Our studio returned an error for this track. It happens rarely and usually works on the second attempt — your lyrics are saved, you do not have to write them again.',
  noCharge: 'You have not been charged anything. Payment happens only after you have listened to the song.',
  startAnother: 'Start another song',
  retrying: 'Trying again…',
  retry: 'Try again',
  seeSaved: 'See saved songs',
  contactNote: 'If it keeps happening, write to us at base.vocalmd@gmail.com and we will sort it out by hand.',

  writingTitle: 'Writing the lyrics',
  writingLate: 'A few more moments — the text is on the home straight. Leave the page open.',
  writingNormal: 'Your story is being read and the text generated. It takes a few dozen seconds — leave the page open.',
  makingTitle: 'Recording the song',
  makingLate: 'A few more moments — the mix is being finished. Do not close the page, the song is coming.',
  makingNormal: 'The voice, the instruments and the mix. It takes a minute or two — leave the page open.',

  headSong: 'Your song',
  demoEyebrow: 'Ready',
  demoTitle: 'Hear how your story sounds.',
  demoText: 'We have prepared two takes of the same song. Listen to both — you get both of them, in full.',
  takesLabel: (n: number) => `You have ${n} recordings of the same song. Pick the one you like — that is the one you get.`,
  recordingN: (n: number) => `Recording ${n}`,
  altText: 'different lyrics',
  variantN: (n: number) => `Take ${n}`,
  voiceMeta: (style: string, voice: string) => `${style} · ${voice.toLowerCase()} vocals`,
  altTake: (style: string) => `${style} · alternative take`,
  seeLyrics: 'See the lyrics',
  otherRecording: 'Another recording',
  rendersLeft: (n: number) => `You can ask for ${n} more ${n === 1 ? 'recording' : 'recordings'}, free. The ones so far are kept, nothing is lost.`,
  rendersNone: 'You have used all the free recordings. Choose the one you like best from above.',
  offerKicker: 'THE FULL VERSION',
  offerTitle: 'The complete song, as two MP3 files',
  priceNote: 'one-time payment · no subscription',
  offer1: 'The complete track, from the first note to the last',
  offer2: 'Both takes in full, so you can give away the better one',
  offer3: 'An MP3 file you download to your phone or laptop, yours forever',
  offer4: 'A link with the song and the lyrics that you can pass on',
  buyCta: 'Get the song — €30',
  trust1: 'Secure payment',
  trust2: 'Delivered by email',
  trust3: 'Unlimited downloads',

  payStep1: '1. Pay €30 through MAIB',
  payStep2: '2. Come back here and tell us',
  payOpen: (eur: number) => `Open the payment — €${eur}`,
  paySameEmail: 'Use the same email address when you pay:',
  payOrderRef: 'Your order:',
  payDone: 'I have paid',
  payFoot: 'We check the payment and unlock your song. Usually within a few minutes.',
  payCheckingTitle: 'Checking your payment',
  payCheckingText: 'The song opens here on its own as soon as we confirm, and it also reaches you by email. You can close this page — the link in the email stays valid.',
  payRejected: 'We could not find your payment. If you did pay, write to us at base.vocalmd@gmail.com and we will sort it out. If not, you can try again.',

  headLyrics: 'The lyrics',
  lyricsEyebrow: 'Next step',
  lyricsFallback: 'Your lyrics are ready',
  lyricsSung: 'The text you approved. If you prefer an earlier version, you can bring it back and ask for a new recording of it.',
  lyricsFresh: 'Read them carefully — this is exactly what will be recorded. You can change any word, or ask for a new version.',
  saving: 'Saving…',
  editDone: 'Done',
  editStart: 'Edit this text',
  otherVersion: 'Another version',
  regensLeft: (n: number) => `You have ${n} free ${n === 1 ? 'version' : 'versions'} of the lyrics left.`,
  regensNone: 'You have used the free versions — but you can edit the text directly, as much as you like.',
  changedCanRecord: 'The current text differs from the one in the recording you are listening to. Record it to hear it sung.',
  changedNoRecord: 'The current text differs from the one in the recording you are listening to, but you have used all your recordings.',
  historySummary: (n: number) => `Earlier versions (${n})`,
  versionN: (n: number) => `Version ${n}`,
  restoreVersion: 'Bring this version back',
  approveRecord: 'Approve and record',
  recordThis: 'Record this version',
  backToSong: 'Back to the song',

  headStep: (n: number) => `Step ${n} of 6`,
  step1: 'Style', step2: 'Fine-tuning', step3: 'Who it is for',
  step4: 'The story', step5: 'Language', step6: 'Ready',
  continueLabel: 'Continue',

  q1: 'What kind of song do you want?',
  q1sub: 'Choose the mood of the track. We settle the rest together in the next step.',

  q2: 'How exactly should it sound?',
  q2sub: 'Three short choices that give the song its character.',
  modDirection: 'Musical direction',
  modDirectionText: (style: string) => `The shade within the ${style.toLowerCase()} style.`,
  modMood: 'The mood',
  modMoodText: 'The feeling you want the song to leave behind when it ends.',
  modVoice: 'Who sings',
  modVoiceText: 'The voice that will perform your lyrics.',
  needDirection: 'the musical direction',
  needMood: 'the mood',
  needVoice: 'who sings',

  q3: 'Who are you giving the song to?',
  q3sub: 'The name is sung in the chorus. This is the detail that moves people most.',
  modPerson: 'The person',
  modPersonText: 'Who will listen to the song.',
  otherPersonPlaceholder: 'e.g. my godmother, my bandmate',
  modNames: 'The name',
  modNamesText: 'Write it exactly as it is pronounced. That is how the voice will sing it.',
  namePlaceholder1: 'e.g. Maria',
  namePlaceholder2: 'e.g. Andrei',
  delNameAria: (n: number) => `Remove name ${n}`,
  addName: 'Add another name',
  modOccasion: 'The occasion',
  modOccasionText: 'The moment you give them the song.',
  otherOccasionPlaceholder: 'e.g. 25 years of marriage',
  needPerson: 'the person',
  needWhoIs: 'who the person is',
  needNames: 'the name',
  needOccasion: 'the occasion',
  needWhatOccasion: 'what the occasion is',

  q4: 'What do you want to tell them?',
  q4sub: 'This part is the difference between a pretty song and one they remember for life.',
  pickAi: 'The lyrics are generated',
  pickAiText: 'You tell the story in your own words, and the lyrics are written from it.',
  pickOwn: 'I already have the lyrics',
  pickOwnText: 'You paste them here and they are recorded exactly as you wrote them.',
  modSongTitle: 'Song title',
  modSongTitleText: 'It shows on the player and on the file you download.',
  songTitlePlaceholder: "e.g. Mother's song",
  modStoryAi: 'Your story',
  modStoryOwn: 'Your lyrics',
  modStoryAiText: 'Names, places, your private jokes, a particular memory, or the message you want to get across.',
  modStoryOwnText: 'Enter the full text, with verses and chorus.',
  storyExample: 'This year we celebrate ten years since our wedding. We built everything from nothing together, from renting a tiny studio flat to the busy life we have now with two children. Even though we are always rushing, the mornings when she makes my coffee make me forget the stress. I want to thank her for all her patience and for her to know that I love her just as much.',
  ownPlaceholder: '[Verse 1]\n…',
  inspireTitle: 'Not sure where to start?',
  inspireText: 'Pick a direction and we fill in an opening for you, which you can then change.',
  insp1Label: 'Thank you for everything',
  insp1Text: 'I want to thank them for everything they have done for me over the years, without ever asking for anything back.',
  insp2Label: 'How we met',
  insp2Text: 'The story of the day we met and how everything changed from then on.',
  insp3Label: 'I miss you',
  insp3Text: 'We are far apart and I want them to know how much I miss them.',
  insp4Label: 'You are my strength',
  insp4Text: 'About how much they inspire me and how they keep me standing on the hard days.',
  insp5Label: 'Something funny',
  insp5Text: 'A cheerful track, with our jokes and the silly things they do.',
  needTitle: 'the song title',
  needStory: 'your story',
  needOwnLyrics: 'your lyrics',

  q5: 'What language is it sung in?',
  q5sub: 'The lyrics are written directly in the language you choose, not translated.',
  songLangNote: (l: string) => `Lyrics in ${l}`,
  needSongLang: 'the language of the lyrics',

  q6: 'Check it over before we begin',
  q6sub: 'You can change anything — press the back arrow.',
  recapStyle: 'Style',
  recapDirection: 'Direction',
  recapMood: 'Mood',
  recapVoice: 'Voice',
  recapFor: 'For',
  recapOccasion: 'Occasion',
  recapTitle: 'Title',
  recapLang: 'Language',
  recapStory: 'The story',
  recapOwnLyrics: 'Your lyrics',
  getTitle: 'What you get',
  getText: 'No payment at this point.',
  get1: 'Original lyrics, written on your story',
  get2: 'You can edit them or ask for others before recording',
  get3: 'Two sung takes, from which you pick your favourite',
  get4: 'One minute of the song, so you hear how it sounds',
  freeNoteBold: 'You pay only if you like it.',
  freeNoteRest: ' The lyrics and the minute of listening are free. The whole track costs €30 and you take it only if what you heard convinced you.',

  navHow: 'How it works',
  navFaq: 'FAQ',
  navAria: 'Page sections',

  heroPriceA: 'Free preview · ',
  heroPriceB: '€30',
  heroPriceC: ' for the full song, one-time payment',

  howTitle: 'How it works',
  howSub: 'Three steps, a few minutes. All automated.',
  how1Title: 'You tell the story',
  how1Text: 'You pick the style, who the song is for and what you want to say. The form is six short steps.',
  how2Title: 'You listen, free',
  how2Text: 'The lyrics are generated in seconds and you can change them. Then you get one minute of the song, in two takes. Nothing is paid up to here.',
  how3Title: 'You pay and download',
  how3Text: 'If you like it, you pay €30 and get two MP3 files — on the page and by email, as soon as we confirm the payment.',

  faqTitle: 'Frequently asked questions',
  faq1Q: 'What exactly do I receive?',
  faq1A: 'Two MP3 files: the same song, in two takes. You get both of them, in full. They download straight from the page and also arrive by email.',
  faq2Q: 'How long does it take?',
  faq2A: 'The lyrics take a few dozen seconds, the song two to three minutes. The free preview is ready in under ten minutes. The full song reaches you as soon as we confirm your payment — usually within minutes, at most a few hours.',
  faq3Q: 'Do I have to pay before hearing it?',
  faq3A: 'No. The lyrics and one minute of the song are free. You pay the €30 only if you like what you heard.',
  faq4Q: 'Is it a real human singer?',
  faq4A: 'No. The voice is generated by an AI model. We do not clone or imitate the voices of real people, and we do not accept voice samples.',
  faq5Q: 'Can I post the song on TikTok or Instagram?',
  faq5A: 'Yes. You get the right to use it personally and to post it on social media. You may not claim you composed it, and you may not register it with Content ID systems.',
  faq6Q: 'Which languages can it be sung in?',
  faq6A: 'Romanian, English, Italian and Russian. The lyrics are written directly in the language you choose, not translated.',
  faq7Q: 'Can I change the lyrics?',
  faq7A: 'Yes. You can edit them word by word or ask for other versions, before recording. Once the song is ready you can still ask for two more recordings, free.',
  faq8Q: 'What if I do not like it, or something goes wrong?',
  faq8A: 'You pay only after listening, so you are never left with a song you did not want. If something breaks technically, write to base.vocalmd@gmail.com. The full terms are in the Refund Policy.',
  faqContact: 'Another question? Write to us at',

  ckAria: 'Cookies',
  ckText: 'We use strictly necessary cookies to remember the order in progress. With your consent we would also use statistics and advertising measurement cookies.',
  ckPolicy: 'Privacy Policy',
  ckNecessaryB: 'Strictly necessary', ckNecessary: ' — the order in progress, the session, security. These cannot be turned off.',
  ckStatsB: 'Statistics', ckStats: ' — how many visitors we have and where they run into trouble.',
  ckAdsB: 'Marketing', ckAds: ' — how well our advertising works.',
  ckSave: 'Save my choice',
  ckSettings: 'Settings',
  ckOnlyNeeded: 'Necessary only',
  ckAcceptAll: 'Accept all',

  metaTitle: 'Vocal MD — personalised songs',
  metaDesc: 'You tell the story, and the lyrics and the voice are generated automatically. Listen to a minute for free and pay only if you like it.',
  metaOgDesc: 'Free lyrics, a free minute to listen to, and you pay only if you like it.',
  metaLocale: 'en_GB',
};

export const UI = { ro: RO, en: EN };
export type Dict = typeof RO;
