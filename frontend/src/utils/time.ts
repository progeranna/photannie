import type { TimeHHMM } from "../api/types";

export function hhmmToMinutes(t: TimeHHMM): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

export function minutesToHHMM(mins: number): TimeHHMM {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = h < 10 ? `0${h}` : String(h);
    const mm = m < 10 ? `0${m}` : String(m);
    return `${hh}:${mm}`;
}

export function addMinutesHHMM(t: TimeHHMM, deltaMinutes: number): TimeHHMM {
    return minutesToHHMM(hhmmToMinutes(t) + deltaMinutes);
}

export function buildSlotGrid(start: TimeHHMM, end: TimeHHMM, stepMinutes: number): TimeHHMM[] {
    const s = hhmmToMinutes(start);
    const e = hhmmToMinutes(end);

    const out: TimeHHMM[] = [];
    for (let t = s; t + stepMinutes <= e; t += stepMinutes) {
        out.push(minutesToHHMM(t));
    }
    return out;
}
