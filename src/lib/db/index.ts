import { Kysely, PostgresDialect, Selectable, Insertable, Updateable } from 'kysely';
import { Pool } from 'pg';
import type { DB } from './generated-types';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create the Kysely instance with generated types
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Export types for use in application
export type { DB } from './generated-types';

// Utility types for table rows
export type SelectableTable<T extends keyof DB> = Selectable<DB[T]>;
export type InsertableTable<T extends keyof DB> = Insertable<DB[T]>;
export type UpdateableTable<T extends keyof DB> = Updateable<DB[T]>;