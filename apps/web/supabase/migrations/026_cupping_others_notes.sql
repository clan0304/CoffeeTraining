-- Add others' notes functionality to cupping_scores
-- Convert notes column from TEXT to JSONB for structured others' notes

-- First, backup existing notes data and convert to JSONB
ALTER TABLE cupping_scores 
ALTER COLUMN notes TYPE JSONB 
USING CASE 
  WHEN notes IS NULL OR notes = '' THEN NULL
  ELSE json_build_object('legacy_notes', notes)
END;

-- Add comment for clarity
COMMENT ON COLUMN cupping_scores.notes IS 'JSONB object containing others'' notes per attribute (aroma_others, acidity_others, etc.)';