import { sql } from 'drizzle-orm';
import { db, pool } from '../src/lib/database.js';

async function createCurriculumTables() {
  console.log('🚀 Creating curriculum management tables...');

  try {
    // Create curriculums table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS curriculums (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        slug TEXT NOT NULL UNIQUE,
        domain_role TEXT NOT NULL CHECK (domain_role IN ('frontend', 'backend', 'fullstack', 'devops', 'qa', 'hr')),
        total_weeks INTEGER NOT NULL,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        published_at TIMESTAMP,
        version TEXT DEFAULT '1.0',
        created_by UUID NOT NULL REFERENCES users(id),
        last_modified_by UUID REFERENCES users(id),
        tags JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ curriculums table created');

    // Create curriculum_weeks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS curriculum_weeks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curriculum_id UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
        week_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        learning_objectives JSONB,
        resources JSONB,
        display_order INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ curriculum_weeks table created');

    // Create task_templates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curriculum_week_id UUID NOT NULL REFERENCES curriculum_weeks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
        estimated_hours INTEGER,
        expected_resource_types JSONB,
        resources JSONB,
        display_order INTEGER NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id),
        last_modified_by UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ task_templates table created');

    // Create buddy_curriculums table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS buddy_curriculums (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buddy_id UUID NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
        curriculum_id UUID NOT NULL REFERENCES curriculums(id),
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        target_completion_date TIMESTAMP,
        completed_at TIMESTAMP,
        current_week INTEGER DEFAULT 1,
        overall_progress INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped')),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ buddy_curriculums table created');

    // Create buddy_week_progress table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS buddy_week_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buddy_curriculum_id UUID NOT NULL REFERENCES buddy_curriculums(id) ON DELETE CASCADE,
        curriculum_week_id UUID NOT NULL REFERENCES curriculum_weeks(id),
        week_number INTEGER NOT NULL,
        total_tasks INTEGER NOT NULL,
        completed_tasks INTEGER DEFAULT 0,
        progress_percentage INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ buddy_week_progress table created');

    // Create task_assignments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buddy_id UUID NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
        task_template_id UUID NOT NULL REFERENCES task_templates(id),
        buddy_curriculum_id UUID NOT NULL REFERENCES buddy_curriculums(id) ON DELETE CASCADE,
        buddy_week_progress_id UUID NOT NULL REFERENCES buddy_week_progress(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW() NOT NULL,
        due_date TIMESTAMP,
        status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'needs_revision', 'completed')),
        started_at TIMESTAMP,
        first_submission_at TIMESTAMP,
        completed_at TIMESTAMP,
        submission_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ task_assignments table created');

    // Rename old submissions table to legacy_submissions
    await db.execute(sql`
      ALTER TABLE IF EXISTS submissions RENAME TO legacy_submissions;
    `);
    console.log('✅ Old submissions table renamed to legacy_submissions');

    // Create new submissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
        buddy_id UUID NOT NULL REFERENCES buddies(id),
        version INTEGER NOT NULL,
        description TEXT NOT NULL,
        notes TEXT,
        review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'under_review', 'approved', 'needs_revision', 'rejected')),
        reviewed_by UUID REFERENCES mentors(id),
        reviewed_at TIMESTAMP,
        grade TEXT,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ submissions table created');

    // Create submission_resources table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submission_resources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        url TEXT NOT NULL,
        filename TEXT,
        filesize INTEGER,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ submission_resources table created');

    // Create submission_feedback table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submission_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES users(id),
        author_role TEXT NOT NULL CHECK (author_role IN ('mentor', 'buddy', 'manager')),
        message TEXT NOT NULL,
        feedback_type TEXT NOT NULL CHECK (feedback_type IN ('comment', 'question', 'approval', 'revision_request', 'reply')),
        parent_feedback_id UUID REFERENCES submission_feedback(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log('✅ submission_feedback table created');

    console.log('\n🎉 All curriculum management tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createCurriculumTables();
