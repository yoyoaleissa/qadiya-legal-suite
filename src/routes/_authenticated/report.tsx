import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirect old /report URL to new /reports page
export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Report Redirect — Qadiya OS" },
      { name: "description", content: "Redirects legacy report access to Qadiya OS case reports." },
      { property: "og:title", content: "Report Redirect — Qadiya OS" },
      { property: "og:description", content: "Redirects legacy report access to Qadiya OS case reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/reports" });
  },
  component: () => null,
});
