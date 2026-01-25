export type ISODate = string; // YYYY-MM-DD
export type TimeHHMM = string; // HH:mm

export type ErrorResponse = {
    code: string;
    message: string;
    details?: Record<string, unknown> | null;
};

export type FieldError = {
    field: string;
    message: string;
};

export type ValidationErrorResponse = {
    code: "validation_error";
    message: string;
    fields: FieldError[];
};

export type HealthCheckResponse = {
    status: "ok";
    time: string;
};

export type PublicConfig = {
    studio_timezone: string;
    booking_window_days: number;
    work_days: number[];
    work_start: TimeHHMM;
    work_end: TimeHHMM;
    slot_minutes: 30;
    max_session_minutes: number;
    server_time?: string;
};

export type FreeSlotsResponse = {
    date: ISODate;
    free_slots: TimeHHMM[];
};

export type BookingStatus = "active" | "cancelled";

export type BookingCreateRequest = {
    date: ISODate;
    start_time: TimeHHMM;
    duration_minutes: number;
    name: string;
    phone: string;
    comment?: string | null;
};

export type BookingCreateResponse = {
    id: string;
    date: ISODate;
    start_time: TimeHHMM;
    end_time: TimeHHMM;
    duration_minutes: number;
    status: BookingStatus;
    created_at: string;
};

export type BookingSummary = {
    id: string;
    date: ISODate;
    start_time: TimeHHMM;
    end_time: TimeHHMM;
    duration_minutes: number;
    client_name: string;
    client_phone: string;
    comment?: string | null;
    status: BookingStatus;
    created_at: string;
    cancelled_at?: string | null;
};

export type BookingDetail = BookingSummary & {
    cancel_reason?: string | null;
};

export type AdminBookingsByDateResponse = {
    date: ISODate;
    items: BookingSummary[];
};

export type AdminSessionLoginRequest = {
    password: string;
};

export type CancelBookingRequest = {
    reason?: string | null;
};
