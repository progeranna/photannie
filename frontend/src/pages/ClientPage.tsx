import { useEffect, useMemo, useState } from "react";
import Card from "../ui/Card";
import Text from "../ui/Text";
import Separator from "../ui/Separator";
import Button from "../ui/Button";
import { Input, Textarea } from "../ui/Field";
import { cn } from "../ui/cn";
import Modal from "../ui/Modal";
import Hero from "../components/client/hero/Hero";

import { RULES } from "../config/rules";
import { addDaysLocal, toISODateLocal } from "../utils/date";
import { addMinutesHHMM, buildSlotGrid } from "../utils/time";
import { useFreeSlots } from "../hooks/useFreeSlots";

import { ApiError } from "../api/http";
import { PublicAPI, type BookingCreateRequest, type TimeHHMM } from "../api";

type SlotVariant = "free" | "busy" | "selected";

function SlotPill({
                      label,
                      variant,
                      onClick,
                  }: {
    label: string;
    variant: SlotVariant;
    onClick?: () => void;
}) {
    const base =
        "h-[34px] w-[92px] rounded-full border-[1.4px] text-[12px] font-[900] grid place-items-center select-none";

    if (variant === "selected") {
        return (
            <button
                type="button"
                onClick={onClick}
                className={cn(base, "border-[var(--ink)] bg-[var(--ink)] text-white")}
            >
                {label}
            </button>
        );
    }

    if (variant === "busy") {
        return (
            <button
                type="button"
                disabled
                className={cn(
                    base,
                    "border-[var(--chip-busy-border)] bg-[var(--chip-busy-bg)] text-[var(--muted2)]",
                    "cursor-not-allowed",
                )}
            >
                {label}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                base,
                "border-[var(--field-border)] bg-white text-[var(--ink)]",
                "hover:border-[var(--ink)]",
            )}
        >
            {label}
        </button>
    );
}

function isValidPhoneRU(phone: string) {
    return /^\+7\d{10}$/.test(phone.trim());
}

type FieldErrors = Partial<Record<"name" | "phone" | "comment", string>>;

