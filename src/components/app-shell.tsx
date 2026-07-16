import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Calendar,
  FileText,
  Gavel,
  LayoutDashboard,
  Sparkles,
  Moon,
  Receipt,
  Search,
  Sun,
  Users,
  Languages,
  CheckSquare,
  LogOut,
  X,
  MoreHorizontal,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { useIsAdmin } from "@/hooks/use-roles";
import { claimFirstAdmin } from "@/lib/roles.functions";
import { cn } from "@/lib/utils";
import { DemoTour } from "@/components/DemoTour";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/GlobalSearch";

type NavItem = {
  to: string;
  labelEn: string;
  labelAr: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", labelEn: "Dashboard", labelAr: "الرئيسية", icon: LayoutDashboard },
  {
    to: "/reports",
    labelEn: "Case Reports",
    labelAr: "تقارير القضايا",
    icon: FileText,
    highlight: true,
  },
  { to: "/clients", labelEn: "Clients & Cases", labelAr: "الموكّلون والقضايا", icon: Users },
  { to: "/calendar", labelEn: "Court Calendar", labelAr: "التقويم القضائي", icon: Calendar },
  { to: "/tasks", labelEn: "Tasks", labelAr: "المهام", icon: CheckSquare },
  { to: "/billing", labelEn: "Billing", labelAr: "الفاتورة", icon: Receipt, adminOnly: true },
  { to: "/documents", labelEn: "Documents", labelAr: "المستندات", icon: FileText },
  { to: "/ai-assistant", labelEn: "AI Assistant", labelAr: "المساعد الذكي", icon: Sparkles },
];

// Core icons for the mobile bottom navigation bar.
const BOTTOM_NAV: NavItem[] = [
  { to: "/", labelEn: "Dashboard", labelAr: "الرئيسية", icon: LayoutDashboard },
  { to: "/calendar", labelEn: "Calendar", labelAr: "التقويم", icon: Calendar },
  { to: "/tasks", labelEn: "Tasks", labelAr: "المهام", icon: CheckSquare },
  { to: "/clients", labelEn: "Clients", labelAr: "الموكّلون", icon: Users },
  { to: "/ai-assistant", labelEn: "AI", labelAr: "الذكاء", icon: Sparkles },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, lang, setLang, theme, toggleTheme, t } = useApp();
  const { isAdmin } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const runClaimAdmin = useServerFn(claimFirstAdmin);

  // Global Cmd/Ctrl+K opens the search palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Bootstrap: the first user to sign in becomes admin (no-op once an admin exists).
  useEffect(() => {
    runClaimAdmin()
      .then((r) => {
        if (r.claimed) queryClient.invalidateQueries({ queryKey: ["my-roles"] });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = NAV.filter((n) => !n.adminOnly || isAdmin);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-gold flex items-center justify-center text-navy">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-xl leading-none">
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {t("Qadiya OS", "قضية OS")}
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60 mt-1">
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {t("Kuwait Legal Suite", "منظومة المحاماة الكويتية")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {nav.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.to;
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
                n.highlight && !active && "ring-1 ring-sidebar-primary/40",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className={lang === "ar" ? "font-arabic" : ""}>{t(n.labelEn, n.labelAr)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
        <div>
          <span className={lang === "ar" ? "font-arabic" : ""}>
            {t("Live backend — Lovable Cloud", "خادم مباشر — لوفابل كلاود")}
          </span>
        </div>
        <div className="mt-1">v2.0 • {t("Kuwait", "الكويت")}</div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
        <SidebarContent />
      </aside>

      {/* Mobile "More" Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 end-4 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/60 backdrop-blur flex items-center justify-between px-4 md:px-6 gap-3">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2 font-display text-lg">
              <div className="h-7 w-7 rounded-md bg-gold flex items-center justify-center text-navy">
                <Gavel className="h-4 w-4" />
              </div>
              {t("Qadiya", "قضية")}
            </div>
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground w-56 lg:w-72"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className={cn("flex-1 text-start truncate", lang === "ar" && "font-arabic")}>
                {t("Search clients, cases, tasks…", "بحث الموكّلين والقضايا والمهام…")}
              </span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                ⌘K
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label={t("Search", "بحث")}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-[120px] sm:w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">{t("Partner", "شريك")}</SelectItem>
                <SelectItem value="associate">{t("Associate", "محامٍ")}</SelectItem>
                <SelectItem value="paralegal">{t("Paralegal", "مساعد قانوني")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="gap-1"
            >
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">{lang === "en" ? "AR" : "EN"}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5"
              title={t("Sign out", "تسجيل الخروج")}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Sign out", "تسجيل الخروج")}</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden pb-24 md:pb-6">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <div className="grid grid-cols-6">
          {BOTTOM_NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-colors",
                  active ? "text-gold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                <span className={lang === "ar" ? "font-arabic" : ""}>
                  {t(n.labelEn, n.labelAr)}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className={lang === "ar" ? "font-arabic" : ""}>{t("More", "المزيد")}</span>
          </button>
        </div>
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <DemoTour />
    </div>
  );
}
