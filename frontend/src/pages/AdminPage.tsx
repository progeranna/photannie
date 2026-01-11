import { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Text from "../ui/Text";
import Button from "../ui/Button";
import { cn } from "../ui/cn";
import { AdminAPI, type BookingDetail, type BookingSummary } from "../api";
import { ApiError } from "../api";
import { toISODateLocal } from "../utils/date";
import { isPastMoscow } from "../utils/moscow";
import BookingDetailModal from "../components/admin/BookingDetailModal";

function BookingRow({
                        item,
                        onClick,
                    }: {
    item: BookingSummary;
    onClick: () => void;
}) {
    const past = isPastMoscow(item.date, item.end_time);

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full text-left rounded-[14px] border-[1.4px] border-[var(--field-border)] bg-white px-4 py-3",
                past ? "opacity-55" : "opacity-100",
                "hover:border-[var(--ink)]",
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[12px] font-[900] text-[var(--ink)] tracking-[0.2px]">
                        {item.start_time}–{item.end_time}
                        <span className="ml-2 text-[11px] font-[800] text-[var(--muted)]">
              ({item.duration_minutes} min)
            </span>
                    </div>

                    <div className="mt-[8px] text-[12px] font-[750] text-[var(--ink)]">
                        {item.client_name}
                        <span className="ml-2 text-[12px] font-[650] text-[var(--muted)]">
              {item.client_phone}
            </span>
                    </div>

                    {item.comment ? (
                        <div className="mt-[6px] text-[12px] font-[520] text-[var(--muted)]">
                            {item.comment}
                        </div>
                    ) : null}
                </div>

                <div className="pt-[2px] text-right">
                    <div
                        className={cn(
                            "inline-flex rounded-full border px-2 py-[2px] text-[10px] font-[900] tracking-[1.2px]",
                            item.status === "active"
                                ? "border-[#d7e7dc] bg-[#f0faf2] text-[#1f4d2b]"
                                : "border-[#e8c9c9] bg-[#fcf1f1] text-[#6b1f1f]",
                        )}
                    >
                        {item.status.toUpperCase()}
                    </div>
                </div>
            </div>
        </button>
    );
}

export default function AdminPage() {
    const [date, setDate] = useState<string>(() => toISODateLocal(new Date()));

    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
        "idle",
    );
    const [items, setItems] = useState<BookingSummary[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<BookingDetail | null>(null);

    const load = async (d: string) => {
        setStatus("loading");
        setError(null);

        try {
            const res = await AdminAPI.adminListBookingsByDate(d);
            setItems(res.items);
            setStatus("success");
        } catch (e) {
            const ae = e instanceof ApiError ? e : new ApiError(0, "Unknown error");
            setStatus("error");
            setError(ae.message || "Failed to load bookings");
        }
    };

    useEffect(() => {
        load(date);
    }, [date]);

    const sorted = useMemo(() => {
        return [...items].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [items]);

    const openDetails = async (id: string) => {
        try {
            const full = await AdminAPI.adminGetBooking(id);
            setDetail(full);
            setDetailOpen(true);
        } catch {
        }
    };

    return (
        <div className="min-h-screen px-[80px] pt-[34px]">
            <div className="flex items-start justify-between">
                <div>
                    <Text as="div" variant="brand">
                        photannie
                    </Text>
                    <Text variant="tiny" tone="muted" className="mt-[10px]">
                        Admin • bookings by date
                    </Text>
                </div>

                <div className="text-right">
                    <Text variant="tiny" tone="muted">
                        Europe/Moscow
                    </Text>
                </div>
            </div>

            <div className="mt-[22px] flex items-end justify-between gap-4">
                <div className="w-[320px]">
                    <Text as="div" variant="h3">
                        Date
                    </Text>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={cn(
                            "mt-[10px] w-full h-[44px] rounded-[var(--r-14)] border-[1.4px] border-[var(--field-border)] bg-white px-3",
                            "text-[12px] font-[650] text-[var(--ink)]",
                            "focus:outline-none focus:ring-0 focus:border-[var(--ink)]",
                        )}
                    />
                </div>

                <div className="pb-[2px]">
                    <Button
                        variant="ghost"
                        onClick={() => load(date)}
                        disabled={status === "loading"}
                    >
                        {status === "loading" ? "Refreshing…" : "Refresh"}
                    </Button>
                </div>
            </div>

            <div className="mt-[18px]">
                <Card shadow="soft" radius="var(--r-card)">
                    <div className="p-[22px]">
                        <div className="flex items-center justify-between">
                            <Text as="div" variant="h2">
                                Bookings
                            </Text>
                            <Text variant="tiny" tone="muted">
                                {sorted.length} items
                            </Text>
                        </div>

                        {status === "error" && error ? (
                            <div className="mt-[14px] rounded-[14px] border-[1.4px] border-[#e8c9c9] bg-[#fcf1f1] px-3 py-2 text-[#6b1f1f]">
                                <Text variant="tiny" tone="ink" className="!text-inherit">
                                    {error}
                                </Text>
                            </div>
                        ) : null}

                        <div className="mt-[14px] h-[520px] rounded-[18px] border-[1.4px] border-[var(--field-border)] bg-[var(--soft)] overflow-hidden">
                            <div className="h-full overflow-y-auto p-[14px] space-y-[12px]">
                                {status === "loading" ? (
                                    <Text variant="tiny" tone="muted2">
                                        Loading…
                                    </Text>
                                ) : null}

                                {status === "success" && sorted.length === 0 ? (
                                    <Text variant="tiny" tone="muted2">
                                        No bookings for this date.
                                    </Text>
                                ) : null}

                                {sorted.map((it) => (
                                    <BookingRow
                                        key={it.id}
                                        item={it}
                                        onClick={() => openDetails(it.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        <Text variant="tiny" tone="muted" className="mt-[12px]">
                            Past bookings are shown with reduced opacity.
                        </Text>
                    </div>
                </Card>
            </div>

            <BookingDetailModal
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                booking={detail}
                onUpdated={(updated) => {
                    setDetail(updated);

                    setItems((prev) =>
                        prev.map((x) =>
                            x.id === updated.id
                                ? {
                                    ...x,
                                    status: updated.status,
                                    cancelled_at: updated.cancelled_at ?? null,
                                }
                                : x,
                        ),
                    );
                }}
            />
        </div>
    );
}
