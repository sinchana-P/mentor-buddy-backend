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
  ssl: { rejectUnauthorized: false }, // Accept self-signed certificates for Supabase
  connection: {
    application_name: 'mentor-buddy-backend',
  },
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Test database connection
export async function testConnection() {
  try {
    await client`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}