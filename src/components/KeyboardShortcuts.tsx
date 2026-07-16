import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/lib/app-context";
import { Keyboard } from "lucide-react";

const SHORTCUTS: Array<{ keys: string[]; en: string; ar: string }> = [
  { keys: ["⌘", "K"], en: "Open global search", ar: "فتح البحث الشامل" },
  { keys: ["?"], en: "Show this help", ar: "إظهار هذه المساعدة" },
  { keys: ["g", "d"], en: "Go to Dashboard", ar: "الذهاب إلى الرئيسية" },
  { keys: ["g", "c"], en: "Go to Calendar", ar: "الذهاب إلى التقويم" },
  { keys: ["g", "t"], en: "Go to Tasks", ar: "الذهاب إلى المهام" },
  { keys: ["g", "b"], en: "Go to Billing", ar: "الذهاب إلى الفواتير" },
  { keys: ["g", "s"], en: "Go to Settings", ar: "الذهاب إلى الإعدادات" },
  { keys: ["Esc"], en: "Close dialogs", ar: "إغلاق النوافذ" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const { t, lang } = useApp();

  useEffect(() => {
    let lastKey = "";
    let lastTime = 0;

    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // g + letter navigation
      const now = Date.now();
      if (lastKey === "g" && now - lastTime < 800) {
        const dest: Record<string, string> = {
          d: "/",
          c: "/calendar",
          t: "/tasks",
          b: "/billing",
          s: "/settings",
        };
        const target = dest[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          window.location.assign(target);
        }
        lastKey = "";
        return;
      }
      if (e.key.toLowerCase() === "g") {
        lastKey = "g";
        lastTime = now;
      } else {
        lastKey = "";
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Keyboard className="h-4 w-4 text-gold" />
            {t("Keyboard shortcuts", "اختصارات لوحة المفاتيح")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {SHORTCUTS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span className={lang === "ar" ? "font-arabic" : ""}>
                {lang === "ar" ? s.ar : s.en}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {t(
            "Tip: press ? anywhere (outside a text field) to open this panel.",
            "نصيحة: اضغط ؟ في أي مكان (خارج حقول النص) لفتح هذه اللوحة.",
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
