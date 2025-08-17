import 'dotenv/config'; // Load environment variables first
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/index.js';
import * as schema from '../shared/schema.js';

// Database connection
let connectionString = config.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Parse connection URL for debugging
console.log('🔗 Connecting to database:', connectionString);

// Create postgres client with SSL configuration for Supabase
export const client = postgres(connectionString, {
  prepare: false,
  max: 1, // Reduce connection pool size for Render
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false, // Force SSL requirement
  connect_timeout: 60, // Increase timeout
  idle_timeout: 0, // Disable idle timeout
  max_lifetime: 0, // Disable max lifetime
  fetch_types: false, // Disable type fetching for performance
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Test database connection
export async function testConnection() {
  try {
    console.log('Testing database connection with config:', {
      host: connectionString.split('@')[1]?.split(':')[0],
      ssl: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled',
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
      port: error.port
    });
    return false;
  }
}