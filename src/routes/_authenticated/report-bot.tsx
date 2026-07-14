import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirect old /report-bot URL to new /reports page
export const Route = createFileRoute("/_authenticated/report-bot")({
  beforeLoad: () => {
    throw redirect({ to: "/reports" });
  },
  component: () => null,
});