import React, { useState, useEffect, useRef } from 'react';
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

const DEMO_LYRICS = `[Strofa 1]
Dimineața se ridică peste casa de pe deal,
Tu ești prima care râde, eu sunt ultimul la mal.
Ai purtat pe umeri anii fără să te plângi o dată
Și-ai crescut din nimic lumea care astăzi îmi e toată.

[Refren]
Maria, Maria, tu ești cântecul din mine,
Tot ce am mai bun pe lume am învățat de la tine.
Dacă viața mi-ar da timpul înapoi ca să-l aleg,
Tot pe drumul tău aș merge, tot cu tine l-aș petrec.

[Strofa 2]
Mâinile tale știu drumul spre orice durere-a mea,
Le-am văzut muncind în tăcere, n-ai cerut nimic în schimb.
Azi îți scriu ce nu-ți spusesem, că mi-a fost rușine, poate —
Că din tot ce am pe lume, tu ești partea cea mai mare.`;

/* ══════════════════════════════════════════════════════════════
   TEXTE LEGALE
   ══════════════════════════════════════════════════════════════ */

const LEGAL = {
  ro: {
    tabs: { terms: 'Termeni și condiții', refund: 'Politica de rambursare', privacy: 'Confidențialitate' },
    terms: {
      date: 'Data intrării în vigoare: 13 septembrie 2026',
      intro: 'Bun venit pe Vocal MD! Prin accesarea site-ului nostru și achiziționarea serviciilor noastre, sunteți de acord să respectați următorii Termeni și Condiții. Vă rugăm să îi citiți cu atenție înainte de a plasa o comandă.',
      s: [
        { h: '1. Descrierea serviciului', p: ['Vocal MD oferă un serviciu care utilizează Inteligența Artificială (AI) pentru a genera piese muzicale personalizate și originale, pe baza instrucțiunilor textuale, poveștilor, genurilor și detaliilor furnizate de dumneavoastră („Clientul”).'] },
        { h: '2. Livrare și termene', p: ['Odată ce plata dumneavoastră este procesată cu succes, sistemul nostru automat va începe generarea melodiei. În condiții normale, fișierele audio finale (format MP3) vor fi livrate la adresa de email furnizată de dumneavoastră în termen de 5 până la 10 minute. Vocal MD nu este responsabil pentru întârzierile cauzate de introducerea incorectă a adresei de email de către Client sau de întreruperile tehnice temporare ale serverelor terțe de AI sau de email.'] },
        { h: '3. Politica de nerambursare (toate vânzările sunt finale)', p: ['Deoarece Vocal MD creează produse audio digitale extrem de personalizate, bazate strict pe detaliile dumneavoastră unice, toate vânzările sunt finale. Nu putem refolosi sau revinde melodia dumneavoastră personalizată. Prin urmare, nu oferim rambursări, schimburi sau revizuiri gratuite odată ce o comandă a fost plasată și procesul de generare audio a început.', 'Prin finalizarea achiziției, recunoașteți și sunteți de acord în mod explicit să renunțați la orice drept la rambursare.'] },
        { h: '4. Calitate și așteptări', p: ['Deși utilizăm tehnologie AI de ultimă generație pentru a produce piese de înaltă calitate cu sunet de studio, natura creativă a inteligenței artificiale înseamnă că melodia finală, vocile și pronunția pot varia. Nu garantăm că melodia generată se va potrivi perfect cu o anumită linie melodică pe care o aveți în minte. AI-ul va interpreta povestea și genul selectat la capacitatea sa tehnică maximă.'] },
        { h: '5. Drepturi de autor și utilizare', p: ['La livrarea melodiei, Vocal MD vă acordă o licență globală, neexclusivă și perpetuă pentru a utiliza piesa audio generată în scopuri personale, pentru distribuire pe rețelele sociale (ex. TikTok, Instagram, YouTube) și pentru a o oferi cadou. Nu puteți pretinde că ați compus sau interpretat dumneavoastră piesa și nici nu puteți înregistra piesa în sisteme de identificare a conținutului (precum YouTube Content ID) care ar putea bloca sau penaliza alți utilizatori.'] },
        { h: '6. Reguli privind conținutul utilizatorului', p: ['Sunteți de acord să nu trimiteți instrucțiuni sau povești care conțin instigare la ură, promovează violența sau sunt explicit ilegale. Vocal MD își rezervă dreptul de a refuza prestarea serviciului și de a anula comenzile (cu o rambursare completă) dacă conținutul solicitat încalcă aceste reguli sau filtrele de siguranță ale partenerilor noștri de procesare AI.'] },
        { h: '7. Limitarea răspunderii', p: ['Vocal MD nu va fi răspunzător pentru nicio daună indirectă, accidentală sau pe cale de consecință care rezultă din utilizarea serviciului nostru sau din incapacitatea de a primi melodia generată în timp util.'] },
        { h: '8. Informații de contact', p: ['Dacă aveți nevoie de asistență sau aveți întrebări referitoare la acești Termeni, vă rugăm să ne contactați la: base.vocalmd@gmail.com'] },
      ],
      foot: 'Serviciul este furnizat de Wade Production S.R.L.',
    },
    refund: {
      date: 'Data intrării în vigoare: 13 septembrie 2026',
      intro: 'Vă mulțumim că ați ales Vocal MD. Ne străduim să vă oferim cea mai bună muzică personalizată, generată de AI.',
      s: [
        { h: 'Produse digitale', p: ['Datorită naturii serviciului nostru — crearea de fișiere audio digitale complet personalizate pe baza solicitărilor dumneavoastră specifice — toate vânzările sunt finale. Odată ce o comandă a fost procesată, iar melodia personalizată a fost generată și livrată, nu putem oferi rambursări, schimburi sau anulări.'] },
        { h: 'Excepții', p: ['Vom emite o rambursare sau vom oferi o înlocuire numai în următoarele cazuri excepționale:'], ul: ['Nelivrare: dacă nu primiți melodia în intervalul de timp promis din cauza unei erori tehnice din partea noastră.', 'Fișier corupt: dacă fișierul audio livrat este corupt tehnic, gol sau nu poate fi redat și nu vă putem oferi o înlocuire funcțională.'] },
        { h: 'Cum ne contactați', p: ['Dacă întâmpinați probleme cu comanda dumneavoastră, vă rugăm să contactați echipa noastră de suport la base.vocalmd@gmail.com în termen de 7 zile de la achiziție, iar noi vom face tot posibilul pentru a remedia situația.'] },
      ],
      foot: 'Serviciul este furnizat de Wade Production S.R.L.',
    },
    privacy: {
      date: 'Data intrării în vigoare: 19 martie 2026',
      intro: 'Bun venit pe Vocal MD! Confidențialitatea dumneavoastră este de o importanță critică pentru noi. Această Politică de Confidențialitate explică modul în care colectăm, utilizăm și protejăm informațiile dumneavoastră personale atunci când vizitați site-ul nostru și utilizați serviciul nostru pentru a crea melodii personalizate generate de AI.',
      s: [
        { h: '1. Informațiile pe care le colectăm', p: ['Pentru a vă oferi serviciul nostru de melodii personalizate, colectăm următoarele tipuri de informații:'], ul: ['Informații personale de contact: când plasați o comandă, colectăm adresa dumneavoastră de email. Avem nevoie de aceasta pentru a vă livra fișierele audio finale și pentru a vă trimite actualizări despre comandă.', 'Conținut furnizat de utilizator: colectăm textul pe care îl trimiteți în formularul nostru de comandă (de exemplu: povestea, numele, amintirile, ocaziile, stilul muzical și starea de spirit). Aceste date reprezintă fundația creativă necesară pentru a genera melodia dumneavoastră unică.', 'Informații de plată: toate plățile sunt procesate în siguranță prin intermediul procesatorului terț Paddle. Vocal MD nu colectează, nu stochează și nu are acces la numerele complete ale cardului dumneavoastră de credit sau la detaliile contului bancar.', 'Date colectate automat: la fel ca majoritatea site-urilor web, putem colecta informații tehnice standard, cum ar fi adresa dumneavoastră IP, tipul de browser și interacțiunile cu site-ul nostru, pentru a menține funcționarea optimă și sigură a acestuia.'] },
        { h: '2. Cum utilizăm informațiile dumneavoastră', p: ['Utilizăm datele pe care le colectăm strict în următoarele scopuri:'], ul: ['Pentru a genera melodia dumneavoastră personalizată folosind tehnologii de inteligență artificială.', 'Pentru a livra piesele audio finalizate direct în căsuța dumneavoastră de email.', 'Pentru a procesa plata dumneavoastră în siguranță.', 'Pentru a oferi suport clienților și a răspunde la orice întrebări ați putea avea.'] },
        { h: '3. Partajarea și dezvăluirea informațiilor', p: ['Vă respectăm confidențialitatea și nu vindem, nu închiriem și nu tranzacționăm informațiile dumneavoastră personale către marketeri externi. Partajăm datele dumneavoastră doar cu furnizori de servicii terți de încredere care ne ajută în operarea site-ului nostru și în livrarea serviciului nostru. Aceștia includ:'], ul: ['Parteneri de procesare AI: pentru a transforma povestea dumneavoastră scrisă într-o piesă muzicală.', 'Furnizori de servicii de email: pentru a automatiza livrarea melodiei în căsuța dumneavoastră de email.', 'Procesatorul de plăți Paddle: pentru a gestiona în siguranță tranzacția dumneavoastră financiară.'] },
        { h: '4. Securitatea datelor', p: ['Tratăm cu seriozitate securitatea datelor dumneavoastră personale. Implementăm standarde comerciale rezonabile de tehnologie și securitate operațională pentru a vă proteja informațiile împotriva accesului neautorizat, alterării sau distrugerii.'] },
        { h: '5. Drepturile dumneavoastră asupra datelor', p: ['Aveți dreptul de a solicita accesul la datele personale pe care le deținem despre dumneavoastră sau de a ne cere să le ștergem din bazele noastre de date active. Pentru a face o solicitare, vă rugăm să contactați echipa noastră de suport.'] },
        { h: '6. Modificări ale acestei politici', p: ['Putem actualiza această politică din când în când pentru a reflecta modificările aduse practicilor noastre sau cerințelor legale. Vă încurajăm să revizuiți această pagină periodic.'] },
        { h: '7. Contactați-ne', p: ['Dacă aveți întrebări, nelămuriri sau solicitări referitoare la această Politică de Confidențialitate, vă rugăm să ne contactați la: base.vocalmd@gmail.com'] },
      ],
      foot: 'Serviciul este furnizat de Wade Production S.R.L.',
    },
  },
  en: {
    tabs: { terms: 'Terms of Service', refund: 'Refund Policy', privacy: 'Privacy Policy' },
    terms: {
      date: 'Effective date: 13 September 2026',
      intro: 'Welcome to Vocal MD! By accessing our website and purchasing our services, you agree to be bound by the following Terms of Service. Please read them carefully before placing an order.',
      s: [
        { h: '1. Service description', p: ['Vocal MD provides a service that uses Artificial Intelligence (AI) to generate customized, original musical tracks based on the text prompts, stories, genres, and details provided by you (the “Customer”).'] },
        { h: '2. Delivery and timelines', p: ['Once your payment is successfully processed, our automated system will begin generating your song. Under normal circumstances, the final audio files (MP3 format) will be delivered to the email address you provided within 5 to 10 minutes. Vocal MD is not responsible for delays caused by incorrect email addresses entered by the Customer or temporary technical outages of third-party AI or email servers.'] },
        { h: '3. No refunds policy (all sales are final)', p: ['Because Vocal MD creates highly personalized, custom digital audio products based specifically on your unique input, all sales are final. We cannot repurpose or resell your custom song. Therefore, we do not offer refunds, exchanges, or free revisions once an order has been submitted and the audio generation process has begun.', 'By completing your purchase, you explicitly acknowledge and agree to waive any right to a refund.'] },
        { h: '4. Quality and expectations', p: ['While we utilize cutting-edge AI technology to produce high-quality studio-sounding tracks, the creative nature of AI means the final melody, vocals, and pronunciation may vary. We do not guarantee that the generated song will perfectly match a specific melody you may have in mind. The AI will interpret your story and genre selection to the best of its technical ability.'] },
        { h: '5. Copyright and usage rights', p: ['Upon delivery of the song, Vocal MD grants you a worldwide, non-exclusive, perpetual license to use the generated audio track for personal use, social media sharing (e.g. TikTok, Instagram, YouTube), and gifting. You may not claim you composed or performed the track yourself, nor can you register the track with content ID systems (like YouTube Content ID) that might strike other users.'] },
        { h: '6. User content guidelines', p: ['You agree not to submit prompts or stories that contain hate speech, promote violence, or are explicitly illegal. Vocal MD reserves the right to refuse service and cancel orders (with a full refund) if the requested content violates these guidelines or our AI processing partners’ safety filters.'] },
        { h: '7. Limitation of liability', p: ['Vocal MD shall not be liable for any indirect, incidental, or consequential damages arising from the use of our service or the inability to receive the generated song in a timely manner.'] },
        { h: '8. Contact information', p: ['If you need assistance or have questions regarding these Terms, please contact us at: base.vocalmd@gmail.com'] },
      ],
      foot: 'The service is provided by Wade Production S.R.L.',
    },
    refund: {
      date: 'Effective date: 13 September 2026',
      intro: 'Thank you for choosing Vocal MD. We strive to provide you with the best personalized AI-generated music.',
      s: [
        { h: 'Digital products', p: ['Due to the nature of our service — creating custom, personalized digital audio files based on your specific requests — all sales are final. Once an order has been processed and the custom song has been generated and delivered to you, we cannot offer refunds, exchanges, or cancellations.'] },
        { h: 'Exceptions', p: ['We will issue a refund or provide a replacement only in the following exceptional cases:'], ul: ['Non-delivery: if you do not receive your song within the promised timeframe due to a technical error on our end.', 'Corrupted file: if the audio file delivered is technically corrupted, empty, or unplayable, and we are unable to provide a working replacement.'] },
        { h: 'How to reach us', p: ['If you experience any issues with your order, please contact our support team at base.vocalmd@gmail.com within 7 days of your purchase, and we will do our best to resolve the issue.'] },
      ],
      foot: 'The service is provided by Wade Production S.R.L.',
    },
    privacy: {
      date: 'Effective date: 19 March 2026',
      intro: 'Welcome to Vocal MD! Your privacy is critically important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website and use our service to create personalized AI-generated songs.',
      s: [
        { h: '1. Information we collect', p: ['To provide you with our custom song service, we collect the following types of information:'], ul: ['Personal contact information: when you place an order, we collect your email address. We need this to deliver your final audio files and send order updates.', 'User-provided content: we collect the text you submit in our order form (e.g. the story, names, memories, occasions, music style, and mood). This data is the creative foundation required to generate your unique song.', 'Payment information: all payments are processed securely through our third-party payment processor, Paddle. Vocal MD does not collect, store, or have access to your full credit card numbers or bank account details.', 'Automatically collected data: like most websites, we may collect standard technical information, such as your IP address, browser type, and interactions with our site, to keep our website running smoothly and securely.'] },
        { h: '2. How we use your information', p: ['We use the data we collect strictly for the following business purposes:'], ul: ['To generate your personalized song using artificial intelligence technologies.', 'To deliver the finished audio tracks directly to your email inbox.', 'To process your payment securely.', 'To provide customer support and answer any questions you might have.'] },
        { h: '3. Information sharing and disclosure', p: ['We respect your privacy and do not sell, rent, or trade your personal information to outside marketers. We only share your data with trusted third-party service providers who assist us in operating our website and delivering our service. These include:'], ul: ['AI processing partners: to transform your written story into a musical track.', 'Email service providers: to automate the delivery of your song to your inbox.', 'Paddle, our payment processor: to securely handle your financial transaction.'] },
        { h: '4. Data security', p: ['We take the security of your personal data seriously. We implement reasonable commercial standards of technology and operational security to protect your information from unauthorized access, alteration, or destruction.'] },
        { h: '5. Your data rights', p: ['You have the right to request access to the personal data we hold about you, or ask us to delete it from our active databases. To make a request, please contact our support team.'] },
        { h: '6. Changes to this policy', p: ['We may update this policy from time to time to reflect changes in our practices or legal requirements. We encourage you to review this page periodically.'] },
        { h: '7. Contact us', p: ['If you have any questions, concerns, or requests regarding this Privacy Policy, please reach out to us at: base.vocalmd@gmail.com'] },
      ],
      foot: 'The service is provided by Wade Production S.R.L.',
    },
  },
};

