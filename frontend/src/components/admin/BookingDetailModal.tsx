import { useState } from "react";
import Modal from "../../ui/Modal";
import Text from "../../ui/Text";
import Button from "../../ui/Button";
import { Textarea } from "../../ui/Field";
import { cn } from "../../ui/cn";
import { AdminAPI, type BookingDetail } from "../../api";
import { ApiError } from "../../api/http";

export default function BookingDetailModal({
                                               open,
                                               onClose,
                                               booking,
                                               onUpdated,
                                           }: {
    open: boolean;
    onClose: () => void;
    booking: BookingDetail | null;
    onUpdated: (updated: BookingDetail) => void;
}) {
    const [reason, setReason] = useState("");
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!booking) return null;

    const canCancel = booking.status === "active";

    const doCancel = async () => {
        setError(null);
        setSubmitting(true);

        try {
            const updated = await AdminAPI.adminCancelBooking(booking.id, {
                reason: reason.trim() ? reason.trim() : null,
            });
            onUpdated(updated);
            setConfirming(false);
            setSubmitting(false);
        } catch (e) {
            const ae = e instanceof ApiError ? e : new ApiError(0, "Unknown error");
            setSubmitting(false);
            setError(ae.message || "Failed to cancel");
        }
    };

    return (
        <Modal open={open} onClose={() => (!submitting ? onClose() : null)} width={620}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Text as="div" variant="h2">
                        Booking details
                    </Text>
                    <Text variant="tiny" tone="muted" className="mt-[10px]">
                        {booking.date} • {booking.start_time}–{booking.end_time} ({booking.duration_minutes} min)
                    </Text>
                </div>

                <div
                    className={cn(
                        "inline-flex rounded-full border px-2 py-[2px] text-[10px] font-[900] tracking-[1.2px] mt-[4px]",
                        booking.status === "active"
                            ? "border-[#d7e7dc] bg-[#f0faf2] text-[#1f4d2b]"
                            : "border-[#e8c9c9] bg-[#fcf1f1] text-[#6b1f1f]",
                    )}
                >
                    {booking.status.toUpperCase()}
                </div>
            </div>

            {error ? (
                <div className="mt-[14px] rounded-[14px] border-[1.4px] border-[#e8c9c9] bg-[#fcf1f1] px-3 py-2 text-[#6b1f1f]">
                    <Text variant="tiny" tone="ink" className="!text-inherit">
                        {error}
                    </Text>
                </div>
            ) : null}

            <div className="mt-[16px] rounded-[16px] border-[1.4px] border-[var(--hair)] bg-white px-4 py-3">
                <Text variant="small">Client</Text>
                <Text variant="tiny" tone="muted" className="mt-[4px]">
                    {booking.client_name} • {booking.client_phone}
                </Text>

                {booking.comment ? (
                    <>
                        <div className="h-[10px]" />
                        <Text variant="small">Comment</Text>
                        <Text variant="tiny" tone="muted" className="mt-[4px]">
                            {booking.comment}
                        </Text>
                    </>
                ) : null}

                {booking.status === "cancelled" ? (
                    <>
                        <div className="h-[10px]" />
                        <Text variant="small">Cancelled</Text>
                        <Text variant="tiny" tone="muted" className="mt-[4px]">
                            {booking.cancelled_at || "—"}
                        </Text>

                        {booking.cancel_reason ? (
                            <>
                                <div className="h-[10px]" />
                                <Text variant="small">Reason</Text>
                                <Text variant="tiny" tone="muted" className="mt-[4px]">
                                    {booking.cancel_reason}
                                </Text>
                            </>
                        ) : null}
                    </>
                ) : null}
            </div>

            <div className="mt-[14px]">
                <Text variant="tiny" tone="muted">
                    Cancel reason (optional)
                </Text>
                <div className="mt-[8px]">
                    <Textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason (optional)"
                    />
                </div>
            </div>

            <div className="mt-[18px] flex gap-3">
                <Button
                    variant="ghost"
                    className="flex-1"
                    disabled={submitting}
                    onClick={onClose}
                >
                    Close
                </Button>

                {canCancel ? (
                    confirming ? (
                        <Button
                            className="flex-1"
                            disabled={submitting}
                            onClick={doCancel}
                        >
                            {submitting ? "Cancelling…" : "Confirm cancel"}
                        </Button>
                    ) : (
                        <Button
                            className="flex-1"
                            disabled={submitting}
                            onClick={() => setConfirming(true)}
                        >
                            Cancel booking
                        </Button>
                    )
                ) : (
                    <Button className="flex-1" disabled>
                        Cancelled
                    </Button>
                )}
            </div>

            {canCancel && confirming ? (
                <Text variant="tiny" tone="muted2" className="mt-[10px]">
                    This action cannot be undone. Click “Confirm cancel” to proceed.
                </Text>
            ) : null}
        </Modal>
    );
}
