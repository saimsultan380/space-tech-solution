ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS allowed_modules TEXT[];

