// Environment configuration
export const config = {
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mentor_buddy',
  
  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-this-in-production',
  
  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || (
    process.env.NODE_ENV === 'production' 
      ? ['https://mentor-buddy.vercel.app', 'https://mentor-buddy-panel.vercel.app', 'https://mentor-buddy-ui.vercel.app']
      : ['http://localhost:5173', 'http://localhost:3000', 'https://mentor-buddy.vercel.app']
  ),
  
  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
};