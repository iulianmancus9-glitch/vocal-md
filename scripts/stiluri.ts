/**
 * Ce pleacă la Suno, pentru fiecare stil.
 *
 *     npm run stiluri
 *
 * Nu atinge nimic: doar citește tabelele din `src/lib/pipeline/stiluri.ts` și
 * construiește șirurile exact cum le construiește aplicația la o comandă
 * adevărată. Rulează-l înainte și după ce schimbi ceva, ca să vezi diferența
 * fără să arzi credite pe o generare.
 *
 * La final verifică și potrivirile: o stare oferită în formular dar netradusă
 * dispare în tăcere din prompt, iar melodia iese altfel decât a cerut omul.
 */
import { LIMBI, OPTIONS, STARI, STILURI, SUB_STILURI, VOCI_LISTA } from '@/lib/pipeline/stiluri';
import { buildStyle } from '@/lib/pipeline/prompt';
import type { SongBrief } from '@/lib/pipeline/types';

const brief = (over: Partial<SongBrief>): SongBrief => ({
  stil: 'Pop', voce: 'Femeie', destinatar: 'Soție', nume: ['Maria'],
  ocazie: 'Zi de naștere', limba: 'Română', poveste: '', ...over,
});

const B = (s: string) => `\x1b[1m${s}\x1b[0m`;
const DIM = (s: string) => `\x1b[2m${s}\x1b[0m`;

console.log();
console.log(B('CE PLEACĂ LA SUNO, PE STILURI'));
console.log(DIM('Exemplul folosește prima direcție și prima stare din fiecare stil,'));
console.log(DIM('voce de femeie și limba română. Ordinea bucăților o dă buildStyle().'));
console.log();

for (const s of STILURI) {
  const sub = s.sub[0];
  const stare = s.stari[0];
  console.log(`${B(s.nume.toUpperCase())}  ${DIM('(' + s.id + ')')}`);
  console.log(`  fragmentul stilului : ${s.suno}`);
  console.log(`  direcții            : ${s.sub.join(' · ')}`);
  console.log(`  stări               : ${s.stari.map((m) => `${m}→${STARI[m] ?? '???'}`).join(' · ')}`);
  console.log(`  ${B('exemplu complet')}     : ${buildStyle(brief({ stil: s.nume, directie: sub, stare }))}`);
  console.log();
}

console.log(B('LIMBILE'));
for (const [ro, en] of Object.entries(LIMBI)) console.log(`  ${ro.padEnd(10)} → ${en}`);
console.log();
console.log(B('VOCEA'));
console.log(`  ${VOCI_LISTA.join(' · ')}  →  „female vocals" / „male vocals", plus vocalGender la Suno`);
console.log();

/* ─── potrivirile ─── */

console.log(B('VERIFICĂRI'));
const probleme: string[] = [];

for (const s of STILURI) {
  if (!s.suno.trim()) probleme.push(`stilul „${s.nume}" nu are fragment pentru Suno`);
  if (!s.sub.length) probleme.push(`stilul „${s.nume}" nu are nicio direcție`);
  for (const m of s.stari) {
    if (!STARI[m]) probleme.push(`starea „${m}" (la ${s.nume}) nu e tradusă în STARI — dispare din prompt`);
  }
}
const folositeStari = new Set(STILURI.flatMap((s) => s.stari));
for (const m of Object.keys(STARI)) {
  if (!folositeStari.has(m)) probleme.push(`starea „${m}" e tradusă, dar n-o oferă niciun stil`);
}
if (Object.keys(OPTIONS).length !== STILURI.length) probleme.push('OPTIONS și STILURI nu au același număr de stiluri');

const subFolosite = [...new Set(STILURI.flatMap((s) => s.sub))];
const subNetraduse = subFolosite.filter((x) => !SUB_STILURI[x]);

console.log(probleme.length
  ? probleme.map((p) => `  ✗ ${p}`).join('\n')
  : '  ✓ stiluri, direcții și stări — toate se potrivesc');

console.log();
console.log(B('DE ȘTIUT'));
console.log(`  Direcțiile pleacă la Suno ${B('în română')}, așa cum le alege omul:`);
console.log(DIM(`    ex. „${subFolosite[0]}", „${subFolosite.find((x) => x.includes(' ')) ?? subFolosite[1]}"`));
console.log(`  Traducerile lor există deja în SUB_STILURI (${subFolosite.length - subNetraduse.length}/${subFolosite.length} gata),`);
console.log('  dar nu sunt folosite. Vezi comentariul de deasupra lor în stiluri.ts.');
console.log();
