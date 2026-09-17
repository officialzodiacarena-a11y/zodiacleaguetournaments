-- Enable public spectator access to matches, teams, and related data
-- Allows unauthenticated users to view match details and replays for live streaming/replay viewing

-- Policy: Allow anon/public read access to matches
DROP POLICY IF EXISTS "matches_public_read_policy" ON public.matches;
CREATE POLICY "matches_public_read_policy" ON public.matches
  FOR SELECT
  USING (true);

-- Policy: Allow anon/public read access to teams
DROP POLICY IF EXISTS "teams_public_read_policy" ON public.teams;
CREATE POLICY "teams_public_read_policy" ON public.teams
  FOR SELECT
  USING (true);

-- Policy: Allow anon/public read access to match_games
DROP POLICY IF EXISTS "match_games_public_read_policy" ON public.match_games;
CREATE POLICY "match_games_public_read_policy" ON public.match_games
  FOR SELECT
  USING (true);

-- Policy: Allow anon/public read access to map_vetoes
DROP POLICY IF EXISTS "map_vetoes_public_read_policy" ON public.map_vetoes;
CREATE POLICY "map_vetoes_public_read_policy" ON public.map_vetoes
  FOR SELECT
  USING (true);

-- Policy: Allow anon/public read access to match_replays (already implemented via API, but explicit RLS is safer)
DROP POLICY IF EXISTS "match_replays_public_read_policy" ON public.match_replays;
CREATE POLICY "match_replays_public_read_policy" ON public.match_replays
  FOR SELECT
  USING (true);
