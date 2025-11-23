import { Request, Response } from 'express';
import { db } from '../lib/database.js';
import {
  curriculums,
  curriculumWeeks,
  taskTemplates,
  buddyCurriculums,
  buddyWeekProgress,
  taskAssignments,
  newSubmissions,
  submissionResources,
  submissionFeedback,
  buddies,
  users,
  insertCurriculumSchema2,
  insertCurriculumWeekSchema,
  insertTaskTemplateSchema,
} from '../shared/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import {
  getBuddyCurriculumProgress,
  syncNewWeekToEnrolledBuddies,
  syncNewTaskToEnrolledBuddies,
  syncDeletedTask,
  syncDeletedWeek,
  syncUpdatedCurriculum,
  syncUpdatedWeek,
  syncUpdatedTaskTemplate,
} from '../lib/autoAssignment.js';

// Helper to generate slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ═══════════════════════════════════════════════════════════
// CURRICULUMS
// ═══════════════════════════════════════════════════════════

export async function getAllCurriculums(req: Request, res: Response) {
  try {
    const { domainRole, status } = req.query;

    let query = db.select().from(curriculums);

    if (domainRole) {
      query = query.where(eq(curriculums.domainRole, domainRole as string)) as any;
    }

    if (status) {
      query = query.where(eq(curriculums.status, status as string)) as any;
    }

    const result = await query.orderBy(desc(curriculums.createdAt));

    res.json(result);
  } catch (error) {
    console.error('Error fetching curriculums:', error);
    res.status(500).json({ error: 'Failed to fetch curriculums' });
  }
}

export async function getCurriculumById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(curriculums)
      .where(eq(curriculums.id, id))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum' });
  }
}

export async function createCurriculum(req: Request, res: Response) {
  try {
    const slug = generateSlug(req.body.name);

    const validatedData = insertCurriculumSchema2.parse({
      ...req.body,
      slug,
      createdBy: (req as any).user?.userId,
      lastModifiedBy: (req as any).user?.userId,
    });

    const result = await db
      .insert(curriculums)
      .values(validatedData)
      .returning();

    res.status(201).json(result[0]);
  } catch (error: any) {
    console.error('Error creating curriculum:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid curriculum data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create curriculum' });
  }
}

export async function updateCurriculum(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .update(curriculums)
      .set({
        ...req.body,
        lastModifiedBy: (req as any).user?.userId,
        updatedAt: new Date(),
      })
      .where(eq(curriculums.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    // Sync curriculum updates to enrolled buddies
    const syncResult = await syncUpdatedCurriculum(id, req.body);
    console.log(`[UPDATE-CURRICULUM] Sync result:`, syncResult);

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating curriculum:', error);
    res.status(500).json({ error: 'Failed to update curriculum' });
  }
}

export async function deleteCurriculum(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .delete(curriculums)
      .where(eq(curriculums.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    res.json({ message: 'Curriculum deleted successfully' });
  } catch (error) {
    console.error('Error deleting curriculum:', error);
    res.status(500).json({ error: 'Failed to delete curriculum' });
  }
}

export async function publishCurriculum(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .update(curriculums)
      .set({
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(curriculums.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Curriculum not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error publishing curriculum:', error);
    res.status(500).json({ error: 'Failed to publish curriculum' });
  }
}

// ═══════════════════════════════════════════════════════════
// CURRICULUM WEEKS
// ═══════════════════════════════════════════════════════════

export async function getCurriculumWeeks(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(curriculumWeeks)
      .where(eq(curriculumWeeks.curriculumId, id))
      .orderBy(curriculumWeeks.displayOrder);

    res.json(result);
  } catch (error) {
    console.error('Error fetching curriculum weeks:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum weeks' });
  }
}

export async function createCurriculumWeek(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const validatedData = insertCurriculumWeekSchema.parse({
      ...req.body,
      curriculumId: id,
    });

    const result = await db
      .insert(curriculumWeeks)
      .values(validatedData)
      .returning();

    const newWeek = result[0];

    // Sync the new week to all enrolled buddies
    const syncResult = await syncNewWeekToEnrolledBuddies(id, newWeek);
    console.log(`[CREATE-WEEK] Sync result:`, syncResult);

    res.status(201).json(newWeek);
  } catch (error: any) {
    console.error('Error creating curriculum week:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid week data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create curriculum week' });
  }
}

