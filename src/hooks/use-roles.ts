import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles } from "@/lib/roles.functions";

/** Fetch the current user's roles (cached). */
export function useMyRoles() {
  const run = useServerFn(getMyRoles);
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: () => run(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Convenience flag for admin-gated UI. */
export function useIsAdmin() {
  const { data, isLoading } = useMyRoles();
  return { isAdmin: (data ?? []).includes("admin"), isLoading };
}
