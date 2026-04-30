-- Create personal_notes table for private user note-taking
CREATE TABLE IF NOT EXISTS public.personal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    color TEXT DEFAULT 'gray',
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_notes
CREATE POLICY "Users can only see their own personal notes"
    ON public.personal_notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own personal notes"
    ON public.personal_notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own personal notes"
    ON public.personal_notes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own personal notes"
    ON public.personal_notes FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_personal_notes_user_id ON public.personal_notes(user_id);

-- Create index for pinned status
CREATE INDEX IF NOT EXISTS idx_personal_notes_pinned ON public.personal_notes(pinned);

-- Add trigger for updated_at
CREATE TRIGGER tr_personal_notes_updated_at BEFORE UPDATE ON public.personal_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
