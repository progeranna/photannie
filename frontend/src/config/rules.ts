export const RULES = {
    timezone: "Europe/Moscow",
    bookingWindowDays: 90,
    workDays: [1, 2, 3, 4, 5] as const,
    workStart: "09:00",
    workEnd: "18:00",
    slotMinutes: 30,
} as const;
