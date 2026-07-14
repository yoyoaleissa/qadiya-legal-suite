import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirect old /report URL to new /reports page
export const Route = createFileRoute("/_authenticated/report")({
  beforeLoad: () => {
    throw redirect({ to: "/reports" });
  },
  component: () => null,
});
