import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';
import { insertCurriculumSchema, DomainRole } from '../shared/schema.ts';

// Validation schemas
const createCurriculumSchema = insertCurriculumSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  domain: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']),
  createdBy: z.string().uuid("Invalid creator ID format"),
  content: z.string().min(1, "Content is required"),
  attachments: z.string().optional()
});

const updateCurriculumSchema = createCurriculumSchema.partial().omit({ createdBy: true });

const getAllCurriculumQuerySchema = z.object({
  domain: z.string().optional(),
  search: z.string().optional()
});

export const getAllCurriculum = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/curriculum] Fetching all curriculum items...');
    
    // Validate query parameters
    const queryParams = getAllCurriculumQuerySchema.parse(req.query);
    
    const curriculumItems = await storage.getAllCurriculum({
      domain: queryParams.domain,
      search: queryParams.search
    });
    
    console.log('[GET /api/curriculum] Curriculum items found:', curriculumItems.length);
    res.json(curriculumItems);
  } catch (error) {
    console.error('[GET /api/curriculum] Error fetching curriculum:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurriculumById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid curriculum ID" });
    }

    console.log(`[GET /api/curriculum/${id}] Fetching curriculum item...`);
    const curriculumItem = await storage.getCurriculumById(id);
    
    if (!curriculumItem) {
      console.log(`[GET /api/curriculum/${id}] Curriculum item not found`);
      return res.status(404).json({ message: "Curriculum item not found" });
    }
    
    console.log(`[GET /api/curriculum/${id}] Curriculum item found:`, curriculumItem);
    res.json(curriculumItem);
  } catch (error) {
    console.error(`[GET /api/curriculum/${req.params.id}] Error fetching curriculum item:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createCurriculum = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/curriculum] Creating new curriculum item:', req.body);
    
    // Validate request body with Zod
    const curriculumData = createCurriculumSchema.parse(req.body);
    
    const curriculumItem = await storage.createCurriculum(curriculumData);
    console.log('[POST /api/curriculum] Curriculum item created:', curriculumItem.id);
    res.status(201).json(curriculumItem);
  } catch (error) {
    console.error('[POST /api/curriculum] Error creating curriculum item:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid curriculum data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCurriculum = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid curriculum ID" });
    }

    console.log(`[PATCH /api/curriculum/${id}] Updating curriculum item:`, req.body);
    
    // Validate request body with Zod (partial update)
    const updates = updateCurriculumSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    const curriculumItem = await storage.updateCurriculum(id, updates);
    console.log(`[PATCH /api/curriculum/${id}] Curriculum item updated`);
    res.json(curriculumItem);
  } catch (error: any) {
    console.error(`[PATCH /api/curriculum/${req.params.id}] Error updating curriculum item:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid curriculum data", 
        errors: error.issues 
      });
    }
    
    if (error?.message?.includes('not found')) {
      return res.status(404).json({ message: "Curriculum item not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCurriculum = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid curriculum ID" });
    }

    console.log(`[DELETE /api/curriculum/${id}] Deleting curriculum item...`);
    
    // Check if curriculum item exists before deleting
    const existingItem = await storage.getCurriculumById(id);
    if (!existingItem) {
      return res.status(404).json({ message: "Curriculum item not found" });
    }
    
    await storage.deleteCurriculum(id);
    console.log(`[DELETE /api/curriculum/${id}] Curriculum item deleted`);
    res.status(204).send();
  } catch (error: any) {
    console.error(`[DELETE /api/curriculum/${req.params.id}] Error deleting curriculum item:`, error);
    
    if (error?.message?.includes('not found')) {
      return res.status(404).json({ message: "Curriculum item not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurriculumByDomain = async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    
    // Validate domain
    const domainSchema = z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']);
    const validatedDomain = domainSchema.parse(domain);
    
    console.log(`[GET /api/curriculum/domain/${domain}] Fetching curriculum by domain...`);
    
    const curriculumItems = await storage.getAllCurriculum({ domain: validatedDomain });
    
    console.log(`[GET /api/curriculum/domain/${domain}] Curriculum items found:`, curriculumItems.length);
    res.json(curriculumItems);
  } catch (error) {
    console.error(`[GET /api/curriculum/domain/${req.params.domain}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid domain", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchCurriculum = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    // Validate search query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    console.log(`[GET /api/curriculum/search] Searching curriculum with query: "${query}"`);
    
    const curriculumItems = await storage.getAllCurriculum({ search: query });
    
    console.log(`[GET /api/curriculum/search] Search results found:`, curriculumItems.length);
    res.json(curriculumItems);
  } catch (error) {
    console.error(`[GET /api/curriculum/search] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurriculumByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    
    // Validate creator ID format
    const creatorIdSchema = z.string().uuid();
    const validatedCreatorId = creatorIdSchema.parse(creatorId);
    
    console.log(`[GET /api/curriculum/creator/${creatorId}] Fetching curriculum by creator...`);
    
    // Get all curriculum items first, then filter by creator
    // This is not optimal but works with current storage interface
    const allCurriculumItems = await storage.getAllCurriculum();
    const creatorCurriculumItems = allCurriculumItems.filter(item => item.createdBy === validatedCreatorId);
    
    console.log(`[GET /api/curriculum/creator/${creatorId}] Curriculum items found:`, creatorCurriculumItems.length);
    res.json(creatorCurriculumItems);
  } catch (error) {
    console.error(`[GET /api/curriculum/creator/${req.params.creatorId}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid creator ID", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};