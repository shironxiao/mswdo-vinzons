DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.barangay_evacuation_assignments
    GROUP BY lower(btrim(barangay)), lower(btrim(purok))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate barangay/purok evacuation assignments exist. Remove or merge duplicates before applying this migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS barangay_evacuation_assignments_location_key
  ON public.barangay_evacuation_assignments (
    lower(btrim(barangay)),
    lower(btrim(purok))
  );
