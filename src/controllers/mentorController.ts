import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.js';
import { insertMentorSchema, insertUserSchema, DomainRole } from '../shared/schema.js';

// Validation schemas
const createMentorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email format"),
  domainRole: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']),
  expertise: z.string().optional().default(''),
  experience: z.string().optional().default('')
});

const updateMentorSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  domainRole: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']).optional(),
  expertise: z.string().optional(),
  experience: z.string().optional(),
  isActive: z.boolean().optional()
});

const getMentorsQuerySchema = z.object({
  domain: z.string().optional(),
  search: z.string().optional()
});

const getMentorBuddiesQuerySchema = z.object({
  status: z.string().optional()
});

export const getAllMentors = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/mentors] Fetching all mentors...');
    
    // Validate query parameters
    const { domain, search } = getMentorsQuerySchema.parse(req.query);
    
    const mentors = await storage.getAllMentors({
      domain: domain as string,
      search: search as string
    });
    
    console.log('[GET /api/mentors] Mentors found:', mentors.length);
    res.json(mentors);
  } catch (error) {
    console.error('[GET /api/mentors] Error fetching mentors:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMentorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid mentor ID" });
    }

    console.log(`[GET /api/mentors/${id}] Fetching mentor...`);
    const mentor = await storage.getMentorById(id);
    
    if (!mentor) {
      console.log(`[GET /api/mentors/${id}] Mentor not found`);
      return res.status(404).json({ message: "Mentor not found" });
    }
    
    console.log(`[GET /api/mentors/${id}] Mentor found:`, mentor);
    res.json(mentor);
  } catch (error) {
    console.error(`[GET /api/mentors/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createMentor = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/mentors] Creating new mentor:', req.body);
    
    // Validate request body
    const validatedData = createMentorSchema.parse(req.body);
    const { name, email, domainRole, expertise, experience } = validatedData;
    
    try {
      // Create user first
      console.log('[POST /api/mentors] Creating user with data:', { 
        email, 
        name, 
        role: 'mentor', 
        domainRole 
      });
      
      const user = await storage.createUser({
        email,
        name,
        role: 'mentor',
        domainRole: domainRole as DomainRole
      });
      
      console.log('[POST /api/mentors] User created:', user);
      console.log('[POST /api/mentors] User ID:', user.id, 'Type:', typeof user.id);
      
      if (!user || !user.id) {
        return res.status(400).json({ 
          message: "Invalid mentor data", 
          errors: [{ field: "userId", message: "Failed to create user account" }]
        });
      }
      
      // Create mentor with proper userId
      const mentorData = {
        userId: user.id as string,
        expertise: expertise || '',
        experience: experience || '',
        responseRate: 0,
        isActive: true
      };
      
      console.log('[POST /api/mentors] Mentor data to be inserted:', JSON.stringify(mentorData));
      
      // Create mentor profile
      const mentor = await storage.createMentor(mentorData);
      
      console.log('[POST /api/mentors] Mentor created:', mentor.id);
      
      res.status(201).json({ 
        id: mentor.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl
        },
        expertise: mentor.expertise,
        experience: mentor.experience,
        domainRole: user.domainRole,
        buddiesCount: 0
      });
      
    } catch (validationError: any) {
      console.error('[POST /api/mentors] Validation error:', validationError);
      
      if (validationError.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({ message: "Email already exists" });
      }
      
      if (validationError.code === 'INVALID_MENTOR_DATA') {
        return res.status(400).json({ 
          message: "Invalid mentor data", 
          errors: [{ field: "userId", message: validationError.message }]
        });
      }
      
      if (validationError.code === 'USER_NOT_FOUND') {
        return res.status(400).json({ 
          message: "Invalid mentor data", 
          errors: [{ field: "userId", message: "User not found" }]
        });
      }
      
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid mentor data", 
          errors: validationError.issues 
        });
      }
      
      throw validationError; // Re-throw if it's not a validation error we can handle
    }
  } catch (error) {
    console.error('[POST /api/mentors] Error creating mentor:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid mentor data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMentor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid mentor ID" });
    }

    console.log(`[PUT /api/mentors/${id}] Updating mentor:`, req.body);
    
    // Validate request body
    const validatedData = updateMentorSchema.parse(req.body);
    const { name, email, domainRole, expertise, experience, isActive } = validatedData;
    
    // Get current mentor data
    const currentMentor = await storage.getMentorById(id);
    if (!currentMentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }
    
    // Update user info if provided
    if (name || email || domainRole !== undefined) {
      const userUpdates: any = {};
      if (name) userUpdates.name = name;
      if (email) userUpdates.email = email;
      if (domainRole !== undefined) userUpdates.domainRole = domainRole;
      
      try {
        await storage.updateUser(currentMentor.user.id, userUpdates);
      } catch (error: any) {
        if (error.code === 'DUPLICATE_EMAIL') {
          return res.status(409).json({ message: "Email already exists" });
        }
        throw error;
      }
    }
    
    // Update mentor-specific info
    const mentorUpdates: any = {};
    if (expertise !== undefined) mentorUpdates.expertise = expertise;
    if (experience !== undefined) mentorUpdates.experience = experience;
    if (isActive !== undefined) mentorUpdates.isActive = isActive;
    
    if (Object.keys(mentorUpdates).length > 0) {
      await storage.updateMentor(id, mentorUpdates);
    }
    
    // Return updated mentor with user info
    const fullMentorData = await storage.getMentorById(id);
    console.log(`[PUT /api/mentors/${id}] Mentor updated successfully`);
    res.json(fullMentorData);
    
  } catch (error: any) {
    console.error(`[PUT /api/mentors/${req.params.id}] Error updating mentor:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid mentor data", 
        errors: error.issues 
      });
    }
    
    if (error?.message === 'Mentor not found') {
      return res.status(404).json({ message: "Mentor not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMentor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid mentor ID" });
    }

    console.log(`[DELETE /api/mentors/${id}] Deleting mentor...`);
    
    // Get mentor data before deletion to get user ID
    const mentor = await storage.getMentorById(id);
    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }
    
    // Delete mentor record
    await storage.deleteMentor(id);
    
    // Also delete the associated user account
    if (mentor.user?.id) {
      try {
        await storage.deleteUser(mentor.user.id);
        console.log(`[DELETE /api/mentors/${id}] Associated user deleted:`, mentor.user.id);
      } catch (error) {
        console.warn(`[DELETE /api/mentors/${id}] Failed to delete user, but mentor deleted:`, error);
      }
    }
    
    console.log(`[DELETE /api/mentors/${id}] Mentor deleted successfully`);
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /api/mentors/${req.params.id}] Error deleting mentor:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMentorBuddies = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid mentor ID" });
    }

    // Validate query parameters
    const { status } = getMentorBuddiesQuerySchema.parse(req.query);
    
    console.log(`[GET /api/mentors/${id}/buddies] Fetching mentor buddies...`);
    const buddies = await storage.getMentorBuddies(id, status as string);
    
    console.log(`[GET /api/mentors/${id}/buddies] Buddies found:`, buddies.length);
    res.json(buddies);
  } catch (error) {
    console.error(`[GET /api/mentors/${req.params.id}/buddies] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};