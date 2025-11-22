import { db } from './database.js';
import {
  curriculums,
  curriculumWeeks,
  taskTemplates,
  buddyCurriculums,
  buddyWeekProgress,
  taskAssignments,
} from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Auto-assigns a published curriculum to a buddy based on their domain role
 * This creates:
 * - Buddy curriculum enrollment
 * - Week progress records for all weeks
 * - Task assignments for all tasks (unlocked from day 1)
 */
export async function autoAssignCurriculum(buddyId: string, domainRole: string) {
  console.log(`[AUTO-ASSIGN] Starting auto-assignment for buddy ${buddyId}, domain: ${domainRole}`);

  try {
    // 1. Find published curriculum for this domain role
    const publishedCurriculums = await db
      .select()
      .from(curriculums)
      .where(
        and(
          eq(curriculums.domainRole, domainRole),
          eq(curriculums.status, 'published'),
          eq(curriculums.isActive, true)
        )
      )
      .limit(1);

    if (!publishedCurriculums.length) {
      console.log(`[AUTO-ASSIGN] No published curriculum found for domain: ${domainRole}`);
      return {
        success: false,
        message: `No published curriculum available for ${domainRole}`,
        curriculum: null,
        totalTasks: 0
      };
    }

    const curriculum = publishedCurriculums[0];
    console.log(`[AUTO-ASSIGN] Found curriculum: ${curriculum.name} (${curriculum.id})`);

    // 2. Calculate target completion date (current date + totalWeeks * 7 days)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (curriculum.totalWeeks * 7));

    // 3. Create buddy curriculum enrollment
    const enrollment = await db
      .insert(buddyCurriculums)
      .values({
        buddyId,
        curriculumId: curriculum.id,
        targetCompletionDate: targetDate,
        currentWeek: 1,
        overallProgress: 0,
        status: 'active'
      })
      .returning();

    console.log(`[AUTO-ASSIGN] Created enrollment: ${enrollment[0].id}`);

    // 4. Get all weeks for this curriculum
    const weeks = await db
      .select()
      .from(curriculumWeeks)
      .where(eq(curriculumWeeks.curriculumId, curriculum.id))
      .orderBy(curriculumWeeks.displayOrder);

    console.log(`[AUTO-ASSIGN] Found ${weeks.length} weeks`);

    let totalTasksAssigned = 0;

    // 5. For each week, create progress tracking and task assignments
    for (const week of weeks) {
      console.log(`[AUTO-ASSIGN] Processing Week ${week.weekNumber}: ${week.title}`);

      // Get all tasks for this week
      const tasks = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.curriculumWeekId, week.id))
        .orderBy(taskTemplates.displayOrder);

      console.log(`[AUTO-ASSIGN]   Found ${tasks.length} tasks in Week ${week.weekNumber}`);

      // Create week progress record
      const weekProgressRecord = await db
        .insert(buddyWeekProgress)
        .values({
          buddyCurriculumId: enrollment[0].id,
          curriculumWeekId: week.id,
          weekNumber: week.weekNumber,
          totalTasks: tasks.length,
          completedTasks: 0,
          progressPercentage: 0,
          status: 'not_started'
        })
        .returning();

      console.log(`[AUTO-ASSIGN]   Created week progress: ${weekProgressRecord[0].id}`);

      // Calculate due date for tasks in this week (current date + weekNumber * 7 days)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (week.weekNumber * 7));

      // Create task assignments for ALL tasks (no locking!)
      for (const task of tasks) {
        await db.insert(taskAssignments).values({
          buddyId,
          taskTemplateId: task.id,
          buddyCurriculumId: enrollment[0].id,
          buddyWeekProgressId: weekProgressRecord[0].id,
          dueDate,
          status: 'not_started',
          submissionCount: 0
        });

        totalTasksAssigned++;
      }

      console.log(`[AUTO-ASSIGN]   Assigned ${tasks.length} tasks for Week ${week.weekNumber}`);
    }

    console.log(`[AUTO-ASSIGN] ✅ Auto-assignment complete!`);
    console.log(`[AUTO-ASSIGN]    - Curriculum: ${curriculum.name}`);
    console.log(`[AUTO-ASSIGN]    - Weeks: ${weeks.length}`);
    console.log(`[AUTO-ASSIGN]    - Total tasks assigned: ${totalTasksAssigned}`);
    console.log(`[AUTO-ASSIGN]    - All tasks visible from day 1!`);

    return {
      success: true,
      message: 'Curriculum auto-assigned successfully',
      curriculum: {
        id: curriculum.id,
        name: curriculum.name,
        totalWeeks: curriculum.totalWeeks
      },
      totalTasks: totalTasksAssigned,
      enrollmentId: enrollment[0].id
    };

  } catch (error) {
    console.error('[AUTO-ASSIGN] Error during auto-assignment:', error);
    return {
      success: false,
      message: 'Failed to auto-assign curriculum',
      error: error instanceof Error ? error.message : 'Unknown error',
      curriculum: null,
      totalTasks: 0
    };
  }
}

