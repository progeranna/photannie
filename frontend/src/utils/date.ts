function pad2(n: number) {
    return n < 10 ? `0${n}` : String(n);
}

export function toISODateLocal(d: Date): string {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
}

export function addDaysLocal(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
