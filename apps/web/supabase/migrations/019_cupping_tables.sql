-- Cupping sessions, samples, and scores

-- A cupping session (solo or room-based)
CREATE TABLE cupping_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual samples within a session
CREATE TABLE cupping_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES cupping_sessions(id) ON DELETE CASCADE,
  sample_number INT NOT NULL,
  sample_label TEXT NOT NULL DEFAULT '',
  roast_level SMALLINT CHECK (roast_level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user scores for a sample (JSONB for form-specific data)
CREATE TABLE cupping_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID NOT NULL REFERENCES cupping_samples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL DEFAULT 'sca',
  scores JSONB NOT NULL DEFAULT '{}',
  total_score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sample_id, user_id)
);

-- Indexes
CREATE INDEX idx_cupping_sessions_user ON cupping_sessions(user_id);
CREATE INDEX idx_cupping_samples_session ON cupping_samples(session_id);
CREATE INDEX idx_cupping_scores_sample ON cupping_scores(sample_id);
CREATE INDEX idx_cupping_scores_user ON cupping_scores(user_id);
