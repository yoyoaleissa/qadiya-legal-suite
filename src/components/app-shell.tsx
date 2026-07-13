import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Calendar,
  FileText,
  Gavel,
  LayoutDashboard,
  Lock,
  Moon,
  Receipt,
  Sun,
  Users,
  Languages,
  CheckSquare,
} from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  labelEn: string;
  labelAr: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", labelEn: "Dashboard", labelAr: "الرئيسية", icon: LayoutDashboard },
  { to: "/report-bot", labelEn: "Report Bot", labelAr: "روبوت التقارير", icon: Bot, highlight: true },
  { to: "/clients", labelEn: "Clients & Cases", labelAr: "العملاء والقضايا", icon: Users },
  { to: "/calendar", labelEn: "Court Calendar", labelAr: "التقويم القضائي", icon: Calendar },
  { to: "/tasks", labelEn: "Tasks", labelAr: "المهام", icon: CheckSquare },
  { to: "/billing", labelEn: "Billing", labelAr: "الفوترة", icon: Receipt },
  { to: "/documents", labelEn: "Documents", labelAr: "المستندات", icon: FileText },
  { to: "/ai-assistant", labelEn: "AI Assistant", labelAr: "المساعد الذكي", icon: Lock },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, lang, setLang, theme, toggleTheme, t } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-gold flex items-center justify-center text-navy">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-xl leading-none">
                <span className={lang === "ar" ? "font-arabic" : ""}>{t("Qadiya OS", "قضية OS")}</span>
              </div>
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60 mt-1">
                <span className={lang === "ar" ? "font-arabic" : ""}>{t("Kuwait Legal Suite", "منظومة المحاماة الكويتية")}</span>
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
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
            <span className={lang === "ar" ? "font-arabic" : ""}>{t("Live backend — Lovable Cloud", "خادم مباشر — لوفابل كلاود")}</span>
          </div>
          <div className="mt-1">v1.0 • {t("Kuwait", "الكويت")}</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/60 backdrop-blur flex items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="md:hidden font-display text-lg">Qadiya OS</div>
            <div className="hidden md:block text-sm text-muted-foreground">
              {t("Welcome back", "أهلاً بعودتك")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-[140px] h-9">
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
              {lang === "en" ? "AR" : "EN"}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
