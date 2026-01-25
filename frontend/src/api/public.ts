import { requestJson } from "./http";
import type {
    BookingCreateRequest,
    BookingCreateResponse,
    FreeSlotsResponse,
    PublicConfig,
} from "./types";

export function getPublicConfig() {
    return requestJson<PublicConfig>({
        method: "GET",
        path: "/api/public/config",
    });
}

export function getFreeSlotsByDate(date: string) {
    return requestJson<FreeSlotsResponse>({
        method: "GET",
        path: "/api/public/slots",
        query: { date },
    });
}

export function createBooking(body: BookingCreateRequest) {
    return requestJson<BookingCreateResponse>({
        method: "POST",
        path: "/api/public/bookings",
        body,
    });
}
