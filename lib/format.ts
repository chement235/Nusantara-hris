const TIME_ZONE = "Asia/Jakarta";

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Jakarta, as YYYY-MM-DD. */
export function todayISO(): string {
  return isoFormatter.format(new Date());
}

export function nowHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function isISODate(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dateID(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function longDateID(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function weekdayID(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

export function monthLabel(period: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
}

export function rupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

export function compactRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  if (value >= 1_000) return `Rp ${Math.round(value / 1_000)} rb`;
  return rupiah(value);
}

export function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function businessDays(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Inclusive list of YYYY-MM-DD strings. */
export function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let cursor = startISO;
  let guard = 0;
  while (cursor <= endISO && guard < 800) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function monthRange(period: string): { start: string; end: string } {
  const [year, month] = period.split("-").map(Number);
  const start = `${period}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function shiftPeriod(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function previousPeriod(reference = todayISO()): string {
  return shiftPeriod(reference.slice(0, 7), -1);
}

export function periodOf(iso: string): string {
  return iso.slice(0, 7);
}

export function timesheetStatusTone(status: string): "emerald" | "amber" | "sky" | "rose" | "slate" | "violet" {
  switch (status) {
    case "Hadir":
      return "emerald";
    case "Terlambat":
      return "amber";
    case "WFH":
      return "sky";
    case "Cuti":
      return "violet";
    case "Sakit":
    case "Alpha":
      return "rose";
    default:
      return "slate";
  }
}

export function leaveStatusTone(status: string): "emerald" | "amber" | "rose" | "slate" {
  switch (status) {
    case "Disetujui":
      return "emerald";
    case "Menunggu":
      return "amber";
    case "Ditolak":
      return "rose";
    default:
      return "slate";
  }
}
