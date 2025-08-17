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
  max: 10,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connection: {
    application_name: 'mentor-buddy-backend',
  },
  connect_timeout: 30, // 30 second timeout
  idle_timeout: 20,
  max_lifetime: 60 * 30, // 30 minutes
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