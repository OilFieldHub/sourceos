import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { entities } from './entities';

config();

/**
 * Local dev defaults to sql.js (file-backed, in-process — no Docker/Postgres
 * required, and no native build tools needed on Windows). Set DB_TYPE=postgres
 * to point at a real Postgres instance instead (required for Phase 10 deploy,
 * which still uses the hand-written Postgres migration).
 */
const isSqlite = (process.env.DB_TYPE ?? 'postgres') === 'sqlite';

export const dataSourceOptions: DataSourceOptions = isSqlite
  ? {
      type: 'sqljs',
      location: process.env.DB_PATH ?? './data/oilfieldhub.sqlite',
      autoSave: true,
      entities,
      synchronize: true,
      logging: process.env.NODE_ENV === 'development',
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'oilfieldhub',
      password: process.env.DB_PASSWORD ?? 'oilfieldhub',
      database: process.env.DB_DATABASE ?? 'oilfieldhub',
      entities,
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    };

export const AppDataSource = new DataSource(dataSourceOptions);
