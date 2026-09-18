import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirect old /report-bot URL to new /reports page
export const Route = createFileRoute("/_authenticated/report-bot")({
  head: () => ({
    meta: [
      { title: "Report Bot Redirect — Qadiya OS" },
      { name: "description", content: "Redirects legacy report bot access to Qadiya OS case reports." },
      { property: "og:title", content: "Report Bot Redirect — Qadiya OS" },
      { property: "og:description", content: "Redirects legacy report bot access to Qadiya OS case reports." },
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
