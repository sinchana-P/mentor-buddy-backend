import { Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../lib/storage.ts';
import { insertTaskSchema, insertSubmissionSchema, type InsertTask, type InsertSubmission } from '../shared/schema.ts';

// Validation schemas
const createTaskSchema = insertTaskSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  mentorId: z.string().uuid("Invalid mentor ID format"),
  buddyId: z.string().uuid("Invalid buddy ID format"),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional()
});

const updateTaskSchema = createTaskSchema.partial();

const getAllTasksQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  buddyId: z.string().uuid().optional()
});

const createSubmissionSchema = insertSubmissionSchema.extend({
  buddyId: z.string().uuid("Invalid buddy ID format"),
  taskId: z.string().uuid("Invalid task ID format"),
  githubLink: z.string().url().optional(),
  deployedUrl: z.string().url().optional(),
  notes: z.string().optional()
});

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    console.log('[GET /api/tasks] Fetching all tasks...');
    
    // Validate query parameters
    const queryParams = getAllTasksQuerySchema.parse(req.query);
    
    const tasks = await storage.getAllTasks({
      status: queryParams.status,
      search: queryParams.search,
      buddyId: queryParams.buddyId
    });
    
    console.log('[GET /api/tasks] Tasks found:', tasks.length);
    res.json(tasks);
  } catch (error) {
    console.error('[GET /api/tasks] Error fetching tasks:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid query parameters", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    console.log(`[GET /api/tasks/${id}] Fetching task...`);
    const task = await storage.getTaskById(id);
    
    if (!task) {
      console.log(`[GET /api/tasks/${id}] Task not found`);
      return res.status(404).json({ message: "Task not found" });
    }
    
    console.log(`[GET /api/tasks/${id}] Task found:`, task);
    res.json(task);
  } catch (error) {
    console.error(`[GET /api/tasks/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/tasks] Creating task with data:', req.body);
    
    // Validate request body with Zod
    const taskData = createTaskSchema.parse(req.body);
    
    // Convert dueDate if it's a string and prepare InsertTask data
    const processedTaskData: InsertTask = {
      title: taskData.title,
      description: taskData.description,
      mentorId: taskData.mentorId,
      buddyId: taskData.buddyId,
      status: taskData.status || 'pending',
      dueDate: taskData.dueDate && typeof taskData.dueDate === 'string' 
        ? new Date(taskData.dueDate) 
        : (taskData.dueDate as Date | undefined)
    };
    
    const task = await storage.createTask(processedTaskData);
    console.log('[POST /api/tasks] Task created successfully:', task);
    res.status(201).json(task);
  } catch (error) {
    console.error('[POST /api/tasks] Error creating task:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid task data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    console.log(`[PUT /api/tasks/${id}] Updating task with data:`, req.body);
    
    // Validate request body with Zod (partial update)
    const taskData = updateTaskSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(taskData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    // Convert dueDate if it's a string - ensure proper type casting
    const processedTaskData = {
      ...taskData,
      dueDate: taskData.dueDate && typeof taskData.dueDate === 'string' 
        ? new Date(taskData.dueDate) 
        : (taskData.dueDate as Date | null | undefined)
    };
    
    const task = await storage.updateTask(id, processedTaskData);
    console.log(`[PUT /api/tasks/${id}] Task updated successfully:`, task);
    res.json(task);
  } catch (error: any) {
    console.error(`[PUT /api/tasks/${req.params.id}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid task data", 
        errors: error.issues 
      });
    }
    
    if (error?.message === 'Task not found') {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    console.log(`[DELETE /api/tasks/${id}] Deleting task...`);
    
    // Check if task exists before deleting
    const existingTask = await storage.getTaskById(id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    await storage.deleteTask(id);
    console.log(`[DELETE /api/tasks/${id}] Task deleted successfully`);
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /api/tasks/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createSubmission = async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/submissions] Creating submission with data:', req.body);
    
    // Validate request body with Zod
    const submissionData = createSubmissionSchema.parse(req.body);
    
    // Prepare InsertSubmission data
    const processedSubmissionData: InsertSubmission = {
      buddyId: submissionData.buddyId,
      taskId: submissionData.taskId,
      githubLink: submissionData.githubLink,
      deployedUrl: submissionData.deployedUrl,
      notes: submissionData.notes
    };
    
    const submission = await storage.createSubmission(processedSubmissionData);
    console.log('[POST /api/submissions] Submission created successfully:', submission);
    res.status(201).json(submission);
  } catch (error) {
    console.error('[POST /api/submissions] Error creating submission:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid submission data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTaskSubmissions = async (req: Request, res: Response) => {
  try {
    const { id: taskId } = req.params;
    console.log('[DEBUG] taskId from params:', taskId, 'type:', typeof taskId, 'params:', req.params);
    
    // Validate taskId format
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ message: `Invalid task ID: ${taskId}` });
    }

    console.log(`[GET /api/tasks/${taskId}/submissions] Fetching submissions...`);
    const submissions = await storage.getSubmissionsByTaskId(taskId);
    
    console.log(`[GET /api/tasks/${taskId}/submissions] Submissions found:`, submissions.length);
    res.json(submissions);
  } catch (error) {
    console.error(`[GET /api/tasks/${req.params.id}/submissions] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid submission ID" });
    }

    console.log(`[PUT /api/submissions/${id}] Updating submission with data:`, req.body);
    
    // Create a partial update schema for submissions
    const updateSubmissionSchema = createSubmissionSchema.partial().omit({ buddyId: true, taskId: true });
    const submissionData = updateSubmissionSchema.parse(req.body);
    
    // Check if there's actually data to update
    if (Object.keys(submissionData).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }
    
    // Note: This would require implementing updateSubmission in storage
    // For now, we'll return a 501 Not Implemented status
    res.status(501).json({ message: "Update submission not yet implemented" });
  } catch (error) {
    console.error(`[PUT /api/submissions/${req.params.id}] Error:`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid submission data", 
        errors: error.issues 
      });
    }
    
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate ID format
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: "Invalid submission ID" });
    }

    console.log(`[DELETE /api/submissions/${id}] Deleting submission...`);
    
    // Note: This would require implementing deleteSubmission in storage
    // For now, we'll return a 501 Not Implemented status
    res.status(501).json({ message: "Delete submission not yet implemented" });
  } catch (error) {
    console.error(`[DELETE /api/submissions/${req.params.id}] Error:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
};