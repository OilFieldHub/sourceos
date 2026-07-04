import { config } from 'dotenv';

config();

/**
 * Local dev runs on sql.js (no native build tools required on Windows);
 * Postgres remains the production target (Phase 10 deploy). These helpers
 * pick the driver-appropriate column type so entities work unchanged
 * against either backend — read once at entity-definition time from
 * DB_TYPE, before any DataSource connects.
 */
export const isSqlite = (process.env.DB_TYPE ?? 'postgres') === 'sqlite';

export const timestampType = isSqlite ? 'datetime' : 'timestamptz';
export const jsonColumnType = isSqlite ? 'simple-json' : 'jsonb';
export const enumColumnType = isSqlite ? 'simple-enum' : 'enum';
export const charColumnType = isSqlite ? 'varchar' : 'char';
