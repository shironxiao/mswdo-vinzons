ALTER TABLE public.barangay_evacuation_assignments
  ADD COLUMN IF NOT EXISTS center_ids uuid[];

UPDATE public.barangay_evacuation_assignments
SET center_ids = CASE
  WHEN center_id IS NULL AND backup_center_id IS NOT NULL THEN ARRAY[backup_center_id]
  WHEN center_id IS NULL THEN ARRAY[]::uuid[]
  WHEN backup_center_id IS NULL OR backup_center_id = center_id THEN ARRAY[center_id]
  ELSE ARRAY[center_id, backup_center_id]
END
WHERE center_ids IS NULL OR cardinality(center_ids) = 0;

ALTER TABLE public.barangay_evacuation_assignments
  ALTER COLUMN center_ids SET DEFAULT ARRAY[]::uuid[],
  ALTER COLUMN center_ids SET NOT NULL;
