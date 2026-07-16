import { AlertTriangle, Calendar, Clock, ExternalLink } from "lucide-react";
import {
  calculateDeadline,
  getDeadlineCalendarUrl,
  type DeadlineType,
} from "@/lib/deadline-calculator";
import { useApp } from "@/lib/app-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeadlineAlertProps {
  judgmentDate: Date;
  type: DeadlineType;
  caseTitle?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Displays a deadline countdown with urgency indicators.
 * - Green: > 14 days remaining
 * - Yellow: 7-14 days remaining
 * - Red: < 7 days remaining
 * - Black/strikethrough: expired
 *
 * Includes a "Add to Google Calendar" button.
 */
export function DeadlineAlert({
  judgmentDate,
  type,
  caseTitle,
  compact = false,
  className = "",
}: DeadlineAlertProps) {
  const { lang } = useApp();
  const deadline = calculateDeadline(judgmentDate, type);
  const calendarUrl = getDeadlineCalendarUrl(deadline, caseTitle);

  const urgencyColor = deadline.isExpired
    ? "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
    : deadline.isUrgent
      ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
      : deadline.daysRemaining <= 14
        ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700"
        : "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700";

  const textColor = deadline.isExpired
    ? "text-gray-500 line-through"
    : deadline.isUrgent
      ? "text-red-700 dark:text-red-300"
      : deadline.daysRemaining <= 14
        ? "text-yellow-700 dark:text-yellow-300"
        : "text-green-700 dark:text-green-300";

  const badgeVariant = deadline.isExpired
    ? "secondary"
    : deadline.isUrgent
      ? "destructive"
      : "default";

  if (compact) {
    return (
      <Badge variant={badgeVariant} className={cn("gap-1", className)}>
        <Clock className="h-3 w-3" />
        {deadline.isExpired
          ? lang === "ar"
            ? "انتهت"
            : "Expired"
          : `${deadline.daysRemaining} ${lang === "ar" ? "يوم" : "days"}`}
      </Badge>
    );
  }

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", urgencyColor, className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {deadline.isUrgent && !deadline.isExpired && (
            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
          )}
          <span className="text-sm font-medium">
            {lang === "ar" ? deadline.typeAr : deadline.typeEn}
          </span>
        </div>
        <span className={cn("text-lg font-bold", textColor)}>
          {deadline.isExpired
            ? lang === "ar"
              ? "انتهت المهلة"
              : "EXPIRED"
            : `${deadline.daysRemaining} ${lang === "ar" ? "يوم" : "days"}`}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {lang === "ar" ? deadline.descriptionAr : deadline.description}
      </p>

      {!deadline.isExpired && (
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
            <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
              <Calendar className="h-3 w-3" />
              {lang === "ar" ? "أضف للتقويم" : "Add to Calendar"}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

interface AllDeadlinesProps {
  judgmentDate: Date;
  caseTitle?: string;
  className?: string;
}

/**
 * Shows all relevant deadlines for a judgment in a compact grid
 */
export function AllDeadlines({ judgmentDate, caseTitle, className = "" }: AllDeadlinesProps) {
  const types: DeadlineType[] = ["appeal", "cassation", "opposition"];

  return (
    <div className={cn("grid gap-2 sm:grid-cols-3", className)}>
      {types.map((type) => (
        <DeadlineAlert key={type} judgmentDate={judgmentDate} type={type} caseTitle={caseTitle} />
      ))}
    </div>
  );
}
