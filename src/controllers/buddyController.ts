import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';
import { insertBuddySchema, DomainRole } from '../shared/schema.ts';

// Validation schemas
const createBuddySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email format"),
  domainRole: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']),
  topics: z.array(z.string()).optional() // Optional array of topic names
});

const updateBuddySchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  domainRole: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']).optional(),
  status: z.enum(['active', 'inactive', 'exited']).optional(),
  assignedMentorId: z.string().uuid().optional()
});

const getAllBuddiesQuerySchema = z.object({
  status: z.string().optional(),
  domain: z.string().optional(),
  search: z.string().optional()
});

const assignBuddySchema = z.object({
  mentorId: z.string().uuid("Invalid mentor ID format")
});

const updateProgressSchema = z.object({
  checked: z.boolean()
});

export const getAllBuddies = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/buddies] Fetching all buddies...');
    
    // Validate query parameters
    const { status, domain, search } = getAllBuddiesQuerySchema.parse(req.query);
    
    const buddies = await storage.getAllBuddies({
      status: status as string,
      domain: domain as string,
      search: search as string
    });
    
    console.log('[GET /api/buddies] Buddies found:', buddies.length);
    res.json(buddies);
  } catch (error) {
    console.error('[GET /api/buddies] Error fetching buddies:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBuddyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[GET /api/buddies/${id}] Fetching buddy...`);
    const buddy = await storage.getBuddyById(id);
    
    if (!buddy) {
      console.log(`[GET /api/buddies/${id}] Buddy not found`);
      return res.status(404).json({ message: "Buddy not found" });
    }
    
    console.log(`[GET /api/buddies/${id}] Buddy found:`, buddy);
    res.json(buddy);
  } catch (error) {
    console.error(`[GET /api/buddies/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createBuddy = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/buddies] Creating new buddy:', req.body);
    
    // Validate request body
    const validatedData = createBuddySchema.parse(req.body);
    const { name, email, domainRole, topics } = validatedData;

    try {
      // Create user first
      console.log('[POST /api/buddies] Creating user with data:', {
        email,
        name,
        role: 'buddy',
        domainRole
      });

      const user = await storage.createUser({
        email,
        name,
        role: 'buddy',
        domainRole: domainRole as DomainRole
      });

      console.log('[POST /api/buddies] User created:', user.id);

      if (!user || !user.id) {
        return res.status(400).json({
          message: "Invalid buddy data",
          errors: [{ field: "userId", message: "Failed to create user account" }]
        });
      }

      // Create buddy profile
      const buddy = await storage.createBuddy({
        userId: user.id as string,
        status: 'active'
      });

      console.log('[POST /api/buddies] Buddy created:', buddy.id);

      // Create buddy topics if provided
      if (topics && topics.length > 0) {
        console.log('[POST /api/buddies] Creating buddy topics:', topics);
        await storage.createBuddyTopics(buddy.id, topics);
        console.log('[POST /api/buddies] Buddy topics created');
      }

      res.status(201).json({
        id: buddy.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl
        },
        mentor: null,
        domainRole: user.domainRole,
        status: buddy.status,
        startDate: buddy.createdAt
      });
      
    } catch (validationError: any) {
      console.error('[POST /api/buddies] Validation error:', validationError);
      
      if (validationError.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({ message: "Email already exists" });
      }
      
      if (validationError.code === 'USER_NOT_FOUND') {
        return res.status(400).json({ 
          message: "Invalid buddy data", 
          errors: [{ field: "userId", message: "User not found" }]
        });
      }
      
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid buddy data", 
          errors: validationError.issues 
        });
      }
      
      throw validationError;
    }
  } catch (error) {
    console.error('[POST /api/buddies] Error creating buddy:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid buddy data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBuddy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[PUT /api/buddies/${id}] Updating buddy:`, req.body);
    
    // Validate request body
    const validatedData = updateBuddySchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(validatedData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    // Get current buddy data
    const currentBuddy = await storage.getBuddyById(id);
    if (!currentBuddy) {
      return res.status(404).json({ message: "Buddy not found" });
    }
    
    const { name, email, domainRole, status, assignedMentorId } = validatedData;
    
    // Update user info if provided
    if (name || email || domainRole !== undefined) {
      const userUpdates: any = {};
      if (name) userUpdates.name = name;
      if (email) userUpdates.email = email;
      if (domainRole !== undefined) userUpdates.domainRole = domainRole;
      
      try {
        await storage.updateUser(currentBuddy.user.id, userUpdates);
      } catch (error: any) {
        if (error.code === 'DUPLICATE_EMAIL') {
          return res.status(409).json({ message: "Email already exists" });
        }
        throw error;
      }
    }
    
    // Update buddy-specific info
    const buddyUpdates: any = {};
    if (status !== undefined) buddyUpdates.status = status;
    if (assignedMentorId !== undefined) buddyUpdates.assignedMentorId = assignedMentorId;
    
    if (Object.keys(buddyUpdates).length > 0) {
      await storage.updateBuddy(id, buddyUpdates);
    }
    
    // Return updated buddy with user info
    const fullBuddyData = await storage.getBuddyById(id);
    console.log(`[PUT /api/buddies/${id}] Buddy updated successfully`);
    res.json(fullBuddyData);
    
  } catch (error: any) {
    console.error(`[PUT /api/buddies/${req.params.id}] Error updating buddy:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid buddy data", 
        errors: error.issues 
      });
    }
    
    if (error?.message === 'Buddy not found') {
      return res.status(404).json({ message: "Buddy not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteBuddy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[DELETE /api/buddies/${id}] Deleting buddy...`);
    
    // Get buddy data before deletion to get user ID
    const buddy = await storage.getBuddyById(id);
    if (!buddy) {
      return res.status(404).json({ message: "Buddy not found" });
    }
    
    // Delete buddy record
    await storage.deleteBuddy(id);
    
    // Also delete the associated user account
    if (buddy.user?.id) {
      try {
        await storage.deleteUser(buddy.user.id);
        console.log(`[DELETE /api/buddies/${id}] Associated user deleted:`, buddy.user.id);
      } catch (error) {
        console.warn(`[DELETE /api/buddies/${id}] Failed to delete user, but buddy deleted:`, error);
      }
    }
    
    console.log(`[DELETE /api/buddies/${id}] Buddy deleted successfully`);
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /api/buddies/${req.params.id}] Error deleting buddy:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const assignBuddyToMentor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[PUT /api/buddies/${id}/assign] Assigning buddy to mentor:`, req.body);
    
    // Validate request body
    const { mentorId } = assignBuddySchema.parse(req.body);
    
    const buddy = await storage.assignBuddyToMentor(id, mentorId);
    
    console.log(`[PUT /api/buddies/${id}/assign] Buddy assigned successfully`);
    res.json(buddy);
  } catch (error) {
    console.error(`[PUT /api/buddies/${req.params.id}/assign] Error assigning buddy to mentor:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid assignment data", 
        errors: error.issues 
      });
    }
    
    if (error instanceof Error) {
      if (error.message === 'Buddy not found' || error.message === 'Mentor not found') {
        return res.status(404).json({ message: error.message });
      }
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBuddyTasks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[GET /api/buddies/${id}/tasks] Fetching buddy tasks...`);
    const tasks = await storage.getBuddyTasks(id);
    
    console.log(`[GET /api/buddies/${id}/tasks] Tasks found:`, tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error(`[GET /api/buddies/${req.params.id}/tasks] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBuddyProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[GET /api/buddies/${id}/progress] Fetching buddy progress...`);
    const progress = await storage.getBuddyProgress(id);
    
    console.log(`[GET /api/buddies/${id}/progress] Progress fetched:`, progress.percentage + '%');
    res.json(progress);
  } catch (error) {
    console.error(`[GET /api/buddies/${req.params.id}/progress] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBuddyProgress = async (req: Request, res: Response) => {
  try {
    const { buddyId, topicId } = req.params;
    
    // Validate ID formats
    if (!buddyId || typeof buddyId !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }
    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({ message: "Invalid topic ID" });
    }

    console.log(`[PUT /api/buddies/${buddyId}/progress/${topicId}] Updating progress:`, req.body);
    
    // Validate request body
    const { checked } = updateProgressSchema.parse(req.body);
    
    const progress = await storage.updateBuddyTopicProgress(buddyId, topicId, checked);
    
    console.log(`[PUT /api/buddies/${buddyId}/progress/${topicId}] Progress updated successfully`);
    res.json(progress);
  } catch (error) {
    console.error(`[PUT /api/buddies/${req.params.buddyId}/progress/${req.params.topicId}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid progress data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getBuddyPortfolio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[GET /api/buddies/${id}/portfolio] Fetching buddy portfolio...`);
    const portfolio = await storage.getBuddyPortfolio(id);

    console.log(`[GET /api/buddies/${id}/portfolio] Portfolio items found:`, portfolio.length);
    res.json(portfolio);
  } catch (error) {
    console.error(`[GET /api/buddies/${req.params.id}/portfolio] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// New buddy-specific topics endpoints
export const getBuddyTopics = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[GET /api/buddies/${id}/topics] Fetching buddy topics...`);
    const topicsData = await storage.getBuddyTopics(id);

    console.log(`[GET /api/buddies/${id}/topics] Topics found:`, topicsData.topics.length);
    res.json(topicsData);
  } catch (error) {
    console.error(`[GET /api/buddies/${req.params.id}/topics] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBuddyTopicById = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;

    // Validate ID format
    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({ message: "Invalid topic ID" });
    }

    console.log(`[PATCH /api/buddy-topics/${topicId}] Updating buddy topic:`, req.body);

    // Validate request body
    const { checked } = updateProgressSchema.parse(req.body);

    const updatedTopic = await storage.updateBuddyTopic(topicId, checked);

    console.log(`[PATCH /api/buddy-topics/${topicId}] Topic updated successfully`);
    res.json(updatedTopic);
  } catch (error) {
    console.error(`[PATCH /api/buddy-topics/${req.params.topicId}] Error:`, error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid topic data",
        errors: error.issues
      });
    }

    if (error instanceof Error && error.message === 'Buddy topic not found') {
      return res.status(404).json({ message: "Topic not found" });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};