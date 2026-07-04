import 'reflect-metadata';
import { AppDataSource } from '../data-source';

/**
 * One-off: wipes the entire schema (DROP SCHEMA CASCADE) so migrations and
 * the reference seed can run against a clean slate. Only ever intended to
 * be wired into a build command temporarily — never left in permanently,
 * since this is destructive and would erase real data on a live database.
 */
async function main() {
  // Safety guard: this issues Postgres-only syntax and is only ever meant
  // to run against a disposable/pre-launch database — never the local
  // sqlite dev db, which has no DB_TYPE=postgres set.
  if ((process.env.DB_TYPE ?? 'postgres') !== 'postgres') {
    throw new Error('db:reset only runs with DB_TYPE=postgres — refusing to run against sqlite.');
  }

  await AppDataSource.initialize();
  await AppDataSource.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await AppDataSource.destroy();
  console.log('Schema reset complete.');
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
