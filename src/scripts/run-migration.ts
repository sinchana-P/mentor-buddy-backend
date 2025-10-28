import { db } from '../lib/database';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🚀 Running buddy_topics migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../../migrations/create_buddy_topics.sql'),
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');
    console.log('📊 buddy_topics table created');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
