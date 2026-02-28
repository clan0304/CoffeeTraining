-- User's personal flavor vocabulary words
CREATE TABLE user_flavor_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, word)
);

CREATE INDEX idx_user_flavor_words_user_id ON user_flavor_words(user_id);
