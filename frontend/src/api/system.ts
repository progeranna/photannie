import { requestJson } from "./http";
import type { HealthCheckResponse } from "./types";

export function healthCheck() {
    return requestJson<HealthCheckResponse>({
        method: "GET",
        path: "/api/health",
    });
}
