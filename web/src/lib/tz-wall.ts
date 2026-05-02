/**
 * Converts a calendar date + wall-clock time in a named IANA zone to UTC epoch ms.
 * Used for Detroit-local appointment reminders without extra dependencies.
 */
export function utcMillisForZoneWallClock(
  localDateYYYYMMDD: string,
  hour24: number,
  minute: number,
  timeZone: string
): number {
  const parts = localDateYYYYMMDD.split("-").map((v) => Number.parseInt(v, 10));
  const y = parts[0]!;
  const mo = parts[1]!;
  const day = parts[2]!;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  let t = Date.UTC(y, mo - 1, day, hour24, minute, 0, 0);
  for (let i = 0; i < 8; i++) {
    const f = fmt.formatToParts(new Date(t));
    const hh = Number(f.find((p) => p.type === "hour")?.value ?? "0");
    const mm = Number(f.find((p) => p.type === "minute")?.value ?? "0");
    const driftMin = hour24 * 60 + minute - (hh * 60 + mm);
    if (Math.abs(driftMin) < 2) break;
    t += driftMin * 60 * 1000;
  }
  return t;
}

export function businessTimeZone(): string {
  return process.env.BUSINESS_TIMEZONE?.trim() || "America/Detroit";
}

/** Start hour (24h) of preferred service window — reminders fire relative to window start */
export function slotStartHour(preferredTime: string | null | undefined): number {
  const t = String(preferredTime || "").toLowerCase();
  if (t === "morning") return 8;
  if (t === "afternoon") return 12;
  if (t === "evening") return 16;
  return 12;
}