export async function updateCurriculumWeek(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .update(curriculumWeeks)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(eq(curriculumWeeks.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Week not found' });
    }

    // Sync week updates to enrolled buddies (especially important for week number changes)
    const syncResult = await syncUpdatedWeek(id, req.body);
    console.log(`[UPDATE-WEEK] Sync result:`, syncResult);

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating curriculum week:', error);
    res.status(500).json({ error: 'Failed to update curriculum week' });
  }
}

export async function deleteCurriculumWeek(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Sync deletion to enrolled buddies first (removes task assignments and week progress)
    const syncResult = await syncDeletedWeek(id);
    console.log(`[DELETE-WEEK] Sync result:`, syncResult);

    const result = await db
      .delete(curriculumWeeks)
      .where(eq(curriculumWeeks.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Week not found' });
    }

    res.json({ message: 'Week deleted successfully', syncResult });
  } catch (error) {
    console.error('Error deleting curriculum week:', error);
    res.status(500).json({ error: 'Failed to delete curriculum week' });
  }
}

// ═══════════════════════════════════════════════════════════
// TASK TEMPLATES
// ═══════════════════════════════════════════════════════════

export async function getWeekTasks(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.curriculumWeekId, id))
      .orderBy(taskTemplates.displayOrder);

    res.json(result);
  } catch (error) {
    console.error('Error fetching week tasks:', error);
    res.status(500).json({ error: 'Failed to fetch week tasks' });
  }
}

export async function getTaskTemplateById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .limit(1);

    if (!result.length) {
      return res.status(404).json({ error: 'Task template not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching task template:', error);
    res.status(500).json({ error: 'Failed to fetch task template' });
  }
}

export async function createTaskTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const validatedData = insertTaskTemplateSchema.parse({
      ...req.body,
      curriculumWeekId: id,
      createdBy: (req as any).user?.userId,
      lastModifiedBy: (req as any).user?.userId,
    });

    const result = await db
      .insert(taskTemplates)
      .values(validatedData)
      .returning();

    const newTask = result[0];

    // Sync the new task to all enrolled buddies
    const syncResult = await syncNewTaskToEnrolledBuddies(id, newTask);
    console.log(`[CREATE-TASK] Sync result:`, syncResult);

    res.status(201).json(newTask);
  } catch (error: any) {
    console.error('Error creating task template:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid task data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create task template' });
  }
}

export async function updateTaskTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db
      .update(taskTemplates)
      .set({
        ...req.body,
        lastModifiedBy: (req as any).user?.userId,
        updatedAt: new Date(),
      })
      .where(eq(taskTemplates.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Task template not found' });
    }

    // Sync task template updates to enrolled buddies
    const syncResult = await syncUpdatedTaskTemplate(id, req.body);
    console.log(`[UPDATE-TASK] Sync result:`, syncResult);

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating task template:', error);
    res.status(500).json({ error: 'Failed to update task template' });
  }
}

export async function deleteTaskTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Sync deletion to enrolled buddies first (removes task assignments that haven't started)
    const syncResult = await syncDeletedTask(id);
    console.log(`[DELETE-TASK] Sync result:`, syncResult);

    const result = await db
      .delete(taskTemplates)
      .where(eq(taskTemplates.id, id))
      .returning();

    if (!result.length) {
      return res.status(404).json({ error: 'Task template not found' });
    }

    res.json({ message: 'Task template deleted successfully', syncResult });
  } catch (error) {
    console.error('Error deleting task template:', error);
    res.status(500).json({ error: 'Failed to delete task template' });
  }
}

// ═══════════════════════════════════════════════════════════
// BUDDY CURRICULUM (Buddy-specific endpoints)
// ═══════════════════════════════════════════════════════════