export default function ClientPage() {
    const today = new Date();
    const minDate = toISODateLocal(today);
    const maxDate = toISODateLocal(addDaysLocal(today, RULES.bookingWindowDays));

    const [date, setDate] = useState<string>(minDate);

    const [slotsRefresh, setSlotsRefresh] = useState(0);

    const slotsState = useFreeSlots(date, slotsRefresh);

    const grid = useMemo(
        () => buildSlotGrid(RULES.workStart as TimeHHMM, RULES.workEnd as TimeHHMM, RULES.slotMinutes),
        [],
    );

    const freeSet = useMemo(() => {
        if (slotsState.status !== "success") return new Set<string>();
        return new Set(slotsState.data.free_slots);
    }, [slotsState]);

    const [selStartIndex, setSelStartIndex] = useState<number | null>(null);
    const [selCount, setSelCount] = useState<number>(1);

    useEffect(() => {
        setSelStartIndex(null);
        setSelCount(1);
    }, [date]);

    useEffect(() => {
        if (selStartIndex === null) return;
        for (let k = 0; k < selCount; k++) {
            const t = grid[selStartIndex + k];
            if (!t || !freeSet.has(t)) {
                setSelStartIndex(null);
                setSelCount(1);
                break;
            }
        }
    }, [freeSet, grid, selStartIndex, selCount]);

    const isSelected = (i: number) =>
        selStartIndex !== null && i >= selStartIndex && i < selStartIndex + selCount;

    const handleSlotClick = (i: number) => {
        const t = grid[i];
        if (!t) return;
        if (!freeSet.has(t)) return;

        if (selStartIndex === null) {
            setSelStartIndex(i);
            setSelCount(1);
            return;
        }

        const start = selStartIndex;
        const endExclusive = start + selCount;

        if (i === endExclusive - 1 && selCount > 1) {
            setSelCount((c) => c - 1);
            return;
        }

        if (i === start && selCount === 1) {
            setSelStartIndex(null);
            setSelCount(1);
            return;
        }

        if (i === endExclusive) {
            const nextT = grid[i];
            if (nextT && freeSet.has(nextT)) {
                setSelCount((c) => c + 1);
                return;
            }
        }

        setSelStartIndex(i);
        setSelCount(1);
    };

    const selectedStartTime: TimeHHMM | null =
        selStartIndex !== null ? (grid[selStartIndex] as TimeHHMM) : null;

    const durationMinutes = selStartIndex !== null ? selCount * RULES.slotMinutes : 0;

    const selectedEndTime: TimeHHMM | null =
        selectedStartTime ? addMinutesHHMM(selectedStartTime, durationMinutes) : null;

    const selectionLabel =
        selectedStartTime && selectedEndTime
            ? `Selected: ${selectedStartTime}–${selectedEndTime} • ${durationMinutes} min`
            : "Select a free slot to continue";

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [comment, setComment] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const [banner, setBanner] = useState<
        | { kind: "success"; text: string }
        | { kind: "error"; text: string }
        | null
    >(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const bookingHint = `Weekdays • ${RULES.slotMinutes}-minute grid • next ${RULES.bookingWindowDays} days`;
    const headerLine = `Studio • Mon–Fri ${RULES.workStart}–${RULES.workEnd}`;

    const validateClient = (): FieldErrors => {
        const e: FieldErrors = {};
        const n = name.trim();
        const p = phone.trim();

        if (n.length < 2) e.name = "Please enter your name";
        if (!isValidPhoneRU(p)) e.phone = "Phone must start with +7 and contain 10 digits";
        if (comment.trim().length > 1000) e.comment = "Comment is too long (max 1000)";

        return e;
    }

    const canOpenConfirm = selStartIndex !== null && !!selectedStartTime;

    const openConfirm = () => {
        setBanner(null);

        if (!canOpenConfirm) {
            setBanner({ kind: "error", text: "Please select a time slot first." });
            return;
        }

        const e = validateClient();
        setFieldErrors(e);
        if (Object.keys(e).length > 0) return;

        setConfirmOpen(true);
    };

    const submit = async () => {
        if (!selectedStartTime) return;

        setSubmitting(true);
        setBanner(null);

        const payload: BookingCreateRequest = {
            date,
            start_time: selectedStartTime,
            duration_minutes: durationMinutes,
            name: name.trim(),
            phone: phone.trim(),
            comment: comment.trim() ? comment.trim() : null,
        };

        try {
            const res = await PublicAPI.createBooking(payload);

            setConfirmOpen(false);
            setSubmitting(false);

            setBanner({
                kind: "success",
                text: `Booking created: ${res.date} ${res.start_time}–${res.end_time}`,
            });

            setSelStartIndex(null);
            setSelCount(1);
            setComment("");

            setSlotsRefresh((v) => v + 1);
        } catch (err) {
            setSubmitting(false);

            const ae = err instanceof ApiError ? err : new ApiError(0, "Unknown error");

            if (ae.status === 409) {
                setConfirmOpen(false);
                setBanner({
                    kind: "error",
                    text: "Selected time is already taken. Please choose another slot.",
                });
                setSlotsRefresh((v) => v + 1);
                setSelStartIndex(null);
                setSelCount(1);
                return;
            }

            if (ae.status === 422 && ae.validationFields) {
                const fe: FieldErrors = {};
                for (const f of ae.validationFields) {
                    if (f.field === "name") fe.name = f.message;
                    if (f.field === "phone") fe.phone = f.message;
                    if (f.field === "comment") fe.comment = f.message;
                }
                setFieldErrors(fe);
                setBanner({ kind: "error", text: "Please fix highlighted fields." });
                return;
            }

            setBanner({ kind: "error", text: ae.message || "Something went wrong." });
        }
    };

    return (
        <div className="min-h-screen">
            <header className="px-[80px] pt-[34px]">
                <div className="flex items-start justify-between">
                    <div>
                        <Text as="div" variant="brand">
                            photannie
                        </Text>
                        <div className="mt-[10px] h-[2px] w-[38px] rounded-full bg-[var(--gold)]" />
                        <Text variant="tiny" tone="muted" className="mt-[10px]">
                            {headerLine}
                        </Text>
                    </div>

                    <div className="text-right">
                        <Text variant="tiny" tone="muted">
                            +7 (900) 000-00-00
                        </Text>
                        <Text variant="tiny" tone="muted" className="mt-[6px]">
                            hello@photannie.studio
                        </Text>
                    </div>
                </div>

                <div className="mt-[24px]">
                    <Separator />
                </div>
            </header>

            <div className="h-[36px]" />

            <main className="px-[80px]">
                <div className="flex gap-[40px]">
                    <Card className="w-[760px]" shadow="soft" radius="var(--r-card)">
                        <div className="p-[28px]">
                            <Hero />

                            <div className="mt-[34px]">
                                <div className="text-[11px] font-[800] tracking-[2.2px] text-[var(--muted)]">
                                    MILANO EDITORIAL ATELIER
                                </div>

                                <div className="mt-[18px] leading-[0.96]">
                                    <div className="text-[64px] font-[900] tracking-[-0.4px] text-[var(--ink)]">
                                        Couture studio
                                    </div>
                                    <div className="text-[64px] font-[900] tracking-[-0.4px] text-[var(--ink)] underline decoration-[var(--ink)] decoration-[6px] underline-offset-[8px]">
                                        session
                                    </div>
                                </div>

                                <div className="mt-[14px] h-[2px] w-[44px] rounded-full bg-[var(--gold)]" />

                                <div className="mt-[14px]">
                                    <div className="text-[15px] font-[520] text-[var(--muted)]">
                                        Select a date, choose a 30-minute slot,
                                    </div>
                                    <div className="text-[15px] font-[520] text-[var(--muted)]">
                                        leave your contacts. Details are arranged personally.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="w-[480px]" shadow="strong" radius="var(--r-card)">
                        <div className="px-[28px] pb-[28px] pt-[26px]">
                            <Text as="h2" variant="h2">
                                Booking
                            </Text>
                            <Text variant="tiny" tone="muted" className="mt-[10px]">
                                {bookingHint}
                            </Text>

                            {banner ? (
                                <div
                                    className={cn(
                                        "mt-[14px] rounded-[14px] border-[1.4px] px-3 py-2",
                                        banner.kind === "success"
                                            ? "border-[#cfe3d2] bg-[#f0faf2] text-[#1f4d2b]"
                                            : "border-[#e8c9c9] bg-[#fcf1f1] text-[#6b1f1f]",
                                    )}
                                >
                                    <Text variant="tiny" tone="ink" className="!text-inherit">
                                        {banner.text}
                                    </Text>
                                </div>
                            ) : null}

                            <Text as="div" variant="h3" className="mt-[22px]">
                                Date
                            </Text>

                            <div className="mt-[10px]">
                                <input
                                    type="date"
                                    value={date}
                                    min={minDate}
                                    max={maxDate}
                                    onChange={(e) => {
                                        setDate(e.target.value);
                                        setBanner(null);
                                    }}
                                    className={cn(
                                        "w-full h-[44px] rounded-[var(--r-14)] border-[1.4px] border-[var(--field-border)] bg-white px-3",
                                        "text-[12px] font-[650] text-[var(--ink)]",
                                        "focus:outline-none focus:ring-0 focus:border-[var(--ink)]",
                                    )}
                                />
                            </div>

                            <Text as="div" variant="h3" className="mt-[18px]">
                                Free slots
                            </Text>
                            <Text variant="tiny" tone="muted" className="mt-[8px]">
                                Scroll to see more times
                            </Text>

                            {slotsState.status === "loading" ? (
                                <Text variant="tiny" tone="muted2" className="mt-[8px]">
                                    Loading slots…
                                </Text>
                            ) : null}
                            {slotsState.status === "error" ? (
                                <Text variant="tiny" tone="muted2" className="mt-[8px]">
                                    Could not load slots. Try again.
                                </Text>
                            ) : null}

                            <Text variant="tiny" tone="muted2" className="mt-[8px]">
                                {selectionLabel}
                            </Text>

                            <div
                                className={cn(
                                    "relative mt-[12px] h-[154px] w-[424px] rounded-[16px] border-[1.4px] border-[var(--field-border)] bg-white",
                                    "overflow-hidden",
                                )}
                            >
                                <div className="h-full overflow-y-auto px-[14px] py-[14px]">
                                    <div className="grid grid-cols-4 gap-x-[10px] gap-y-[12px]">
                                        {grid.map((t, i) => {
                                            const isFree = freeSet.has(t);
                                            const variant: SlotVariant = isSelected(i)
                                                ? "selected"
                                                : isFree
                                                    ? "free"
                                                    : "busy";

                                            return (
                                                <SlotPill
                                                    key={t}
                                                    label={t}
                                                    variant={variant}
                                                    onClick={isFree ? () => handleSlotClick(i) : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <Text as="div" variant="h3" className="mt-[22px]">
                                Your details
                            </Text>

                            <div className="mt-[10px] space-y-[10px]">
                                <div>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Name *"
                                    />
                                    {fieldErrors.name ? (
                                        <Text variant="tiny" tone="muted2" className="mt-[6px]">
                                            {fieldErrors.name}
                                        </Text>
                                    ) : null}
                                </div>

                                <div>
                                    <Input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Phone * (starts with +7)"
                                        inputMode="tel"
                                    />
                                    {fieldErrors.phone ? (
                                        <Text variant="tiny" tone="muted2" className="mt-[6px]">
                                            {fieldErrors.phone}
                                        </Text>
                                    ) : null}
                                </div>

                                <div>
                                    <Textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Comment (optional)"
                                    />
                                    {fieldErrors.comment ? (
                                        <Text variant="tiny" tone="muted2" className="mt-[6px]">
                                            {fieldErrors.comment}
                                        </Text>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-[18px]">
                                <Button
                                    className="w-[424px]"
                                    disabled={selStartIndex === null || submitting}
                                    onClick={openConfirm}
                                >
                                    Create booking
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>

            <Modal open={confirmOpen} onClose={() => (!submitting ? setConfirmOpen(false) : null)} width={560}>
                <Text as="div" variant="h2">
                    Confirm booking
                </Text>

                <Text variant="tiny" tone="muted" className="mt-[10px]">
                    Please verify details before creating the booking.
                </Text>

                <div className="mt-[16px] rounded-[16px] border-[1.4px] border-[var(--hair)] bg-white px-4 py-3">
                    <Text variant="small">Date</Text>
                    <Text variant="tiny" tone="muted" className="mt-[4px]">
                        {date}
                    </Text>

                    <div className="h-[10px]" />

                    <Text variant="small">Time</Text>
                    <Text variant="tiny" tone="muted" className="mt-[4px]">
                        {selectedStartTime}–{selectedEndTime} ({durationMinutes} min)
                    </Text>

                    <div className="h-[10px]" />

                    <Text variant="small">Client</Text>
                    <Text variant="tiny" tone="muted" className="mt-[4px]">
                        {name.trim()} • {phone.trim()}
                    </Text>

                    {comment.trim() ? (
                        <>
                            <div className="h-[10px]" />
                            <Text variant="small">Comment</Text>
                            <Text variant="tiny" tone="muted" className="mt-[4px]">
                                {comment.trim()}
                            </Text>
                        </>
                    ) : null}
                </div>

                <div className="mt-[18px] flex gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1"
                        disabled={submitting}
                        onClick={() => setConfirmOpen(false)}
                    >
                        Back
                    </Button>
                    <Button className="flex-1" disabled={submitting} onClick={submit}>
                        {submitting ? "Creating…" : "Confirm"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
