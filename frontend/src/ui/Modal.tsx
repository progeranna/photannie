import { useEffect } from "react";
import { createPortal } from "react-dom";
import Card from "./Card";
import { cn } from "./cn";

export default function Modal({
                                  open,
                                  onClose,
                                  children,
                                  width = 520,
                              }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}) {
    useEffect(() => {
        if (!open) return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/[0.22]"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="absolute inset-0 grid place-items-center px-6">
                <div style={{ width }}>
                    <Card shadow="strong" radius="var(--r-card)">
                        <div className={cn("p-[22px]")}>{children}</div>
                    </Card>
                </div>
            </div>
        </div>,
        document.body,
    );
}
