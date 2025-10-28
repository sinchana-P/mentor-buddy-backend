import { db } from '../lib/database.ts';
import { sql } from 'drizzle-orm';

/**
 * Simple migration: Clear data and update schema
 * WARNING: This will delete all buddy topics data!
 */
async function migrateSimple() {
  try {
    console.log('🔄 Starting simple schema migration...');
    console.log('⚠️  WARNING: This will delete all buddy topics data!');

    // Step 1: Drop buddy_topic_progress table
    console.log('🗑️  Dropping buddy_topic_progress table...');
    await db.execute(sql`DROP TABLE IF EXISTS buddy_topic_progress CASCADE;`);
    console.log('✅ buddy_topic_progress dropped');

    // Step 2: Clear buddy_topics table
    console.log('🗑️  Clearing buddy_topics table...');
    await db.execute(sql`TRUNCATE TABLE buddy_topics CASCADE;`);
    console.log('✅ buddy_topics cleared');

    // Step 3: Drop old columns from buddy_topics
    console.log('🗑️  Removing old columns from buddy_topics...');
    await db.execute(sql`ALTER TABLE buddy_topics DROP COLUMN IF EXISTS topic_name CASCADE;`);
    await db.execute(sql`ALTER TABLE buddy_topics DROP COLUMN IF EXISTS category CASCADE;`);
    console.log('✅ Old columns removed');

    // Step 4: Add topic_id column if it doesn't exist
    console.log('➕ Adding topic_id column to buddy_topics...');
    await db.execute(sql`
      ALTER TABLE buddy_topics
      ADD COLUMN IF NOT EXISTS topic_id UUID;
    `);
    console.log('✅ topic_id column added');

    // Step 5: Add foreign key constraint
    console.log('🔗 Adding foreign key constraint...');
    await db.execute(sql`
      ALTER TABLE buddy_topics
      DROP CONSTRAINT IF EXISTS buddy_topics_topic_id_topics_id_fk;
    `);
    await db.execute(sql`
      ALTER TABLE buddy_topics
      ADD CONSTRAINT buddy_topics_topic_id_topics_id_fk
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
    `);
    console.log('✅ Foreign key constraint added');

    // Step 6: Add NOT NULL constraint
    console.log('🔒 Adding NOT NULL constraint...');
    await db.execute(sql`
      ALTER TABLE buddy_topics
      ALTER COLUMN topic_id SET NOT NULL;
    `);
    console.log('✅ NOT NULL constraint added');

    console.log('\n🎉 Schema migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run seed script: npx tsx src/scripts/seedTopics.ts');
    console.log('   2. Verify topics table has data');
    console.log('   3. Create buddies - topics will be auto-assigned');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error during migration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateSimple();
