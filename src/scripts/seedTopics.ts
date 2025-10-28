import { db } from '../lib/database.ts';
import { topics } from '../shared/schema.ts';
import { getAllDefaultTopics } from '../config/defaultTopics.ts';
import { eq } from 'drizzle-orm';

/**
 * Seed the topics table with default topics for all domain roles
 */
async function seedTopics() {
  try {
    console.log('🌱 Starting topics seed...');

    // Get all default topics
    const defaultTopics = getAllDefaultTopics();
    console.log(`📋 Found ${defaultTopics.length} default topics to seed`);

    // Check how many topics already exist
    const existingTopics = await db.select().from(topics);
    console.log(`📊 Existing topics in database: ${existingTopics.length}`);

    if (existingTopics.length > 0) {
      console.log('⚠️  Topics table is not empty. Do you want to:');
      console.log('   1. Skip seeding (current data preserved)');
      console.log('   2. Merge new topics (add only missing topics)');
      console.log('   3. Replace all topics (WARNING: will affect existing buddy progress)');
      console.log('');
      console.log('💡 Recommended: Option 2 (Merge)');
      console.log('');
      console.log('ℹ️  For now, performing merge operation...');

      // Merge operation - add only topics that don't exist
      let addedCount = 0;

      for (const topic of defaultTopics) {
        // Check if topic already exists (by name and domainRole)
        const existing = existingTopics.find(
          t => t.name === topic.name && t.domainRole === topic.domainRole
        );

        if (!existing) {
          await db.insert(topics).values({
            name: topic.name,
            category: topic.category,
            domainRole: topic.domainRole
          });
          addedCount++;
        }
      }

      console.log(`✅ Added ${addedCount} new topics`);
      console.log(`📊 Total topics now: ${existingTopics.length + addedCount}`);
    } else {
      // Fresh insert - table is empty
      await db.insert(topics).values(
        defaultTopics.map(topic => ({
          name: topic.name,
          category: topic.category,
          domainRole: topic.domainRole
        }))
      );

      console.log(`✅ Successfully seeded ${defaultTopics.length} topics`);
    }

    // Show summary by domain
    const allTopics = await db.select().from(topics);
    const byDomain = allTopics.reduce((acc, topic) => {
      acc[topic.domainRole] = (acc[topic.domainRole] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Topics by domain:');
    Object.entries(byDomain).forEach(([domain, count]) => {
      console.log(`   ${domain}: ${count} topics`);
    });

    console.log('\n🎉 Topics seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding topics:', error);
    process.exit(1);
  }
}

// Run the seed function
seedTopics();
