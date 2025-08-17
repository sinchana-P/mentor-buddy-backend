import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';
import { insertUserSchema, type InsertUser } from '../shared/schema.ts';

// Validation schemas
const updateUserSchema = insertUserSchema.partial();

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/users] Fetching all users...');
    const users = await storage.getAllUsers();
    console.log('[GET /api/users] Users found:', users.length);
    res.json(users);
  } catch (error) {
    console.error('[GET /api/users] Error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.issues 
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format (basic validation)
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    console.log(`[GET /api/users/${id}] Looking for user...`);
    const user = await storage.getUser(id);
    
    if (!user) {
      console.log(`[GET /api/users/${id}] User not found in storage`);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`[GET /api/users/${id}] User found:`, user);
    res.json(user);
  } catch (error) {
    console.error(`[GET /api/users/${req.params.id}] Error:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.issues 
      });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/users] Creating user with data:', req.body);
    
    // Validate request body with Zod and cast to proper type
    const validatedData = insertUserSchema.parse(req.body);
    const userData: InsertUser = {
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
      domainRole: validatedData.domainRole,
      avatarUrl: validatedData.avatarUrl
    };
    
    const user = await storage.createUser(userData);
    console.log('[POST /api/users] User created successfully:', user);
    res.status(201).json(user);
  } catch (error: any) {
    console.error('[POST /api/users] Error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid user data", 
        errors: error.issues 
      });
    }
    
    // Handle specific application errors
    if (error?.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ message: "Email already exists" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    console.log(`[PUT /api/users/${id}] Updating user with data:`, req.body);
    
    // Validate request body with Zod (partial update)
    const userData = updateUserSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(userData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    const user = await storage.updateUser(id, userData);
    console.log(`[PUT /api/users/${id}] User updated successfully:`, user);
    res.json(user);
  } catch (error: any) {
    console.error(`[PUT /api/users/${req.params.id}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid user data", 
        errors: error.issues 
      });
    }
    
    // Handle specific application errors
    if (error?.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ message: "Email already exists" });
    }
    
    if (error?.message === 'User not found') {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    console.log(`[DELETE /api/users/${id}] Deleting user...`);
    
    // Check if user exists before deleting
    const existingUser = await storage.getUser(id);
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    await storage.deleteUser(id);
    console.log(`[DELETE /api/users/${id}] User deleted successfully`);
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /api/users/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    // Validate email format
    const emailSchema = z.string().email();
    const validatedEmail = emailSchema.parse(email);
    
    console.log(`[GET /api/users/email/${email}] Looking for user by email...`);
    const user = await storage.getUserByEmail(validatedEmail);
    
    if (!user) {
      console.log(`[GET /api/users/email/${email}] User not found`);
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log(`[GET /api/users/email/${email}] User found:`, user);
    res.json(user);
  } catch (error) {
    console.error(`[GET /api/users/email/${req.params.email}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid email format", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};