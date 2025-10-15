import React, { useEffect, useMemo, useState } from "react";

/**
 * Parse a "local wall time" (YYYY-MM-DDTHH:mm[:ss]) in a specific IANA time zone
 * into a real Date (UTC instant) without external libs.
 *
 * Examples of accepted `raw`:
 *  - "2025-11-10T09:00"
 *  - "2025-11-10 09:00:00"
 */
function parseZonedLocalToDate(raw, timeZone) {
  if (!raw || !timeZone) return null;

  // Normalize separators and ensure we have HH:mm(:ss)
  const norm = String(raw).trim().replace(" ", "T");
  const [datePart, timePart = "00:00:00"] = norm.split("T");

  const [y, m, d] = datePart.split("-").map((x) => parseInt(x, 10));
  const [hh, mm = "00", ss = "00"] = timePart.split(":");

  const year = y;
  const monthIndex = (m || 1) - 1;
  const day = d || 1;
  const hour = parseInt(hh ?? "0", 10);
  const minute = parseInt(mm ?? "0", 10);
  const second = parseInt(ss ?? "0", 10);

  // First construct the "same wall time" **as UTC**
  const asUTC = new Date(Date.UTC(year, monthIndex, day, hour, minute, second));

  // Figure out what the offset is in that TZ at that instant
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // Convert the UTC instant into that time zone's wall-time parts
  const parts = dtf.formatToParts(asUTC);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  // Rebuild a UTC timestamp from the TZ wall-time parts; the delta is the TZ offset
  const tzAsUTC = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    parseInt(map.hour, 10),
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );

  const offsetMinutes = (tzAsUTC - asUTC.getTime()) / 60000;
  // To get the actual UTC instant for "that wall time in timeZone",
  // subtract the zone offset from our UTC wall-time.
  return new Date(asUTC.getTime() - offsetMinutes * 60 * 1000);
}

/**
 * Convert the input into a real Date (UTC instant), handling three cases:
 *  1) Date instance
 *  2) ISO string with Z or ±HH:MM (already absolute) -> new Date(input)
 *  3) Naive wall-time string + timeZone -> parseZonedLocalToDate
 */
function toTargetInstant(targetDate, timeZone) {
  if (!targetDate) return null;

  if (targetDate instanceof Date) return targetDate;

  if (typeof targetDate === "number") return new Date(targetDate);

  if (typeof targetDate === "string") {
    const s = targetDate.trim().replace(/\s+/, "T");
    const hasExplicitOffset = /Z|[+\-]\d{2}:\d{2}$/.test(s);
    if (hasExplicitOffset) {
      // Already absolute
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    if (timeZone) {
      const d = parseZonedLocalToDate(s, timeZone);
      return d && !isNaN(d.getTime()) ? d : null;
    }
    // Fallback: interpret as local; not ideal, but keeps backward-compat
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export default function Countdown({
  targetDate,
  timeZone,       // e.g., "Asia/Ho_Chi_Minh" | "America/Toronto"
  onComplete,     // optional callback when countdown hits 0
  className = "",
  labels = { days: "days", hours: "hours", minutes: "minutes", seconds: "seconds" },
}) {
  const target = useMemo(() => toTargetInstant(targetDate, timeZone), [targetDate, timeZone]);
  const [now, setNow] = useState(() => Date.now());

  // Tick every second
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) {
    return (
      <div className={className}>
        <span className="text-sm text-gray-500">No target time</span>
      </div>
    );
  }

  const diff = target.getTime() - now;
  const remaining = Math.max(0, diff);

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  useEffect(() => {
    if (diff <= 0 && typeof onComplete === "function") onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diff]);

  const pad2 = (n) => n.toString().padStart(2, "0");

  const items = [
    { key: "days", value: days, label: labels.days || "days" },
    { key: "hours", value: hours, label: labels.hours || "hours" },
    { key: "minutes", value: minutes, label: labels.minutes || "minutes" },
    { key: "seconds", value: seconds, label: labels.seconds || "seconds" },
  ].filter((x) => x.value !== undefined && x.value !== null);

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-3">
        {items.map((item, i) => (
          <React.Fragment key={item.key}>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-green-600">{pad2(item.value)}</span>
              <span className="text-[10px] uppercase text-gray-500 font-medium">
                {item.label}
              </span>
            </div>
            {i < items.length - 1 && (
              <span className="text-lg font-bold text-gray-400 pb-4">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
