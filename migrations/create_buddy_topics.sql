-- Create buddy_topics table for buddy-specific topics
CREATE TABLE IF NOT EXISTS buddy_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_id UUID NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  category TEXT,
  checked BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_buddy_topics_buddy_id ON buddy_topics(buddy_id);

-- Add comment to table
COMMENT ON TABLE buddy_topics IS 'Stores buddy-specific learning topics created when buddy is added';
