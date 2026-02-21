-- Add settings JSONB column for type-specific room configuration
-- cup_tasters: {} (timer_minutes stays as existing column)
-- cupping: { "form_type": "sca" }
-- future game types: add their own keys without schema changes
ALTER TABLE rooms ADD COLUMN settings JSONB NOT NULL DEFAULT '{}';
