import { Request, Response } from 'express';
import { db } from '../lib/database.js';
import {
  newSubmissions,
  submissionResources,
  submissionFeedback,
  taskAssignments,
  buddyWeekProgress,
  buddyCurriculums,
  taskTemplates,
  insertNewSubmissionSchema,
  insertSubmissionResourceSchema,
  insertSubmissionFeedbackSchema,
} from '../shared/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

// ═══════════════════════════════════════════════════════════
// TASK ASSIGNMENT ACTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Mark task assignment as started
 * POST /api/task-assignments/:id/start
 */
export async function startTaskAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const buddyId = (req as any).user?.buddyId;

    // Verify ownership
    const assignment = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.id, id))
      .limit(1);

    if (!assignment.length) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }

    if (assignment[0].buddyId !== buddyId && (req as any).user?.role !== 'manager' && (req as any).user?.role !== 'mentor') {
      return res.status(403).json({ error: 'Not authorized to modify this assignment' });
    }

    const result = await db
      .update(taskAssignments)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, id))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error starting task assignment:', error);
    res.status(500).json({ error: 'Failed to start task assignment' });
  }
}

/**
 * Submit task assignment
 * POST /api/task-assignments/:id/submit
 * Body: { description, notes, resources: [{ type, label, url }] }
 */
export async function submitTaskAssignment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { description, notes, resources } = req.body;
    const buddyId = (req as any).user?.buddyId;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!resources || !Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ error: 'At least one resource is required' });
    }

    // Verify ownership
    const assignment = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.id, id))
      .limit(1);

    if (!assignment.length) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }

    if (assignment[0].buddyId !== buddyId) {
      return res.status(403).json({ error: 'Not authorized to submit this assignment' });
    }

    // Get current submission count for versioning
    const existingSubmissions = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.taskAssignmentId, id));

    const version = existingSubmissions.length + 1;

    // Create submission
    const submission = await db
      .insert(newSubmissions)
      .values({
        taskAssignmentId: id,
        buddyId: assignment[0].buddyId,
        version,
        description,
        notes: notes || null,
        reviewStatus: 'pending',
      })
      .returning();

    // Create submission resources
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      await db.insert(submissionResources).values({
        submissionId: submission[0].id,
        type: resource.type,
        label: resource.label,
        url: resource.url,
        filename: resource.filename || null,
        filesize: resource.filesize || null,
        displayOrder: i,
      });
    }

    // Update task assignment
    await db
      .update(taskAssignments)
      .set({
        status: 'submitted',
        submissionCount: version,
        firstSubmissionAt: version === 1 ? new Date() : assignment[0].firstSubmissionAt,
        updatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, id));

    // Get complete submission with resources
    const completeSubmission = await getSubmissionWithDetails(submission[0].id);

    res.status(201).json(completeSubmission);
  } catch (error) {
    console.error('Error submitting task assignment:', error);
    res.status(500).json({ error: 'Failed to submit task assignment' });
  }
}

/**
 * Get task assignment details
 * GET /api/task-assignments/:id
 */
export async function getTaskAssignmentById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const assignment = await db
      .select({
        assignment: taskAssignments,
        taskTemplate: taskTemplates,
      })
      .from(taskAssignments)
      .leftJoin(taskTemplates, eq(taskAssignments.taskTemplateId, taskTemplates.id))
      .where(eq(taskAssignments.id, id))
      .limit(1);

    if (!assignment.length) {
      return res.status(404).json({ error: 'Task assignment not found' });
    }

    res.json(assignment[0]);
  } catch (error) {
    console.error('Error fetching task assignment:', error);
    res.status(500).json({ error: 'Failed to fetch task assignment' });
  }
}

// ═══════════════════════════════════════════════════════════
// SUBMISSIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get all submissions for a task assignment
 * GET /api/task-assignments/:id/submissions
 */
