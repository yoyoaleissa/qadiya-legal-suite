import { MapPin, Navigation } from "lucide-react";
import { findCourt, getCourtMapsUrl, getCourtDirectionsUrl } from "@/lib/kuwait-courts";
import { useApp } from "@/lib/app-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CourtMapLinkProps {
  courtName: string;
  showIcon?: boolean;
  className?: string;
}

/**
 * Renders a court name as a clickable Google Maps link.
 * If the court is found in our directory, shows a tooltip with address
 * and provides both "View on Map" and "Get Directions" options.
 */
export function CourtMapLink({ courtName, showIcon = true, className = "" }: CourtMapLinkProps) {
  const { lang } = useApp();
  const court = findCourt(courtName);

  if (!court) {
    // Court not in directory — render as plain text
    return <span className={className}>{courtName}</span>;
  }

  const mapsUrl = getCourtMapsUrl(courtName);
  const directionsUrl = getCourtDirectionsUrl(courtName);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={mapsUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-primary hover:underline cursor-pointer ${className}`}
          >
            {showIcon && <MapPin className="h-3.5 w-3.5 shrink-0" />}
            <span>{lang === "ar" ? court.nameAr : court.nameEn}</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-medium">{court.nameAr}</p>
            <p className="text-muted-foreground">{court.address}</p>
            {court.phone && (
              <p className="text-muted-foreground" dir="ltr">
                {court.phone}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <a
                href={mapsUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <MapPin className="h-3 w-3" />
                {lang === "ar" ? "عرض على الخريطة" : "View on Map"}
              </a>
              <a
                href={directionsUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Navigation className="h-3 w-3" />
                {lang === "ar" ? "اتجاهات" : "Directions"}
              </a>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
