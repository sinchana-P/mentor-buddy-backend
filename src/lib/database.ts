import 'dotenv/config'; // Load environment variables first
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema.ts';

// Database connection - use environment variable directly to avoid config loading issues
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mentor_buddy';

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Parse connection URL for debugging
console.log('🔗 Connecting to database:', connectionString.replace(/:[^:@]*@/, ':***@'));

// Lazy database connection - only create when needed
let _client: postgres.Sql | null = null;
let _db: any | null = null;

const createClient = () => {
  if (!_client) {
    console.log('🔄 Creating database client...');
    _client = postgres(connectionString, {
      prepare: false,
      max: 2, // Allow 2 connections
      ssl: { rejectUnauthorized: false },
      connect_timeout: 10, // 10 second timeout
      idle_timeout: 30, // 30 second idle timeout
      max_lifetime: 600, // 10 minute max lifetime
      fetch_types: false,
      transform: {
        undefined: null,
      },
      onnotice: () => {}, // Suppress notices
      connection: {
        application_name: 'mentor-buddy-backend'
      },
      debug: false
    });
  }
  return _client;
};

const createDb = () => {
  if (!_db) {
    _db = drizzle(createClient(), { schema });
  }
  return _db;
};

// Export lazy getters
export const getClient = () => createClient();
export const getDb = () => createDb();

// For backward compatibility, create getters that only initialize when accessed
export const client = new Proxy({} as postgres.Sql, {
  get(target, prop) {
    return createClient()[prop as keyof postgres.Sql];
  }
});

export const db = new Proxy({} as any, {
  get(target, prop) {
    return createDb()[prop];
  }
});

// Test database connection
export async function testConnection() {
  try {
    console.log('Testing database connection with config:', {
      host: connectionString.split('@')[1]?.split(':')[0],
      port: connectionString.split(':')[2]?.split('/')[0],
      ssl: 'enabled',
      nodeEnv: process.env.NODE_ENV
    });
    
    const result = await createClient()`SELECT 1 as test`;
    console.log('✅ Database connection successful, result:', result);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      port: error.port,
      address: error.address
    });
    
    return false;
  }
}