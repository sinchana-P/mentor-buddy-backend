import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';

// Validation schemas
const linkSchema = z.object({
  label: z.string().min(1, 'Link label is required'),
  url: z.string().url('Must be a valid URL'),
  type: z.enum(['github', 'live', 'other']),
});

const createPortfolioSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  technologies: z.array(z.string()).optional().default([]),
  links: z.array(linkSchema).max(3, 'Maximum 3 links allowed').default([]),
  resourceUrl: z.string().url('Must be a valid URL').optional(),
  resourceType: z.string().optional(),
  resourceName: z.string().optional(),
  completedAt: z.string().optional(),
});

const updatePortfolioSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  links: z.array(linkSchema).max(3, 'Maximum 3 links allowed').optional(),
  resourceUrl: z.string().url('Must be a valid URL').optional().nullable(),
  resourceType: z.string().optional().nullable(),
  resourceName: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
});

// Create a new portfolio item
export const createPortfolio = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/buddies/:buddyId/portfolio] Creating portfolio item...');

    const { buddyId } = req.params;
    const portfolioData = createPortfolioSchema.parse(req.body);

    const portfolio = await storage.createPortfolio({
      buddyId,
      ...portfolioData,
      completedAt: portfolioData.completedAt ? new Date(portfolioData.completedAt) : undefined,
    });

    console.log('[POST /api/buddies/:buddyId/portfolio] Portfolio item created:', portfolio.id);
    res.status(201).json(portfolio);
  } catch (error) {
    console.error('[POST /api/buddies/:buddyId/portfolio] Error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid portfolio data",
        errors: error.issues
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all portfolio items for a buddy
export const getPortfoliosByBuddyId = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/buddies/:buddyId/portfolio] Fetching portfolio items...');

    const { buddyId } = req.params;
    const portfolios = await storage.getPortfoliosByBuddyId(buddyId);

    console.log('[GET /api/buddies/:buddyId/portfolio] Found', portfolios.length, 'items');
    res.json(portfolios);
  } catch (error) {
    console.error('[GET /api/buddies/:buddyId/portfolio] Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update a portfolio item
export const updatePortfolio = async (req: Request, res: Response) => {
  try {
    console.log('[PATCH /api/portfolios/:id] Updating portfolio item...');

    const { id } = req.params;
    const updates = updatePortfolioSchema.parse(req.body);

    const portfolio = await storage.updatePortfolio(id, {
      ...updates,
      completedAt: updates.completedAt ? new Date(updates.completedAt) : undefined,
    });

    console.log('[PATCH /api/portfolios/:id] Portfolio item updated:', portfolio.id);
    res.json(portfolio);
  } catch (error) {
    console.error('[PATCH /api/portfolios/:id] Error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid portfolio data",
        errors: error.issues
      });
    }

    if (error instanceof Error && error.message === 'Portfolio item not found') {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a portfolio item
export const deletePortfolio = async (req: Request, res: Response) => {
  try {
    console.log('[DELETE /api/portfolios/:id] Deleting portfolio item...');

    const { id } = req.params;
    await storage.deletePortfolio(id);

    console.log('[DELETE /api/portfolios/:id] Portfolio item deleted');
    res.status(204).send();
  } catch (error) {
    console.error('[DELETE /api/portfolios/:id] Error:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};
