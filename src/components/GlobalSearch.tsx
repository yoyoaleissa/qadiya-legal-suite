import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, FileText, CheckSquare, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useApp } from "@/lib/app-context";
import { globalSearch } from "@/lib/search.functions";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { lang } = useApp();
  const tt = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const ar = lang === "ar";
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 200);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setDebounced("");
    }
  }, [open]);

  const run = useServerFn(globalSearch);
  const { data, isFetching } = useQuery({
    queryKey: ["global-search", debounced],
    queryFn: () => run({ data: { q: debounced } }),
    enabled: open && debounced.length >= 1,
    staleTime: 30_000,
  });

  const clients = data?.clients ?? [];
  const cases = data?.cases ?? [];
  const tasks = data?.tasks ?? [];
  const hasResults = clients.length + cases.length + tasks.length > 0;

  const close = () => onOpenChange(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        value={term}
        onValueChange={setTerm}
        placeholder={tt("Search clients, cases, tasks…", "ابحث في الموكّلين والقضايا والمهام…")}
        className={ar ? "font-arabic" : ""}
      />
      <CommandList>
        {debounced.length < 1 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <span className={ar ? "font-arabic" : ""}>
              {tt("Type to search across your firm.", "اكتب للبحث في مكتبك.")}
            </span>
          </div>
        ) : isFetching && !hasResults ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tt("Searching…", "جارٍ البحث…")}
          </div>
        ) : !hasResults ? (
          <CommandEmpty>
            <span className={ar ? "font-arabic" : ""}>{tt("No results found.", "لا توجد نتائج.")}</span>
          </CommandEmpty>
        ) : (
          <>
            {clients.length > 0 && (
              <CommandGroup heading={tt("Clients", "الموكّلون")}>
                {clients.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`client-${c.id}`}
                    onSelect={() => {
                      close();
                      navigate({ to: "/clients", search: { clientId: c.id } });
                    }}
                  >
                    <Users className="text-muted-foreground" />
                    <span className={ar ? "font-arabic" : ""}>
                      {ar ? c.name_ar ?? c.name : c.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {cases.length > 0 && (
              <CommandGroup heading={tt("Cases", "القضايا")}>
                {cases.map((cs) => (
                  <CommandItem
                    key={cs.id}
                    value={`case-${cs.id}`}
                    onSelect={() => {
                      close();
                      navigate({
                        to: "/clients",
                        search: cs.client_id ? { clientId: cs.client_id } : {},
                      });
                    }}
                  >
                    <FileText className="text-muted-foreground" />
                    <span className="flex-1 truncate">
                      <span className={ar ? "font-arabic" : ""}>
                        {ar ? cs.title_ar ?? cs.title ?? cs.case_number : cs.title ?? cs.case_number}
                      </span>
                    </span>
                    <span className="ms-auto text-xs text-muted-foreground">#{cs.case_number}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {tasks.length > 0 && (
              <CommandGroup heading={tt("Tasks", "المهام")}>
                {tasks.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`task-${t.id}`}
                    onSelect={() => {
                      close();
                      navigate({ to: "/tasks", search: { taskId: t.id } });
                    }}
                  >
                    <CheckSquare className="text-muted-foreground" />
                    <span className={ar ? "font-arabic" : ""}>{ar ? t.title_ar ?? t.title : t.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
