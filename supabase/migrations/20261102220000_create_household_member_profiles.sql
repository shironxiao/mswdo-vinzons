CREATE TABLE IF NOT EXISTS public.household_member_profiles (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  household_member_id uuid NOT NULL,
  monthly_income numeric(10, 2) NULL DEFAULT 0,
  gov_assistance_availed text[] NULL DEFAULT '{}'::text[],
  characteristics_remarks text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  has_worked_dole boolean NULL,
  dole_employment_year integer NULL,
  has_received_government_assistance boolean NULL,
  government_assistance_year integer NULL,
  has_received_relief_assistance boolean NULL,
  other_income_source text NULL,
  flood_depth_level character varying(50) NULL,
  CONSTRAINT household_member_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT household_member_profiles_member_id_key UNIQUE (household_member_id),
  CONSTRAINT household_member_profiles_member_id_fkey
    FOREIGN KEY (household_member_id)
    REFERENCES public.household_members (id)
    ON DELETE CASCADE
);
