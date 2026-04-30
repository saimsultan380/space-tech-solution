-- Create chat_events table
CREATE TABLE IF NOT EXISTS public.chat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view events in their channels" ON public.chat_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_channel_members
            WHERE channel_id = chat_events.channel_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create events in their channels" ON public.chat_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_channel_members
            WHERE channel_id = chat_events.channel_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Creators can update their events" ON public.chat_events
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their events" ON public.chat_events
    FOR DELETE USING (creator_id = auth.uid());