export async function getBuddyCurriculum(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const progress = await getBuddyCurriculumProgress(id);

    if (!progress) {
      return res.status(404).json({ error: 'No curriculum assigned to this buddy' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching buddy curriculum:', error);
    res.status(500).json({ error: 'Failed to fetch buddy curriculum' });
  }
}

export async function getBuddyAssignments(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assignments = await db
      .select({
        assignment: taskAssignments,
        taskTemplate: taskTemplates,
        weekProgress: buddyWeekProgress,
        week: curriculumWeeks,
      })
      .from(taskAssignments)
      .leftJoin(taskTemplates, eq(taskAssignments.taskTemplateId, taskTemplates.id))
      .leftJoin(buddyWeekProgress, eq(taskAssignments.buddyWeekProgressId, buddyWeekProgress.id))
      .leftJoin(curriculumWeeks, eq(buddyWeekProgress.curriculumWeekId, curriculumWeeks.id))
      .where(eq(taskAssignments.buddyId, id))
      .orderBy(curriculumWeeks.displayOrder, taskTemplates.displayOrder);

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching buddy assignments:', error);
    res.status(500).json({ error: 'Failed to fetch buddy assignments' });
  }
}

// ═══════════════════════════════════════════════════════════
// CURRICULUM SUBMISSIONS (Manager/Mentor view all buddy submissions)
// ═══════════════════════════════════════════════════════════

export async function getCurriculumSubmissions(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get all weeks for this curriculum
    const weeks = await db
      .select()
      .from(curriculumWeeks)
      .where(eq(curriculumWeeks.curriculumId, id))
      .orderBy(curriculumWeeks.displayOrder);

    // Get all task templates for these weeks
    const weekIds = weeks.map(w => w.id);
    const tasks = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.curriculumWeekId, weekIds[0]))
      .orderBy(taskTemplates.displayOrder);

    // For each week, get task templates
    const weeksWithTasks = await Promise.all(
      weeks.map(async (week) => {
        const weekTasks = await db
          .select()
          .from(taskTemplates)
          .where(eq(taskTemplates.curriculumWeekId, week.id))
          .orderBy(taskTemplates.displayOrder);

        // For each task template, get all assignments and submissions
        const tasksWithSubmissions = await Promise.all(
          weekTasks.map(async (task) => {
            // Get all task assignments for this task template
            const assignments = await db
              .select({
                assignment: taskAssignments,
                buddy: buddies,
                user: users,
              })
              .from(taskAssignments)
              .leftJoin(buddies, eq(taskAssignments.buddyId, buddies.id))
              .leftJoin(users, eq(buddies.userId, users.id))
              .where(eq(taskAssignments.taskTemplateId, task.id));

            // For each assignment, get all submissions
            const assignmentsWithSubmissions = await Promise.all(
              assignments.map(async ({ assignment, buddy, user }) => {
                const submissions = await db
                  .select({
                    submission: newSubmissions,
                  })
                  .from(newSubmissions)
                  .where(eq(newSubmissions.taskAssignmentId, assignment.id))
                  .orderBy(desc(newSubmissions.version));

                // Get resources and feedback for each submission
                const submissionsWithDetails = await Promise.all(
                  submissions.map(async ({ submission }) => {
                    const resources = await db
                      .select()
                      .from(submissionResources)
                      .where(eq(submissionResources.submissionId, submission.id))
                      .orderBy(submissionResources.displayOrder);

                    const feedback = await db
                      .select()
                      .from(submissionFeedback)
                      .where(eq(submissionFeedback.submissionId, submission.id))
                      .orderBy(submissionFeedback.createdAt);

                    return {
                      ...submission,
                      resources,
                      feedbackCount: feedback.length,
                    };
                  })
                );

                return {
                  assignment,
                  buddy: buddy ? {
                    id: buddy.id,
                    name: user?.name || 'Unknown',
                    email: user?.email || '',
                    avatarUrl: user?.avatarUrl,
                    domainRole: buddy.domainRole,
                    status: buddy.status,
                  } : null,
                  submissions: submissionsWithDetails,
                  latestSubmission: submissionsWithDetails[0] || null,
                };
              })
            );

            return {
              taskTemplate: task,
              buddySubmissions: assignmentsWithSubmissions,
              totalBuddies: assignments.length,
              submittedCount: assignmentsWithSubmissions.filter(a => a.submissions.length > 0).length,
              completedCount: assignmentsWithSubmissions.filter(
                a => a.assignment.status === 'completed'
              ).length,
            };
          })
        );

        return {
          week,
          tasks: tasksWithSubmissions,
        };
      })
    );

    res.json({
      curriculumId: id,
      weeks: weeksWithTasks,
    });
  } catch (error) {
    console.error('Error fetching curriculum submissions:', error);
    res.status(500).json({ error: 'Failed to fetch curriculum submissions' });
  }
}
