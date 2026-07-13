/**
 * Google Calendar URL generator for one-click event creation.
 * Opens a pre-filled Google Calendar event in a new tab.
 */

export interface CalendarEventParams {
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM (24h), defaults to 09:00
  endTime?: string; // HH:MM (24h), defaults to 10:00
  location?: string;
  description?: string;
}

/**
 * Generates a Google Calendar "create event" URL with pre-filled data.
 */
export function buildGoogleCalendarUrl(params: CalendarEventParams): string {
  const { title, date, startTime = "09:00", endTime = "10:00", location, description } = params;

  // Format dates as YYYYMMDDTHHMMSS (no timezone = floating)
  const dateClean = date.replace(/-/g, "");
  const startClean = startTime.replace(":", "");
  const endClean = endTime.replace(":", "");

  const start = `${dateClean}T${startClean}00`;
  const end = `${dateClean}T${endClean}00`;

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("ctz", "Asia/Kuwait");

  if (location) url.searchParams.set("location", location);
  if (description) url.searchParams.set("details", description);

  return url.toString();
}

/**
 * Generates a Google Tasks "add task" URL (opens Google Tasks web).
 * Note: Google Tasks doesn't have a direct deep-link API for creation,
 * so we use the Calendar task creation as a workaround.
 */
export function buildGoogleTaskUrl(title: string, dueDate?: string): string {
  // Google Tasks doesn't have a public deep-link for task creation.
  // Best alternative: use Google Calendar's task creation
  const url = new URL("https://calendar.google.com/calendar/r/eventedit");
  url.searchParams.set("text", title);
  url.searchParams.set("ctz", "Asia/Kuwait");
  if (dueDate) {
    const dateClean = dueDate.replace(/-/g, "");
    url.searchParams.set("dates", `${dateClean}/${dateClean}`);
  }
  return url.toString();
}