export async function getTaskAssignmentSubmissions(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const submissions = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.taskAssignmentId, id))
      .orderBy(desc(newSubmissions.version));

    // Get resources for each submission
    const submissionsWithResources = await Promise.all(
      submissions.map(async (submission) => {
        const resources = await db
          .select()
          .from(submissionResources)
          .where(eq(submissionResources.submissionId, submission.id))
          .orderBy(submissionResources.displayOrder);

        return { ...submission, resources };
      })
    );

    res.json(submissionsWithResources);
  } catch (error) {
    console.error('Error fetching task assignment submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

/**
 * Get submission details by ID
 * GET /api/submissions/:id
 */
export async function getSubmissionById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const submission = await getSubmissionWithDetails(id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
}

/**
 * Update submission (before review)
 * PATCH /api/submissions/:id
 */
export async function updateSubmission(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { description, notes } = req.body;
    const buddyId = (req as any).user?.buddyId;

    const submission = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.id, id))
      .limit(1);

    if (!submission.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission[0].buddyId !== buddyId) {
      return res.status(403).json({ error: 'Not authorized to update this submission' });
    }

    if (submission[0].reviewStatus !== 'pending') {
      return res.status(400).json({ error: 'Cannot update submission after review has started' });
    }

    const result = await db
      .update(newSubmissions)
      .set({
        description: description || submission[0].description,
        notes: notes !== undefined ? notes : submission[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(newSubmissions.id, id))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating submission:', error);
    res.status(500).json({ error: 'Failed to update submission' });
  }
}

/**
 * Delete submission (only if pending)
 * DELETE /api/submissions/:id
 */
export async function deleteSubmission(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const buddyId = (req as any).user?.buddyId;

    const submission = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.id, id))
      .limit(1);

    if (!submission.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission[0].buddyId !== buddyId && (req as any).user?.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to delete this submission' });
    }

    if (submission[0].reviewStatus !== 'pending') {
      return res.status(400).json({ error: 'Cannot delete submission after review has started' });
    }

    await db.delete(newSubmissions).where(eq(newSubmissions.id, id));

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
}

// ═══════════════════════════════════════════════════════════
// REVIEW ACTIONS (Mentor/Manager)
// ═══════════════════════════════════════════════════════════

/**
 * Approve submission
 * POST /api/submissions/:id/approve
 * Body: { grade? }
 */
export async function approveSubmission(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { grade } = req.body;
    const mentorId = (req as any).user?.mentorId;
    const userId = (req as any).user?.userId;

    const submission = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.id, id))
      .limit(1);

    if (!submission.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update submission
    await db
      .update(newSubmissions)
      .set({
        reviewStatus: 'approved',
        reviewedBy: mentorId || null,
        reviewedAt: new Date(),
        grade: grade || null,
        updatedAt: new Date(),
      })
      .where(eq(newSubmissions.id, id));

    // Update task assignment to completed
    await db
      .update(taskAssignments)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, submission[0].taskAssignmentId));

    // Update week progress
    await updateWeekProgress(submission[0].taskAssignmentId);

    // Create approval feedback
    await db.insert(submissionFeedback).values({
      submissionId: id,
      authorId: userId,
      authorRole: (req as any).user?.role,
      message: grade ? `Approved with grade: ${grade}` : 'Approved',
      feedbackType: 'approval',
    });

    const updatedSubmission = await getSubmissionWithDetails(id);
    res.json(updatedSubmission);
  } catch (error) {
    console.error('Error approving submission:', error);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
}

/**
 * Request revision on submission
 * POST /api/submissions/:id/request-revision
 * Body: { message }
 */
export async function requestRevision(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const mentorId = (req as any).user?.mentorId;
    const userId = (req as any).user?.userId;

    if (!message) {
      return res.status(400).json({ error: 'Feedback message is required' });
    }

    const submission = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.id, id))
      .limit(1);

    if (!submission.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update submission
    await db
      .update(newSubmissions)
      .set({
        reviewStatus: 'needs_revision',
        reviewedBy: mentorId || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(newSubmissions.id, id));

    // Update task assignment back to in_progress
    await db
      .update(taskAssignments)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, submission[0].taskAssignmentId));

    // Create revision request feedback
    await db.insert(submissionFeedback).values({
      submissionId: id,
      authorId: userId,
      authorRole: (req as any).user?.role,
      message,
      feedbackType: 'revision_request',
    });

    const updatedSubmission = await getSubmissionWithDetails(id);
    res.json(updatedSubmission);
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ error: 'Failed to request revision' });
  }
}

