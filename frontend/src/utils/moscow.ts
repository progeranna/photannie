export function nowInMoscow(): Date {
    const fmt = new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });

    const parts = fmt.formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";

    const y = Number(get("year"));
    const m = Number(get("month"));
    const d = Number(get("day"));
    const hh = Number(get("hour"));
    const mm = Number(get("minute"));
    const ss = Number(get("second"));

    return new Date(y, m - 1, d, hh, mm, ss);
}

export function isPastMoscow(dateISO: string, endTimeHHMM: string): boolean {
    const [y, m, d] = dateISO.split("-").map(Number);
    const [hh, mm] = endTimeHHMM.split(":").map(Number);

    const end = new Date(y, m - 1, d, hh, mm, 0);
    const now = nowInMoscow();

    return end.getTime() <= now.getTime();
}