/**
 * Assigns a specific curriculum to a buddy by curriculum ID
 * Used when manager manually selects a curriculum during buddy creation
 */
export async function assignCurriculumById(buddyId: string, curriculumId: string) {
  console.log(`[ASSIGN-CURRICULUM] Starting assignment for buddy ${buddyId}, curriculum: ${curriculumId}`);

  try {
    // 1. Get the curriculum by ID
    const curriculumData = await db
      .select()
      .from(curriculums)
      .where(eq(curriculums.id, curriculumId))
      .limit(1);

    if (!curriculumData.length) {
      console.log(`[ASSIGN-CURRICULUM] Curriculum not found: ${curriculumId}`);
      return {
        success: false,
        message: `Curriculum not found`,
        curriculum: null,
        totalTasks: 0
      };
    }

    const curriculum = curriculumData[0];

    // Check if curriculum is published
    if (curriculum.status !== 'published') {
      console.log(`[ASSIGN-CURRICULUM] Curriculum is not published: ${curriculum.status}`);
      return {
        success: false,
        message: `Curriculum is not published (status: ${curriculum.status})`,
        curriculum: null,
        totalTasks: 0
      };
    }

    console.log(`[ASSIGN-CURRICULUM] Found curriculum: ${curriculum.name} (${curriculum.id})`);

    // 2. Calculate target completion date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (curriculum.totalWeeks * 7));

    // 3. Create buddy curriculum enrollment
    const enrollment = await db
      .insert(buddyCurriculums)
      .values({
        buddyId,
        curriculumId: curriculum.id,
        targetCompletionDate: targetDate,
        currentWeek: 1,
        overallProgress: 0,
        status: 'active'
      })
      .returning();

    console.log(`[ASSIGN-CURRICULUM] Created enrollment: ${enrollment[0].id}`);

    // 4. Get all weeks for this curriculum
    const weeks = await db
      .select()
      .from(curriculumWeeks)
      .where(eq(curriculumWeeks.curriculumId, curriculum.id))
      .orderBy(curriculumWeeks.displayOrder);

    console.log(`[ASSIGN-CURRICULUM] Found ${weeks.length} weeks`);

    let totalTasksAssigned = 0;

    // 5. For each week, create progress tracking and task assignments
    for (const week of weeks) {
      console.log(`[ASSIGN-CURRICULUM] Processing Week ${week.weekNumber}: ${week.title}`);

      const tasks = await db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.curriculumWeekId, week.id))
        .orderBy(taskTemplates.displayOrder);

      console.log(`[ASSIGN-CURRICULUM]   Found ${tasks.length} tasks in Week ${week.weekNumber}`);

      const weekProgressRecord = await db
        .insert(buddyWeekProgress)
        .values({
          buddyCurriculumId: enrollment[0].id,
          curriculumWeekId: week.id,
          weekNumber: week.weekNumber,
          totalTasks: tasks.length,
          completedTasks: 0,
          progressPercentage: 0,
          status: 'not_started'
        })
        .returning();

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (week.weekNumber * 7));

      for (const task of tasks) {
        await db.insert(taskAssignments).values({
          buddyId,
          taskTemplateId: task.id,
          buddyCurriculumId: enrollment[0].id,
          buddyWeekProgressId: weekProgressRecord[0].id,
          dueDate,
          status: 'not_started',
          submissionCount: 0
        });

        totalTasksAssigned++;
      }

      console.log(`[ASSIGN-CURRICULUM]   Assigned ${tasks.length} tasks for Week ${week.weekNumber}`);
    }

    console.log(`[ASSIGN-CURRICULUM] ✅ Curriculum assignment complete!`);
    console.log(`[ASSIGN-CURRICULUM]    - Curriculum: ${curriculum.name}`);
    console.log(`[ASSIGN-CURRICULUM]    - Weeks: ${weeks.length}`);
    console.log(`[ASSIGN-CURRICULUM]    - Total tasks assigned: ${totalTasksAssigned}`);

    return {
      success: true,
      message: 'Curriculum assigned successfully',
      curriculum: {
        id: curriculum.id,
        name: curriculum.name,
        totalWeeks: curriculum.totalWeeks
      },
      totalTasks: totalTasksAssigned,
      enrollmentId: enrollment[0].id
    };

  } catch (error) {
    console.error('[ASSIGN-CURRICULUM] Error during assignment:', error);
    return {
      success: false,
      message: 'Failed to assign curriculum',
      error: error instanceof Error ? error.message : 'Unknown error',
      curriculum: null,
      totalTasks: 0
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRICULUM SYNC FUNCTIONS
// These functions sync curriculum template changes to all enrolled buddies
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sync a newly added week to all buddies enrolled in this curriculum
 * Creates week progress records and task assignments for existing enrollments
 */
export async function syncNewWeekToEnrolledBuddies(curriculumId: string, week: any) {
  console.log(`[SYNC-WEEK] Syncing new week ${week.weekNumber} to enrolled buddies`);

  try {
    // Get all active enrollments for this curriculum
    const enrollments = await db
      .select()
      .from(buddyCurriculums)
      .where(
        and(
          eq(buddyCurriculums.curriculumId, curriculumId),
          eq(buddyCurriculums.status, 'active')
        )
      );

    if (!enrollments.length) {
      console.log(`[SYNC-WEEK] No active enrollments found for curriculum ${curriculumId}`);
      return { success: true, syncedCount: 0 };
    }

    console.log(`[SYNC-WEEK] Found ${enrollments.length} active enrollments to sync`);

    // Get tasks for this week (if any already exist)
    const tasks = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.curriculumWeekId, week.id))
      .orderBy(taskTemplates.displayOrder);

    let syncedCount = 0;

    for (const enrollment of enrollments) {
      // Check if week progress already exists
      const existingProgress = await db
        .select()
        .from(buddyWeekProgress)
        .where(
          and(
            eq(buddyWeekProgress.buddyCurriculumId, enrollment.id),
            eq(buddyWeekProgress.curriculumWeekId, week.id)
          )
        )
        .limit(1);

      if (existingProgress.length) {
        console.log(`[SYNC-WEEK] Week progress already exists for enrollment ${enrollment.id}, skipping`);
        continue;
      }

      // Create week progress record
      const weekProgressRecord = await db
        .insert(buddyWeekProgress)
        .values({
          buddyCurriculumId: enrollment.id,
          curriculumWeekId: week.id,
          weekNumber: week.weekNumber,
          totalTasks: tasks.length,
          completedTasks: 0,
          progressPercentage: 0,
          status: 'not_started'
        })
        .returning();

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (week.weekNumber * 7));

      // Create task assignments for existing tasks
      for (const task of tasks) {
        await db.insert(taskAssignments).values({
          buddyId: enrollment.buddyId,
          taskTemplateId: task.id,
          buddyCurriculumId: enrollment.id,
          buddyWeekProgressId: weekProgressRecord[0].id,
          dueDate,
          status: 'not_started',
          submissionCount: 0
        });
      }

      syncedCount++;
      console.log(`[SYNC-WEEK] Synced week ${week.weekNumber} for buddy ${enrollment.buddyId}`);
    }

    console.log(`[SYNC-WEEK] ✅ Synced new week to ${syncedCount} buddies`);
    return { success: true, syncedCount };

  } catch (error) {
    console.error('[SYNC-WEEK] Error syncing new week:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync a newly added task to all buddies enrolled in the curriculum
 * Creates task assignments for all existing enrollments
 */
export async function syncNewTaskToEnrolledBuddies(weekId: string, taskTemplate: any) {
  console.log(`[SYNC-TASK] Syncing new task "${taskTemplate.title}" to enrolled buddies`);

  try {
    // Get the week to find the curriculum
    const weekData = await db
      .select()
      .from(curriculumWeeks)
      .where(eq(curriculumWeeks.id, weekId))
      .limit(1);

    if (!weekData.length) {
      console.log(`[SYNC-TASK] Week not found: ${weekId}`);
      return { success: false, message: 'Week not found' };
    }

    const week = weekData[0];

    // Get all active enrollments for this curriculum
    const enrollments = await db
      .select()
      .from(buddyCurriculums)
      .where(
        and(
          eq(buddyCurriculums.curriculumId, week.curriculumId),
          eq(buddyCurriculums.status, 'active')
        )
      );

    if (!enrollments.length) {
      console.log(`[SYNC-TASK] No active enrollments found`);
      return { success: true, syncedCount: 0 };
    }

    console.log(`[SYNC-TASK] Found ${enrollments.length} active enrollments to sync`);

    let syncedCount = 0;

    for (const enrollment of enrollments) {
      // Get the week progress record for this enrollment
      const weekProgress = await db
        .select()
        .from(buddyWeekProgress)
        .where(
          and(
            eq(buddyWeekProgress.buddyCurriculumId, enrollment.id),
            eq(buddyWeekProgress.curriculumWeekId, weekId)
          )
        )
        .limit(1);

      if (!weekProgress.length) {
        console.log(`[SYNC-TASK] No week progress found for enrollment ${enrollment.id}, creating...`);
        // Create week progress if it doesn't exist
        const newWeekProgress = await db
          .insert(buddyWeekProgress)
          .values({
            buddyCurriculumId: enrollment.id,
            curriculumWeekId: weekId,
            weekNumber: week.weekNumber,
            totalTasks: 1,
            completedTasks: 0,
            progressPercentage: 0,
            status: 'not_started'
          })
          .returning();
        weekProgress.push(newWeekProgress[0]);
      }

      // Check if task assignment already exists
      const existingAssignment = await db
        .select()
        .from(taskAssignments)
        .where(
          and(
            eq(taskAssignments.buddyId, enrollment.buddyId),
            eq(taskAssignments.taskTemplateId, taskTemplate.id)
          )
        )
        .limit(1);

      if (existingAssignment.length) {
        console.log(`[SYNC-TASK] Task assignment already exists for buddy ${enrollment.buddyId}, skipping`);
        continue;
      }

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (week.weekNumber * 7));

      // Create task assignment
      await db.insert(taskAssignments).values({
        buddyId: enrollment.buddyId,
        taskTemplateId: taskTemplate.id,
        buddyCurriculumId: enrollment.id,
        buddyWeekProgressId: weekProgress[0].id,
        dueDate,
        status: 'not_started',
        submissionCount: 0
      });

      // Update week progress total tasks count
      await db
        .update(buddyWeekProgress)
        .set({ totalTasks: weekProgress[0].totalTasks + 1 })
        .where(eq(buddyWeekProgress.id, weekProgress[0].id));

      syncedCount++;
      console.log(`[SYNC-TASK] Created task assignment for buddy ${enrollment.buddyId}`);
    }

    console.log(`[SYNC-TASK] ✅ Synced new task to ${syncedCount} buddies`);
    return { success: true, syncedCount };

  } catch (error) {
    console.error('[SYNC-TASK] Error syncing new task:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Handle task deletion - removes task assignments only if not started
 * Keeps assignments that have any progress to preserve history
 */
export async function syncDeletedTask(taskTemplateId: string) {
  console.log(`[SYNC-DELETE-TASK] Processing deletion for task template ${taskTemplateId}`);

  try {
    // Get all assignments for this task
    const assignments = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.taskTemplateId, taskTemplateId));

    let deletedCount = 0;
    let preservedCount = 0;

    for (const assignment of assignments) {
      if (assignment.status === 'not_started') {
        // Delete assignments that haven't been started
        await db
          .delete(taskAssignments)
          .where(eq(taskAssignments.id, assignment.id));
        deletedCount++;
      } else {
        // Keep assignments with progress but mark task template as deleted
        preservedCount++;
      }
    }

    console.log(`[SYNC-DELETE-TASK] ✅ Deleted ${deletedCount} not-started assignments, preserved ${preservedCount} with progress`);
    return { success: true, deletedCount, preservedCount };

  } catch (error) {
    console.error('[SYNC-DELETE-TASK] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Handle week deletion - removes week progress and task assignments
 * Only removes items that haven't been started
 */
export async function syncDeletedWeek(weekId: string) {
  console.log(`[SYNC-DELETE-WEEK] Processing deletion for week ${weekId}`);

  try {
    // Get all tasks in this week first
    const tasks = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.curriculumWeekId, weekId));

    // Delete task assignments for each task
    for (const task of tasks) {
      await syncDeletedTask(task.id);
    }

    // Get all week progress records for this week
    const weekProgressRecords = await db
      .select()
      .from(buddyWeekProgress)
      .where(eq(buddyWeekProgress.curriculumWeekId, weekId));

    let deletedCount = 0;

    for (const progress of weekProgressRecords) {
      if (progress.status === 'not_started' && progress.completedTasks === 0) {
        await db
          .delete(buddyWeekProgress)
          .where(eq(buddyWeekProgress.id, progress.id));
        deletedCount++;
      }
    }

    console.log(`[SYNC-DELETE-WEEK] ✅ Deleted ${deletedCount} week progress records`);
    return { success: true, deletedCount };

  } catch (error) {
    console.error('[SYNC-DELETE-WEEK] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync task template updates to all enrolled buddies
 * Updates task assignments when template details change
 */
export async function syncUpdatedTaskTemplate(taskTemplateId: string, updates: any) {
  console.log(`[SYNC-UPDATE-TASK] Syncing task template updates for ${taskTemplateId}`);

  try {
    // Get all task assignments for this template
    const assignments = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.taskTemplateId, taskTemplateId));

    if (!assignments.length) {
      console.log(`[SYNC-UPDATE-TASK] No assignments found for this task template`);
      return { success: true, updatedCount: 0 };
    }

    // If the task template hasn't been started by buddies, we can update more freely
    // For tasks in progress, we preserve the current state
    let updatedCount = 0;

    for (const assignment of assignments) {
      // Only update assignments that haven't been started
      if (assignment.status === 'not_started') {
        // Could update due dates or other assignment properties here if needed
        // For now, the task template update itself is sufficient as assignments reference it
        updatedCount++;
      }
    }

    console.log(`[SYNC-UPDATE-TASK] ✅ Task template updated, ${assignments.length} assignments reference it`);
    return { success: true, updatedCount: assignments.length };

  } catch (error) {
    console.error('[SYNC-UPDATE-TASK] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync week updates to all enrolled buddies
 * Recalculates due dates if week number changed
 */
export async function syncUpdatedWeek(weekId: string, updates: any) {
  console.log(`[SYNC-UPDATE-WEEK] Syncing week updates for ${weekId}`);

  try {
    // Get the week
    const weekData = await db
      .select()
      .from(curriculumWeeks)
      .where(eq(curriculumWeeks.id, weekId))
      .limit(1);

    if (!weekData.length) {
      return { success: false, message: 'Week not found' };
    }

    const week = weekData[0];

    // Get all week progress records for this week
    const weekProgressRecords = await db
      .select()
      .from(buddyWeekProgress)
      .where(eq(buddyWeekProgress.curriculumWeekId, weekId));

    let updatedCount = 0;

    // If week number changed, update due dates
    if (updates.weekNumber && updates.weekNumber !== week.weekNumber) {
      console.log(`[SYNC-UPDATE-WEEK] Week number changed, updating due dates...`);

      for (const progress of weekProgressRecords) {
        // Get all task assignments for this week progress
        const assignments = await db
          .select()
          .from(taskAssignments)
          .where(eq(taskAssignments.buddyWeekProgressId, progress.id));

        // Calculate new due date based on new week number
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + (updates.weekNumber * 7));

        // Update due dates for not-started tasks
        for (const assignment of assignments) {
          if (assignment.status === 'not_started') {
            await db
              .update(taskAssignments)
              .set({ dueDate: newDueDate })
              .where(eq(taskAssignments.id, assignment.id));
            updatedCount++;
          }
        }
      }
    }

    // Update week number in progress records if changed
    if (updates.weekNumber && updates.weekNumber !== week.weekNumber) {
      await db
        .update(buddyWeekProgress)
        .set({ weekNumber: updates.weekNumber })
        .where(eq(buddyWeekProgress.curriculumWeekId, weekId));
    }

    console.log(`[SYNC-UPDATE-WEEK] ✅ Updated ${updatedCount} task assignments`);
    return { success: true, updatedCount };

  } catch (error) {
    console.error('[SYNC-UPDATE-WEEK] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Sync curriculum updates to all enrolled buddies
 * Updates enrollment records and recalculates completion dates
 */
export async function syncUpdatedCurriculum(curriculumId: string, updates: any) {
  console.log(`[SYNC-UPDATE-CURRICULUM] Syncing curriculum updates for ${curriculumId}`);

  try {
    // Get all active enrollments for this curriculum
    const enrollments = await db
      .select()
      .from(buddyCurriculums)
      .where(
        and(
          eq(buddyCurriculums.curriculumId, curriculumId),
          eq(buddyCurriculums.status, 'active')
        )
      );

    if (!enrollments.length) {
      console.log(`[SYNC-UPDATE-CURRICULUM] No active enrollments found`);
      return { success: true, updatedCount: 0 };
    }

    let updatedCount = 0;

    // If total weeks changed, recalculate target completion dates
    if (updates.totalWeeks) {
      console.log(`[SYNC-UPDATE-CURRICULUM] Total weeks changed, updating target completion dates...`);

      for (const enrollment of enrollments) {
        // Calculate new target date based on enrollment start date
        const enrollmentDate = new Date(enrollment.enrolledAt);
        const newTargetDate = new Date(enrollmentDate);
        newTargetDate.setDate(newTargetDate.getDate() + (updates.totalWeeks * 7));

        await db
          .update(buddyCurriculums)
          .set({ targetCompletionDate: newTargetDate })
          .where(eq(buddyCurriculums.id, enrollment.id));

        updatedCount++;
      }
    }

    console.log(`[SYNC-UPDATE-CURRICULUM] ✅ Updated ${updatedCount} enrollments`);
    return { success: true, updatedCount };

  } catch (error) {
    console.error('[SYNC-UPDATE-CURRICULUM] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Recalculate week progress totals after changes
 */
export async function recalculateWeekProgress(weekProgressId: string) {
  try {
    const weekProgress = await db
      .select()
      .from(buddyWeekProgress)
      .where(eq(buddyWeekProgress.id, weekProgressId))
      .limit(1);

    if (!weekProgress.length) return;

    // Count active task assignments for this week
    const assignments = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.buddyWeekProgressId, weekProgressId));

    const totalTasks = assignments.length;
    const completedTasks = assignments.filter(a =>
      a.status === 'completed' || a.status === 'approved'
    ).length;
    const progressPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    await db
      .update(buddyWeekProgress)
      .set({
        totalTasks,
        completedTasks,
        progressPercentage
      })
      .where(eq(buddyWeekProgress.id, weekProgressId));

    console.log(`[RECALC] Updated week progress ${weekProgressId}: ${completedTasks}/${totalTasks} (${progressPercentage}%)`);

  } catch (error) {
    console.error('[RECALC] Error recalculating week progress:', error);
  }
}

/**
 * Get buddy's curriculum enrollment and progress
 */
export async function getBuddyCurriculumProgress(buddyId: string) {
  try {
    // Get enrollment
    const enrollments = await db
      .select()
      .from(buddyCurriculums)
      .where(eq(buddyCurriculums.buddyId, buddyId))
      .limit(1);

    if (!enrollments.length) {
      return null;
    }

    const enrollment = enrollments[0];

    // Get curriculum details
    const curriculumData = await db
      .select()
      .from(curriculums)
      .where(eq(curriculums.id, enrollment.curriculumId))
      .limit(1);

    // Get week progress
    const weekProgressData = await db
      .select()
      .from(buddyWeekProgress)
      .where(eq(buddyWeekProgress.buddyCurriculumId, enrollment.id))
      .orderBy(buddyWeekProgress.weekNumber);

    // Get total task assignments
    const assignments = await db
      .select()
      .from(taskAssignments)
      .where(eq(taskAssignments.buddyId, buddyId));

    const completedAssignments = assignments.filter(a => a.status === 'completed');

    return {
      enrollment,
      curriculum: curriculumData[0],
      weekProgress: weekProgressData,
      totalTasks: assignments.length,
      completedTasks: completedAssignments.length,
      overallProgress: assignments.length > 0
        ? Math.round((completedAssignments.length / assignments.length) * 100)
        : 0
    };
  } catch (error) {
    console.error('[GET-PROGRESS] Error fetching buddy curriculum progress:', error);
    return null;
  }
}