/**
 * Reject submission
 * POST /api/submissions/:id/reject
 * Body: { message }
 */
export async function rejectSubmission(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const mentorId = (req as any).user?.mentorId;
    const userId = (req as any).user?.userId;

    if (!message) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const submission = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.id, id))
      .limit(1);

    if (!submission.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update submission
    await db
      .update(newSubmissions)
      .set({
        reviewStatus: 'rejected',
        reviewedBy: mentorId || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(newSubmissions.id, id));

    // Update task assignment back to not_started
    await db
      .update(taskAssignments)
      .set({
        status: 'not_started',
        updatedAt: new Date(),
      })
      .where(eq(taskAssignments.id, submission[0].taskAssignmentId));

    // Create rejection feedback
    await db.insert(submissionFeedback).values({
      submissionId: id,
      authorId: userId,
      authorRole: (req as any).user?.role,
      message,
      feedbackType: 'revision_request',
    });

    const updatedSubmission = await getSubmissionWithDetails(id);
    res.json(updatedSubmission);
  } catch (error) {
    console.error('Error rejecting submission:', error);
    res.status(500).json({ error: 'Failed to reject submission' });
  }
}

// ═══════════════════════════════════════════════════════════
// FEEDBACK / COMMENTS
// ═══════════════════════════════════════════════════════════

/**
 * Add feedback/comment to submission
 * POST /api/submissions/:id/feedback
 * Body: { message, feedbackType, parentFeedbackId? }
 */
export async function addFeedback(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { message, feedbackType, parentFeedbackId } = req.body;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const submission = await db
      .select()
      .from(newSubmissions)
      .where(eq(newSubmissions.id, id))
      .limit(1);

    if (!submission.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const feedback = await db
      .insert(submissionFeedback)
      .values({
        submissionId: id,
        authorId: userId,
        authorRole: userRole,
        message,
        feedbackType: feedbackType || 'comment',
        parentFeedbackId: parentFeedbackId || null,
      })
      .returning();

    res.status(201).json(feedback[0]);
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ error: 'Failed to add feedback' });
  }
}

/**
 * Get all feedback for a submission
 * GET /api/submissions/:id/feedback
 */
export async function getSubmissionFeedback(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const feedback = await db
      .select()
      .from(submissionFeedback)
      .where(eq(submissionFeedback.submissionId, id))
      .orderBy(submissionFeedback.createdAt);

    res.json(feedback);
  } catch (error) {
    console.error('Error fetching submission feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
}

/**
 * Update feedback
 * PATCH /api/feedback/:id
 */
export async function updateFeedback(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = (req as any).user?.userId;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const feedback = await db
      .select()
      .from(submissionFeedback)
      .where(eq(submissionFeedback.id, id))
      .limit(1);

    if (!feedback.length) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedback[0].authorId !== userId && (req as any).user?.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to update this feedback' });
    }

    const result = await db
      .update(submissionFeedback)
      .set({
        message,
        updatedAt: new Date(),
      })
      .where(eq(submissionFeedback.id, id))
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
}

/**
 * Delete feedback
 * DELETE /api/feedback/:id
 */
export async function deleteFeedback(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const feedback = await db
      .select()
      .from(submissionFeedback)
      .where(eq(submissionFeedback.id, id))
      .limit(1);

    if (!feedback.length) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedback[0].authorId !== userId && (req as any).user?.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to delete this feedback' });
    }

    await db.delete(submissionFeedback).where(eq(submissionFeedback.id, id));

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
}

// ═══════════════════════════════════════════════════════════
// MENTOR REVIEW QUEUE
// ═══════════════════════════════════════════════════════════

/**
 * Get mentor's review queue
 * GET /api/mentors/:id/review-queue
 */
