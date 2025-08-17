import 'dotenv/config'; // Load environment variables first
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { setDefaultResultOrder } from 'dns';
import { config } from '../config/index.js';
import * as schema from '../shared/schema.js';

// Database connection
let connectionString = config.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Force pooler mode for Render/production deployments to avoid IPv6 issues
// Check multiple conditions that indicate we're in a deployed environment
const isDeployedEnvironment = process.env.NODE_ENV === 'production' || 
                              process.env.RENDER || 
                              process.env.PORT === '10000';

if (isDeployedEnvironment) {
  console.log('🔗 Detected deployed environment, applying IPv4 pooler fix');
  console.log('🔗 NODE_ENV:', process.env.NODE_ENV);
  console.log('🔗 RENDER:', process.env.RENDER);
  console.log('🔗 PORT:', process.env.PORT);
  
  // Force IPv4 DNS resolution to avoid IPv6 connectivity issues
  setDefaultResultOrder('ipv4first');
  console.log('🔗 Set DNS to prefer IPv4 for deployment compatibility');
  
  // Use explicit pooler URL if provided, otherwise construct it
  if (config.DATABASE_POOLER_URL) {
    connectionString = config.DATABASE_POOLER_URL;
    console.log('🔗 Using explicit DATABASE_POOLER_URL');
  } else {
    // Parse the URL to extract components
    const url = new URL(connectionString);
    const host = url.hostname;
    const username = url.username;
    const password = url.password;
    const database = url.pathname.substring(1); // Remove leading slash
    
    // For Supabase, use regional pooler endpoint to bypass DNS resolution issues
    if (host.includes('supabase.co')) {
      // Extract the project reference from the original hostname
      const supabaseProject = host.split('.')[0].replace('db.', '');
      // Use the correct Supabase pooler format: postgres.{project}@aws-0-ap-southeast-1.pooler.supabase.com
      connectionString = `postgresql://postgres.${supabaseProject}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/${database}?sslmode=require`;
      console.log(`🔗 Using Supabase AP Southeast pooler (project: ${supabaseProject})`);
    } else {
      // Use IPv4-only pooler connection for other deployments
      connectionString = `postgresql://${username}:${password}@${host}:6543/${database}?sslmode=require`;
      console.log('🔗 Converted to IPv4 pooler connection');
    }
  }
  console.log('🔗 Final connection string:', connectionString.replace(/:[^:@]*@/, ':***@'));
}

// Parse connection URL for debugging
console.log('🔗 Connecting to database:', connectionString);

// Create postgres client with SSL configuration for Supabase
export const client = postgres(connectionString, {
  prepare: false,
  max: 1, // Reduce connection pool size for deployments
  ssl: isDeployedEnvironment ? 'require' : false, // Force SSL requirement for deployed environments
  connect_timeout: 60, // Increase timeout
  idle_timeout: 0, // Disable idle timeout
  max_lifetime: 0, // Disable max lifetime
  fetch_types: false, // Disable type fetching for performance
  // Additional deployment compatibility settings
  transform: {
    undefined: null,
  },
  // Force IPv4 for deployed environments
  ...(isDeployedEnvironment && {
    publications: 'supabase_realtime',
    onnotice: () => {}, // Suppress notices
    // Additional network settings for IPv4 compatibility
    target_session_attrs: 'read-write',
  }),
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Test database connection
export async function testConnection() {
  try {
    console.log('Testing database connection with config:', {
      host: connectionString.split('@')[1]?.split(':')[0],
      port: connectionString.split(':')[2]?.split('/')[0],
      ssl: isDeployedEnvironment ? 'enabled' : 'disabled',
      nodeEnv: process.env.NODE_ENV,
      isDeployedEnvironment
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
    
    // If this is an IPv6 connectivity error, suggest troubleshooting
    if (error.code === 'ENETUNREACH' && error.address?.includes(':')) {
      console.error('🚨 IPv6 connectivity issue detected. Make sure DATABASE_POOLER_URL is set or NODE_ENV=production');
    }
    
    return false;
  }
}