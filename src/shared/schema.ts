import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Clean union type for domain roles
export type DomainRole = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'qa' | 'hr';

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["manager", "mentor", "buddy"] }).notNull(),
  domainRole: text("domain_role", { enum: ["frontend", "backend", "fullstack", "devops", "qa", "hr"] }).notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const curriculum = pgTable("curriculum", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  domain: text("domain", { enum: ["frontend", "backend", "fullstack", "devops", "qa", "hr"] }).notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  content: text("content").notNull(),
  attachments: text("attachments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentors = pgTable("mentors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  expertise: text("expertise").notNull(),
  experience: text("experience").notNull(),
  responseRate: integer("response_rate").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buddies = pgTable("buddies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  assignedMentorId: uuid("assigned_mentor_id").references(() => mentors.id),
  status: text("status", { enum: ["active", "inactive", "exited"] }).default("active"),
  joinDate: timestamp("join_date").defaultNow().notNull(),
  progress: integer("progress").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorId: uuid("mentor_id").references(() => mentors.id).notNull(),
  buddyId: uuid("buddy_id").references(() => buddies.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status", { enum: ["pending", "in_progress", "completed", "overdue"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buddyId: uuid("buddy_id").references(() => buddies.id).notNull(),
  taskId: uuid("task_id").references(() => tasks.id).notNull(),
  githubLink: text("github_link"),
  deployedUrl: text("deployed_url"),
  notes: text("notes"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  domainRole: text("domain_role", { enum: ["frontend", "backend", "fullstack", "devops", "qa", "hr"] }).notNull(),
});

// Buddy-specific topics (tracks which topics are assigned to each buddy and their completion status)
export const buddyTopics = pgTable("buddy_topics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buddyId: uuid("buddy_id").references(() => buddies.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid("topic_id").references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  checked: boolean("checked").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url').notNull(),
  description: text('description'),
  type: varchar('type', { length: 64 }),
  category: varchar('category', { length: 64 }),
  difficulty: varchar('difficulty', { length: 32 }),
  duration: varchar('duration', { length: 32 }),
  author: varchar('author', { length: 128 }),
  tags: jsonb('tags').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const portfolio = pgTable('portfolio', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  buddyId: uuid('buddy_id').references(() => buddies.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  technologies: jsonb('technologies').$type<string[]>().default(sql`'[]'::jsonb`),
  links: jsonb('links').$type<{ label: string; url: string; type: 'github' | 'live' | 'other' }[]>().default(sql`'[]'::jsonb`).notNull(),
  resourceUrl: text('resource_url'),
  resourceType: text('resource_type'),
  resourceName: text('resource_name'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// NEW CURRICULUM MANAGEMENT SYSTEM
// ═══════════════════════════════════════════════════════════

// 1. Curriculums - Template for programs (one per domain role)
export const curriculums = pgTable("curriculums", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  domainRole: text("domain_role", {
    enum: ["frontend", "backend", "fullstack", "devops", "qa", "hr"]
  }).notNull(),
  totalWeeks: integer("total_weeks").notNull(),
  status: text("status", {
    enum: ["draft", "published", "archived"]
  }).default("draft"),
  publishedAt: timestamp("published_at"),
  version: text("version").default("1.0"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id),
  tags: jsonb("tags").$type<string[]>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Curriculum Weeks - Week definitions
export const curriculumWeeks = pgTable("curriculum_weeks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  curriculumId: uuid("curriculum_id")
    .references(() => curriculums.id, { onDelete: 'cascade' })
    .notNull(),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  learningObjectives: jsonb("learning_objectives").$type<string[]>(),
  resources: jsonb("resources").$type<{
    title: string;
    url: string;
    type: string;
    duration?: string;
  }[]>(),
  displayOrder: integer("display_order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Task Templates - Reusable task definitions
export const taskTemplates = pgTable("task_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  curriculumWeekId: uuid("curriculum_week_id")
    .references(() => curriculumWeeks.id, { onDelete: 'cascade' })
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  difficulty: text("difficulty", {
    enum: ["easy", "medium", "hard"]
  }),
  estimatedHours: integer("estimated_hours"),
  expectedResourceTypes: jsonb("expected_resource_types").$type<{
    type: string;
    label: string;
    required: boolean;
  }[]>(),
  resources: jsonb("resources").$type<{
    title: string;
    url: string;
    type: string;
  }[]>(),
  displayOrder: integer("display_order").notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Buddy Curriculums - Enrollment (auto-created when buddy joins)
export const buddyCurriculums = pgTable("buddy_curriculums", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buddyId: uuid("buddy_id")
    .references(() => buddies.id, { onDelete: 'cascade' })
    .notNull(),
  curriculumId: uuid("curriculum_id")
    .references(() => curriculums.id)
    .notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  targetCompletionDate: timestamp("target_completion_date"),
  completedAt: timestamp("completed_at"),
  currentWeek: integer("current_week").default(1),
  overallProgress: integer("overall_progress").default(0),
  status: text("status", {
    enum: ["active", "paused", "completed", "dropped"]
  }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 5. Buddy Week Progress - Track progress per week
export const buddyWeekProgress = pgTable("buddy_week_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buddyCurriculumId: uuid("buddy_curriculum_id")
    .references(() => buddyCurriculums.id, { onDelete: 'cascade' })
    .notNull(),
  curriculumWeekId: uuid("curriculum_week_id")
    .references(() => curriculumWeeks.id)
    .notNull(),
  weekNumber: integer("week_number").notNull(),
  totalTasks: integer("total_tasks").notNull(),
  completedTasks: integer("completed_tasks").default(0),
  progressPercentage: integer("progress_percentage").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  status: text("status", {
    enum: ["not_started", "in_progress", "completed"]
  }).default("not_started"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Task Assignments - Individual buddy task tracking
export const taskAssignments = pgTable("task_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  buddyId: uuid("buddy_id")
    .references(() => buddies.id, { onDelete: 'cascade' })
    .notNull(),
  taskTemplateId: uuid("task_template_id")
    .references(() => taskTemplates.id)
    .notNull(),
  buddyCurriculumId: uuid("buddy_curriculum_id")
    .references(() => buddyCurriculums.id, { onDelete: 'cascade' })
    .notNull(),
  buddyWeekProgressId: uuid("buddy_week_progress_id")
    .references(() => buddyWeekProgress.id, { onDelete: 'cascade' })
    .notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  dueDate: timestamp("due_date"),
  status: text("status", {
    enum: [
      "not_started",
      "in_progress",
      "submitted",
      "under_review",
      "needs_revision",
      "completed"
    ]
  }).default("not_started"),
  startedAt: timestamp("started_at"),
  firstSubmissionAt: timestamp("first_submission_at"),
  completedAt: timestamp("completed_at"),
  submissionCount: integer("submission_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 7. New Submissions (replaces old submissions table)
export const newSubmissions = pgTable("new_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskAssignmentId: uuid("task_assignment_id")
    .references(() => taskAssignments.id, { onDelete: 'cascade' })
    .notNull(),
  buddyId: uuid("buddy_id")
    .references(() => buddies.id)
    .notNull(),
  version: integer("version").notNull(),
  description: text("description").notNull(),
  notes: text("notes"),
  reviewStatus: text("review_status", {
    enum: ["pending", "under_review", "approved", "needs_revision", "rejected"]
  }).default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => mentors.id),
  reviewedAt: timestamp("reviewed_at"),
  grade: text("grade"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 8. Submission Resources - Multiple URLs/files per submission
export const submissionResources = pgTable("submission_resources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: uuid("submission_id")
    .references(() => newSubmissions.id, { onDelete: 'cascade' })
    .notNull(),
  type: text("type").notNull(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  filename: text("filename"),
  filesize: integer("filesize"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Submission Feedback - Conversation thread
export const submissionFeedback = pgTable("submission_feedback", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: uuid("submission_id")
    .references(() => newSubmissions.id, { onDelete: 'cascade' })
    .notNull(),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  authorRole: text("author_role", {
    enum: ["mentor", "buddy", "manager"]
  }).notNull(),
  message: text("message").notNull(),
  feedbackType: text("feedback_type", {
    enum: ["comment", "question", "approval", "revision_request", "reply"]
  }).notNull(),
  parentFeedbackId: uuid("parent_feedback_id").references((): any => submissionFeedback.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas using Zod validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorSchema = createInsertSchema(mentors).omit({
  id: true,
  createdAt: true,
});

export const insertBuddySchema = createInsertSchema(buddies).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
});

export const insertBuddyTopicSchema = createInsertSchema(buddyTopics).omit({
  id: true,
  createdAt: true,
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCurriculumSchema = createInsertSchema(curriculum).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolio).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// New Curriculum Management System Insert Schemas
export const insertCurriculumSchema2 = createInsertSchema(curriculums).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCurriculumWeekSchema = createInsertSchema(curriculumWeeks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskTemplateSchema = createInsertSchema(taskTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuddyCurriculumSchema = createInsertSchema(buddyCurriculums).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuddyWeekProgressSchema = createInsertSchema(buddyWeekProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNewSubmissionSchema = createInsertSchema(newSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubmissionResourceSchema = createInsertSchema(submissionResources).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionFeedbackSchema = createInsertSchema(submissionFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types - Use Drizzle's built-in type inference for Insert types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Mentor = typeof mentors.$inferSelect;
export type InsertMentor = typeof mentors.$inferInsert;
export type Buddy = typeof buddies.$inferSelect;
export type InsertBuddy = typeof buddies.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;
export type BuddyTopic = typeof buddyTopics.$inferSelect;
export type InsertBuddyTopic = typeof buddyTopics.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
export type Curriculum = typeof curriculum.$inferSelect;
export type InsertCurriculum = typeof curriculum.$inferInsert;
export type Portfolio = typeof portfolio.$inferSelect;
export type InsertPortfolio = typeof portfolio.$inferInsert;

// New Curriculum Management System Types
export type Curriculum2 = typeof curriculums.$inferSelect;
export type InsertCurriculum2 = typeof curriculums.$inferInsert;
export type CurriculumWeek = typeof curriculumWeeks.$inferSelect;
export type InsertCurriculumWeek = typeof curriculumWeeks.$inferInsert;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type InsertTaskTemplate = typeof taskTemplates.$inferInsert;
export type BuddyCurriculum = typeof buddyCurriculums.$inferSelect;
export type InsertBuddyCurriculum = typeof buddyCurriculums.$inferInsert;
export type BuddyWeekProgress = typeof buddyWeekProgress.$inferSelect;
export type InsertBuddyWeekProgress = typeof buddyWeekProgress.$inferInsert;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = typeof taskAssignments.$inferInsert;
export type NewSubmission = typeof newSubmissions.$inferSelect;
export type InsertNewSubmission = typeof newSubmissions.$inferInsert;
export type SubmissionResource = typeof submissionResources.$inferSelect;
export type InsertSubmissionResource = typeof submissionResources.$inferInsert;
export type SubmissionFeedback = typeof submissionFeedback.$inferSelect;
export type InsertSubmissionFeedback = typeof submissionFeedback.$inferInsert;