// Pure ICS (RFC 5545) generator for hearings + deadlines.
// All-day events; no timezone required.

export interface IcsEvent {
  uid: string;          // stable id (use DB id)
  date: string;         // YYYY-MM-DD
  title: string;
  description?: string | null;
  location?: string | null;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function stamp(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function dateOnly(iso: string) {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate())
  );
}

// RFC 5545 text escaping
function esc(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold long lines at 75 octets per RFC 5545
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

export function buildIcs(calendarName: string, events: IcsEvent[]): string {
  const now = stamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Qadiya OS//Court Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold("X-WR-CALNAME:" + esc(calendarName)),
  ];
  for (const ev of events) {
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + esc(ev.uid) + "@qadiya.lovable.app");
    lines.push("DTSTAMP:" + now);
    lines.push("DTSTART;VALUE=DATE:" + dateOnly(ev.date));
    lines.push("DTEND;VALUE=DATE:" + nextDay(ev.date));
    lines.push(fold("SUMMARY:" + esc(ev.title)));
    if (ev.description) lines.push(fold("DESCRIPTION:" + esc(ev.description)));
    if (ev.location) lines.push(fold("LOCATION:" + esc(ev.location)));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcs(filename: string, ics: string) {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : filename + ".ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
