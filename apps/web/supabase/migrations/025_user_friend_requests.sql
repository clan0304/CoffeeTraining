-- Friend request system (replaces direct add with request/accept flow)
CREATE TABLE user_friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sender_id, recipient_id),
  CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_friend_requests_sender ON user_friend_requests(sender_id);
CREATE INDEX idx_friend_requests_recipient ON user_friend_requests(recipient_id);
CREATE INDEX idx_friend_requests_status ON user_friend_requests(status);

