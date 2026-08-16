import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    const connectionString =
      'postgresql://ticketmaster:ticketmaster_password@localhost:5432/ticketmaster?schema=public'; // process.env.DATABASE_URL;

    this.pool = new Pool({
      connectionString,
    });
    this.db = drizzle(this.pool, { schema });

    console.log('[DatabaseService] Connected to the database');
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('[DatabaseService] Database connection closed');
  }

  get schema() {
    return schema;
  }
}
