GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_firm_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.belongs_to_firm(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_firm_for_current_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_firm_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_invitation_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_legal_knowledge(vector, integer) TO authenticated;