import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.js';
import { insertTopicSchema, DomainRole } from '../shared/schema.js';

// Validation schemas
const createTopicSchema = insertTopicSchema.extend({
  name: z.string().min(1, "Topic name is required"),
  category: z.string().min(1, "Category is required"),
  domainRole: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr'])
});

const updateTopicSchema = createTopicSchema.partial();

const getTopicsQuerySchema = z.object({
  domainRole: z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']).optional(),
  category: z.string().optional(),
  search: z.string().optional()
});

export const getAllTopics = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/topics] Fetching all topics...');
    
    // Validate query parameters
    const queryParams = getTopicsQuerySchema.parse(req.query);
    
    let topics;
    if (queryParams.domainRole) {
      topics = await storage.getTopics(queryParams.domainRole);
    } else {
      topics = await storage.getAllTopics();
    }
    
    // Apply additional filters in memory if needed
    if (queryParams.category) {
      topics = topics.filter(topic => topic.category.toLowerCase().includes(queryParams.category!.toLowerCase()));
    }
    
    if (queryParams.search) {
      const searchTerm = queryParams.search.toLowerCase();
      topics = topics.filter(topic => 
        topic.name.toLowerCase().includes(searchTerm) ||
        topic.category.toLowerCase().includes(searchTerm)
      );
    }
    
    console.log('[GET /api/topics] Topics found:', topics.length);
    res.json(topics);
  } catch (error) {
    console.error('[GET /api/topics] Error fetching topics:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid topic ID" });
    }

    console.log(`[GET /api/topics/${id}] Fetching topic...`);
    const topic = await storage.getTopicById(id);
    
    if (!topic) {
      console.log(`[GET /api/topics/${id}] Topic not found`);
      return res.status(404).json({ message: "Topic not found" });
    }
    
    console.log(`[GET /api/topics/${id}] Topic found:`, topic);
    res.json(topic);
  } catch (error) {
    console.error(`[GET /api/topics/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createTopic = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/topics] Creating topic with data:', req.body);
    
    // Validate request body with Zod
    const topicData = createTopicSchema.parse(req.body);
    
    const topic = await storage.createTopic(topicData);
    console.log('[POST /api/topics] Topic created successfully:', topic);
    res.status(201).json(topic);
  } catch (error) {
    console.error('[POST /api/topics] Error creating topic:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid topic data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid topic ID" });
    }

    console.log(`[PUT /api/topics/${id}] Updating topic with data:`, req.body);
    
    // Validate request body with Zod (partial update)
    const topicData = updateTopicSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(topicData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    const topic = await storage.updateTopic(id, topicData);
    console.log(`[PUT /api/topics/${id}] Topic updated successfully:`, topic);
    res.json(topic);
  } catch (error: any) {
    console.error(`[PUT /api/topics/${req.params.id}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid topic data", 
        errors: error.issues 
      });
    }
    
    if (error?.message === 'Topic not found') {
      return res.status(404).json({ message: "Topic not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid topic ID" });
    }

    console.log(`[DELETE /api/topics/${id}] Deleting topic...`);
    
    // Check if topic exists before deleting
    const existingTopic = await storage.getTopicById(id);
    if (!existingTopic) {
      return res.status(404).json({ message: "Topic not found" });
    }
    
    await storage.deleteTopic(id);
    console.log(`[DELETE /api/topics/${id}] Topic deleted successfully`);
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /api/topics/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicsByDomain = async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    
    // Validate domain
    const domainSchema = z.enum(['frontend', 'backend', 'devops', 'qa', 'hr']);
    const validatedDomain = domainSchema.parse(domain);
    
    console.log(`[GET /api/topics/domain/${domain}] Fetching topics by domain...`);
    
    const topics = await storage.getTopics(validatedDomain);
    
    console.log(`[GET /api/topics/domain/${domain}] Topics found:`, topics.length);
    res.json(topics);
  } catch (error) {
    console.error(`[GET /api/topics/domain/${req.params.domain}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid domain", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    // Validate category
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: "Invalid category" });
    }

    console.log(`[GET /api/topics/category/${category}] Fetching topics by category...`);
    
    const allTopics = await storage.getAllTopics();
    const filteredTopics = allTopics.filter(topic => 
      topic.category.toLowerCase() === category.toLowerCase()
    );
    
    console.log(`[GET /api/topics/category/${category}] Topics found:`, filteredTopics.length);
    res.json(filteredTopics);
  } catch (error) {
    console.error(`[GET /api/topics/category/${req.params.category}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const searchTopics = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    // Validate search query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: "Search query is required" });
    }

    console.log(`[GET /api/topics/search] Searching topics with query: "${query}"`);
    
    const allTopics = await storage.getAllTopics();
    const searchTerm = query.toLowerCase();
    const filteredTopics = allTopics.filter(topic => 
      topic.name.toLowerCase().includes(searchTerm) ||
      topic.category.toLowerCase().includes(searchTerm)
    );
    
    console.log(`[GET /api/topics/search] Search results found:`, filteredTopics.length);
    res.json(filteredTopics);
  } catch (error) {
    console.error(`[GET /api/topics/search] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicProgress = async (req: Request, res: Response) => {
  try {
    const { topicId, buddyId } = req.params;
    
    // Validate ID formats
    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({ message: "Invalid topic ID" });
    }
    if (!buddyId || typeof buddyId !== 'string') {
      return res.status(400).json({ message: "Invalid buddy ID" });
    }

    console.log(`[GET /api/topics/${topicId}/progress/${buddyId}] Fetching topic progress...`);
    
    // Get buddy progress which includes all topics
    const progressData = await storage.getBuddyProgress(buddyId);
    const topicProgress = progressData.topics.find((topic: any) => topic.id === topicId);
    
    if (!topicProgress) {
      return res.status(404).json({ message: "Topic progress not found" });
    }
    
    console.log(`[GET /api/topics/${topicId}/progress/${buddyId}] Progress found:`, topicProgress);
    res.json(topicProgress);
  } catch (error) {
    console.error(`[GET /api/topics/${req.params.topicId}/progress/${req.params.buddyId}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};