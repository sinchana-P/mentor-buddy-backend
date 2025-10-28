import { db } from './src/lib/database.ts';
import { sql } from 'drizzle-orm';

async function createPortfolioTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS portfolios (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        buddy_id uuid NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        project_type text,
        technologies text,
        link1 text,
        link1_label text,
        link2 text,
        link2_label text,
        link3 text,
        link3_label text,
        completed_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ Portfolio table created successfully');
  } catch (error) {
    console.error('❌ Error creating portfolio table:', error);
  }
  process.exit(0);
}

createPortfolioTable();
