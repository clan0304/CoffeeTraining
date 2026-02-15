-- Add room type column to distinguish cup_tasters vs cupping rooms
ALTER TABLE rooms ADD COLUMN type TEXT NOT NULL DEFAULT 'cup_tasters';

CREATE INDEX idx_rooms_type ON rooms(type);
