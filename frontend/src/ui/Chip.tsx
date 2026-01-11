import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "default" | "busy" | "selected" | "muted";

const VARIANT: Record<Variant, string> = {
    default: "bg-white border-[1.4px] border-[var(--field-border)] text-[var(--ink)]",
    muted: "bg-white border-[1.4px] border-[var(--field-border)] text-[var(--muted)]",
    busy: "bg-[var(--chip-busy-bg)] border-[1.4px] border-[var(--chip-busy-border)] text-[var(--muted2)]",
    selected: "bg-[var(--ink)] border-[1.4px] border-[var(--ink)] text-white",
};

export default function Chip({
                                 className,
                                 variant = "default",
                                 ...props
                             }: HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
    return (
        <div
            className={cn(
                "inline-flex items-center justify-center rounded-[var(--r-pill)]",
                "h-[34px] px-3",
                "text-[12px] font-[900]",
                VARIANT[variant],
                className,
            )}
            {...props}
        />
    );
}
