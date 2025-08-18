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

// Create postgres client with optimized configuration for Supabase
export const client = postgres(connectionString, {
  prepare: false,
  max: 1, // Single connection to avoid connection issues
  ssl: { rejectUnauthorized: false }, // More permissive SSL for development
  connect_timeout: 5, // Shorter connect timeout
  idle_timeout: 20, // Shorter idle timeout
  max_lifetime: 300, // 5 minute max lifetime
  fetch_types: false, // Disable type fetching for performance
  transform: {
    undefined: null,
  },
  onnotice: () => {}, // Suppress notices
  connection: {
    application_name: 'mentor-buddy-backend'
  },
  debug: false // Disable debug output
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Test database connection
export async function testConnection() {
  try {
    console.log('Testing database connection with config:', {
      host: connectionString.split('@')[1]?.split(':')[0],
      port: connectionString.split(':')[2]?.split('/')[0],
      ssl: 'enabled',
      nodeEnv: process.env.NODE_ENV
    });
    
    const result = await client`SELECT 1 as test`;
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