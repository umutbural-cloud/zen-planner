REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted() FROM authenticated;

CREATE OR REPLACE FUNCTION public.purge_soft_deleted()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin','service_role') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM public.tasks WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.notes WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.projects WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.journal_entries WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
  DELETE FROM public.backlog_tasks WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted() FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_soft_deleted() FROM authenticated;