/* ══════════════════════════════════════════════════════════════
   STIL
   ══════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

.vc, .vc *, .vc *::before, .vc *::after { box-sizing: border-box; }
.vc {
  --violet: #6C5CE7; --violet-d: #5B4BD1; --violet-l: #EFECFF; --violet-t: #F7F5FF;
  --grad: linear-gradient(135deg, #3BBDF5 0%, #6C5CE7 55%, #8B5CF6 100%);
  --ink: #16161D; --ink-2: #3F3F4B; --gray: #767686;
  --tile: #F4F4F6; --tile-h: #ECECF0; --line: #E6E6EC; --line-2: #D6D6E0;
  --page: #FFFFFF;
  font-family: Poppins, "Segoe UI", system-ui, sans-serif;
  background: var(--page); color: var(--ink); min-height: 100vh; -webkit-font-smoothing: antialiased;
}
.vc button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }
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
.vc-footLink { font-size: 12px; color: var(--gray); font-weight: 500; }
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

/* ─── navigare de prototip ─── */
.vc-dev { margin-top: 12px; display: flex; gap: 7px; justify-content: center; flex-wrap: wrap; }
.vc-devBtn { font-size: 11px; color: var(--gray); border: 1px dashed var(--line-2); border-radius: 8px; padding: 5px 10px; transition: color .15s, border-color .15s; }
.vc-devBtn:hover { color: var(--violet); border-color: var(--violet); }

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

