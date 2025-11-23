import { db } from '../src/lib/database.js';
import { users, mentors } from '../src/shared/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('=== Resetting Mentor Passwords ===\n');

  const newPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Get all mentors with their user info
  const allMentors = await db
    .select({
      mentorId: mentors.id,
      userId: mentors.userId,
    })
    .from(mentors);

  console.log(`Found ${allMentors.length} mentors\n`);

  for (const mentor of allMentors) {
    // Get user details
    const userDetails = await db
      .select()
      .from(users)
      .where(eq(users.id, mentor.userId))
      .limit(1);

    if (userDetails.length > 0) {
      const user = userDetails[0];

      // Update password
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));

      console.log(`✅ Reset password for: ${user.email} (${user.name})`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`All mentor passwords set to: ${newPassword}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
