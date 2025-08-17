import 'dotenv/config'; // Load environment variables first
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/index.ts';
import * as schema from '../shared/schema.ts';

// Database connection
const connectionString = config.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Parse connection URL for debugging
console.log('🔗 Connecting to database:', connectionString.replace(/:[^:@]*@/, ':***@'));

// Create postgres client with SSL configuration for Supabase
export const client = postgres(connectionString, {
  prepare: false,
  max: 1, // Reduce connection pool size
  ssl: 'require', // Always require SSL for Supabase connections
  connect_timeout: 30, // Reduce timeout to 30 seconds
  idle_timeout: 0, // Disable idle timeout
  max_lifetime: 0, // Disable max lifetime
  fetch_types: false, // Disable type fetching for performance
  transform: {
    undefined: null,
  },
  onnotice: () => {}, // Suppress notices
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