import type { ErrorResponse, ValidationErrorResponse } from "./types";

export class ApiError extends Error {
    public readonly status: number;
    public readonly payload?: ErrorResponse | ValidationErrorResponse | undefined;

    constructor(status: number, message: string, payload?: ErrorResponse | ValidationErrorResponse) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
    }

    get code(): string | undefined {
        return (this.payload as any)?.code;
    }

    get validationFields(): { field: string; message: string }[] | undefined {
        if ((this.payload as any)?.code === "validation_error") {
            return (this.payload as ValidationErrorResponse).fields;
        }
        return undefined;
    }
}

function normalizeBaseUrl(baseUrl: string): string {
    if (!baseUrl) return "";
    return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function joinUrl(baseUrl: string, path: string): string {
    const b = normalizeBaseUrl(baseUrl);
    if (!b) return path;
    return path.startsWith("/") ? `${b}${path}` : `${b}/${path}`;
}

async function tryReadJson(res: Response): Promise<any | undefined> {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return undefined;
    try {
        return await res.json();
    } catch {
        return undefined;
    }
}

export type RequestOptions = {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    withCredentials?: boolean;
};

export const API_BASE_URL = normalizeBaseUrl((import.meta.env.VITE_API_BASE_URL as string) || "");

export async function requestJson<T>(opts: RequestOptions): Promise<T> {
    const url = new URL(joinUrl(API_BASE_URL, opts.path), window.location.origin);

    if (opts.query) {
        for (const [k, v] of Object.entries(opts.query)) {
            if (v === undefined) continue;
            url.searchParams.set(k, String(v));
        }
    }

    const headers: Record<string, string> = {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.headers ?? {}),
    };

    const res = await fetch(url.toString(), {
        method: opts.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        credentials: opts.withCredentials ? "include" : "same-origin",
    });

    if (res.status === 204) return undefined as T;

    const payload = await tryReadJson(res);

    if (!res.ok) {
        const msg =
            (payload && typeof payload === "object" && "message" in payload && String((payload as any).message)) ||
            `HTTP ${res.status}`;
        throw new ApiError(res.status, msg, payload);
    }

    return payload as T;
}
