import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.ts';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mentor_buddy';

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('🔗 Connecting to database:', connectionString.replace(/:[^:@]*@/, ':***@'));

// Lazy connection - only create when first used
let _client: postgres.Sql | null = null;
let _db: any | null = null;

function getClient() {
  if (!_client) {
    console.log('🔄 Creating database client (lazy)...');
    _client = postgres(connectionString, {
      prepare: false,
      max: 10, // Increased from 1 to 10 to handle concurrent requests
      ssl: connectionString.includes('supabase.com') ? 'require' : false,
      connect_timeout: 30,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      fetch_types: false,
      transform: { undefined: null },
      onnotice: () => {},
      connection: {
        application_name: 'mentor-buddy-backend'
      },
      debug: process.env.NODE_ENV === 'development'
    });
  }
  return _client;
}

function getDb() {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

// Export getters that create connection only when accessed
export const db = new Proxy({} as any, {
  get(_, prop) {
    return getDb()[prop];
  }
});

export const client = new Proxy({} as postgres.Sql, {
  get(_, prop) {
    return getClient()[prop as keyof postgres.Sql];
  }
});

// Test database connection with timeout
export async function testConnection() {
  return new Promise<boolean>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.error('❌ Database connection timeout after 5 seconds');
      resolve(false);
    }, 5000);

    (async () => {
      try {
        console.log('Testing database connection with config:', {
          host: connectionString.split('@')[1]?.split(':')[0],
          port: connectionString.split(':')[2]?.split('/')[0],
          ssl: 'enabled',
          nodeEnv: process.env.NODE_ENV
        });
        
        const result = await getClient()`SELECT 1 as test`;
        clearTimeout(timeoutId);
        console.log('✅ Database connection successful, result:', result);
        resolve(true);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Database connection failed:', {
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          hostname: error.hostname,
          port: error.port,
          address: error.address
        });
        
        resolve(false);
      }
    })();
  });
}