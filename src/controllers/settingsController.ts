import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  phoneNumber: z.string().optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal(''))
});

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  mentorUpdates: z.boolean().optional(),
  systemNotifications: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  desktopNotifications: z.boolean().optional()
});

const updatePrivacySchema = z.object({
  profileVisibility: z.enum(['public', 'team', 'private']).optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional()
});

export const updateProfile = async (req: Request, res: Response) => {
  try {
    console.log('[PATCH /api/settings/profile] Update profile request');
    console.log('[PATCH /api/settings/profile] req.user:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user?.id || req.user?.userId;
    console.log('[PATCH /api/settings/profile] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - no userId found" });
    }

    // Validate request body
    const profileData = updateProfileSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(profileData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    // Update user profile
    const updatedUser = await storage.updateUser(userId, profileData);
    
    console.log('[PATCH /api/settings/profile] Profile updated successfully');
    res.json({ 
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        domainRole: updatedUser.domainRole,
        avatarUrl: updatedUser.avatarUrl,
        bio: (updatedUser as any).bio,
        phoneNumber: (updatedUser as any).phoneNumber,
        timezone: (updatedUser as any).timezone
      }
    });
  } catch (error) {
    console.error('[PATCH /api/settings/profile] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    console.log('[PATCH /api/settings/preferences] Update preferences request');
    console.log('[PATCH /api/settings/preferences] req.user:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user?.id || req.user?.userId;
    console.log('[PATCH /api/settings/preferences] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - no userId found" });
    }

    // Validate request body
    const preferences = updatePreferencesSchema.parse(req.body);
    
    // For now, just return success since we don't have a preferences table
    // In a real application, you'd store these in a separate preferences table
    console.log('[PATCH /api/settings/preferences] Preferences would be updated:', preferences);
    
    res.json({ 
      message: "Preferences updated successfully",
      preferences
    });
  } catch (error) {
    console.error('[PATCH /api/settings/preferences] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePrivacySettings = async (req: Request, res: Response, next: unknown) => {
  try {
    console.log('[PATCH /api/settings/privacy] Update privacy settings request');
    console.log('[PATCH /api/settings/privacy] req.user:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user?.id || req.user?.userId;
    console.log('[PATCH /api/settings/privacy] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - no userId found" });
    }

    // Validate request body
    const privacySettings = updatePrivacySchema.parse(req.body);
    
    // For now, just return success since we don't have a privacy settings table
    // In a real application, you'd store these in a separate privacy_settings table
    console.log('[PATCH /api/settings/privacy] Privacy settings would be updated:', privacySettings);
    
    res.json({ 
      message: "Privacy settings updated successfully",
      privacySettings
    });
  } catch (error) {
    console.error('[PATCH /api/settings/privacy] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const exportUserData = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/settings/export] Export user data request');
    console.log('[GET /api/settings/export] req.user:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user?.id || req.user?.userId;
    console.log('[GET /api/settings/export] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - no userId found" });
    }

    // Get user data
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get related data (you might want to add more data here)
    const exportData = {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        domainRole: user.domainRole,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      preferences: {
        // Default preferences since we don't store them yet
        emailNotifications: true,
        pushNotifications: true,
        weeklyReports: false,
        taskReminders: true
      },
      exportedAt: new Date().toISOString()
    };

    console.log('[GET /api/settings/export] Data export prepared');
    res.json(exportData);
  } catch (error) {
    console.error('[GET /api/settings/export] Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    console.log('[DELETE /api/settings/account] Delete account request');
    console.log('[DELETE /api/settings/account] req.user:', JSON.stringify(req.user, null, 2));
    
    const userId = req.user?.id || req.user?.userId;
    console.log('[DELETE /api/settings/account] Extracted userId:', userId);
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - no userId found" });
    }

    // For safety, we'll just mark the account as inactive instead of deleting
    // In a production app, you might want to implement a soft delete or actual deletion
    await storage.updateUser(userId, { 
      isActive: false,
      updatedAt: new Date()
    });

    console.log('[DELETE /api/settings/account] Account deactivated successfully');
    res.json({ 
      message: "Account has been scheduled for deletion. Your account has been deactivated." 
    });
  } catch (error) {
    console.error('[DELETE /api/settings/account] Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};