import { Request, Response } from 'express';
import { z } from 'zod';
// import { storage } from '../lib/storage.ts'; // Temporarily comment out to test
import { generateToken } from '../lib/jwt.ts';
import { hashPassword, comparePassword, validatePasswordStrength } from '../lib/password.ts';
import { tokenBlacklist } from '../lib/tokenBlacklist.ts';
import { type DomainRole, type InsertUser } from '../shared/schema.ts';
import { ROLE_PERMISSIONS } from '../config/permissions.ts';

// Use real database storage for authentication
// const userStorage = storage; // Temporarily comment out to test

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['manager', 'mentor', 'buddy']).default('buddy'),
  domainRole: z.enum(['frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr'])
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Helper function to create user response (without password)
const createUserResponse = (user: any, permissions: string[]) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  domainRole: user.domainRole,
  avatarUrl: user.avatarUrl,
  isActive: user.isActive,
  permissions: permissions,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const login = async (req: Request, res: Response) => {
  console.log('[AUTH] Login endpoint reached');
  try {
    console.log('[POST /api/auth/login] Login attempt for:', req.body?.email || 'undefined');
    
    const { email, password } = loginSchema.parse(req.body);
    
    // Use Supabase REST API directly to avoid database connection issues
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[AUTH] Missing Supabase configuration');
      return res.status(500).json({ message: "Server configuration error" });
    }
    
    try {
      // Query users table via Supabase REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${email}&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('[AUTH] Supabase query failed:', response.status);
        return res.status(500).json({ message: "Database query failed" });
      }
      
      const users = await response.json();
      const user = users[0];
      
      if (!user) {
        console.log('[POST /api/auth/login] User not found:', email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.is_active) {
        console.log('[POST /api/auth/login] User account is inactive:', email);
        return res.status(401).json({ message: "Account is inactive. Please contact administrator." });
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        console.log('[POST /api/auth/login] Invalid password for:', email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Get permissions based on user role
      const userRole = user.role as 'manager' | 'mentor' | 'buddy';
      const permissions = ROLE_PERMISSIONS[userRole] ? [...ROLE_PERMISSIONS[userRole]] : [];

      // Generate JWT token with permissions
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: userRole,
        domainRole: user.domain_role,
        permissions
      });

      console.log('[POST /api/auth/login] Login successful for:', email, 'Role:', user.role, 'Permissions:', permissions.length);

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          domainRole: user.domain_role,
          avatarUrl: user.avatar_url,
          isActive: user.is_active,
          permissions: permissions,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        }
      });
    } catch (apiError) {
      console.error('[AUTH] Supabase API error:', apiError);
      return res.status(500).json({ message: "Authentication service unavailable" });
    }
  } catch (error) {
    console.error('[POST /api/auth/login] Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid input", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/auth/register] Registration attempt for:', req.body.email);
    
    const { email, password, name, role, domainRole } = registerSchema.parse(req.body);
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: "Password does not meet requirements",
        errors: passwordValidation.errors
      });
    }
    
    // Use Supabase REST API directly to avoid database connection issues
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[AUTH] Missing Supabase configuration');
      return res.status(500).json({ message: "Server configuration error" });
    }
    
    try {
      // Check if user already exists
      const existingUserResponse = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${email}&select=id`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!existingUserResponse.ok) {
        console.error('[AUTH] Supabase query failed:', existingUserResponse.status);
        return res.status(500).json({ message: "Database query failed" });
      }
      
      const existingUsers = await existingUserResponse.json() as any[];
      if (existingUsers.length > 0) {
        console.log('[POST /api/auth/register] User already exists:', email);
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create user via Supabase REST API
      const createUserResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          email,
          name,
          password: hashedPassword,
          role,
          domain_role: domainRole,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      
      if (!createUserResponse.ok) {
        console.error('[AUTH] User creation failed:', createUserResponse.status);
        return res.status(500).json({ message: "User creation failed" });
      }
      
      const [newUser] = await createUserResponse.json() as any[];

      // Get permissions based on user role
      const userRole = newUser.role as 'manager' | 'mentor' | 'buddy';
      const permissions = ROLE_PERMISSIONS[userRole] ? [...ROLE_PERMISSIONS[userRole]] : [];

      // Generate JWT token with permissions
      const token = generateToken({
        userId: newUser.id,
        email: newUser.email,
        role: userRole,
        domainRole: newUser.domain_role,
        permissions
      });

      console.log('[POST /api/auth/register] Registration successful for:', email, 'Role:', role, 'Permissions assigned:', permissions.length);

      res.status(201).json({
        message: "Registration successful",
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          domainRole: newUser.domain_role,
          avatarUrl: newUser.avatar_url,
          isActive: newUser.is_active,
          permissions: permissions,
          lastLoginAt: newUser.last_login_at,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at
        }
      });
    } catch (apiError) {
      console.error('[AUTH] Supabase API error:', apiError);
      return res.status(500).json({ message: "Registration service unavailable" });
    }
  } catch (error) {
    console.error('[POST /api/auth/register] Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid input", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // User is set by authenticateToken middleware
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log('[GET /api/auth/me] Getting current user:', req.user.userId);

    // Fetch full user data from database
    const { storage } = await import('../lib/storage.ts');
    const userFromDb = await storage.getUser(req.user.userId);

    if (!userFromDb) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get permissions based on user role
    const userRole = req.user.role as 'manager' | 'mentor' | 'buddy';
    const permissions = ROLE_PERMISSIONS[userRole] ? [...ROLE_PERMISSIONS[userRole]] : [];

    // Fetch profile ID for mentors and buddies
    let profileId: string | undefined;
    if (userRole === 'mentor') {
      console.log('[GET /api/auth/me] Fetching mentor for email:', req.user.email);
      const mentor = await storage.getMentors({ search: req.user.email });
      console.log('[GET /api/auth/me] Mentor found:', mentor && mentor.length > 0 ? mentor[0].id : 'none');
      if (mentor && mentor.length > 0) {
        profileId = mentor[0].id;
      }
    } else if (userRole === 'buddy') {
      console.log('[GET /api/auth/me] Fetching buddy for email:', req.user.email);
      const buddies = await storage.getAllBuddies({ search: req.user.email });
      console.log('[GET /api/auth/me] Buddy found:', buddies && buddies.length > 0 ? buddies[0].id : 'none');
      if (buddies && buddies.length > 0) {
        profileId = buddies[0].id;
      }
    }

    console.log('[GET /api/auth/me] Final profileId:', profileId);

    // Return user data with name from database
    res.json({
      message: "User retrieved successfully",
      user: {
        id: userFromDb.id,
        name: userFromDb.name,
        email: userFromDb.email,
        role: userFromDb.role,
        domainRole: userFromDb.domainRole,
        avatarUrl: userFromDb.avatarUrl,
        isActive: userFromDb.isActive,
        lastLoginAt: userFromDb.lastLoginAt,
        createdAt: userFromDb.createdAt,
        updatedAt: userFromDb.updatedAt,
        permissions: permissions,
        profileId: profileId // mentor ID or buddy ID
      }
    });
  } catch (error) {
    console.error('[GET /api/auth/me] Get current user error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/auth/change-password] Change password request');
    console.log('[POST /api/auth/change-password] req.user:', JSON.stringify(req.user, null, 2));
    
    // Get user from middleware - check both id and userId fields  
    const userId = req.user?.id || req.user?.userId;
    console.log('[POST /api/auth/change-password] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - no userId found" });
    }

    // Validate request body
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    // Import storage here to avoid circular dependencies
    const { storage } = await import('../lib/storage.ts');

    // Get user with password for verification
    const user = await storage.getUserByEmailWithPassword(req.user!.email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password!);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(newPassword);
    if (!passwordStrength.isValid) {
      return res.status(400).json({ 
        message: "Password does not meet requirements", 
        requirements: passwordStrength.requirements 
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    await storage.updateUser(userId, { 
      password: hashedNewPassword,
      updatedAt: new Date()
    });

    console.log('[POST /api/auth/change-password] Password changed successfully');
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error('[POST /api/auth/change-password] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/auth/logout] Logout request');
    
    // Get token from request (set by authenticateToken middleware)
    const token = req.token;
    
    if (token) {
      // Add token to blacklist
      tokenBlacklist.blacklistToken(token);
      console.log('[POST /api/auth/logout] Token blacklisted successfully');
    }
    
    res.json({ 
      message: "Logout successful. Token has been revoked." 
    });
  } catch (error) {
    console.error('[POST /api/auth/logout] Logout error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin-only function to update user roles
export const updateUserRole = async (req: Request, res: Response) => {
  // Temporarily disabled - database connection issues
  return res.status(503).json({ message: "Role update temporarily unavailable" });
};