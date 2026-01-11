import { requestJson } from "./http";
import type {
    AdminBookingsByDateResponse,
    AdminSessionLoginRequest,
    BookingDetail,
    CancelBookingRequest,
} from "./types";

export function adminSessionLogin(body: AdminSessionLoginRequest) {
    return requestJson<void>({
        method: "POST",
        path: "/api/admin/session/login",
        body,
        withCredentials: true,
    });
}

export function adminListBookingsByDate(date: string) {
    return requestJson<AdminBookingsByDateResponse>({
        method: "GET",
        path: "/api/admin/bookings",
        query: { date },
        withCredentials: true,
    });
}

export function adminGetBooking(bookingId: string) {
    return requestJson<BookingDetail>({
        method: "GET",
        path: `/api/admin/bookings/${bookingId}`,
        withCredentials: true,
    });
}

export function adminCancelBooking(bookingId: string, body?: CancelBookingRequest) {
    return requestJson<BookingDetail>({
        method: "POST",
        path: `/api/admin/bookings/${bookingId}/cancel`,
        body,
        withCredentials: true,
    });
}
