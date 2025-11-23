import { db } from '../src/lib/database.js';
import { buddies, users, buddyCurriculums } from '../src/shared/schema.js';
import { eq } from 'drizzle-orm';
import { autoAssignCurriculum } from '../src/lib/autoAssignment.js';

async function main() {
  console.log('=== Assigning Curricula to Existing Buddies ===\n');

  // Get all buddies with their user info
  const allBuddies = await db
    .select({
      buddyId: buddies.id,
      userId: buddies.userId,
      userName: users.name,
      domainRole: users.domainRole,
    })
    .from(buddies)
    .innerJoin(users, eq(buddies.userId, users.id));

  console.log(`Found ${allBuddies.length} buddies\n`);

  let assignedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const buddy of allBuddies) {
    console.log(`Processing: ${buddy.userName} (${buddy.domainRole})`);

    // Check if buddy already has a curriculum assigned
    const existingEnrollment = await db
      .select()
      .from(buddyCurriculums)
      .where(eq(buddyCurriculums.buddyId, buddy.buddyId))
      .limit(1);

    if (existingEnrollment.length > 0) {
      console.log(`  ⏭️  Already enrolled in a curriculum, skipping\n`);
      skippedCount++;
      continue;
    }

    // Auto-assign curriculum based on domain role
    const result = await autoAssignCurriculum(buddy.buddyId, buddy.domainRole);

    if (result.success) {
      console.log(`  ✅ Assigned: ${result.curriculum?.name}`);
      console.log(`     Weeks: ${result.curriculum?.totalWeeks}, Tasks: ${result.totalTasks}\n`);
      assignedCount++;
    } else {
      console.log(`  ❌ Failed: ${result.message}\n`);
      failedCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Assigned: ${assignedCount}`);
  console.log(`Skipped (already enrolled): ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total: ${allBuddies.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
