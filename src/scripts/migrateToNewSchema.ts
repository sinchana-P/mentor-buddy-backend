import { db } from '../lib/database.ts';
import { sql } from 'drizzle-orm';

/**
 * Migrate from old schema (buddyTopicProgress) to new schema (buddyTopics with topicId)
 */
async function migrateSchema() {
  try {
    console.log('🔄 Starting schema migration...');

    // Step 1: Check if buddy_topic_progress table exists
    const tableCheckResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'buddy_topic_progress'
      );
    `);

    const buddyTopicProgressExists = tableCheckResult?.[0]?.exists || false;
    console.log(`📊 buddy_topic_progress table exists: ${buddyTopicProgressExists}`);

    // Step 2: Check if buddy_topics needs migration (has topicName column)
    const buddyTopicsColumnsResult = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'buddy_topics'
      ORDER BY ordinal_position;
    `);

    const columns = Array.isArray(buddyTopicsColumnsResult) ? buddyTopicsColumnsResult : [];
    const hasTopicName = columns.some((col: any) => col.column_name === 'topic_name');
    const hasTopicId = columns.some((col: any) => col.column_name === 'topic_id');

    console.log(`📊 buddy_topics has topic_name column: ${hasTopicName}`);
    console.log(`📊 buddy_topics has topic_id column: ${hasTopicId}`);

    // Step 3: If buddy_topics has topicName, we need to migrate it
    if (hasTopicName && !hasTopicId) {
      console.log('⚠️  buddy_topics table needs migration from topic_name to topic_id');
      console.log('❌ Automatic migration not safe - topics table may not have all topics yet');
      console.log('📝 Recommended: Backup buddy_topics data, then:');
      console.log('   1. Run seed script to populate topics table');
      console.log('   2. Manually map topic names to topic IDs');
      console.log('   3. Update buddy_topics');
      console.log('');
      console.log('   Or clear buddy_topics and let buddies be recreated with new topics');
      process.exit(1);
    }

    // Step 4: Drop buddy_topic_progress table if it exists
    if (buddyTopicProgressExists) {
      console.log('🗑️  Dropping buddy_topic_progress table...');
      await db.execute(sql`DROP TABLE IF EXISTS buddy_topic_progress CASCADE;`);
      console.log('✅ buddy_topic_progress table dropped');
    }

    // Step 5: Ensure buddy_topics has the correct structure
    if (!hasTopicId) {
      console.log('➕ Adding topic_id column to buddy_topics...');
      await db.execute(sql`
        ALTER TABLE buddy_topics
        ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;
      `);
      console.log('✅ topic_id column added');
    }

    // Step 6: Drop topic_name and category columns if they exist
    if (hasTopicName) {
      console.log('🗑️  Removing old columns from buddy_topics...');
      await db.execute(sql`ALTER TABLE buddy_topics DROP COLUMN IF EXISTS topic_name CASCADE;`);
      await db.execute(sql`ALTER TABLE buddy_topics DROP COLUMN IF EXISTS category CASCADE;`);
      console.log('✅ Old columns removed');
    }

    // Step 7: Add NOT NULL constraint to topic_id if needed
    console.log('🔒 Adding NOT NULL constraint to topic_id...');
    await db.execute(sql`
      ALTER TABLE buddy_topics
      ALTER COLUMN topic_id SET NOT NULL;
    `);
    console.log('✅ Constraint added');

    console.log('\n🎉 Schema migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run seed script: npm run seed:topics');
    console.log('   2. Verify topics table has data');
    console.log('   3. Test buddy creation with new topics system');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error during migration:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateSchema();
