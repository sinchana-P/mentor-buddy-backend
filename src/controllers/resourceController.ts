import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';
import { insertResourceSchema } from '../shared/schema.ts';

// Validation schemas
const createResourceSchema = insertResourceSchema.extend({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  url: z.string().url("Invalid URL format"),
  description: z.string().optional(),
  type: z.string().max(64, "Type must be less than 64 characters").optional(),
  category: z.string().max(64, "Category must be less than 64 characters").optional(),
  difficulty: z.string().max(32, "Difficulty must be less than 32 characters").optional(),
  duration: z.string().max(32, "Duration must be less than 32 characters").optional(),
  author: z.string().max(128, "Author must be less than 128 characters").optional(),
  tags: z.array(z.string()).optional()
});

const updateResourceSchema = createResourceSchema.partial();

const getAllResourcesQuerySchema = z.object({
  category: z.string().optional(),
  difficulty: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional()
});

export const getAllResources = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/resources] Fetching all resources...');
    
    // Validate query parameters
    const queryParams = getAllResourcesQuerySchema.parse(req.query);
    
    const resources = await storage.getAllResources({
      category: queryParams.category,
      difficulty: queryParams.difficulty,
      type: queryParams.type,
      search: queryParams.search
    });
    
    console.log('[GET /api/resources] Resources found:', resources.length);
    res.json(resources);
  } catch (error) {
    console.error('[GET /api/resources] Error fetching resources:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getResourceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid resource ID" });
    }

    console.log(`[GET /api/resources/${id}] Fetching resource...`);
    const resource = await storage.getResourceById(id);
    
    if (!resource) {
      console.log(`[GET /api/resources/${id}] Resource not found`);
      return res.status(404).json({ message: "Resource not found" });
    }
    
    console.log(`[GET /api/resources/${id}] Resource found:`, resource);
    res.json(resource);
  } catch (error) {
    console.error(`[GET /api/resources/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createResource = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/resources] Creating resource with data:', req.body);
    
    // Validate request body with Zod
    const resourceData = createResourceSchema.parse(req.body);
    
    const resource = await storage.createResource(resourceData);
    console.log('[POST /api/resources] Resource created successfully:', resource);
    res.status(201).json(resource);
  } catch (error) {
    console.error('[POST /api/resources] Error creating resource:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid resource data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid resource ID" });
    }

    console.log(`[PUT /api/resources/${id}] Updating resource with data:`, req.body);
    
    // Validate request body with Zod (partial update)
    const resourceData = updateResourceSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(resourceData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    const resource = await storage.updateResource(id, resourceData);
    console.log(`[PUT /api/resources/${id}] Resource updated successfully:`, resource);
    res.json(resource);
  } catch (error: any) {
    console.error(`[PUT /api/resources/${req.params.id}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid resource data", 
        errors: error.issues 
      });
    }
    
    if (error?.message === 'Resource not found') {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid resource ID" });
    }

    console.log(`[DELETE /api/resources/${id}] Deleting resource...`);
    
    // Check if resource exists before deleting
    const existingResource = await storage.getResourceById(id);
    if (!existingResource) {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    await storage.deleteResource(id);
    console.log(`[DELETE /api/resources/${id}] Resource deleted successfully`);
    res.status(204).send();
  } catch (error: any) {
    console.error(`[DELETE /api/resources/${req.params.id}] Error:`, error);
    
    if (error?.message === 'Resource not found') {
      return res.status(404).json({ message: "Resource not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getResourcesByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    // Validate category
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: "Invalid category" });
    }

    console.log(`[GET /api/resources/category/${category}] Fetching resources by category...`);
    
    const resources = await storage.getAllResources({ category });
    
    console.log(`[GET /api/resources/category/${category}] Resources found:`, resources.length);
    res.json(resources);
  } catch (error) {
    console.error(`[GET /api/resources/category/${req.params.category}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getResourcesByDifficulty = async (req: Request, res: Response) => {
  try {
    const { difficulty } = req.params;
    
    // Validate difficulty
    if (!difficulty || typeof difficulty !== 'string') {
      return res.status(400).json({ message: "Invalid difficulty level" });
    }

    console.log(`[GET /api/resources/difficulty/${difficulty}] Fetching resources by difficulty...`);
    
    const resources = await storage.getAllResources({ difficulty });
    
    console.log(`[GET /api/resources/difficulty/${difficulty}] Resources found:`, resources.length);
    res.json(resources);
  } catch (error) {
    console.error(`[GET /api/resources/difficulty/${req.params.difficulty}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getResourcesByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    
    // Validate type
    if (!type || typeof type !== 'string') {
      return res.status(400).json({ message: "Invalid resource type" });
    }

    console.log(`[GET /api/resources/type/${type}] Fetching resources by type...`);
    
    const resources = await storage.getAllResources({ type });
    
    console.log(`[GET /api/resources/type/${type}] Resources found:`, resources.length);
    res.json(resources);
  } catch (error) {
    console.error(`[GET /api/resources/type/${req.params.type}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchResources = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    // Validate search query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    console.log(`[GET /api/resources/search] Searching resources with query: "${query}"`);
    
    const resources = await storage.getAllResources({ search: query });
    
    console.log(`[GET /api/resources/search] Search results found:`, resources.length);
    res.json(resources);
  } catch (error) {
    console.error(`[GET /api/resources/search] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};