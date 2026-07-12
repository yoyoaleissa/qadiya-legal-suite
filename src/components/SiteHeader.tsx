import { Link } from "@tanstack/react-router";
import { Moon, Sun, Languages } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/app-context";

export function SiteHeader() {
  const { theme, toggleTheme, lang, toggleLang, t } = useApp();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md no-print">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <BrandMark />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/report">{t("report_bot")}</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/dashboard">{t("dashboard")}</Link>
          </Button>

          <Button variant="outline" size="sm" onClick={toggleLang} className="gap-1.5" aria-label={t("language")}>
            <Languages className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "en" ? "عربي" : "EN"}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={toggleTheme} aria-label={t("theme")}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </nav>
      </div>
    </header>
  );
}
