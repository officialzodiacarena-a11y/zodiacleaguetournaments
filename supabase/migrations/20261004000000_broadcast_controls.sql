CREATE TABLE IF NOT EXISTS public.broadcast_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_scene TEXT NOT NULL DEFAULT 'STANDBY',
    active_match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.broadcast_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.broadcast_controls FOR SELECT USING (true);
CREATE POLICY "Enable update for admins" ON public.broadcast_controls FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF', 'SUPERADMIN'))
);

INSERT INTO public.broadcast_controls (active_scene) VALUES ('STANDBY');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_controls;
