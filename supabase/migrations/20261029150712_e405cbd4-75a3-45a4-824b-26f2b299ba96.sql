CREATE OR REPLACE FUNCTION public.post_stats(_ids uuid[])
RETURNS TABLE (post_id uuid, like_count bigint, view_count bigint, share_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
    (SELECT count(*) FROM public.post_likes l WHERE l.post_id = p.id),
    (SELECT count(*) FROM public.events e WHERE e.post_id = p.id AND e.event_type = 'view_post'),
    (SELECT count(*) FROM public.events e WHERE e.post_id = p.id AND e.event_type = 'share')
  FROM unnest(_ids) AS p(id);
$$;

GRANT EXECUTE ON FUNCTION public.post_stats(uuid[]) TO anon, authenticated;

CREATE POLICY "Profil dapat dilihat semua orang" ON public.profiles FOR SELECT USING (true);