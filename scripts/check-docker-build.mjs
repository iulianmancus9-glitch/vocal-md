/**
 * Verifică exact ce nu se vede când construiești local: că `next build` trece
 * fără nicio variabilă de mediu.
 *
 *   node scripts/check-docker-build.mjs
 *
 * Imaginea Docker se construiește înainte să existe vreun .env — cheile vin abia
 * la pornire. Dacă un modul citește configurarea la import, build-ul local trece
 * (pentru că ai variabilele în shell) și cel din Docker cade. Asta s-a și
 * întâmplat o dată; de aia există scriptul.
 */
import { spawnSync } from 'node:child_process';

const STRIP = [
  'APP_SECRET', 'DATABASE_URL', 'APP_URL', 'STORAGE_DIR',
  'OPENROUTER_API_KEY', 'GEMINI_MODEL', 'GEMINI_TEMPERATURE',
  'SUNO_API_KEY', 'SUNO_MODEL', 'SUNO_CALLBACK_URL',
  'PADDLE_API_KEY', 'PADDLE_CLIENT_TOKEN', 'PADDLE_PRICE_ID', 'PADDLE_WEBHOOK_SECRET',
  'RESEND_API_KEY', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB',
];

const env = { ...process.env };
for (const key of STRIP) delete env[key];
env.NEXT_TELEMETRY_DISABLED = '1';

console.log(`Construiesc fără ${STRIP.length} variabile de mediu, ca în Docker...\n`);

const res = spawnSync('npx', ['next', 'build'], { env, stdio: 'inherit', shell: false });

if (res.status !== 0) {
  console.error(
    '\n✗ Build-ul cade fără variabile de mediu, deci ar cădea și în Docker.\n' +
    '  Caută un modul care citește `env.CEVA` la încărcare, nu în interiorul unei funcții.\n',
  );
  process.exit(1);
}

console.log('\n✓ Build-ul trece fără variabile de mediu. Docker ar reuși.\n');
