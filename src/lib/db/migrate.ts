/**
 * Rulează migrările și iese. Pornit ca serviciu separat în docker compose,
 * înaintea web-ului și a worker-ului, ca schema să fie mereu la zi înainte
 * ca ceva să încerce să scrie în ea.
 */
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';

async function main() {
  console.log('Rulez migrările...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrări aplicate.');
  await pool.end();
}

main().catch((err) => {
  console.error('Migrarea a eșuat:', err);
  process.exit(1);
});
