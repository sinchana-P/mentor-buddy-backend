import { db } from '../lib/database.ts';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('🔄 Running authentication fields migration...');
    
    // Add password column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';
    `);
    
    // Add is_active column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);
    
    // Add last_login_at column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);
    
    // Update any existing users to have a default password (they'll need to reset)
    await db.execute(sql`
      UPDATE users 
      SET password = '$2b$12$default.password.hash.that.wont.match.anything'
      WHERE password = '' OR password IS NULL;
    `);
    
    // Add indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added columns: password, is_active, last_login_at');
    console.log('📊 Added indexes for email, is_active, and role');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('🎉 Database migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database migration failed:', error);
    process.exit(1);
  });