export async function getMentorReviewQueue(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Get all submissions for buddies assigned to this mentor
    const submissions = await db
      .select({
        submission: newSubmissions,
        assignment: taskAssignments,
        taskTemplate: taskTemplates,
      })
      .from(newSubmissions)
      .innerJoin(taskAssignments, eq(newSubmissions.taskAssignmentId, taskAssignments.id))
      .innerJoin(taskTemplates, eq(taskAssignments.taskTemplateId, taskTemplates.id))
      .where(
        and(
          sql`${taskAssignments.buddyId} IN (
            SELECT id FROM buddies WHERE assigned_mentor_id = ${id}
          )`,
          sql`${newSubmissions.reviewStatus} IN ('pending', 'under_review')`
        )
      )
      .orderBy(newSubmissions.submittedAt);

    // Get resources for each submission
    const submissionsWithResources = await Promise.all(
      submissions.map(async (item) => {
        const resources = await db
          .select()
          .from(submissionResources)
          .where(eq(submissionResources.submissionId, item.submission.id))
          .orderBy(submissionResources.displayOrder);

        return { ...item, resources };
      })
    );

    res.json(submissionsWithResources);
  } catch (error) {
    console.error('Error fetching mentor review queue:', error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function getSubmissionWithDetails(submissionId: string) {
  const submission = await db
    .select()
    .from(newSubmissions)
    .where(eq(newSubmissions.id, submissionId))
    .limit(1);

  if (!submission.length) {
    return null;
  }

  const resources = await db
    .select()
    .from(submissionResources)
    .where(eq(submissionResources.submissionId, submissionId))
    .orderBy(submissionResources.displayOrder);

  const feedback = await db
    .select()
    .from(submissionFeedback)
    .where(eq(submissionFeedback.submissionId, submissionId))
    .orderBy(submissionFeedback.createdAt);

  return {
    ...submission[0],
    resources,
    feedback,
  };
}

async function updateWeekProgress(taskAssignmentId: string) {
  try {
    // Get the task assignment
    const assignment = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.id, taskAssignmentId))
      .limit(1);

    if (!assignment.length) return;

    const weekProgressId = assignment[0].buddyWeekProgressId;
    if (!weekProgressId) return;

    // Count completed tasks in this week
    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskAssignments)
      .where(
        and(
          eq(taskAssignments.buddyWeekProgressId, weekProgressId),
          eq(taskAssignments.status, 'completed')
        )
      );

    // Get total tasks for this week
    const weekProgress = await db
      .select()
      .from(buddyWeekProgress)
      .where(eq(buddyWeekProgress.id, weekProgressId))
      .limit(1);

    if (!weekProgress.length) return;

    const totalTasks = weekProgress[0].totalTasks || 0;
    const completed = Number(completedCount[0]?.count || 0);
    const progressPercentage = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    // Update week progress
    await db
      .update(buddyWeekProgress)
      .set({
        completedTasks: completed,
        progressPercentage,
        status: progressPercentage === 100 ? 'completed' : progressPercentage > 0 ? 'in_progress' : 'not_started',
        completedAt: progressPercentage === 100 ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(buddyWeekProgress.id, weekProgressId));

    // Update overall curriculum progress
    const buddyCurriculumId = assignment[0].buddyCurriculumId;
    if (buddyCurriculumId) {
      await updateCurriculumProgress(buddyCurriculumId);
    }
  } catch (error) {
    console.error('Error updating week progress:', error);
  }
}

async function updateCurriculumProgress(buddyCurriculumId: string) {
  try {
    // Count all completed tasks for this curriculum
    const completedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskAssignments)
      .where(
        and(
          eq(taskAssignments.buddyCurriculumId, buddyCurriculumId),
          eq(taskAssignments.status, 'completed')
        )
      );

    // Count total tasks
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taskAssignments)
      .where(eq(taskAssignments.buddyCurriculumId, buddyCurriculumId));

    const completed = Number(completedCount[0]?.count || 0);
    const total = Number(totalCount[0]?.count || 0);
    const overallProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update buddy curriculum
    await db
      .update(buddyCurriculums)
      .set({
        overallProgress,
        completedAt: overallProgress === 100 ? new Date() : null,
        status: overallProgress === 100 ? 'completed' : 'active',
        updatedAt: new Date(),
      })
      .where(eq(buddyCurriculums.id, buddyCurriculumId));
  } catch (error) {
    console.error('Error updating curriculum progress:', error);
  }
}
