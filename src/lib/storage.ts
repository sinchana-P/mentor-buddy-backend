import { eq, and, like, desc, asc, sql, ilike, inArray } from 'drizzle-orm';
import { db } from './database.ts';
import * as schema from '../shared/schema.ts';
import { 
  type User, 
  type InsertUser, 
  type Mentor, 
  type InsertMentor,
  type Buddy,
  type InsertBuddy,
  type Task,
  type InsertTask,
  type Submission,
  type InsertSubmission,
  type Topic,
  type InsertTopic,
  type BuddyTopicProgress,
  type InsertBuddyTopicProgress,
  type Curriculum,
  type InsertCurriculum,
  type Resource,
  type InsertResource,
  type DomainRole
} from '../shared/schema.ts';

// Extended interface with all CRUD methods needed for the mentoring platform
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<any>;
  getRecentActivity(): Promise<any[]>;

  // Mentor management
  getMentors(filters: { role?: string; status?: string; search?: string }): Promise<any[]>;
  getMentorById(id: string): Promise<any>;
  createMentor(mentor: InsertMentor): Promise<Mentor>;
  updateMentor(id: string, updates: Partial<Mentor>): Promise<Mentor>;
  getMentorBuddies(mentorId: string, status?: string): Promise<any[]>;
  deleteMentor(id: string): Promise<void>;
  getAllMentors(filters?: { domain?: string; search?: string }): Promise<any[]>;

  // Buddy management
  getBuddyById(id: string): Promise<any>;
  getAllBuddies(filters?: { status?: string; domain?: string; search?: string }): Promise<any[]>;
  createBuddy(buddy: InsertBuddy): Promise<Buddy>;
  updateBuddy(id: string, updates: Partial<Buddy>): Promise<Buddy>;
  deleteBuddy(id: string): Promise<void>;
  getBuddyTasks(buddyId: string): Promise<any[]>;
  getBuddyProgress(buddyId: string): Promise<any>;
  updateBuddyTopicProgress(buddyId: string, topicId: string, checked: boolean): Promise<any>;
  getBuddyPortfolio(buddyId: string): Promise<any[]>;
  assignBuddyToMentor(buddyId: string, mentorId: string): Promise<any>;

  // Task management
  createTask(task: InsertTask): Promise<Task>;
  getTaskById(id: string): Promise<Task | undefined>;
  getAllTasks(filters?: { status?: string; search?: string; buddyId?: string }): Promise<any[]>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Submission management
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmissionsByTaskId(taskId: string): Promise<any[]>;

  // Topic management
  getTopics(domainRole?: string): Promise<Topic[]>;
  getAllTopics(): Promise<Topic[]>;
  getTopicById(id: string): Promise<Topic | undefined>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: string, updates: Partial<Topic>): Promise<Topic>;
  deleteTopic(id: string): Promise<void>;

  // Progress tracking
  createBuddyTopicProgress(progress: InsertBuddyTopicProgress): Promise<BuddyTopicProgress>;

  // Resource management
  getAllResources(filters?: { category?: string; difficulty?: string; type?: string; search?: string }): Promise<any[]>;
  getResourceById(id: string): Promise<any | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, updates: Partial<Resource>): Promise<Resource>;
  deleteResource(id: string): Promise<void>;
  
  // Curriculum management
  getAllCurriculum(filters?: { domain?: string; search?: string }): Promise<Curriculum[]>;
  getCurriculumById(id: string): Promise<Curriculum | undefined>;
  createCurriculum(curriculum: InsertCurriculum): Promise<Curriculum>;
  updateCurriculum(id: string, updates: Partial<Curriculum>): Promise<Curriculum>;
  deleteCurriculum(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(schema.users).orderBy(desc(schema.users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const result = await db.update(schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error('User not found');
    }
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }

  // Dashboard methods
  async getDashboardStats(): Promise<any> {
    const [mentorsCount, buddiesCount, tasksCount, completedTasksCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(schema.mentors),
      db.select({ count: sql<number>`count(*)` }).from(schema.buddies).where(eq(schema.buddies.status, 'active')),
      db.select({ count: sql<number>`count(*)` }).from(schema.tasks),
      db.select({ count: sql<number>`count(*)` }).from(schema.tasks).where(eq(schema.tasks.status, 'completed'))
    ]);

    return {
      totalMentors: mentorsCount[0]?.count || 0,
      totalBuddies: buddiesCount[0]?.count || 0,
      activeTasks: tasksCount[0]?.count || 0,
      completedTasks: completedTasksCount[0]?.count || 0,
      completionRate: tasksCount[0]?.count > 0 ? Math.round((completedTasksCount[0]?.count / tasksCount[0]?.count) * 100) : 0
    };
  }

  async getRecentActivity(): Promise<any[]> {
    // Get recent tasks with related data
    const recentTasks = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      status: schema.tasks.status,
      createdAt: schema.tasks.createdAt,
      mentorName: schema.users.name,
      buddyName: sql<string>`buddy_user.name`
    })
    .from(schema.tasks)
    .leftJoin(schema.mentors, eq(schema.tasks.mentorId, schema.mentors.id))
    .leftJoin(schema.users, eq(schema.mentors.userId, schema.users.id))
    .leftJoin(schema.buddies, eq(schema.tasks.buddyId, schema.buddies.id))
    .leftJoin(sql`${schema.users} as buddy_user`, sql`${schema.buddies.userId} = buddy_user.id`)
    .orderBy(desc(schema.tasks.createdAt))
    .limit(10);

    return recentTasks.map(task => ({
      id: task.id,
      type: 'task_assigned',
      message: `${task.mentorName} assigned "${task.title}" to ${task.buddyName}`,
      timestamp: task.createdAt,
      status: task.status
    }));
  }

  // Mentor methods
  async getMentors(filters: { role?: string; status?: string; search?: string }): Promise<any[]> {
    // Build where conditions
    const conditions = [];
    
    if (filters.role && filters.role !== 'all') {
      conditions.push(eq(schema.users.domainRole, filters.role as DomainRole));
    }

    if (filters.status && filters.status !== 'all') {
      const isActive = filters.status === 'active';
      conditions.push(eq(schema.mentors.isActive, isActive));
    }

    if (filters.search) {
      conditions.push(
        sql`${schema.users.name} ILIKE ${'%' + filters.search + '%'} OR ${schema.mentors.expertise} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const baseQuery = db.select({
      id: schema.mentors.id,
      userId: schema.mentors.userId,
      expertise: schema.mentors.expertise,
      experience: schema.mentors.experience,
      responseRate: schema.mentors.responseRate,
      isActive: schema.mentors.isActive,
      createdAt: schema.mentors.createdAt,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        domainRole: schema.users.domainRole,
        avatarUrl: schema.users.avatarUrl
      }
    })
    .from(schema.mentors)
    .leftJoin(schema.users, eq(schema.mentors.userId, schema.users.id));

    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const mentors = await query.orderBy(desc(schema.mentors.createdAt));

    // Get buddy counts for each mentor
    const mentorIds = mentors.map(m => m.id);
    let buddyCounts: any[] = [];
    
    if (mentorIds.length > 0) {
      buddyCounts = await db.select({
        mentorId: schema.buddies.assignedMentorId,
        count: sql<number>`count(*)`
      })
      .from(schema.buddies)
      .where(inArray(schema.buddies.assignedMentorId, mentorIds))
      .groupBy(schema.buddies.assignedMentorId);
    }

    return mentors.map(mentor => ({
      ...mentor,
      stats: {
        buddiesCount: buddyCounts.find(bc => bc.mentorId === mentor.id)?.count || 0,
        completedTasks: 0 // TODO: Calculate completed tasks
      }
    }));
  }

  async getMentorById(id: string): Promise<any> {
    const mentor = await db.select({
      id: schema.mentors.id,
      userId: schema.mentors.userId,
      expertise: schema.mentors.expertise,
      experience: schema.mentors.experience,
      responseRate: schema.mentors.responseRate,
      isActive: schema.mentors.isActive,
      createdAt: schema.mentors.createdAt,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        domainRole: schema.users.domainRole,
        avatarUrl: schema.users.avatarUrl
      }
    })
    .from(schema.mentors)
    .leftJoin(schema.users, eq(schema.mentors.userId, schema.users.id))
    .where(eq(schema.mentors.id, id))
    .limit(1);

    if (mentor.length === 0) return null;

    // Get stats
    const [buddiesCount, activeBuddiesCount, completedTasksCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` })
        .from(schema.buddies)
        .where(eq(schema.buddies.assignedMentorId, id)),
      db.select({ count: sql<number>`count(*)` })
        .from(schema.buddies)
        .where(and(
          eq(schema.buddies.assignedMentorId, id),
          eq(schema.buddies.status, 'active')
        )),
      db.select({ count: sql<number>`count(*)` })
        .from(schema.tasks)
        .where(and(
          eq(schema.tasks.mentorId, id),
          eq(schema.tasks.status, 'completed')
        ))
    ]);

    return {
      ...mentor[0],
      stats: {
        totalBuddies: buddiesCount[0]?.count || 0,
        activeBuddies: activeBuddiesCount[0]?.count || 0,
        completedTasks: completedTasksCount[0]?.count || 0,
        avgRating: 4.8 // Mock rating
      }
    };
  }

  async createMentor(insertMentor: InsertMentor): Promise<Mentor> {
    const result = await db.insert(schema.mentors).values(insertMentor).returning();
    return result[0];
  }

  async updateMentor(id: string, updates: Partial<Mentor>): Promise<Mentor> {
    const result = await db.update(schema.mentors)
      .set(updates)
      .where(eq(schema.mentors.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error('Mentor not found');
    }
    return result[0];
  }

  async deleteMentor(id: string): Promise<void> {
    await db.delete(schema.mentors).where(eq(schema.mentors.id, id));
  }

  async getMentorBuddies(mentorId: string, status?: string): Promise<any[]> {
    // Build where conditions
    const conditions = [eq(schema.buddies.assignedMentorId, mentorId)];
    
    if (status && status !== 'all') {
      conditions.push(eq(schema.buddies.status, status as any));
    }

    const query = db.select({
      id: schema.buddies.id,
      userId: schema.buddies.userId,
      assignedMentorId: schema.buddies.assignedMentorId,
      status: schema.buddies.status,
      joinDate: schema.buddies.joinDate,
      progress: schema.buddies.progress,
      createdAt: schema.buddies.createdAt,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        domainRole: schema.users.domainRole,
        avatarUrl: schema.users.avatarUrl
      }
    })
    .from(schema.buddies)
    .leftJoin(schema.users, eq(schema.buddies.userId, schema.users.id))
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const buddies = await query.orderBy(desc(schema.buddies.createdAt));

    // Get task stats for each buddy
    const buddyIds = buddies.map(b => b.id);
    let taskStats: any[] = [];
    
    if (buddyIds.length > 0) {
      taskStats = await db.select({
        buddyId: schema.tasks.buddyId,
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${schema.tasks.status} = 'completed')`
      })
      .from(schema.tasks)
      .where(inArray(schema.tasks.buddyId, buddyIds))
      .groupBy(schema.tasks.buddyId);
    }

    return buddies.map(buddy => ({
      ...buddy,
      stats: {
        totalTasks: taskStats.find(ts => ts.buddyId === buddy.id)?.total || 0,
        completedTasks: taskStats.find(ts => ts.buddyId === buddy.id)?.completed || 0
      }
    }));
  }

  async getAllMentors(filters?: { domain?: string; search?: string }): Promise<any[]> {
    return this.getMentors({ 
      role: filters?.domain, 
      status: 'all', 
      search: filters?.search 
    });
  }

  // Placeholder implementations for remaining methods
  // These would need full implementation based on your specific requirements

  // Buddy methods
  async getBuddyById(id: string): Promise<any> {
    const result = await db.select({
      id: schema.buddies.id,
      userId: schema.buddies.userId,
      assignedMentorId: schema.buddies.assignedMentorId,
      status: schema.buddies.status,
      joinDate: schema.buddies.joinDate,
      progress: schema.buddies.progress,
      createdAt: schema.buddies.createdAt,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        domainRole: schema.users.domainRole,
        avatarUrl: schema.users.avatarUrl
      }
    })
    .from(schema.buddies)
    .leftJoin(schema.users, eq(schema.buddies.userId, schema.users.id))
    .where(eq(schema.buddies.id, id))
    .limit(1);

    if (result.length === 0) return null;

    // Get mentor info if assigned
    const buddy = result[0];
    let mentor = null;
    if (buddy.assignedMentorId) {
      const mentorResult = await db.select({
        id: schema.mentors.id,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          domainRole: schema.users.domainRole
        }
      })
      .from(schema.mentors)
      .leftJoin(schema.users, eq(schema.mentors.userId, schema.users.id))
      .where(eq(schema.mentors.id, buddy.assignedMentorId))
      .limit(1);
      
      mentor = mentorResult[0] || null;
    }

    return {
      ...buddy,
      mentor
    };
  }

  async getAllBuddies(filters?: { status?: string; domain?: string; search?: string }): Promise<any[]> {
    // Build where conditions
    const conditions = [];
    
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(schema.buddies.status, filters.status as any));
    }

    if (filters?.domain && filters.domain !== 'all') {
      conditions.push(eq(schema.users.domainRole, filters.domain as DomainRole));
    }

    if (filters?.search) {
      conditions.push(
        sql`${schema.users.name} ILIKE ${'%' + filters.search + '%'} OR ${schema.users.email} ILIKE ${'%' + filters.search + '%'}`
      );
    }

    const baseQuery = db.select({
      id: schema.buddies.id,
      userId: schema.buddies.userId,
      assignedMentorId: schema.buddies.assignedMentorId,
      status: schema.buddies.status,
      joinDate: schema.buddies.joinDate,
      progress: schema.buddies.progress,
      createdAt: schema.buddies.createdAt,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        domainRole: schema.users.domainRole,
        avatarUrl: schema.users.avatarUrl
      }
    })
    .from(schema.buddies)
    .leftJoin(schema.users, eq(schema.buddies.userId, schema.users.id));

    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const buddies = await query.orderBy(desc(schema.buddies.createdAt));

    // Get mentor info for each buddy
    const buddyIds = buddies.map(b => b.id);
    const mentorIds = buddies.filter(b => b.assignedMentorId).map(b => b.assignedMentorId!);
    
    let mentorMap = new Map();
    if (mentorIds.length > 0) {
      const mentors = await db.select({
        id: schema.mentors.id,
        user: {
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          domainRole: schema.users.domainRole
        }
      })
      .from(schema.mentors)
      .leftJoin(schema.users, eq(schema.mentors.userId, schema.users.id))
      .where(inArray(schema.mentors.id, mentorIds));
      
      mentors.forEach(m => mentorMap.set(m.id, m));
    }

    // Get task stats for each buddy
    let taskStats: any[] = [];
    if (buddyIds.length > 0) {
      taskStats = await db.select({
        buddyId: schema.tasks.buddyId,
        total: sql<number>`count(*)`,
        completed: sql<number>`count(*) filter (where ${schema.tasks.status} = 'completed')`
      })
      .from(schema.tasks)
      .where(inArray(schema.tasks.buddyId, buddyIds))
      .groupBy(schema.tasks.buddyId);
    }

    return buddies.map(buddy => ({
      ...buddy,
      mentor: buddy.assignedMentorId ? mentorMap.get(buddy.assignedMentorId) || null : null,
      stats: {
        totalTasks: taskStats.find(ts => ts.buddyId === buddy.id)?.total || 0,
        completedTasks: taskStats.find(ts => ts.buddyId === buddy.id)?.completed || 0
      }
    }));
  }

  async createBuddy(buddy: InsertBuddy): Promise<Buddy> {
    const result = await db.insert(schema.buddies).values(buddy).returning();
    return result[0];
  }

  async updateBuddy(id: string, updates: Partial<Buddy>): Promise<Buddy> {
    const result = await db.update(schema.buddies).set(updates).where(eq(schema.buddies.id, id)).returning();
    if (result.length === 0) throw new Error('Buddy not found');
    return result[0];
  }

  async deleteBuddy(id: string): Promise<void> {
    await db.delete(schema.buddies).where(eq(schema.buddies.id, id));
  }

  async getBuddyTasks(buddyId: string): Promise<any[]> {
    const tasks = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      dueDate: schema.tasks.dueDate,
      createdAt: schema.tasks.createdAt,
      mentorId: schema.mentors.id,
      mentorName: schema.users.name,
      mentorEmail: schema.users.email
    })
    .from(schema.tasks)
    .leftJoin(schema.mentors, eq(schema.tasks.mentorId, schema.mentors.id))
    .leftJoin(schema.users, eq(schema.mentors.userId, schema.users.id))
    .where(eq(schema.tasks.buddyId, buddyId))
    .orderBy(desc(schema.tasks.createdAt));

    return tasks;
  }

  async getBuddyProgress(buddyId: string): Promise<any> {
    // Get all topics for the buddy's domain
    const buddy = await this.getBuddyById(buddyId);
    if (!buddy) return { topics: [], percentage: 0 };

    const domainTopics = await db.select()
      .from(schema.topics)
      .where(eq(schema.topics.domainRole, buddy.user.domainRole as DomainRole));

    // Get completed topics for this buddy
    const topicIds = domainTopics.map(t => t.id);
    let completedTopics: any[] = [];
    
    if (topicIds.length > 0) {
      completedTopics = await db.select()
        .from(schema.buddyTopicProgress)
        .where(and(
          eq(schema.buddyTopicProgress.buddyId, buddyId),
          eq(schema.buddyTopicProgress.checked, true),
          inArray(schema.buddyTopicProgress.topicId, topicIds)
        ));
    }

    const completedTopicIds = new Set(completedTopics.map(ct => ct.topicId));
    const topics = domainTopics.map(topic => ({
      ...topic,
      completed: completedTopicIds.has(topic.id)
    }));

    const percentage = domainTopics.length > 0 
      ? Math.round((completedTopics.length / domainTopics.length) * 100)
      : 0;

    return { topics, percentage };
  }

  async updateBuddyTopicProgress(buddyId: string, topicId: string, checked: boolean): Promise<any> {
    // Check if progress record exists
    const existing = await db.select()
      .from(schema.buddyTopicProgress)
      .where(and(
        eq(schema.buddyTopicProgress.buddyId, buddyId),
        eq(schema.buddyTopicProgress.topicId, topicId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      const updated = await db.update(schema.buddyTopicProgress)
        .set({ 
          checked, 
          completedAt: checked ? new Date() : null 
        })
        .where(and(
          eq(schema.buddyTopicProgress.buddyId, buddyId),
          eq(schema.buddyTopicProgress.topicId, topicId)
        ))
        .returning();
      return updated[0];
    } else {
      // Create new record
      const created = await db.insert(schema.buddyTopicProgress)
        .values({
          buddyId,
          topicId,
          checked,
          completedAt: checked ? new Date() : null
        })
        .returning();
      return created[0];
    }
  }

  async getBuddyPortfolio(buddyId: string): Promise<any[]> {
    // Get completed tasks as portfolio items
    const portfolioTasks = await db.select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      completedAt: schema.tasks.createdAt // Use createdAt as placeholder for completedAt
    })
    .from(schema.tasks)
    .where(and(
      eq(schema.tasks.buddyId, buddyId),
      eq(schema.tasks.status, 'completed')
    ))
    .orderBy(desc(schema.tasks.createdAt));

    // Get submissions for these tasks
    const taskIds = portfolioTasks.map(t => t.id);
    let submissions: any[] = [];
    
    if (taskIds.length > 0) {
      submissions = await db.select()
        .from(schema.submissions)
        .where(and(
          eq(schema.submissions.buddyId, buddyId),
          inArray(schema.submissions.taskId, taskIds)
        ));
    }

    // Group submissions by task
    const submissionMap = new Map();
    submissions.forEach(sub => {
      if (!submissionMap.has(sub.taskId)) {
        submissionMap.set(sub.taskId, []);
      }
      submissionMap.get(sub.taskId).push(sub);
    });

    return portfolioTasks.map(task => ({
      ...task,
      submissions: submissionMap.get(task.id) || []
    }));
  }

  async assignBuddyToMentor(buddyId: string, mentorId: string): Promise<any> {
    return this.updateBuddy(buddyId, { assignedMentorId: mentorId });
  }

  // Task methods
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(schema.tasks).values(task).returning();
    return result[0];
  }

  async getTaskById(id: string): Promise<Task | undefined> {
    const result = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1);
    return result[0];
  }

  async getAllTasks(filters?: { status?: string; search?: string; buddyId?: string }): Promise<any[]> {
    // Build where conditions
    const conditions = [];
    
    if (filters?.status && filters.status !== 'all') {
      conditions.push(eq(schema.tasks.status, filters.status as any));
    }
    
    if (filters?.buddyId) {
      conditions.push(eq(schema.tasks.buddyId, filters.buddyId));
    }
    
    const baseQuery = db.select().from(schema.tasks);
    
    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;
    
    return query.orderBy(desc(schema.tasks.createdAt));
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const result = await db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, id)).returning();
    if (result.length === 0) throw new Error('Task not found');
    return result[0];
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  }

  // Submission methods
  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const result = await db.insert(schema.submissions).values(submission).returning();
    return result[0];
  }

  async getSubmissionsByTaskId(taskId: string): Promise<any[]> {
    return db.select().from(schema.submissions).where(eq(schema.submissions.taskId, taskId));
  }

  // Topic methods
  async getTopics(domainRole?: string): Promise<Topic[]> {
    if (domainRole) {
      return db.select().from(schema.topics).where(eq(schema.topics.domainRole, domainRole as DomainRole));
    }
    return db.select().from(schema.topics);
  }

  async getAllTopics(): Promise<Topic[]> {
    return db.select().from(schema.topics);
  }

  async getTopicById(id: string): Promise<Topic | undefined> {
    const result = await db.select().from(schema.topics).where(eq(schema.topics.id, id)).limit(1);
    return result[0];
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const result = await db.insert(schema.topics).values(topic).returning();
    return result[0];
  }

  async updateTopic(id: string, updates: Partial<Topic>): Promise<Topic> {
    const result = await db.update(schema.topics).set(updates).where(eq(schema.topics.id, id)).returning();
    if (result.length === 0) throw new Error('Topic not found');
    return result[0];
  }

  async deleteTopic(id: string): Promise<void> {
    await db.delete(schema.topics).where(eq(schema.topics.id, id));
  }

  // Progress tracking methods
  async createBuddyTopicProgress(progress: InsertBuddyTopicProgress): Promise<BuddyTopicProgress> {
    const result = await db.insert(schema.buddyTopicProgress).values(progress).returning();
    return result[0];
  }

  // Resource methods
  async getAllResources(filters?: { category?: string; difficulty?: string; type?: string; search?: string }): Promise<Resource[]> {
    // Build where conditions
    const conditions = [];
    
    if (filters?.category && filters.category !== 'all') {
      conditions.push(eq(schema.resources.category, filters.category));
    }
    
    const baseQuery = db.select().from(schema.resources);
    
    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;
    
    return query.orderBy(desc(schema.resources.createdAt));
  }

  async getResourceById(id: string): Promise<Resource | undefined> {
    const result = await db.select().from(schema.resources).where(eq(schema.resources.id, id)).limit(1);
    return result[0];
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const result = await db.insert(schema.resources).values(resource).returning();
    return result[0];
  }

  async updateResource(id: string, updates: Partial<Resource>): Promise<Resource> {
    const result = await db.update(schema.resources).set(updates).where(eq(schema.resources.id, id)).returning();
    if (result.length === 0) throw new Error('Resource not found');
    return result[0];
  }

  async deleteResource(id: string): Promise<void> {
    await db.delete(schema.resources).where(eq(schema.resources.id, id));
  }

  // Curriculum methods
  async getAllCurriculum(filters?: { domain?: string; search?: string }): Promise<Curriculum[]> {
    // Build where conditions
    const conditions = [];
    
    if (filters?.domain && filters.domain !== 'all') {
      conditions.push(eq(schema.curriculum.domain, filters.domain as DomainRole));
    }
    
    const baseQuery = db.select().from(schema.curriculum);
    
    const query = conditions.length > 0 
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;
    
    return query.orderBy(desc(schema.curriculum.createdAt));
  }

  async getCurriculumById(id: string): Promise<Curriculum | undefined> {
    const result = await db.select().from(schema.curriculum).where(eq(schema.curriculum.id, id)).limit(1);
    return result[0];
  }

  async createCurriculum(curriculum: InsertCurriculum): Promise<Curriculum> {
    const result = await db.insert(schema.curriculum).values(curriculum).returning();
    return result[0];
  }

  async updateCurriculum(id: string, updates: Partial<Curriculum>): Promise<Curriculum> {
    const result = await db.update(schema.curriculum).set(updates).where(eq(schema.curriculum.id, id)).returning();
    if (result.length === 0) throw new Error('Curriculum not found');
    return result[0];
  }

  async deleteCurriculum(id: string): Promise<void> {
    await db.delete(schema.curriculum).where(eq(schema.curriculum.id, id));
  }
}

// Create and export storage instance
export const storage = new DatabaseStorage();