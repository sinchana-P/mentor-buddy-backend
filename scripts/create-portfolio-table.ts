import { db } from '../src/lib/database.ts';
import { sql } from 'drizzle-orm';

async function createPortfolioTable() {
  try {
    console.log('Creating portfolio table...');

    // Create the portfolio table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portfolio (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buddy_id UUID NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        technologies JSONB DEFAULT '[]'::jsonb,
        links JSONB DEFAULT '[]'::jsonb NOT NULL,
        resource_url TEXT,
        resource_type TEXT,
        resource_name TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✓ Portfolio table created successfully!');
  } catch (error) {
    console.error('Error creating portfolio table:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createPortfolioTable();