function Take({ name, meta, playing, at, active, onToggle, onSeek }) {
  const ref = useRef(null);
  const seek = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 60);
  };
  const head = active ? at / 60 : 0;
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
      <div className="vc-times"><span>{fmt(active ? at : 0)}</span><span>1:00</span></div>
    </div>
  );
}

function Footer({ onOpen, onJump }) {
  return (
    <>
    <div className="vc-footer">
      <button className="vc-footLink" onClick={() => onOpen('terms')}>Termeni și condiții</button>
      <button className="vc-footLink" onClick={() => onOpen('refund')}>Politica de rambursare</button>
      <button className="vc-footLink" onClick={() => onOpen('privacy')}>Confidențialitate</button>
      <span className="vc-footLink">Wade Production S.R.L.</span>
    </div>
    {onJump && (
      <div className="vc-dev">
        <span className="vc-devBtn" style={{ border: 0 }}>Prototip — sari la:</span>
        <button className="vc-devBtn" onClick={() => onJump('email')}>Email</button>
        <button className="vc-devBtn" onClick={() => onJump('done')}>Livrare</button>
        <button className="vc-devBtn" onClick={() => onJump('library')}>Biblioteca</button>
        <button className="vc-devBtn" onClick={() => onJump('error')}>Eroare</button>
        <button className="vc-devBtn" onClick={() => onJump('wizard')}>Start</button>
      </div>
    )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   APLICAȚIA
   ══════════════════════════════════════════════════════════════ */

export default function Vocal() {
  const [screen, setScreen] = useState('wizard');
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    style: null, sub: null, mood: null, voice: null,
    recipient: null, recipientOther: '', names: [''], occasion: null, occasionOther: '',
    mode: 'ai', title: '', story: '', lang: 'Română',
  });
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));

  const [lyrics, setLyrics] = useState(DEMO_LYRICS);
  const [editing, setEditing] = useState(false);
  const [regens, setRegens] = useState(2);
  const [progress, setProgress] = useState(0);
  const [take, setTake] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);

  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [news, setNews] = useState(false);
  const [copied, setCopied] = useState(false);
  const [legalTab, setLegalTab] = useState('terms');
  const [legalLang, setLegalLang] = useState('ro');
  const [back, setBack] = useState('wizard');

  const top = useRef(null);
  const navRef = useRef(null);
  const [showBar, setShowBar] = useState(false);

  const style = STYLES.find((s) => s.id === d.style);
  const opts = d.style ? OPTIONS[d.style] : null;

  useEffect(() => { top.current?.scrollIntoView({ block: 'start' }); }, [step, screen, legalTab]);

  /* bara de jos apare doar când butonul din pagină nu se vede */
  useEffect(() => {
    const el = navRef.current;
    if (!el) { setShowBar(false); return; }
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [step, screen, d.mode, d.style]);

  useEffect(() => {
    if (screen !== 'making') return;
    setProgress(0);
    const t = setInterval(() => setProgress((p) => {
      if (p >= 100) { clearInterval(t); setScreen('demo'); return 100; }
      return p + 4;
    }), 210);
    return () => clearInterval(t);
  }, [screen]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setAt((v) => (v >= 60 ? (setPlaying(false), 60) : v + 0.3)), 100);
    return () => clearInterval(t);
  }, [playing]);

  const toggleTake = (n) => { if (take === n) return setPlaying((p) => !p); setTake(n); setAt(0); setPlaying(true); };
  const seekTake = (n, s) => { setTake(n); setAt(s); setPlaying(true); };

  const openLegal = (tab) => { setBack(screen); setLegalTab(tab); setScreen('legal'); };

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

  /* ────────── pagini legale ────────── */
  if (screen === 'legal') {
    const L = LEGAL[legalLang];
    const doc = L[legalTab];
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span>
          <div className="vc-langBtns">
            {['ro', 'en'].map((l) => (
              <button key={l} className="vc-langBtn" data-on={legalLang === l ? '1' : '0'} onClick={() => setLegalLang(l)}>
                {l === 'ro' ? '🇷🇴 RO' : '🇬🇧 EN'}
              </button>
            ))}
          </div>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-tabs">
              {['terms', 'refund', 'privacy'].map((t) => (
                <button key={t} className="vc-tab" data-on={legalTab === t ? '1' : '0'} onClick={() => setLegalTab(t)}>
                  {L.tabs[t]}
                </button>
              ))}
            </div>
            <h1 className="vc-q" style={{ marginTop: 4 }}>{L.tabs[legalTab]}</h1>
            <p className="vc-legalDate">{doc.date}</p>
            <p className="vc-legalIntro">{doc.intro}</p>
            {doc.s.map((sec) => (
              <div key={sec.h}>
                <h3 className="vc-legalH">{sec.h}</h3>
                {sec.p?.map((t, i) => <p className="vc-legalP" key={i}>{t}</p>)}
                {sec.ul && <ul className="vc-legalUl">{sec.ul.map((t, i) => <li key={i}>{t}</li>)}</ul>}
              </div>
            ))}
            <p className="vc-legalFoot">{doc.foot}</p>
            <div className="vc-nav" ref={navRef}>
              <button className="vc-next" onClick={() => setScreen(back)}>
                <ArrowLeft size={18} /> {legalLang === 'ro' ? 'Înapoi la site' : 'Back to the site'}
              </button>
            </div>
          </div>
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
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span><span className="vc-headNote">Ultimul pas</span>
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

            <button className="vc-check" data-on={agree ? '1' : '0'} onClick={() => setAgree(!agree)}>
              <span className="vc-box">{agree && <Check size={14} strokeWidth={3} />}</span>
              <span className="vc-checkText">
                Am citit și accept <u>Termenii și condițiile</u> și <u>Politica de confidențialitate</u>.
              </span>
            </button>

            <button className="vc-check" data-on={news ? '1' : '0'} onClick={() => setNews(!news)}>
              <span className="vc-box">{news && <Check size={14} strokeWidth={3} />}</span>
              <span className="vc-checkText">
                Vreau să primesc ocazional idei de cadouri și oferte. Opțional, te poți dezabona oricând.
              </span>
            </button>

            <div className="vc-safe" style={{ background: 'var(--violet-t)', color: 'var(--ink-2)' }}>
              <ShieldCheck size={16} color="#6C5CE7" />
              <span>Nu îți cerem nicio plată acum. Versurile și minutul de ascultat rămân gratuite.</span>
            </div>

            <div className="vc-nav" ref={navRef}>
              <button className="vc-back" onClick={() => { setScreen('wizard'); setStep(5); }} aria-label="Înapoi">
                <ArrowLeft size={19} />
              </button>
              <button className={nextCls} disabled={!okMail || !agree} onClick={() => setScreen('lyrics')}>
                <Sparkles size={18} /> Scrie versurile — gratuit
              </button>
            </div>
            {(!okMail || !agree) && (
              <Need items={[!okMail && 'o adresă de email validă', !agree && 'acordul cu termenii'].filter(Boolean)} />
            )}
          </div>
          <Footer onOpen={openLegal} onJump={setScreen} />
        </div>
      </div>
    );
  }

  /* ────────── livrarea, după plată ────────── */
  if (screen === 'done') {
    const link = 'https://vocal.md/m/8f4c21';
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span><span className="vc-headNote">Comanda #8F4C21</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-done">
              <div className="vc-doneIcon"><Check size={34} strokeWidth={3} /></div>
              <h1 className="vc-doneTitle">Melodia e a ta.</h1>
              <p className="vc-doneText">
                Ți-am trimis totul și pe email, la {email || 'adresa ta'}. O poți descărca de aici oricând.
              </p>
            </div>

            <div className="vc-track">
              <span className="vc-trackIcon"><Music2 size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="vc-trackName">{d.title || 'Melodia ta'} — varianta 1</p>
                <p className="vc-trackMeta">MP3 · 3:14 · calitate 320 kbps</p>
              </div>
              <button className="vc-dl" aria-label="Descarcă varianta 1"><Download size={19} /></button>
            </div>
            <div className="vc-track">
              <span className="vc-trackIcon"><Music2 size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="vc-trackName">{d.title || 'Melodia ta'} — varianta 2</p>
                <p className="vc-trackMeta">MP3 · 3:02 · calitate 320 kbps</p>
              </div>
              <button className="vc-dl" aria-label="Descarcă varianta 2"><Download size={19} /></button>
            </div>

            <Module icon={Link2} title="Trimite cadoul" text="Un link cu piesa și versurile, gata de dat mai departe.">
              <div className="vc-linkRow">
                <span className="vc-linkBox">{link}</span>
                <button className="vc-copy" data-done={copied ? '1' : '0'}
                  onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
                  {copied ? <><Check size={15} /> Copiat</> : <><Copy size={15} /> Copiază</>}
                </button>
              </div>
            </Module>

            <div className="vc-safe">
              <Check size={16} />
              <span>
                Factura ți-a fost trimisă de Paddle pe email. Melodia rămâne în biblioteca ta 24 de luni
                și o poți descărca de oricâte ori vrei.
              </span>
            </div>

            <div className="vc-nav" ref={navRef}>
              <button className="vc-ghost" style={{ flex: 1 }} onClick={() => setScreen('library')}>
                <ListMusic size={16} /> Biblioteca mea
              </button>
              <button className="vc-ghost" style={{ flex: 1 }}
                onClick={() => { setScreen('wizard'); setStep(0); }}>
                <Sparkles size={16} /> Mai fac una
              </button>
            </div>
          </div>
          <Footer onOpen={openLegal} onJump={setScreen} />
        </div>
      </div>
    );
  }

  /* ────────── biblioteca ────────── */
  if (screen === 'library') {
    const items = [
      { name: d.title || 'Cântecul mamei', meta: 'Din suflet · pentru Maria · 13 septembrie 2026', state: 'paid' },
      { name: 'Zece ani împreună', meta: 'Romantic · pentru Ana · 2 septembrie 2026', state: 'demo' },
    ];
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span><span className="vc-headNote">Biblioteca</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <h1 className="vc-q" style={{ marginTop: 4 }}>Melodiile tale</h1>
            <p className="vc-qSub">Tot ce ai creat cu adresa {email || 'ta de email'}.</p>

            {items.map((it) => (
              <div className="vc-item" key={it.name}>
                <div className="vc-itemTop">
                  <div style={{ minWidth: 0 }}>
                    <p className="vc-itemName">{it.name}</p>
                    <p className="vc-itemMeta">{it.meta}</p>
                  </div>
                  <span className="vc-state" data-t={it.state}>
                    {it.state === 'paid' ? 'CUMPĂRATĂ' : 'DOAR DEMO'}
                  </span>
                </div>
                {it.state === 'paid' ? (
                  <div className="vc-itemAct">
                    <button className="vc-ghost" style={{ flex: 1 }}><Play size={15} /> Ascultă</button>
                    <button className="vc-ghost" style={{ flex: 1 }}><Download size={15} /> Descarcă</button>
                  </div>
                ) : (
                  <>
                    <p className="vc-itemMeta" style={{ marginTop: 10, color: '#9A5B0B' }}>
                      Previzualizarea expiră peste 19 zile. Cumpăr-o ca s-o păstrezi.
                    </p>
                    <div className="vc-itemAct">
                      <button className="vc-ghost" style={{ flex: 1 }}><Play size={15} /> Ascultă demo</button>
                      <button className="vc-ghost" style={{ flex: 1 }} onClick={() => setScreen('done')}>
                        <Gift size={15} /> Cumpără — 30 €
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="vc-nav" ref={navRef}>
              <button className={nextCls} onClick={() => { setScreen('wizard'); setStep(0); }}>
                <Sparkles size={18} /> Creează o melodie nouă
              </button>
            </div>
          </div>
          <Footer onOpen={openLegal} onJump={setScreen} />
        </div>
      </div>
    );
  }

  /* ────────── eroare la generare ────────── */
  if (screen === 'error') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span><span className="vc-headNote">Ceva n-a mers</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar="0">
          <div className="vc-panel">
            <div className="vc-err">
              <div className="vc-errIcon"><AlertTriangle size={32} /></div>
              <h1 className="vc-errTitle">Înregistrarea nu a reușit</h1>
              <p className="vc-errText">
                Studioul nostru a răspuns cu o eroare la această piesă. Se întâmplă rar și de obicei
                se rezolvă din a doua încercare — versurile tale sunt salvate, nu le rescrii.
              </p>
            </div>

            <div className="vc-safe">
              <ShieldCheck size={16} />
              <span>Nu ți-a fost debitat niciun ban. Plata se face doar după ce asculți melodia.</span>
            </div>

            <div className="vc-nav" ref={navRef}>
              <button className={nextCls} onClick={() => setScreen('making')}>
                <RotateCcw size={18} /> Încearcă din nou
              </button>
            </div>
            <button className="vc-ghost" style={{ width: '100%', marginTop: 9 }}
              onClick={() => setScreen('library')}>
              <ListMusic size={16} /> Vezi melodiile salvate
            </button>
            <p style={{ fontSize: 12.5, color: '#767686', textAlign: 'center', marginTop: 14, lineHeight: 1.55 }}>
              Dacă se repetă, scrie-ne la base.vocalmd@gmail.com și rezolvăm noi manual.
            </p>
          </div>
          <Footer onOpen={openLegal} onJump={setScreen} />
        </div>
      </div>
    );
  }

  /* ────────── se creează ────────── */
  if (screen === 'making') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn"><span className="vc-mark">VOCAL</span></div></div>
        <div className="vc-wrap"><div className="vc-panel">
          <div className="vc-wait">
            <div className="vc-waitRing"><Disc3 size={32} /></div>
            <h2 className="vc-waitTitle">Se înregistrează melodia</h2>
            <p className="vc-waitText">Vocea, instrumentele și mixajul. Durează două-trei minute — lasă pagina deschisă.</p>
            <div className="vc-waitRail"><div className="vc-waitFill" style={{ width: `${progress}%` }} /></div>
          </div>
        </div></div>
      </div>
    );
  }

  /* ────────── demo + ofertă ────────── */
  if (screen === 'demo') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span><span className="vc-headNote">Melodia ta</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">Gata</p>
            <h1 className="vc-heroTitle">Ascultă cum sună povestea voastră.</h1>
            <p className="vc-heroText">Am pregătit două interpretări ale aceleiași piese. Ascultă-le pe amândouă — le primești pe ambele, integral.</p>
          </div>
          <div className="vc-panel">
            <Take name="Varianta 1" meta={`${style?.name} · voce ${(d.voice || 'Femeie').toLowerCase()}`}
              playing={playing && take === 1} at={at} active={take === 1}
              onToggle={() => toggleTake(1)} onSeek={(s) => seekTake(1, s)} />
            <Take name="Varianta 2" meta={`${style?.name} · interpretare alternativă`}
              playing={playing && take === 2} at={at} active={take === 2}
              onToggle={() => toggleTake(2)} onSeek={(s) => seekTake(2, s)} />

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
                  <button className="vc-buy" onClick={() => setScreen('done')}><Gift size={20} /> Primește melodia — 30 €</button>
                </div>
                <div className="vc-offerTrust">
                  <span className="vc-trustBit"><ShieldCheck size={13} /> Plată securizată</span>
                  <span className="vc-trustBit"><Zap size={13} /> Livrare instant</span>
                  <span className="vc-trustBit"><Download size={13} /> Descărcare nelimitată</span>
                </div>
              </div>
            </div>
          </div>
          <Footer onOpen={openLegal} onJump={setScreen} />
        </div>
        {showBar && (
          <div className="vc-bar"><div className="vc-barIn">
            <button className="vc-next" onClick={() => setScreen('done')}><Gift size={18} /> Primește melodia — 30 €</button>
          </div></div>
        )}
      </div>
    );
  }

  /* ────────── versuri ────────── */
  if (screen === 'lyrics') {
    return (
      <div className="vc">
        <style>{CSS}</style>
        <div className="vc-head"><div className="vc-headIn">
          <span className="vc-mark">VOCAL</span><span className="vc-headNote">Versurile</span>
        </div></div>
        <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
          <div className="vc-hero">
            <p className="vc-heroEyebrow">Pasul următor</p>
            <h1 className="vc-heroTitle">{d.title || 'Versurile tale sunt gata'}</h1>
            <p className="vc-heroText">Citește-le cu atenție — exact așa vor fi înregistrate. Poți modifica orice cuvânt sau poți cere o variantă nouă.</p>
          </div>
          <div className="vc-panel">
            {editing
              ? <textarea className="vc-lyricsEdit" value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
              : <div className="vc-lyrics">{lyrics}</div>}
            <div className="vc-two">
              <button className="vc-ghost" onClick={() => setEditing(!editing)}>
                <Pencil size={16} /> {editing ? 'Am terminat' : 'Modifică acest text'}
              </button>
              <button className="vc-ghost" disabled={regens === 0} onClick={() => setRegens(regens - 1)}
                style={regens === 0 ? { opacity: .5, cursor: 'not-allowed' } : undefined}>
                <RefreshCw size={16} /> Altă variantă
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#767686', margin: '12px 0 0', lineHeight: 1.55 }}>
              {regens > 0
                ? `Mai ai ${regens} ${regens === 1 ? 'variantă gratuită' : 'variante gratuite'} de versuri.`
                : 'Ai folosit variantele gratuite — dar poți modifica textul direct, oricât vrei.'}
            </p>
            <div className="vc-nav" ref={navRef}>
              <button className="vc-back" onClick={() => { setScreen('wizard'); setStep(5); }} aria-label="Înapoi"><ArrowLeft size={19} /></button>
              <button className="vc-next" onClick={() => setScreen('making')}><Check size={18} /> Aprobă și înregistrează</button>
            </div>
          </div>
          <Footer onOpen={openLegal} onJump={setScreen} />
        </div>
        {showBar && (
          <div className="vc-bar"><div className="vc-barIn">
            <button className="vc-back" onClick={() => { setScreen('wizard'); setStep(5); }} aria-label="Înapoi"><ArrowLeft size={19} /></button>
            <button className="vc-next" onClick={() => setScreen('making')}><Check size={18} /> Aprobă și înregistrează</button>
          </div></div>
        )}
      </div>
    );
  }

  /* ────────── formular ────────── */
  return (
    <div className="vc">
      <style>{CSS}</style>

      <div className="vc-head"><div className="vc-headIn">
        <span className="vc-mark">VOCAL</span>
        <span className="vc-headNote">Pasul {step + 1} din 6</span>
      </div></div>

      <div className="vc-wrap" ref={top} data-bar={showBar ? '1' : '0'}>
        <div className="vc-hero">
          <p className="vc-heroEyebrow">Melodii 100% personalizate</p>
          <h1 className="vc-heroTitle">Transformă povestea voastră într-o melodie de neuitat.</h1>
          <p className="vc-heroText">
            Spune-ne povestea voastră. Noi scriem versurile, le dăm viață pe note muzicale,
            iar tu dăruiești o melodie creată exclusiv pentru omul drag ție.
          </p>
          <div className="vc-perks">
            {PERKS.map(({ Icon, text }) => (
              <div className="vc-perk" key={text}>
                <span className="vc-perkIcon"><Icon size={17} /></span>
                <p className="vc-perkText">{text}</p>
              </div>
            ))}
          </div>
        </div>

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
                    <b>Un detaliu mic creează cea mai mare emoție.</b> „Cafeaua pregătită în diminețile aglomerate"
                    spune mult mai multe într-o piesă decât un simplu „îți mulțumesc pentru tot".
                  </p>
                )}
              </Module>

              {d.mode === 'ai' && (
                <Module icon={Sparkles} title="Nu știi de unde să începi?" text="Alege o direcție și îți completăm un început, pe care îl poți schimba.">
                  <div className="vc-opts" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
                    {INSPIRATION.map((i) => (
                      <button key={i.label} className="vc-opt" onClick={() => set('story', i.text)}>
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

        <Footer onOpen={openLegal} onJump={setScreen} />
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
